import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/components/manager/BookingRow";

export const Route = createFileRoute("/manager/chats")({
  component: ManagerChats,
});

type DialogRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
  last_from_me: boolean | null;
  unread_count: number;
};

function fmtLastAt(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function ManagerChats() {
  const [rows, setRows] = useState<DialogRow[] | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("manager_list_dialogs");
    if (!error) setRows((data ?? []) as DialogRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: новое сообщение — список и непрочитанные обновляются сами.
  useEffect(() => {
    const ch = supabase
      .channel("manager-dialogs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Чаты с организаторами</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Все, кто создавал игры на твоём стадионе. Можно написать первым.
        </p>
      </div>

      {rows === null && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Пока нет организаторов — появятся после первой брони на стадионе.
          </CardContent>
        </Card>
      )}

      {rows !== null && rows.length > 0 && (
        <Card>
          <CardContent className="divide-y divide-border/60 p-0">
            {rows.map((r) => (
              <Link
                key={r.user_id}
                to="/friends/$friendId"
                params={{ friendId: r.user_id }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-6"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(r.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{r.display_name ?? "Организатор"}</p>
                    {r.last_at && (
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtLastAt(r.last_at)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {r.last_at
                        ? `${r.last_from_me ? "Вы: " : ""}${r.last_body ?? "📎 Вложение"}`
                        : "Сообщений ещё нет — напиши первым"}
                    </p>
                    {r.unread_count > 0 && (
                      <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full bg-gradient-brand px-1.5 text-[11px] text-primary-foreground">
                        {r.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
                <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
