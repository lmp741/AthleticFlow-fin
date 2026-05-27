import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Server route: POST /api/admin/grant-role
 * Body: { target_id: string, role: 'admin' | 'organizer' | 'stadium_owner' | 'player' }
 * Header: Authorization: Bearer <jwt>
 *
 * TanStack Start 1.131: createServerFileRoute + .methods (ServerRoute).
 *
 * Логика:
 *   1. Достаём JWT из заголовка → проверяем в supabase auth (получаем user_id вызывающего).
 *   2. Caller user_id ДОЛЖЕН быть в env ADMIN_USER_IDS (csv UUID-ов) ИЛИ быть admin в user_roles.
 *   3. INSERT user_roles (target, role) — через service_role (обходит RLS).
 *   4. INSERT admin_actions audit.
 *
 * Зачем: первый admin в системе. ENV ADMIN_USER_IDS — это «root», bootstrap-механизм:
 *   тот, кто прописан в env, может выдавать роль admin кому угодно. Это рабочий путь
 *   назначить первого админа без прямого доступа к SQL.
 *
 * ENV:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_USER_IDS — CSV UUID, например: "0e7b...,a14f..."
 */

const ALLOWED_ROLES = ["admin", "organizer", "stadium_owner", "player"] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const ServerRoute = createServerFileRoute("/api/admin/grant-role")
  .methods({
    POST: async ({ request }) => {
      // 1. Auth: Bearer JWT
      const authH = request.headers.get("authorization") ?? "";
      const m = authH.match(/^Bearer\s+(.+)$/i);
      if (!m) {
        return new Response(JSON.stringify({ error: "no auth" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const jwt = m[1];

      const supa = getAdminSupabase();
      if (!supa) {
        return new Response(JSON.stringify({ error: "server misconfigured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: userResp, error: userErr } = await supa.auth.getUser(jwt);
      if (userErr || !userResp.user) {
        return new Response(JSON.stringify({ error: "bad token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const callerId = userResp.user.id;

      // 2. Authorization: ADMIN_USER_IDS env OR has_role('admin')
      const envList = (process.env.ADMIN_USER_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(isUuid);
      const isSuperByEnv = envList.includes(callerId);

      let isAdminByRole = false;
      if (!isSuperByEnv) {
        const { data: roleRow } = await supa
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        isAdminByRole = !!roleRow;
      }

      if (!isSuperByEnv && !isAdminByRole) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 3. Validate body
      let body: { target_id?: string; role?: string };
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "bad json" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const targetId = (body.target_id ?? "").trim();
      const role = (body.role ?? "").trim() as AppRole;
      if (!isUuid(targetId) || !ALLOWED_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: "bad payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 4. Grant
      const { error: insErr } = await supa
        .from("user_roles")
        .upsert({ user_id: targetId, role }, { onConflict: "user_id,role" });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 5. Audit
      await supa.from("admin_actions").insert({
        actor_id: callerId,
        target_kind: "role",
        target_id: targetId,
        action: isSuperByEnv ? "super_grant_role" : "grant_role",
        payload: { role, via: isSuperByEnv ? "env" : "user_roles" },
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
