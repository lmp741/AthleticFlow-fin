// Лёгкая обёртка над RTCPeerConnection для P2P аудио/видео звонков.
// Сигналинг внешний (Supabase Realtime broadcast).

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export type CallMode = "audio" | "video";

export interface CallHandlers {
  onIce: (candidate: RTCIceCandidateInit) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export async function getLocalStream(mode: CallMode): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
  });
}

export function createPeer(local: MediaStream, h: CallHandlers): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  for (const t of local.getTracks()) pc.addTrack(t, local);

  const remote = new MediaStream();
  pc.ontrack = (e) => {
    for (const t of e.streams[0]?.getTracks() ?? [e.track]) {
      if (!remote.getTracks().includes(t)) remote.addTrack(t);
    }
    h.onRemoteStream(remote);
  };
  pc.onicecandidate = (e) => {
    if (e.candidate) h.onIce(e.candidate.toJSON());
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") h.onConnected?.();
    if (["disconnected", "failed", "closed"].includes(pc.connectionState)) h.onDisconnected?.();
  };
  return pc;
}

export function stopStream(s: MediaStream | null) {
  if (!s) return;
  for (const t of s.getTracks()) t.stop();
}
