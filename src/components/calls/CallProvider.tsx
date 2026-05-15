import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Phone, PhoneOff, Video as VideoIcon, Mic, MicOff, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  createPeer,
  getLocalStream,
  stopStream,
  type CallMode,
} from "@/lib/webrtc";

interface PeerInfo {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface OfferPayload {
  fromId: string;
  fromName: string;
  fromAvatar?: string | null;
  sdp: RTCSessionDescriptionInit;
  mode: CallMode;
  callId: string;
}
interface AnswerPayload { fromId: string; sdp: RTCSessionDescriptionInit; callId: string }
interface IcePayload { fromId: string; candidate: RTCIceCandidateInit; callId: string }
interface EndPayload { fromId: string; callId: string; reason?: "ended" | "declined" | "busy" }

interface IncomingState {
  peer: PeerInfo;
  mode: CallMode;
  sdp: RTCSessionDescriptionInit;
  callId: string;
}

interface ActiveState {
  peer: PeerInfo;
  mode: CallMode;
  callId: string;
  role: "caller" | "callee";
  status: "calling" | "ringing" | "connected" | "ended";
}

interface CallCtx {
  startCall: (peer: PeerInfo, mode: CallMode) => Promise<void>;
}

const Ctx = createContext<CallCtx>({ startCall: async () => {} });

export const useCall = () => useContext(Ctx);

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// Отправка broadcast-события в канал получателя.
async function sendTo(targetId: string, event: string, payload: unknown) {
  const ch = supabase.channel(`call:${targetId}`);
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("realtime timeout")), 5000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      }
    });
  });
  await ch.send({ type: "broadcast", event, payload });
  // небольшое окно чтобы сообщение точно ушло перед закрытием
  setTimeout(() => { supabase.removeChannel(ch); }, 200);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const myId = user?.id ?? null;

  const [incoming, setIncoming] = useState<IncomingState | null>(null);
  const [active, setActive] = useState<ActiveState | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringRef = useRef<HTMLAudioElement | null>(null);

  // === Привязка видео-элементов к стримам ===
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [active?.status, active?.mode]);

  const attachRemote = useCallback((s: MediaStream) => {
    remoteStreamRef.current = s;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = s;
  }, []);

  // === Завершение звонка / очистка ===
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* ignore */ }
      pcRef.current = null;
    }
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    setMuted(false);
    setCamOff(false);
  }, []);

  const endCall = useCallback(async (reason: "ended" | "declined" = "ended") => {
    const peerId = active?.peer.id ?? incoming?.peer.id;
    const callId = active?.callId ?? incoming?.callId;
    if (peerId && callId && myId) {
      sendTo(peerId, "end", { fromId: myId, callId, reason } satisfies EndPayload).catch(() => {});
    }
    cleanup();
    setActive(null);
    setIncoming(null);
  }, [active, incoming, myId, cleanup]);

  // === Слушаем входящие на свой канал ===
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`call:${myId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        const p = payload as OfferPayload;
        if (active || incoming) {
          // занят
          sendTo(p.fromId, "end", { fromId: myId, callId: p.callId, reason: "busy" } satisfies EndPayload).catch(() => {});
          return;
        }
        setIncoming({
          peer: { id: p.fromId, name: p.fromName, avatarUrl: p.fromAvatar },
          mode: p.mode,
          sdp: p.sdp,
          callId: p.callId,
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        const p = payload as AnswerPayload;
        if (!pcRef.current || !active || p.callId !== active.callId) return;
        try {
          await pcRef.current.setRemoteDescription(p.sdp);
          for (const c of pendingIceRef.current) {
            await pcRef.current.addIceCandidate(c).catch(() => {});
          }
          pendingIceRef.current = [];
        } catch (e) {
          console.error("answer error", e);
        }
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        const p = payload as IcePayload;
        if (!pcRef.current || !active || p.callId !== active.callId) return;
        if (!pcRef.current.remoteDescription) {
          pendingIceRef.current.push(p.candidate);
          return;
        }
        await pcRef.current.addIceCandidate(p.candidate).catch(() => {});
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        const p = payload as EndPayload;
        const matchActive = active && p.callId === active.callId;
        const matchIncoming = incoming && p.callId === incoming.callId;
        if (!matchActive && !matchIncoming) return;
        if (p.reason === "busy") toast.info("Абонент занят");
        else if (p.reason === "declined") toast.info("Звонок отклонён");
        cleanup();
        setActive(null);
        setIncoming(null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, active, incoming, cleanup]);

  // === Рингтон при входящем ===
  useEffect(() => {
    if (!incoming) {
      ringRef.current?.pause();
      return;
    }
    // короткий бип-цикл через data URI silence невозможен, используем веб-аудио
    const audio = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
    );
    audio.loop = true;
    audio.volume = 0.6;
    audio.play().catch(() => {});
    ringRef.current = audio;
    return () => { audio.pause(); };
  }, [incoming]);

  // === Инициировать звонок (caller) ===
  const startCall = useCallback(async (peer: PeerInfo, mode: CallMode) => {
    if (!myId) return;
    if (active || incoming) {
      toast.info("Завершите текущий звонок");
      return;
    }
    const callId = crypto.randomUUID();
    let stream: MediaStream;
    try {
      stream = await getLocalStream(mode);
    } catch {
      toast.error("Нет доступа к микрофону/камере");
      return;
    }
    localStreamRef.current = stream;

    const pc = createPeer(stream, {
      onIce: (candidate) => {
        sendTo(peer.id, "ice", { fromId: myId, candidate, callId } satisfies IcePayload).catch(() => {});
      },
      onRemoteStream: attachRemote,
      onConnected: () => setActive((s) => (s ? { ...s, status: "connected" } : s)),
      onDisconnected: () => {
        cleanup();
        setActive(null);
      },
    });
    pcRef.current = pc;

    setActive({ peer, mode, callId, role: "caller", status: "calling" });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const meName =
        (user?.user_metadata as { display_name?: string; full_name?: string } | undefined)?.display_name ??
        (user?.user_metadata as { display_name?: string; full_name?: string } | undefined)?.full_name ??
        user?.email?.split("@")[0] ??
        "Игрок";

      await sendTo(peer.id, "offer", {
        fromId: myId,
        fromName: meName,
        fromAvatar: (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null,
        sdp: offer,
        mode,
        callId,
      } satisfies OfferPayload);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось дозвониться");
      cleanup();
      setActive(null);
    }
  }, [myId, user, active, incoming, attachRemote, cleanup]);

  // === Принять входящий (callee) ===
  const acceptIncoming = useCallback(async () => {
    if (!incoming || !myId) return;
    let stream: MediaStream;
    try {
      stream = await getLocalStream(incoming.mode);
    } catch {
      toast.error("Нет доступа к микрофону/камере");
      await endCall("declined");
      return;
    }
    localStreamRef.current = stream;

    const pc = createPeer(stream, {
      onIce: (candidate) => {
        sendTo(incoming.peer.id, "ice", { fromId: myId, candidate, callId: incoming.callId } satisfies IcePayload).catch(() => {});
      },
      onRemoteStream: attachRemote,
      onConnected: () => setActive((s) => (s ? { ...s, status: "connected" } : s)),
      onDisconnected: () => {
        cleanup();
        setActive(null);
      },
    });
    pcRef.current = pc;

    setActive({
      peer: incoming.peer,
      mode: incoming.mode,
      callId: incoming.callId,
      role: "callee",
      status: "connected",
    });

    try {
      await pc.setRemoteDescription(incoming.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      for (const c of pendingIceRef.current) await pc.addIceCandidate(c).catch(() => {});
      pendingIceRef.current = [];
      await sendTo(incoming.peer.id, "answer", {
        fromId: myId,
        sdp: answer,
        callId: incoming.callId,
      } satisfies AnswerPayload);
      setIncoming(null);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка соединения");
      await endCall("ended");
    }
  }, [incoming, myId, attachRemote, cleanup, endCall]);

  // === Контролы ===
  const toggleMute = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const newMuted = !muted;
    s.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    setMuted(newMuted);
  };
  const toggleCam = () => {
    const s = localStreamRef.current;
    if (!s) return;
    const newOff = !camOff;
    s.getVideoTracks().forEach((t) => (t.enabled = !newOff));
    setCamOff(newOff);
  };

  return (
    <Ctx.Provider value={{ startCall }}>
      {children}

      {/* Аудио элемент для звука собеседника (всегда смонтирован) */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Входящий звонок */}
      <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) endCall("declined"); }}>
        <DialogContent className="max-w-sm">
          {incoming && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                {incoming.peer.avatarUrl ? <AvatarImage src={incoming.peer.avatarUrl} /> : null}
                <AvatarFallback className="text-xl">{initials(incoming.peer.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-semibold">{incoming.peer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Входящий {incoming.mode === "video" ? "видеозвонок" : "звонок"}…
                </p>
              </div>
              <div className="flex w-full justify-around pt-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14 p-0"
                  onClick={() => endCall("declined")}
                  aria-label="Отклонить"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full h-14 w-14 p-0 bg-green-600 hover:bg-green-700 text-white"
                  onClick={acceptIncoming}
                  aria-label="Принять"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Активный звонок */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) endCall("ended"); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-black text-white">
          {active && (
            <div className="relative flex h-[80vh] flex-col">
              {/* Видео собеседника */}
              {active.mode === "video" ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-32 w-32">
                      {active.peer.avatarUrl ? <AvatarImage src={active.peer.avatarUrl} /> : null}
                      <AvatarFallback className="text-3xl">{initials(active.peer.name)}</AvatarFallback>
                    </Avatar>
                    <p className="text-xl font-semibold">{active.peer.name}</p>
                    <p className="text-sm text-white/70">
                      {active.status === "calling" ? "Вызов…" : "Аудиозвонок"}
                    </p>
                  </div>
                </div>
              )}

              {/* Превью своей камеры */}
              {active.mode === "video" && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-24 right-4 h-32 w-24 rounded-xl border-2 border-white/30 bg-black object-cover shadow-lg"
                />
              )}

              {/* Шапка */}
              <div className="relative z-10 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent p-4">
                <Avatar className="h-10 w-10">
                  {active.peer.avatarUrl ? <AvatarImage src={active.peer.avatarUrl} /> : null}
                  <AvatarFallback>{initials(active.peer.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{active.peer.name}</p>
                  <p className="text-xs text-white/70">
                    {active.status === "calling" ? "Вызов…" :
                     active.status === "connected" ? "В разговоре" : "Соединение…"}
                  </p>
                </div>
              </div>

              {/* Контролы */}
              <div className="relative z-10 mt-auto flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent p-6">
                <Button
                  size="lg"
                  variant={muted ? "default" : "secondary"}
                  className="rounded-full h-12 w-12 p-0"
                  onClick={toggleMute}
                  aria-label="Микрофон"
                >
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                {active.mode === "video" && (
                  <Button
                    size="lg"
                    variant={camOff ? "default" : "secondary"}
                    className="rounded-full h-12 w-12 p-0"
                    onClick={toggleCam}
                    aria-label="Камера"
                  >
                    {camOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14 p-0"
                  onClick={() => endCall("ended")}
                  aria-label="Завершить"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
