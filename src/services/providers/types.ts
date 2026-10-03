// Integration contracts. UI depends only on these interfaces; real vendors plug in via registry.ts.
import type { SessionComment, TranscriptLine } from "./../types";

export type ProviderResult<T> = Promise<T>;

export interface VideoConnection {
  localStream: MediaStream | null;
  mediaError?: string;
  setAudio(on: boolean): void;
  setVideo(on: boolean): void;
  leave(): void;
  onRemoteJoin(cb: (name: string) => void): () => void;
  onChat(cb: (m: ChatMessage) => void): () => void;
  sendChat(text: string): void;
}
export interface ChatMessage { id: string; from: "me" | "them"; text: string; at: string }
export interface VideoProvider {
  readonly name: string;
  createRoom(sessionId: string): ProviderResult<{ roomId: string }>;
  join(roomId: string, opts: { video: boolean; audio: boolean; displayName: string; remoteName: string }): ProviderResult<VideoConnection>;
}

export interface TranscriptionProvider {
  readonly name: string;
  start(sessionId: string, onLine: (l: TranscriptLine) => void): void;
  stop(): void;
}

export interface PaymentOrder { orderId: string; amount: number; currency: "INR"; paymentId: string }
export interface PaymentResult { status: "success" | "failed" | "cancelled"; txn?: string; reason?: string }
export interface PaymentProvider {
  readonly name: string;
  createOrder(paymentId: string, amount: number): ProviderResult<PaymentOrder>;
  checkout(order: PaymentOrder, method: "upi" | "card" | "netbanking", upiId?: string): ProviderResult<PaymentResult>;
}

export interface CalendarProvider {
  readonly name: string;
  connect(): ProviderResult<{ connected: boolean; account: string }>;
  syncEvent(e: { id: string; title: string; start: string; durationMin: number }): ProviderResult<{ externalId: string }>;
  removeEvent(externalId: string): ProviderResult<void>;
}

export interface UploadedFile { key: string; name: string; size: number; type: string }
export interface StorageProvider {
  readonly name: string;
  upload(file: File, onProgress: (pct: number) => void): ProviderResult<UploadedFile>;
  getSignedUrl(key: string): ProviderResult<{ url: string; expiresInSec: number }>;
}

export interface NotificationPayload { channel: "email" | "sms" | "whatsapp" | "push"; to: string; template: string; data?: Record<string, string> }
export interface NotificationProvider {
  readonly name: string;
  send(p: NotificationPayload): ProviderResult<{ id: string; status: "queued" | "sent" }>;
}

export type { SessionComment };
