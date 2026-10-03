import type { TranscriptLine } from "../types";
import { uid } from "@/lib/format";
import type * as P from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = () => new Date().toISOString();

export const mockVideo: P.VideoProvider = {
  name: "Mock video (browser camera preview)",
  async createRoom(sessionId) { await wait(200); return { roomId: `room_${sessionId}` }; },
  async join(_room, opts) {
    let stream: MediaStream | null = null;
    let mediaError: string | undefined;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ video: opts.video, audio: opts.audio }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]);
      }
      catch { mediaError = "Camera/microphone unavailable or permission denied. Continuing in preview mode."; }
    }
    const chat = new Set<(m: P.ChatMessage) => void>();
    const joins = new Set<(n: string) => void>();
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => joins.forEach((f) => f(opts.remoteName)), 1800));
    const replies = ["Sure, I can see that.", "Thanks for sharing — let us explore that.", "Noted. We will come back to this.", "Take your time."];
    let r = 0;
    return {
      localStream: stream, mediaError,
      setAudio: (on) => stream?.getAudioTracks().forEach((t) => (t.enabled = on)),
      setVideo: (on) => stream?.getVideoTracks().forEach((t) => (t.enabled = on)),
      leave: () => { timers.forEach(clearTimeout); stream?.getTracks().forEach((t) => t.stop()); chat.clear(); joins.clear(); },
      onRemoteJoin: (cb) => { joins.add(cb); return () => joins.delete(cb); },
      onChat: (cb) => { chat.add(cb); return () => chat.delete(cb); },
      sendChat: (text) => {
        chat.forEach((f) => f({ id: uid("m"), from: "me", text, at: clock() }));
        timers.push(setTimeout(() => chat.forEach((f) => f({ id: uid("m"), from: "them", text: replies[r++ % replies.length], at: clock() })), 1500));
      },
    };
  },
};

const script: [TranscriptLine["speaker"], string][] = [
  ["therapist", "Let us begin with a quick check-in. How are you feeling today?"],
  ["client", "A bit anxious, but better than last week."],
  ["therapist", "What has changed since last week?"],
  ["client", "I have been using the breathing exercise before meetings."],
  ["therapist", "That is excellent progress. Let us review how it felt."],
  ["client", "Calmer, though my mind still wandered sometimes."],
];
export function createMockTranscription(): P.TranscriptionProvider {
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    name: "Mock transcription",
    start(_s, onLine) {
      let i = 0; const t0 = Date.now();
      timer = setInterval(() => {
        const [speaker, text] = script[i % script.length]; i++;
        const s = Math.round((Date.now() - t0) / 1000);
        onLine({ id: uid("l"), speaker, text, at: `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` });
      }, 4500);
    },
    stop() { if (timer) clearInterval(timer); },
  };
}

export const mockPayment: P.PaymentProvider = {
  name: "Mock Razorpay / UPI",
  async createOrder(paymentId, amount) { await wait(300); return { orderId: uid("order"), amount, currency: "INR", paymentId }; },
  async checkout(order, method, upiId) {
    await wait(1600);
    if (method === "upi" && upiId && !/^[\w.-]+@[\w]+$/.test(upiId)) return { status: "failed", reason: "Invalid UPI ID" };
    return { status: "success", txn: `pay_${order.orderId.slice(-8)}` };
  },
};

export const mockCalendar: P.CalendarProvider = {
  name: "Mock calendar",
  async connect() { await wait(500); return { connected: true, account: "demo@calendar.local" }; },
  async syncEvent(e) { await wait(300); return { externalId: `evt_${e.id}` }; },
  async removeEvent() { await wait(200); },
};

export const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"] as const;
export const MAX_FILE_MB = 10;
export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_EXT as readonly string[]).includes(ext)) return "Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint.";
  if (file.size > MAX_FILE_MB * 1048576) return `File is larger than ${MAX_FILE_MB} MB.`;
  return null;
}
export const mockStorage: P.StorageProvider = {
  name: "Mock storage",
  async upload(file, onProgress) {
    for (let p = 10; p <= 100; p += 15) { await wait(150); onProgress(Math.min(p, 100)); }
    return { key: `mock/${uid("f")}/${file.name}`, name: file.name, size: file.size, type: file.type };
  },
  async getSignedUrl(key) { await wait(200); return { url: `#signed:${key}`, expiresInSec: 300 }; },
};

export const mockNotifications: P.NotificationProvider = {
  name: "Mock notifications",
  async send() { await wait(400); return { id: uid("msg"), status: "queued" }; },
};
