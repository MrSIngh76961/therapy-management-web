import { createMockTranscription, mockCalendar, mockNotifications, mockPayment, mockStorage, mockVideo } from "./mock";
import type * as P from "./types";

/** Swap implementations here (or via env) to plug in Twilio/Daily, Razorpay, Google Calendar, S3, SES, etc. */
export const providers = {
  video: mockVideo as P.VideoProvider,
  transcription: () => createMockTranscription() as P.TranscriptionProvider,
  payment: mockPayment as P.PaymentProvider,
  calendar: mockCalendar as P.CalendarProvider,
  storage: mockStorage as P.StorageProvider,
  notification: mockNotifications as P.NotificationProvider,
};
export * from "./types";
