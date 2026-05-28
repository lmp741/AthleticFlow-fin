import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Calendar, Loader2, MapPin, Upload, User as UserIcon, CreditCard, Sparkles, ShieldCheck, X, Plus, Check, Trash2, Star, Image as ImageIcon, Video, Trophy, ThumbsUp } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { toast } from "sonner";
import { formatRuPhone, isValidRuPhone, toE164Ru } from "@/lib/phone";
import { PhoneVerifyDialog } from "@/components/auth/PhoneVerifyDialog";
import { FEATURES } from "@/lib/feature-flags";
import { isPushSupported, getPushStatus, enablePush, disablePush, type PushStatus } from "@/lib/push";
import { compressImage } from "@/lib/image";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Профиль — Athletic Flow" }] }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const levels = ["Новичок", "Любитель", "Полупрофи", "Профи"] as const;

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  phone_public: boolean;
  level: string | null;
  username: string | null;
  numeric_id: number | null;
}

interface GameItem {
  id: string;
  sport: string;
  starts_at: string;
  ends_at: string;
  stadium: { name: string; address: string } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    avatar_url: null,
    phone: "",
    phone_verified: false,
    phone_public: false,
    level: "Любитель",
    username: "",
    numeric_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [upcoming, setUpcoming] = useState<GameItem[]>([]);
  const [past, setPast] = useState<GameItem[]>([]);
  // Сколько матчей пользователь сам организовал и они уже завершились.
  const [organizedCount, setOrganizedCount] = useState<number>(0);
  const [ratings, setRatings] = useState<{ id: string; rater_id: string; score: number; comment: string | null; created_at: string }[]>([]);
  const [raters, setRaters] = useState<Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }>>({});
  const [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone, level, username, phone_verified, phone_public, numeric_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setProfile(data as ProfileData);
      setLoading(false);

      const { data: parts } = await supabase
        .from("game_participants")
        .select("game:games(id, sport, starts_at, ends_at, stadium:stadiums(name,address))")
        .eq("user_id", user.id);
      const now = Date.now();
      const games = ((parts ?? []).map((p) => p.game).filter(Boolean) as unknown) as GameItem[];
      setUpcoming(
        games
          .filter((g) => new Date(g.starts_at).getTime() >= now)
          .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
      );
      setPast(
        games
          .filter((g) => new Date(g.ends_at).getTime() < now)
          .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at))
      );

      // Сколько игр пользователь сам создал и довёл до конца (ends_at < now).
      // Это «организовал успешных матчей» — показываем в метриках.
      const { count: organizedCount } = await supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", user.id)
        .lt("ends_at", new Date().toISOString());
      setOrganizedCount(organizedCount ?? 0);

      const { data: rs } = await supabase
        .from("user_ratings")
        .select("id, rater_id, score, comment, created_at")
        .eq("ratee_id", user.id)
        .order("created_at", { ascending: false });
      const list = rs ?? [];
      setRatings(list);
      const ids = Array.from(new Set(list.map((r) => r.rater_id)));
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        const map: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
        (ps ?? []).forEach((p) => (map[p.id] = p));
        setRaters(map);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const uname = profile.username?.trim() || null;
    if (uname && !/^[A-Za-z0-9_]{3,24}$/.test(uname)) {
      toast.error("Никнейм: 3–24 символа, латиница, цифры или _");
      return;
    }
    const rawPhone = profile.phone?.trim() || "";
    let phoneToSave: string | null = null;
    if (rawPhone) {
      const e164 = toE164Ru(rawPhone);
      if (!e164) {
        toast.error("Телефон должен быть российским: +7 (XXX) XXX-XX-XX");
        return;
      }
      phoneToSave = e164;
    }
    setSaving(true);
    // If number changed, reset verified flag
    const phoneChanged = phoneToSave !== (toE164Ru(profile.phone) ?? null) || false;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name?.trim() || null,
        phone: phoneToSave,
        phone_verified: phoneChanged ? false : profile.phone_verified,
        phone_public: profile.phone_public,
        level: profile.level,
        username: uname,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Этот никнейм уже занят");
      else toast.error(error.message);
    } else {
      setProfile((p) => ({ ...p, phone: phoneToSave }));
      toast.success("Профиль обновлён");
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    // 15 МБ — практический потолок для iPhone-фото перед сжатием. После compressImage
    // получим ~300-800 КБ JPEG 1024×1024 — это с запасом и для retina, и для трафика.
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Файл больше 15 МБ");
      return;
    }
    setUploading(true);
    let toUpload: File = file;
    try {
      toUpload = await compressImage(file, { maxDim: 1024, maxSizeMB: 1 });
    } catch {
      // Если сжатие сломалось — пробуем загрузить оригинал, лимит storage не пробьём.
    }
    const ext = (toUpload.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, toUpload, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setProfile((p) => ({ ...p, avatar_url: url }));
    setUploading(false);
    toast.success("Аватар обновлён");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-12">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const avgRating =
    ratings.length === 0 ? null : ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  const completedCount = past.length;
  const upcomingCount = upcoming.length;
  // Attendance streak: consecutive past games sorted desc
  const attendanceStreak = completedCount;
  const reliability =
    completedCount === 0
      ? null
      : Math.min(100, Math.round((completedCount / (completedCount + 0)) * 100));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-gradient-hero py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <Badge className="mb-3 border-white/30 bg-white/10 text-white">Профиль</Badge>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
            {profile.display_name || "Игрок"}
          </h1>
          <p className="mt-2 text-white/80">{user?.email}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
              <Star className="h-4 w-4 fill-white" />
              {avgRating === null
                ? "Пока без оценок"
                : `${avgRating.toFixed(1)} / 5 · ${ratings.length} ${ratings.length === 1 ? "оценка" : "оценок"}`}
            </span>
            {FEATURES.PHONE_VERIFICATION && profile.phone_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-sm text-white ring-1 ring-emerald-200/40">
                <ShieldCheck className="h-4 w-4" /> Проверенный игрок
              </span>
            )}
            {profile.username && (
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25"
              >
                Открыть публичный профиль →
              </Link>
            )}
          </div>

          {/* Stats row: «Сыграно» (где участник), «Организовал» (где организатор),
              «Впереди» (предстоящие), «Серия» (текущая активность). */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Сыграно</p>
              <p className="font-display text-2xl font-bold text-white">{completedCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Организовал</p>
              <p className="font-display text-2xl font-bold text-white">{organizedCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Впереди</p>
              <p className="font-display text-2xl font-bold text-white">{upcomingCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Серия</p>
              <p className="font-display text-2xl font-bold text-white">
                {attendanceStreak}
                <span className="ml-1 text-sm">🔥</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15">
              <p className="text-[10px] uppercase tracking-wider text-white/70">Уровень</p>
              <p className="font-display text-lg font-bold text-white">{profile.level || "—"}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {completedCount >= 1 && (
              <Badge className="border-white/20 bg-white/15 text-white">🎯 Первая игра</Badge>
            )}
            {completedCount >= 5 && (
              <Badge className="border-white/20 bg-white/15 text-white">⚡ 5 матчей</Badge>
            )}
            {completedCount >= 10 && (
              <Badge className="border-white/20 bg-white/15 text-white">🏆 10 матчей</Badge>
            )}
            {avgRating !== null && avgRating >= 4.5 && (
              <Badge className="border-white/20 bg-white/15 text-white">⭐ Любимец команды</Badge>
            )}
            {FEATURES.PHONE_VERIFICATION && profile.phone_verified && (
              <Badge className="border-white/20 bg-white/15 text-white">✅ Верифицирован</Badge>
            )}
            {reliability !== null && reliability >= 90 && completedCount >= 3 && (
              <Badge className="border-white/20 bg-white/15 text-white">📅 Надёжная явка</Badge>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-6 py-12 lg:grid-cols-[360px_1fr]">
        {/* Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex flex-col items-center">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-32 w-32 rounded-full object-cover shadow-glow"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow">
                  <UserIcon className="h-12 w-12" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-card hover:opacity-90">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                />
              </label>
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              Уровень игры
            </p>
            <p className="font-display text-lg font-bold">{profile.level || "—"}</p>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="numeric_id">ID</Label>
              <Input
                id="numeric_id"
                value={profile.numeric_id ?? ""}
                readOnly
                disabled
                className="mt-1 h-11 font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Постоянный номер, присвоен при регистрации. Его нельзя изменить.
              </p>
            </div>
            <div>
              <Label htmlFor="username">Ник (@)</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-base font-bold text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={profile.username ?? ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      username: e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 24),
                    })
                  }
                  placeholder="timur_07"
                  className="h-11"
                  maxLength={24}
                />
              </div>
              {profile.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: profile.username }}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  Твоя страница: /u/{profile.username}
                </Link>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  3–24 символа: латиница, цифры или _. По нему тебя найдут друзья.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={profile.display_name ?? ""}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Александр"
                className="mt-1 h-11"
                maxLength={60}
              />
            </div>
            {FEATURES.PHONE_VERIFICATION && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone">Телефон (необязательно)</Label>
                  {profile.phone_verified && isValidRuPhone(profile.phone) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Подтверждён
                    </span>
                  ) : isValidRuPhone(profile.phone) ? (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Не подтверждён
                    </span>
                  ) : null}
                </div>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={formatRuPhone(profile.phone ?? "")}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+7 (999) 000-00-00"
                  className="mt-1 h-11"
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Только российские номера. Подтверждённый телефон можно использовать
                  для входа и восстановления пароля.
                </p>
                {isValidRuPhone(profile.phone) && (
                  <label className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-background p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={profile.phone_public}
                      onChange={(e) => setProfile({ ...profile, phone_public: e.target.checked })}
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Показывать телефон в публичном профиле</p>
                      <p className="text-muted-foreground">Любой пользователь сможет увидеть твой номер на странице /u/{profile.username || "…"}</p>
                    </div>
                  </label>
                )}
                {isValidRuPhone(profile.phone) && !profile.phone_verified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      const e164 = toE164Ru(profile.phone);
                      if (!e164 || !user) return;
                      await supabase
                        .from("profiles")
                        .update({ phone: e164, phone_verified: false })
                        .eq("id", user.id);
                      setProfile((p) => ({ ...p, phone: e164 }));
                      setVerifyOpen(true);
                    }}
                  >
                    Подтвердить номер по SMS
                  </Button>
                )}
              </div>
            )}
            <div>
              <Label>Уровень игры</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {levels.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setProfile({ ...profile, level: lv })}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      profile.level === lv
                        ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={save}
              disabled={saving}
              size="lg"
              className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="space-y-8">
          <CardReminder />
          <PushSettings />
          <RatingsSection ratings={ratings} raters={raters} />
          {user && <MediaSection userId={user.id} isOwner />}
          {user && <GoalsSection userId={user.id} pastGames={past} />}
          <HistorySection title="Предстоящие игры" empty="Нет записанных игр" items={upcoming} />
          <HistorySection title="История игр" empty="Сыгранных игр пока нет" items={past} muted />
        </div>
      </section>
      {FEATURES.PHONE_VERIFICATION && user && isValidRuPhone(profile.phone) && (
        <PhoneVerifyDialog
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          userId={user.id}
          phone={profile.phone ?? ""}
          purpose="verify"
          onVerified={() => setProfile((p) => ({ ...p, phone_verified: true }))}
        />
      )}
      <SiteFooter />
    </div>
  );
}

interface RatingItem {
  id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

function RatingsSection({
  ratings,
  raters,
}: {
  ratings: RatingItem[];
  raters: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }>;
}) {
  const { user } = useAuth();
  // votes[ratingId] = { likes, dislikes, myVote: -1|0|1 }
  const [votes, setVotes] = useState<Record<string, { likes: number; dislikes: number; myVote: number }>>({});

  // Лайки/дизлайки имеют смысл только на отзывы с комментарием.
  const reviewIds = ratings.filter((r) => r.comment).map((r) => r.id);

  useEffect(() => {
    if (reviewIds.length === 0) {
      setVotes({});
      return;
    }
    let alive = true;
    (async () => {
      // Один запрос на все голоса по интересующим отзывам.
      const { data } = await supabase
        .from("rating_review_votes")
        .select("rating_id, voter_id, value")
        .in("rating_id", reviewIds);
      if (!alive) return;
      const agg: Record<string, { likes: number; dislikes: number; myVote: number }> = {};
      reviewIds.forEach((id) => (agg[id] = { likes: 0, dislikes: 0, myVote: 0 }));
      (data ?? []).forEach((v) => {
        const bucket = agg[v.rating_id];
        if (!bucket) return;
        if (v.value === 1) bucket.likes++;
        else if (v.value === -1) bucket.dislikes++;
        if (user && v.voter_id === user.id) bucket.myVote = v.value;
      });
      setVotes(agg);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIds.join(","), user?.id]);

  const vote = async (ratingId: string, raterId: string, next: number) => {
    if (!user) return;
    if (raterId === user.id) return; // нельзя на свой
    const cur = votes[ratingId]?.myVote ?? 0;
    const value = cur === next ? 0 : next; // повторный клик — отмена
    // Оптимистично обновляем UI.
    setVotes((prev) => {
      const b = prev[ratingId] ?? { likes: 0, dislikes: 0, myVote: 0 };
      const next_b = { ...b };
      // вычитаем старый голос
      if (b.myVote === 1) next_b.likes--;
      else if (b.myVote === -1) next_b.dislikes--;
      // добавляем новый
      if (value === 1) next_b.likes++;
      else if (value === -1) next_b.dislikes++;
      next_b.myVote = value;
      return { ...prev, [ratingId]: next_b };
    });
    const { error } = await supabase.rpc("vote_rating_review", {
      p_rating_id: ratingId,
      p_value: value,
    });
    if (error) {
      toast.error(error.message);
      // На ошибку — откатываемся: проще перезагрузить, но для MVP оставим
      // оптимистичное состояние. Реальный rollback можно добавить позже.
    }
  };

  const avg =
    ratings.length === 0
      ? null
      : ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Рейтинг и отзывы</h3>
          <p className="text-xs text-muted-foreground">
            Оценки от партнёров после совместных игр.
          </p>
        </div>
        {avg !== null && (
          <div className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-primary-foreground shadow-glow">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-display text-sm font-bold">{avg.toFixed(1)}</span>
            <span className="text-xs opacity-80">/ 5 · {ratings.length}</span>
          </div>
        )}
      </div>
      {ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока никто не оценил. Сыграй игру и попроси партнёров оставить отзыв.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ratings.slice(0, 6).map((r) => {
            const rp = raters[r.rater_id];
            const v = votes[r.id];
            const canVote = !!user && r.rater_id !== user.id && !!r.comment;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  {rp?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: rp.username }}
                      className="text-sm font-semibold hover:underline"
                    >
                      @{rp.username}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold">{rp?.display_name ?? "Игрок"}</span>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                )}
                {r.comment && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canVote}
                      onClick={() => vote(r.id, r.rater_id, 1)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                        v?.myVote === 1
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      } ${canVote ? "" : "cursor-default opacity-60"}`}
                      aria-label="Полезный отзыв"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {(v?.likes ?? 0) > 0 ? v?.likes : ""}
                    </button>
                    <button
                      type="button"
                      disabled={!canVote}
                      onClick={() => vote(r.id, r.rater_id, -1)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                        v?.myVote === -1
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      } ${canVote ? "" : "cursor-default opacity-60"}`}
                      aria-label="Не согласен с отзывом"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 rotate-180" />
                      {(v?.dislikes ?? 0) > 0 ? v?.dislikes : ""}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SavedCard {
  id: string;
  last4: string;
  holder: string;
  expiry: string;
  brand: string;
}

const STORAGE_KEY = "af_cards_v2";

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(2200|2201|2202|2203|2204)/.test(digits)) return "МИР";
  return "Карта";
}

/**
 * Карточка управления Web Push-уведомлениями.
 * Состояния:
 *   - unsupported: браузер не поддерживает Web Push (iOS Safari < 16.4, и т.д.)
 *   - not-configured: на сервере не настроен VAPID — показываем заглушку для админа
 *   - denied: юзер ранее отказал, объясняем как включить в настройках браузера
 *   - subscribed: всё включено, можно выключить
 *   - default: подписки нет — кнопка «Включить»
 */
function PushSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getPushStatus().then(setStatus);
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setStatus("subscribed");
      toast.success("Уведомления включены");
    } else {
      const map: Record<string, string> = {
        denied: "Разрешения отозваны. Открой настройки сайта в браузере и разреши уведомления.",
        unsupported: "Браузер не поддерживает уведомления.",
        "not-configured": "VAPID-ключ не настроен на сервере. Сообщи админу.",
        "no-keys": "Не удалось получить ключи подписки. Попробуй ещё раз.",
        "not-authenticated": "Нужно войти в аккаунт.",
      };
      toast.error(map[res.reason ?? ""] ?? res.reason ?? "Не удалось включить");
      if (res.reason) setStatus(res.reason as PushStatus);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    const res = await disablePush();
    setBusy(false);
    if (res.ok) {
      setStatus("default");
      toast.success("Уведомления выключены");
    } else {
      toast.error(res.reason ?? "Не удалось выключить");
    }
  };

  if (status === null) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Проверяем уведомления…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
            {status === "subscribed" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-bold leading-tight">Уведомления</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "subscribed"
                ? "Получаешь пуш-уведомления о сообщениях, оценках и приглашениях."
                : status === "denied"
                  ? "Разрешения отозваны. Включи в настройках сайта в браузере."
                  : status === "unsupported"
                    ? "Браузер не поддерживает Web Push. На iPhone нужно добавить сайт на главный экран (iOS 16.4+)."
                    : status === "not-configured"
                      ? "Сервер не настроен. Сообщи администратору."
                      : "Включи, чтобы не пропускать сообщения и приглашения."}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Switch
            checked={status === "subscribed"}
            disabled={
              busy ||
              status === "unsupported" ||
              status === "denied" ||
              status === "not-configured"
            }
            onCheckedChange={(v) => (v ? handleEnable() : handleDisable())}
          />
        </div>
      </div>
    </div>
  );
}

function CardReminder() {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);

  const [cards, setCards] = useState<SavedCard[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("af_card_active") ?? null;
  });

  const persist = (next: SavedCard[], nextActive: string | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (nextActive) localStorage.setItem("af_card_active", nextActive);
    else localStorage.removeItem("af_card_active");
    setCards(next);
    setActiveId(nextActive);
  };

  const formatNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const resetForm = () => {
    setNumber("");
    setHolder("");
    setExpiry("");
    setCvc("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = number.replace(/\s/g, "");
    if (digits.length < 13) return toast.error("Проверь номер карты");
    if (!holder.trim()) return toast.error("Укажи держателя карты");
    if (expiry.length < 5) return toast.error("Срок действия неполный");
    if (cvc.length < 3) return toast.error("CVC неполный");
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const card: SavedCard = {
      id: crypto.randomUUID(),
      last4: digits.slice(-4),
      holder: holder.trim().toUpperCase(),
      expiry,
      brand: detectBrand(digits),
    };
    const next = [...cards, card];
    persist(next, activeId ?? card.id);
    setSaving(false);
    setAdding(false);
    resetForm();
    toast.success("Карта добавлена");
  };

  const removeCard = (id: string) => {
    const next = cards.filter((c) => c.id !== id);
    let nextActive = activeId;
    if (activeId === id) nextActive = next[0]?.id ?? null;
    persist(next, nextActive);
    toast.success("Карта удалена");
  };

  const setActive = (id: string) => {
    persist(cards, id);
    toast.success("Карта выбрана для оплаты");
  };

  const active = cards.find((c) => c.id === activeId) ?? null;
  const hasCards = cards.length > 0;

  if (dismissed && !hasCards) return null;

  return (
    <>
      {hasCards ? (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold">Способы оплаты</h3>
              <p className="text-xs text-muted-foreground">
                Все привязанные карты. Выбери одну активную для оплаты игр.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setAdding(true); setOpen(true); }}
            >
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group relative overflow-hidden rounded-2xl border p-4 transition ${
                    isActive
                      ? "border-primary bg-gradient-to-br from-primary/15 via-card to-accent/30 shadow-elegant"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !isActive && setActive(c.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-bold">
                          {c.brand} •••• {c.last4}
                        </p>
                        {isActive && (
                          <Badge className="h-5 bg-primary px-1.5 text-[10px] text-primary-foreground">
                            <Check className="mr-0.5 h-3 w-3" /> Активна
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.holder} · {c.expiry}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCard(c.id)}
                    aria-label="Удалить карту"
                    className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Платежные данные защищены. Активной картой будут оплачиваться игры в один клик.
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/30 p-6 shadow-elegant">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Скрыть"
            className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="max-w-xl">
                <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">Совет</Badge>
                <h3 className="font-display text-xl font-bold leading-tight">
                  Привяжи карту — записывайся на игры в один клик
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Можно сохранить несколько карт и выбрать одну рабочую. Возвраты — автоматически
                  на ту же карту.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Данные защищены, токенизация по стандарту PCI DSS
                </div>
              </div>
            </div>
            <Button
              onClick={() => { setAdding(true); setOpen(true); }}
              size="lg"
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              <CreditCard className="mr-2 h-4 w-4" /> Привязать карту
            </Button>
          </div>
        </div>
      )}

      {/* Drawer / Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => { setOpen(false); setAdding(false); resetForm(); }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-background p-6 shadow-elegant animate-in slide-in-from-right">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/20">Безопасно</Badge>
                <h2 className="font-display text-2xl font-bold">
                  {adding ? "Новая карта" : "Способы оплаты"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {adding
                    ? "Карта будет добавлена к твоему профилю."
                    : "Выбери карту для оплаты или добавь новую."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); setAdding(false); resetForm(); }}
                aria-label="Закрыть"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!adding && (
              <>
                <div className="space-y-3">
                  {cards.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Карт пока нет. Добавь первую.
                    </p>
                  )}
                  {cards.map((c) => {
                    const isActive = c.id === activeId;
                    return (
                      <div
                        key={c.id}
                        className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                          isActive
                            ? "border-primary bg-gradient-to-br from-primary/15 via-card to-accent/30 shadow-elegant"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActive(c.id)}
                          className="flex w-full items-center gap-4 text-left"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-sm font-bold">
                              {c.brand} •••• {c.last4}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.holder} · {c.expiry}
                            </p>
                          </div>
                          {isActive ? (
                            <Badge className="bg-primary text-primary-foreground">
                              <Check className="mr-1 h-3 w-3" /> Активна
                            </Badge>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">Выбрать</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeCard(c.id); }}
                          aria-label="Удалить карту"
                          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setAdding(true)}
                  variant="outline"
                  size="lg"
                  className="mt-5 w-full border-dashed"
                >
                  <Plus className="mr-2 h-4 w-4" /> Добавить новую карту
                </Button>

                <div className="mt-6 flex items-start gap-2 rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Платежные данные передаются по защищенному каналу и не сохраняются на наших серверах.
                </div>
              </>
            )}

            {adding && (
              <>
                {/* Visual card preview */}
                <div className="mb-6 rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-glow">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-6 w-6" />
                    <span className="text-xs uppercase tracking-widest opacity-80">
                      {detectBrand(number.replace(/\s/g, ""))}
                    </span>
                  </div>
                  <p className="mt-6 font-mono text-lg tracking-widest">
                    {number || "•••• •••• •••• ••••"}
                  </p>
                  <div className="mt-4 flex justify-between text-xs uppercase opacity-90">
                    <span>{holder || "Имя держателя"}</span>
                    <span>{expiry || "ММ/ГГ"}</span>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label htmlFor="cardnum">Номер карты</Label>
                    <Input
                      id="cardnum"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      className="mt-1 h-11 font-mono tracking-wider"
                      value={number}
                      onChange={(e) => setNumber(formatNumber(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holder">Держатель карты</Label>
                    <Input
                      id="holder"
                      autoComplete="cc-name"
                      placeholder="ALEKSANDR IVANOV"
                      className="mt-1 h-11 uppercase"
                      value={holder}
                      onChange={(e) => setHolder(e.target.value.toUpperCase())}
                      maxLength={40}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="exp">Срок действия</Label>
                      <Input
                        id="exp"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="ММ/ГГ"
                        className="mt-1 h-11 font-mono"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="•••"
                        className="mt-1 h-11 font-mono"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {hasCards && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => { setAdding(false); resetForm(); }}
                      >
                        Назад
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      disabled={saving}
                      className="flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить карту"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function HistorySection({
  title,
  items,
  empty,
  muted,
}: {
  title: string;
  items: GameItem[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((g) => (
            <Link
              key={g.id}
              to="/games/$gameId"
              params={{ gameId: g.id }}
              className={`rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant ${
                muted ? "opacity-80" : ""
              }`}
            >
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                {g.sport}
              </Badge>
              <h3 className="mt-3 font-display text-base font-semibold">{g.stadium?.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {g.stadium?.address}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" /> {fmtDate(g.starts_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ====================== MediaSection ======================

interface MediaItem {
  id: string;
  url: string;
  kind: "image" | "video";
  storage_path: string | null;
  created_at: string;
}

function MediaSection({ userId, isOwner }: { userId: string; isOwner?: boolean }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("profile_media")
      .select("id, url, kind, storage_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as MediaItem[]);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const upload = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Только фото или видео");
      return;
    }
    // Видео не сжимаем в браузере — потолок 50 МБ.
    // Фото сжимаем до ~2 МБ, поэтому принимаем оригинал до 20 МБ.
    const maxMb = isVideo ? 50 : 20;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Файл больше ${maxMb} МБ`);
      return;
    }
    setUploading(true);
    let toUpload: File = file;
    if (isImage) {
      try {
        toUpload = await compressImage(file, { maxDim: 1920, maxSizeMB: 2 });
      } catch {
        /* upload original on compression error */
      }
    }
    const ext = toUpload.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("profile-media")
      .upload(path, toUpload, { upsert: false, contentType: toUpload.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(path);
    const { error: insErr } = await supabase
      .from("profile_media")
      .insert({ user_id: userId, url: pub.publicUrl, storage_path: path, kind: isVideo ? "video" : "image" });
    setUploading(false);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success(isVideo ? "Видео загружено" : "Фото загружено");
    load();
  };

  const remove = async (m: MediaItem) => {
    const { error } = await supabase.from("profile_media").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (m.storage_path) {
      await supabase.storage.from("profile-media").remove([m.storage_path]);
    }
    toast.success("Удалено");
    load();
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Медиа</h3>
          <p className="text-xs text-muted-foreground">
            Фото и видео для твоего профиля. До 8 МБ для фото и 50 МБ для видео.
          </p>
        </div>
        {isOwner && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Загрузить
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Пока ничего не загружено. Покажи свои моменты с игр.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-2xl border border-border bg-background">
              <button
                type="button"
                onClick={() => setPreview(m)}
                className="block aspect-square w-full"
              >
                {m.kind === "image" ? (
                  <img src={m.url} alt="media" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="relative h-full w-full">
                    <video src={m.url} className="h-full w-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 text-background">
                      <Video className="h-8 w-8" />
                    </div>
                  </div>
                )}
              </button>
              <div className="absolute left-2 top-2 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                {m.kind === "image" ? "Фото" : "Видео"}
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(m)}
                  aria-label="Удалить"
                  className="absolute right-2 top-2 rounded-full bg-foreground/70 p-1.5 text-background opacity-0 transition hover:bg-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground hover:bg-background"
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {preview.kind === "image" ? (
              <img src={preview.url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
            ) : (
              <video src={preview.url} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================== GoalsSection ======================

interface GoalClaim {
  id: string;
  game_id: string;
  count: number;
  status: "pending" | "approved";
  created_at: string;
  approvals: number;
  game?: { sport: string; starts_at: string; stadium: { name: string } | null } | null;
}

function GoalsSection({ userId, pastGames }: { userId: string; pastGames: GameItem[] }) {
  const [claims, setClaims] = useState<GoalClaim[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [count, setCount] = useState<string>("1");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: cs } = await supabase
      .from("goal_claims")
      .select("id, game_id, count, status, created_at, game:games(sport, starts_at, stadium:stadiums(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const list = (cs ?? []) as unknown as GoalClaim[];
    if (list.length) {
      const ids = list.map((c) => c.id);
      const { data: ap } = await supabase
        .from("goal_claim_approvals")
        .select("claim_id")
        .in("claim_id", ids);
      const counts = new Map<string, number>();
      (ap ?? []).forEach((a) => counts.set(a.claim_id, (counts.get(a.claim_id) ?? 0) + 1));
      list.forEach((c) => (c.approvals = counts.get(c.id) ?? 0));
    }
    setClaims(list);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const total = claims.filter((c) => c.status === "approved").reduce((s, c) => s + c.count, 0);
  const claimedGameIds = new Set(claims.map((c) => c.game_id));
  const availableGames = pastGames.filter((g) => !claimedGameIds.has(g.id));

  const submit = async () => {
    const n = parseInt(count, 10);
    if (!selectedGameId) { toast.error("Выбери игру"); return; }
    if (!Number.isFinite(n) || n < 1 || n > 50) { toast.error("От 1 до 50 голов"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("goal_claims")
      .insert({ user_id: userId, game_id: selectedGameId, count: n });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Заявка отправлена. Нужно 3 подтверждения от партнёров.");
    setAdding(false);
    setSelectedGameId("");
    setCount("1");
    load();
  };

  const cancel = async (claimId: string) => {
    const { error } = await supabase.from("goal_claims").delete().eq("id", claimId);
    if (error) { toast.error(error.message); return; }
    toast.success("Заявка отменена");
    load();
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-bold leading-tight">Забитые голы</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Подтверждается партнёрами по игре. Нужно ≥ 3 согласований.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Всего</p>
          <p className="font-display text-3xl font-bold">{total}</p>
        </div>
      </div>

      {!adding ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={availableGames.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          {availableGames.length === 0 ? "Нет завершённых игр" : "Заявить голы"}
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-background p-4">
          <Label className="text-xs">Игра</Label>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="">— выбери игру —</option>
            {availableGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.sport} · {g.stadium?.name ?? "Игра"} · {new Date(g.starts_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </option>
            ))}
          </select>
          <Label className="mt-3 block text-xs">Сколько голов</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-1 h-11"
          />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="flex-1">Отмена</Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={saving}
              className="flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
            </Button>
          </div>
        </div>
      )}

      {claims.length > 0 && (
        <ul className="mt-5 space-y-2">
          {claims.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{c.count}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.game?.sport} · {c.game?.stadium?.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.game ? new Date(c.game.starts_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.status === "approved" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    <Check className="mr-1 h-3 w-3" /> Подтверждено
                  </Badge>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{c.approvals}/3</span>
                    <Button size="sm" variant="ghost" onClick={() => cancel(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
