import type * as T from "../types";

const base = new Date();
base.setSeconds(0, 0);
export const at = (day: number, h = 10, m = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const ME = { therapistId: "t1", therapistName: "Dr. Aisha Sharma", clientId: "c1", clientName: "Riya Mehta" };

const th = (id: string, name: string, spec: string, status: T.Therapist["status"], exp: number, fee: number, rating: number, clients: number): T.Therapist => ({
  id, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^dr\./, "")}@theraflow.in`, phone: "+91 98" + (10000000 + exp * 123457).toString().slice(0, 8),
  specialization: spec, license: `RCI/${2010 + exp}/${1000 + exp * 7}`, experience: exp, fee, status, rating, clientCount: clients, joined: at(-300 + exp * 20, 9),
  bio: "Compassionate practitioner focused on evidence-based, client-centred care.", languages: "English, Hindi",
});
export const therapists: T.Therapist[] = [
  th("t1", "Dr. Aisha Sharma", "Clinical Psychologist", "active", 9, 2500, 4.9, 6),
  th("t2", "Dr. Meera Kapoor", "CBT Specialist", "active", 7, 2500, 4.8, 4),
  th("t3", "Dr. Rahul Verma", "Couples Therapist", "active", 12, 3000, 4.7, 3),
  th("t4", "Dr. Simran Kaur", "Child Psychologist", "active", 6, 3500, 4.9, 3),
  th("t5", "Dr. Nikhil Rao", "Counselling Psychologist", "pending", 3, 1800, 0, 0),
  th("t6", "Dr. Priya Nair", "Trauma Therapist", "active", 8, 2800, 4.6, 2),
  th("t7", "Dr. Karan Malhotra", "Addiction Counsellor", "suspended", 5, 2000, 4.1, 1),
  th("t8", "Dr. Ananya Iyer", "Psychiatrist", "inactive", 14, 4000, 4.8, 0),
];

type Cl = [string, string, string, number, string, string, T.OnboardingStatus, T.RegistrationStatus, T.Client["status"]];
const clientRows: Cl[] = [
  ["c1", "Riya Mehta", "riya.mehta@mail.com", 29, "Female", "t1", "consent_provided", "registered", "active"],
  ["c2", "Arjun Kapoor", "arjun.k@mail.com", 34, "Male", "t1", "consent_provided", "registered", "active"],
  ["c3", "Kabir Singh", "kabir.singh@mail.com", 41, "Male", "t1", "consent_provided", "not_registered", "active"],
  ["c4", "Neha Gupta", "neha.gupta@mail.com", 26, "Female", "t1", "consent_pending", "not_registered", "active"],
  ["c5", "Sana Khan", "sana.khan@mail.com", 31, "Female", "t1", "invited", "not_registered", "active"],
  ["c6", "Vikram Joshi", "vikram.j@mail.com", 38, "Male", "t1", "consent_provided", "registered", "inactive"],
  ["c7", "Ishaan Roy", "ishaan.roy@mail.com", 17, "Male", "t4", "consent_provided", "registered", "active"],
  ["c8", "Tara Menon", "tara.menon@mail.com", 45, "Female", "t3", "consent_provided", "registered", "active"],
  ["c9", "Dev Patel", "dev.patel@mail.com", 52, "Male", "t3", "consent_pending", "not_registered", "active"],
  ["c10", "Maya Das", "maya.das@mail.com", 23, "Female", "t2", "consent_provided", "registered", "active"],
  ["c11", "Rohan Bhat", "rohan.bhat@mail.com", 36, "Male", "t2", "consent_provided", "registered", "archived"],
  ["c12", "Anita Pillai", "anita.pillai@mail.com", 58, "Female", "t6", "consent_provided", "registered", "active"],
];
export const clients: T.Client[] = clientRows.map(([id, name, email, age, gender, tid, onboarding, registration, status], i) => ({
  id, name, email, phone: `+91 9${(870000000 + i * 91731).toString().slice(0, 9)}`, age, gender, therapistId: tid,
  therapistName: therapists.find((t) => t.id === tid)!.name, onboarding, registration, status, joined: at(-200 + i * 12, 9),
  lastSession: onboarding === "invited" ? undefined : at(-(2 + i), 11), accountId: registration === "registered" ? `acc_${id}` : undefined,
}));

export const services: T.Service[] = [
  { id: "s1", name: "Individual Therapy (50 min)", category: "Therapy", duration: 50, price: 2500, gst: 18, mode: "any", status: "active", description: "One-on-one therapy session" },
  { id: "s2", name: "Initial Consultation", category: "Consultation", duration: 30, price: 1500, gst: 18, mode: "any", status: "active", description: "Intake and goal setting" },
  { id: "s3", name: "Couples Counselling", category: "Therapy", duration: 75, price: 3500, gst: 18, mode: "video", status: "active" },
  { id: "s4", name: "Child & Adolescent Therapy", category: "Therapy", duration: 45, price: 3000, gst: 18, mode: "any", status: "active" },
  { id: "s5", name: "Psychiatric Review", category: "Medical", duration: 20, price: 2000, gst: 18, mode: "any", status: "active" },
  { id: "s6", name: "Group Therapy Workshop", category: "Group", duration: 90, price: 900, gst: 18, mode: "video", status: "inactive" },
  { id: "s7", name: "Psychological Assessment", category: "Assessment", duration: 60, price: 4500, gst: 18, mode: "in_person", status: "active" },
];

const statuses: T.SessionStatus[] = ["completed", "completed", "completed", "completed", "cancelled", "no_show", "completed"];
const tr = (): T.TranscriptLine[] => [
  { id: "l1", speaker: "therapist", at: "00:12", text: "Welcome back. How has your week been since we last spoke?" },
  { id: "l2", speaker: "client", at: "00:25", text: "Better overall. The breathing exercises helped on two stressful days." },
  { id: "l3", speaker: "therapist", at: "01:10", text: "That is encouraging. What did you notice in your body when the stress started?" },
  { id: "l4", speaker: "client", at: "01:42", text: "Tight chest first, then racing thoughts about work deadlines." },
];
export const appointments: T.Appointment[] = [];
const people = clients.filter((c) => c.status !== "archived");
const mk = (n: number, day: number, hr: number, cl: T.Client, status: T.SessionStatus, mode: T.SessionMode = "video") => {
  const svc = services[n % 2 === 0 ? 0 : 1];
  const t = therapists.find((x) => x.id === cl.therapistId)!;
  appointments.push({
    id: `a${n}`, clientId: cl.id, clientName: cl.name, therapistId: t.id, therapistName: t.name, serviceId: svc.id, serviceName: svc.name,
    start: at(day, hr), duration: svc.duration, mode, status, fee: svc.price, token: `tok_${n}_${cl.id}x9`, calendarSynced: n % 3 === 0,
    paymentStatus: status === "completed" ? (n % 5 === 0 ? "pending" : "paid") : status === "cancelled" ? "unpaid" : "pending",
    ...(status === "completed" ? { summary: "Reviewed coping strategies, practised grounding, and agreed on a sleep-hygiene routine for the week.", transcript: tr(), comments: [{ id: `cm${n}`, at: at(day, hr + 1), text: "Good engagement. Anxiety triggers are mostly work related. Continue CBT thought records.", visibility: "private" }] } : {}),
  });
};
let n = 1;
people.forEach((cl, i) => {
  if (cl.onboarding === "invited") return;
  for (let k = 1; k <= 3; k++) mk(n++, -k * 6 - (i % 4), 9 + ((i + k) % 8), cl, statuses[(i + k) % statuses.length], k === 2 ? "audio" : "video");
});
// Upcoming & live
mk(n++, 0, 15, clients[0], "link_shared");
mk(n++, 0, 17, clients[1], "scheduled");
mk(n++, 1, 10, clients[2], "link_shared");
mk(n++, 1, 12, clients[3], "scheduled");
mk(n++, 2, 11, clients[4], "scheduled", "audio");
mk(n++, 3, 16, clients[0], "scheduled");
mk(n++, 4, 10, clients[7], "scheduled");
mk(n++, 5, 14, clients[9], "scheduled");
mk(n++, 0, 9, clients[1], "completed");
appointments.find((a) => a.id === `a${n - 1}`)!.paymentStatus = "paid";

export const payments: T.Payment[] = appointments
  .filter((a) => a.status === "completed" || a.paymentStatus === "pending")
  .slice(0, 24)
  .map((a, i) => ({
    id: `p${i + 1}`, appointmentId: a.id, clientId: a.clientId, clientName: a.clientName, therapistId: a.therapistId, therapistName: a.therapistName,
    amount: a.fee, method: (["UPI", "UPI", "Card", "Netbanking", "UPI"] as const)[i % 5],
    status: a.paymentStatus === "paid" ? "paid" : i % 7 === 0 ? "failed" : "pending",
    date: a.start, txn: `pay_${(900000 + i * 7731).toString(36).toUpperCase()}${i}`,
  }));

const mkInv = (i: number, p: T.Payment, status: T.Invoice["status"], kind: T.Invoice["kind"]): T.Invoice => {
  const c = clients.find((x) => x.id === p.clientId)!;
  const subtotal = Math.round(p.amount / 1.18);
  const tax = p.amount - subtotal;
  return {
    id: `inv${i}`, no: `${kind === "receipt" ? "RCP" : "INV"}-2026-${String(90 + i).padStart(4, "0")}`, kind, status,
    paymentStatus: status === "paid" ? "paid" : "unpaid", clientId: c.id, clientName: c.name, clientEmail: c.email, therapistId: p.therapistId, therapistName: p.therapistName,
    issueDate: p.date, dueDate: new Date(new Date(p.date).getTime() + 7 * 864e5).toISOString(), items: [{ description: "Therapy session", qty: 1, rate: subtotal }],
    gst: 18, subtotal, tax, total: p.amount, paymentId: p.id, emailedAt: status === "paid" || status === "sent" ? p.date : undefined,
  };
};
const invStatuses: T.Invoice["status"][] = ["paid", "paid", "sent", "overdue", "draft", "paid", "paid", "void", "paid", "sent"];
export const invoices: T.Invoice[] = payments.slice(0, 12).map((p, i) => {
  const inv = mkInv(i + 1, p, invStatuses[i % invStatuses.length], i % 3 === 0 ? "receipt" : "tax_invoice");
  p.invoiceId = inv.id;
  return inv;
});
export const invoiceSeries: T.InvoiceSeries = { invoicePrefix: "INV", receiptPrefix: "RCP", startCounter: 1, nextCounter: 102, padding: 4, includeYear: true, resetYearly: true };

export const users: T.ClinicUser[] = [
  { id: "u1", name: "Dr. Kavita Rao", email: "kavita@theraflow.in", role: "Owner", status: "active", lastLogin: at(0, 8) },
  { id: "u2", name: "Manish Arora", email: "manish@theraflow.in", role: "Admin", status: "active", lastLogin: at(-1, 17) },
  { id: "u3", name: "Pooja Singh", email: "pooja@theraflow.in", role: "Front Desk", status: "active", lastLogin: at(-2, 10) },
  { id: "u4", name: "Sandeep Nair", email: "sandeep@theraflow.in", role: "Billing", status: "pending", lastLogin: at(-30, 10) },
  { id: "u5", name: "Leena Thomas", email: "leena@theraflow.in", role: "Manager", status: "inactive", lastLogin: at(-60, 10) },
];
export const permissions: T.PermissionMatrix = Object.fromEntries(
  ["Owner", "Admin", "Manager", "Front Desk", "Billing"].map((r) => [r, Object.fromEntries(
    ["Therapists", "Clients", "Appointments", "Payments", "Invoices", "Reports", "Settings", "Users"].map((m) => [m,
      r === "Owner" ? ["view", "create", "edit", "delete"] : r === "Admin" ? ["view", "create", "edit"] :
      r === "Manager" ? (["Settings", "Users"].includes(m) ? [] : ["view", "edit"]) :
      r === "Front Desk" ? (["Clients", "Appointments"].includes(m) ? ["view", "create", "edit"] : ["view"].filter(() => m === "Therapists")) :
      (["Payments", "Invoices", "Reports"].includes(m) ? ["view", "create", "edit"] : []),
    ]))]),
);

const nf = (audience: T.Role, i: number, title: string, body: string, type: T.AppNotification["type"], read = false): T.AppNotification => ({ id: `n_${audience}_${i}`, audience, title, body, type, read, time: at(0, 9 - Math.min(i, 8), 30 - i) });
export const notifications: T.AppNotification[] = [
  nf("admin", 1, "New therapist awaiting approval", "Dr. Nikhil Rao submitted credentials for review.", "system"),
  nf("admin", 2, "Payment failed", "UPI payment from Kabir Singh failed — retry link sent.", "payment"),
  nf("admin", 3, "Invoice overdue", "INV-2026-0094 is 3 days overdue.", "payment"),
  nf("admin", 4, "Daily summary ready", "Yesterday: 14 sessions, ₹36,500 collected.", "system", true),
  nf("admin", 5, "Appointment cancelled", "Arjun Kapoor cancelled his 5 PM session.", "appointment", true),
  nf("therapist", 1, "Neha Gupta has not given consent", "DPDPA consent request is still pending.", "consent"),
  nf("therapist", 2, "Riya Mehta joined via secure link", "Session starts in 10 minutes.", "appointment"),
  nf("therapist", 3, "Task completed", "Arjun Kapoor completed 'Thought record — week 3'.", "task"),
  nf("therapist", 4, "New feedback received", "Riya left a 5-star rating.", "message", true),
  nf("therapist", 5, "Payment received", "₹2,500 received from Arjun Kapoor via UPI.", "payment", true),
  nf("client", 1, "Session reminder", "Your session with Dr. Aisha Sharma is today at 3:00 PM.", "appointment"),
  nf("client", 2, "New task assigned", "Please complete 'Sleep diary' before your next session.", "task"),
  nf("client", 3, "Receipt available", "Your receipt RCP-2026-0091 is ready to download.", "payment", true),
  nf("client", 4, "Document shared", "Dr. Aisha shared 'Grounding techniques.pdf'.", "message", true),
];

export const tasks: T.Task[] = [
  { id: "k1", clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", title: "Sleep diary (7 days)", description: "Record bedtime, wake time and quality each morning.", due: at(2, 20), status: "assigned" },
  { id: "k2", clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", title: "Thought record — week 3", description: "Log three situations and alternative thoughts.", due: at(-1, 20), status: "completed", response: "Completed all three. Noticed catastrophising at work." },
  { id: "k3", clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", title: "Box breathing twice daily", description: "4-4-4-4 breathing for 5 minutes, morning and evening.", due: at(-3, 20), status: "overdue" },
  { id: "k4", clientId: "c2", clientName: "Arjun Kapoor", therapistId: "t1", title: "Gratitude journal", description: "Three entries per day.", due: at(3, 20), status: "in_progress" },
  { id: "k5", clientId: "c3", clientName: "Kabir Singh", therapistId: "t1", title: "Trigger tracking sheet", description: "Note triggers and intensity (0-10).", due: at(5, 20), status: "assigned" },
];
export const documents: T.SharedDocument[] = [
  { id: "d1", name: "Grounding techniques.pdf", ext: "pdf", size: 482000, clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", uploadedBy: "therapist", date: at(-2, 12), permission: "download" },
  { id: "d2", name: "Weekly mood tracker.xlsx", ext: "xlsx", size: 96000, clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", uploadedBy: "therapist", date: at(-9, 12), permission: "download" },
  { id: "d3", name: "Work stress notes.docx", ext: "docx", size: 54000, clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", uploadedBy: "client", date: at(-4, 12), permission: "view" },
  { id: "d4", name: "CBT introduction.pptx", ext: "pptx", size: 2100000, clientId: "c2", clientName: "Arjun Kapoor", therapistId: "t1", uploadedBy: "therapist", date: at(-6, 12), permission: "view" },
];
export const feedback: T.Feedback[] = [
  { id: "f1", sessionId: "a1", clientId: "c1", clientName: "Riya Mehta", therapistId: "t1", rating: 5, comment: "Felt really heard. The grounding exercise was very useful.", date: at(-6, 13), reply: "Thank you Riya — glad it helped!" },
  { id: "f2", sessionId: "a4", clientId: "c2", clientName: "Arjun Kapoor", therapistId: "t1", rating: 4, comment: "Helpful, though I would like more worksheets.", date: at(-7, 13) },
  { id: "f3", sessionId: "a7", clientId: "c3", clientName: "Kabir Singh", therapistId: "t1", rating: 3, comment: "Audio kept dropping near the end.", date: at(-12, 13) },
];
export const consents: T.Consent[] = clients.filter((c) => c.therapistId === "t1").map((c, i) => ({
  id: `co${i + 1}`, clientId: c.id, clientName: c.name, therapistId: "t1", type: "DPDPA — Data processing & session recording",
  status: c.onboarding === "consent_provided" ? "provided" : "pending", requestedAt: at(-20 + i, 10),
  respondedAt: c.onboarding === "consent_provided" ? at(-19 + i, 10) : undefined, channel: c.registration === "registered" ? "portal" : "secure_link",
}));
export const reminders: T.Reminder[] = [
  { id: "r1", title: "Session with Riya Mehta — 24h before", when: at(-0, 15), channel: "email", status: "scheduled", appointmentId: "a22", audience: "client" },
  { id: "r2", title: "Session with Arjun Kapoor — 1h before", when: at(0, 16), channel: "whatsapp", status: "scheduled", audience: "client" },
  { id: "r3", title: "Write session notes for yesterday", when: at(0, 18), channel: "in_app", status: "scheduled", audience: "therapist" },
  { id: "r4", title: "Consent follow-up: Neha Gupta", when: at(1, 9), channel: "sms", status: "paused", audience: "therapist" },
];
export const therapistLinks: T.TherapistLink[] = [
  { id: "l1", clientId: "c1", therapistId: "t1", therapistName: "Dr. Aisha Sharma", specialization: "Clinical Psychologist", status: "active", since: at(-180) },
  { id: "l2", clientId: "c1", therapistId: "t2", therapistName: "Dr. Meera Kapoor", specialization: "CBT Specialist", status: "newly_added", since: at(-1) },
  { id: "l3", clientId: "c1", therapistId: "t6", therapistName: "Dr. Priya Nair", specialization: "Trauma Therapist", status: "ended", since: at(-400) },
];

export const workingHours: T.WorkingHours = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => ({
    day, enabled: i < 6, slots: i === 5 ? [{ start: "10:00", end: "14:00" }] : i < 5 ? [{ start: "09:00", end: "13:00" }, { start: "15:00", end: "19:00" }] : [],
  })),
  slotMinutes: 50, bufferMinutes: 10, timeOff: [{ id: "to1", date: at(12).slice(0, 10), reason: "Conference" }],
};
export const clinicSettings: T.ClinicSettings = {
  name: "TheraFlow Wellness Clinic", email: "hello@theraflow.in", phone: "+91 98765 43210", address: "12 Lodhi Road, New Delhi 110003", gstin: "07ABCDE1234F1Z5",
  timezone: "Asia/Kolkata", currency: "INR", website: "https://theraflow.in", cancellationHours: 24, defaultReminderHours: 24,
  integrations: { video: "mock", transcription: "mock", payment: "mock", calendar: "mock", storage: "mock", notification: "mock" },
};
