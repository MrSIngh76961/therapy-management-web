export type Role = "admin" | "therapist" | "client";

export type OnboardingStatus = "invited" | "consent_pending" | "consent_provided";
export type RegistrationStatus = "not_registered" | "registered";
export type SessionStatus = "scheduled" | "link_shared" | "joined" | "live" | "completed" | "cancelled" | "no_show";
export type SessionMode = "video" | "audio" | "in_person";

export interface Therapist {
  id: string; name: string; email: string; phone: string; specialization: string; license: string;
  experience: number; fee: number; status: "active" | "pending" | "suspended" | "inactive";
  rating: number; clientCount: number; joined: string; bio?: string; languages?: string;
}
export interface Client {
  id: string; name: string; email: string; phone: string; age: number; gender: string;
  therapistId: string; therapistName: string;
  onboarding: OnboardingStatus; registration: RegistrationStatus;
  status: "active" | "inactive" | "archived"; joined: string; lastSession?: string; accountId?: string; notes?: string;
}
export interface Service {
  id: string; name: string; category: string; duration: number; price: number; gst: number;
  mode: SessionMode | "any"; status: "active" | "inactive"; description?: string;
}
export interface TranscriptLine { id: string; speaker: "therapist" | "client"; at: string; text: string }
export interface SessionComment { id: string; at: string; text: string; visibility: "private" | "shared" }
export interface Appointment {
  id: string; clientId: string; clientName: string; therapistId: string; therapistName: string;
  serviceId: string; serviceName: string; start: string; duration: number; mode: SessionMode;
  status: SessionStatus; fee: number; token: string; calendarSynced: boolean; notes?: string;
  summary?: string; transcript?: TranscriptLine[]; comments?: SessionComment[]; paymentStatus: "paid" | "pending" | "unpaid";
}
export interface Payment {
  id: string; appointmentId?: string; clientId: string; clientName: string; therapistId: string; therapistName: string;
  amount: number; method: "UPI" | "Card" | "Netbanking" | "Cash"; status: "paid" | "pending" | "failed";
  date: string; txn: string; invoiceId?: string;
}
export interface InvoiceItem { description: string; qty: number; rate: number }
export interface Invoice {
  id: string; no: string; kind: "receipt" | "tax_invoice"; status: "draft" | "sent" | "paid" | "overdue" | "void";
  paymentStatus: "paid" | "unpaid" | "partial"; clientId: string; clientName: string; clientEmail: string;
  therapistId: string; therapistName: string; issueDate: string; dueDate: string; items: InvoiceItem[];
  gst: number; subtotal: number; tax: number; total: number; paymentId?: string; emailedAt?: string; notes?: string;
}
export interface InvoiceSeries {
  invoicePrefix: string; receiptPrefix: string; startCounter: number; nextCounter: number; padding: number; includeYear: boolean; resetYearly: boolean;
}
export interface ClinicUser { id: string; name: string; email: string; role: string; status: "active" | "pending" | "inactive"; lastLogin: string }
export interface AppNotification { id: string; audience: Role; title: string; body: string; type: "appointment" | "payment" | "consent" | "system" | "task" | "message"; read: boolean; time: string }
export interface Task {
  id: string; clientId: string; clientName: string; therapistId: string; title: string; description: string; due: string;
  status: "assigned" | "in_progress" | "completed" | "overdue"; response?: string; sessionId?: string;
}
export interface SharedDocument {
  id: string; name: string; ext: "pdf" | "docx" | "xlsx" | "pptx"; size: number; clientId: string; clientName: string; therapistId: string;
  uploadedBy: "therapist" | "client"; date: string; permission: "view" | "download"; sessionId?: string;
}
export interface Feedback {
  id: string; sessionId: string; clientId: string; clientName: string; therapistId: string; rating: number; comment: string; date: string; reply?: string;
}
export interface Consent {
  id: string; clientId: string; clientName: string; therapistId: string; type: string; status: "pending" | "provided" | "withdrawn";
  requestedAt: string; respondedAt?: string; channel: "secure_link" | "portal";
}
export interface Reminder { id: string; title: string; when: string; channel: "email" | "sms" | "whatsapp" | "in_app"; status: "scheduled" | "sent" | "paused"; appointmentId?: string; audience: "client" | "therapist" }
export interface TherapistLink { id: string; clientId: string; therapistId: string; therapistName: string; specialization: string; status: "newly_added" | "active" | "ended"; since: string }

export interface DaySchedule { day: string; enabled: boolean; slots: { start: string; end: string }[] }
export interface WorkingHours { days: DaySchedule[]; slotMinutes: number; bufferMinutes: number; timeOff: { id: string; date: string; reason: string }[] }
export interface ClinicSettings {
  name: string; email: string; phone: string; address: string; gstin: string; timezone: string; currency: string; website: string;
  cancellationHours: number; defaultReminderHours: number; logoUrl?: string;
  integrations: { video: string; transcription: string; payment: string; calendar: string; storage: string; notification: string };
}
export type PermissionMatrix = Record<string, Record<string, string[]>>;

export interface ListParams { q?: string; page?: number; pageSize?: number; sort?: string; dir?: "asc" | "desc"; [filter: string]: string | number | undefined }
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }

export interface SessionUser { id: string; name: string; email: string; role: Role; profileComplete: boolean; accessMode?: "account" | "secure_link" }

export type SessionJourney = { label: string; tone: "gray" | "blue" | "amber" | "green" | "wine" | "red" };
