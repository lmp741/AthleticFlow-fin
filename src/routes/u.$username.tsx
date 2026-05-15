import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, User as UserIcon, Loader2, ArrowLeft, MessageCircle, Phone, Video, UserPlus, Check } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRuPhone } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [{ title: `@${params.username} — Athletic Flow` }],
  }),
  component: PublicProfilePage,
});

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
  phone: string | null;
  phone_public: boolean;
}

interface RatingRow {
  id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

interface MediaItem {
  id: string;
  url: string;
  kind: "image" | "video";
  created_at: string;
}

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [raters, setRaters] = useState<Record<string, ProfileRow>>({});
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted">("none");
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, level, phone, phone_public")
        .ilike("username", username)
        .maybeSingle();
      if (!data) {
        setNotFoundFlag(true);
        setLoading(false);
        return;
      }
      setProfile(data as ProfileRow);
      const [{ data: rs }, { data: ms }, { data: fr }] = await Promise.all([
        supabase
          .from("user_ratings")
          .select("id, rater_id, score, comment, created_at")
          .eq("ratee_id", data.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profile_media")
          .select("id, url, kind, created_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false }),
        user
          ? supabase
              .from("friendships")
              .select("status, requester_id, addressee_id")
              .or(
                `and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`
              )
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const list = rs ?? [];
      setRatings(list);
      setMedia((ms ?? []) as MediaItem[]);
      if (fr) setFriendStatus(fr.status === "accepted" ? "accepted" : "pending");
      const ids = Array.from(new Set(list.map((r) => r.rater_id)));
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, level, phone, phone_public")
          .in("id", ids);
        const map: Record<string, ProfileRow> = {};
        (ps ?? []).forEach((p) => (map[p.id] = p as ProfileRow));
        setRaters(map);
      }
      setLoading(false);
    })();
  }, [username, user]);

  const sendFriendRequest = async () => {
    if (!user || !profile) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: profile.id, status: "pending" });
    if (error) toast.error(error.message);
    else {
      toast.success("Заявка отправлена");
      setFriendStatus("pending");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (notFoundFlag || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Игрок не найден</h1>
          <p className="mt-2 text-muted-foreground">
            Никнейм <span className="font-mono">@{username}</span> ещё не занят.
          </p>
          <Button asChild className="mt-6">
            <Link to="/games">К играм</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isMe = user?.id === profile.id;
  const avg =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-gradient-hero py-12">
        <div className="container mx-auto flex flex-col items-start gap-6 px-6 md:flex-row md:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.username ?? ""}
              className="h-28 w-28 rounded-full object-cover shadow-glow"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 text-white">
              <UserIcon className="h-12 w-12" />
            </div>
          )}
          <div className="flex-1">
            <Badge className="mb-2 border-white/30 bg-white/10 text-white">
              @{profile.username}
            </Badge>
            <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
              {profile.display_name ?? "Игрок"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-white/90">
              {profile.level && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                  {profile.level}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm">
                <Star className="h-4 w-4 fill-white" />
                {avg !== null ? `${avg.toFixed(1)} · ${ratings.length} оценок` : "пока без оценок"}
              </span>
            </div>
          </div>
          {!isMe && user && (
            <div className="flex flex-wrap gap-2">
              {friendStatus === "accepted" ? (
                <Button asChild className="bg-white text-foreground hover:bg-white/90">
                  <Link to="/friends/$friendId" params={{ friendId: profile.id }}>
                    <MessageCircle className="mr-1 h-4 w-4" /> Написать
                  </Link>
                </Button>
              ) : friendStatus === "pending" ? (
                <Button disabled variant="outline" className="border-white/40 bg-white/10 text-white">
                  <Check className="mr-1 h-4 w-4" /> Заявка отправлена
                </Button>
              ) : (
                <Button onClick={sendFriendRequest} className="bg-white text-foreground hover:bg-white/90">
                  <UserPlus className="mr-1 h-4 w-4" /> В друзья
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Button variant="ghost" asChild className="-ml-2">
            <Link to="/games">
              <ArrowLeft className="mr-1 h-4 w-4" /> Назад к играм
            </Link>
          </Button>

          {/* Media */}
          <div>
            <h2 className="font-display text-2xl font-bold">Медиа</h2>
            {media.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Игрок пока ничего не загрузил.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreview(m)}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-background"
                  >
                    {m.kind === "image" ? (
                      <img src={m.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="relative h-full w-full">
                        <video src={m.url} className="h-full w-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 text-background">
                          <Video className="h-8 w-8" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ratings */}
          <div>
            <h2 className="font-display text-2xl font-bold">Отзывы и оценки</h2>
            {ratings.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                После совместных игр другие игроки смогут оставить здесь оценку.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {ratings.map((r) => {
                  const rp = raters[r.rater_id];
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border bg-card p-4 shadow-card"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {rp?.username ? (
                          <Link
                            to="/u/$username"
                            params={{ username: rp.username }}
                            className="text-sm font-semibold hover:underline"
                          >
                            @{rp.username}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold">
                            {rp?.display_name ?? "Игрок"}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display text-lg font-bold">Рейтинг игрока</h3>
            {avg !== null ? (
              <>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">{avg.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">из 5</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  на основе {ratings.length} {ratings.length === 1 ? "оценки" : "оценок"}
                </p>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const cnt = ratings.filter((r) => r.score === star).length;
                    const pct = ratings.length ? (cnt / ratings.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-muted-foreground">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Пока нет оценок.</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display text-lg font-bold">Контакты</h3>
            <div className="mt-3 space-y-2 text-sm">
              {profile.phone_public && profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium">{formatRuPhone(profile.phone)}</span>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Игрок не указал телефон или скрыл его.
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {preview.kind === "image" ? (
              <img src={preview.url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
            ) : (
              <video src={preview.url} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
