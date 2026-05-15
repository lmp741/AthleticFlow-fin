import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Layout-роут для всех /admin/*.
 * Контент конкретного раздела рендерится через <Outlet />.
 * Dashboard (для path = /admin) живёт в admin.index.tsx.
 */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админка — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequireAdmin>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </RequireAdmin>
  );
}
