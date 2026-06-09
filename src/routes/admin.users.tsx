import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, ShieldCheck, Search, UserX, UserCheck, Crown, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Админка · Пользователи — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UsersAdmin,
});

interface UserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  level: string | null;
  created_at: string;
  banned_at: string | null;
  ban_reason: string | null;
  is_admin: boolean;
  games_organized: number;
  games_joined: number;
}

const PAGE_SIZE = 30;

function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = async () => {
    let q = supabase
      .from("admin_users_view")
      .select(
        "id, username, display_name, phone, phone_verified, level, created_at, banned_at, ban_reason, is_admin, games_organized, games_joined",
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const s = search.trim().replace(/^@/, "");
    if (s) {
      // Sanitize: only escape special PostgREST ilike chars
      const safe = s.replace(/[%_]/g, "\\$&");
      q = q.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as unknown as UserRow[];
    setHasMore(list.length > PAGE_SIZE);
    setUsers(list.slice(0, PAGE_SIZE));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Админка</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Пользователи</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          maxLength={64}
          placeholder="Поиск по @username, имени или телефону…"
          className="h-10 pl-10"
        />
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Пользователь</th>
              <th className="px-4 py-3 text-left">Телефон</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left">Активность</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-6 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Никого не нашли
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <UserRowItem key={u.id} u={u} onChanged={load} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Назад
        </Button>
        <span className="text-xs text-muted-foreground">Стр. {page + 1}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
          Далее
        </Button>
      </div>
    </div>
  );
}

function UserRowItem({ u, onChanged }: { u: UserRow; onChanged: () => void }) {
  const [banOpen, setBanOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fullName = u.display_name ?? (u.username ? `@${u.username}` : "Без имени");
  const banned = !!u.banned_at;

  const unban = async () => {
    const { error } = await supabase.rpc("admin_unban_user", { p_target: u.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Разбанен");
      onChanged();
    }
  };

  const toggleAdmin = async () => {
    if (u.is_admin) {
      const ok = window.confirm(`Снять права admin у ${fullName}?`);
      if (!ok) return;
      const { error } = await supabase.rpc("admin_revoke_role", { p_target: u.id, p_role: "admin" });
      if (error) toast.error(error.message);
      else {
        toast.success("Роль admin снята");
        onChanged();
      }
    } else {
      const ok = window.confirm(`Выдать права admin пользователю ${fullName}?`);
      if (!ok) return;
      const { error } = await supabase.rpc("admin_grant_role", { p_target: u.id, p_role: "admin" });
      if (error) toast.error(error.message);
      else {
        toast.success("Роль admin выдана");
        onChanged();
      }
    }
  };

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3">
        <p className="font-semibold">{fullName}</p>
        <p className="text-xs text-muted-foreground">
          {u.username ? `@${u.username}` : "—"} · {u.level ?? "—"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          С {new Date(u.created_at).toLocaleDateString("ru-RU")}
        </p>
      </td>
      <td className="px-4 py-3">
        <p>{u.phone ?? "—"}</p>
        <p className="text-[11px] text-muted-foreground">
          {u.phone_verified ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Подтверждён
            </span>
          ) : (
            "не подтверждён"
          )}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {banned ? (
            <Badge className="gap-1 bg-destructive/15 text-destructive">
              <ShieldAlert className="h-3 w-3" /> Бан
            </Badge>
          ) : (
            <Badge variant="outline">Активен</Badge>
          )}
          {u.is_admin && (
            <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Crown className="h-3 w-3" /> admin
            </Badge>
          )}
        </div>
        {banned && u.ban_reason && (
          <p className="mt-1 text-[11px] text-muted-foreground">{u.ban_reason}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        Игр организовано: <b className="text-foreground">{u.games_organized}</b>
        <br />
        Игр пройдено: <b className="text-foreground">{u.games_joined}</b>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} aria-label="Править">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleAdmin} aria-label="Роль admin">
            <Crown className="h-3.5 w-3.5" />
          </Button>
          {banned ? (
            <Button size="sm" variant="outline" onClick={unban}>
              <UserCheck className="mr-1 h-3.5 w-3.5" /> Разбан
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setBanOpen(true)}>
              <UserX className="mr-1 h-3.5 w-3.5" /> Бан
            </Button>
          )}
        </div>
        <BanDialog
          open={banOpen}
          onOpenChange={setBanOpen}
          userId={u.id}
          userName={fullName}
          onSuccess={onChanged}
        />
        <EditUserDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={u}
          onSuccess={onChanged}
        />
      </td>
    </tr>
  );
}

function BanDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const safeReason = reason.trim().slice(0, 500);
    setSaving(true);
    const { error } = await supabase.rpc("admin_ban_user", {
      p_target: userId,
      p_reason: safeReason || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Забанен");
      onOpenChange(false);
      setReason("");
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Забанить {userName}?</DialogTitle>
          <DialogDescription>
            Пользователь не сможет логиниться и взаимодействовать с сервисом. Можно разбанить позже.
          </DialogDescription>
        </DialogHeader>
        <Label>Причина (опционально, видна другим админам)</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Например: спам, мошенничество, оскорбления…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? "..." : "Забанить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserRow;
  onSuccess: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [level, setLevel] = useState(user.level ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(user.display_name ?? "");
      setUsername(user.username ?? "");
      setLevel(user.level ?? "");
    }
  }, [open, user.id]);

  const save = async () => {
    setSaving(true);
    const cleanDisplay = displayName.trim().slice(0, 100);
    const cleanUsername = username.trim().replace(/^@/, "").slice(0, 24);
    const cleanLevel = level.trim().slice(0, 32);
    // Sanitize username: только [a-zA-Z0-9_]
    if (cleanUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
      toast.error("Username: 3-24 символа, латиница/цифры/_");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: cleanDisplay || null,
        username: cleanUsername || null,
        level: cleanLevel || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Сохранено");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Править пользователя</DialogTitle>
          <DialogDescription>Изменения сохранятся в БД и попадут в аудит-лог.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
          </div>
          <div>
            <Label>Уровень</Label>
            <Input value={level} onChange={(e) => setLevel(e.target.value)} maxLength={32} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            {saving ? "..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
