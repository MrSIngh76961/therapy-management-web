import { ApiError, type ApiClient } from "../http";
import type * as T from "../types";
import * as db from "./db";
import { uid } from "@/lib/format";

export const mockControl = { fail: false, latency: 350, listeners: new Set<() => void>() };
export const setMockFail = (v: boolean) => { mockControl.fail = v; mockControl.listeners.forEach((l) => l()); };

type Row = { id: string } & Record<string, unknown>;
const collections: Record<string, { rows: Row[]; search: string[]; dateField?: string; prepend?: boolean }> = {
  therapists: { rows: db.therapists as unknown as Row[], search: ["name", "email", "specialization"], dateField: "joined" },
  clients: { rows: db.clients as unknown as Row[], search: ["name", "email", "therapistName", "phone"], dateField: "joined" },
  services: { rows: db.services as unknown as Row[], search: ["name", "category"] },
  appointments: { rows: db.appointments as unknown as Row[], search: ["clientName", "therapistName", "serviceName"], dateField: "start" },
  payments: { rows: db.payments as unknown as Row[], search: ["clientName", "therapistName", "txn"], dateField: "date" },
  invoices: { rows: db.invoices as unknown as Row[], search: ["no", "clientName", "therapistName"], dateField: "issueDate" },
  users: { rows: db.users as unknown as Row[], search: ["name", "email", "role"] },
  notifications: { rows: db.notifications as unknown as Row[], search: ["title", "body"], dateField: "time" },
  tasks: { rows: db.tasks as unknown as Row[], search: ["title", "clientName"], dateField: "due" },
  documents: { rows: db.documents as unknown as Row[], search: ["name", "clientName"], dateField: "date" },
  feedback: { rows: db.feedback as unknown as Row[], search: ["comment", "clientName"], dateField: "date" },
  consents: { rows: db.consents as unknown as Row[], search: ["clientName", "type"], dateField: "requestedAt" },
  reminders: { rows: db.reminders as unknown as Row[], search: ["title"], dateField: "when" },
  "therapist-links": { rows: db.therapistLinks as unknown as Row[], search: ["therapistName", "specialization"] },
};
const col = (name: string) => {
  const c = collections[name];
  if (!c) throw new ApiError(404, `Unknown resource ${name}`);
  return c;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <V,>(v: V): V => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const RESERVED = new Set(["q", "page", "pageSize", "sort", "dir", "from", "to", "scope"]);

function list(name: string, p: Record<string, unknown>): T.Paged<unknown> | unknown[] {
  const c = col(name);
  let rows = c.rows.slice();
  const q = String(p.q ?? "").trim().toLowerCase();
  if (q) rows = rows.filter((r) => c.search.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
  for (const [k, v] of Object.entries(p)) {
    if (RESERVED.has(k) || v === undefined || v === "") continue;
    rows = rows.filter((r) => String(r[k]) === String(v));
  }
  if (c.dateField) {
    const f = c.dateField;
    if (p.from) rows = rows.filter((r) => String(r[f]) >= String(p.from));
    if (p.to) rows = rows.filter((r) => String(r[f]) <= String(p.to));
    const now = new Date().toISOString();
    if (p.scope === "upcoming") rows = rows.filter((r) => String(r[f]) >= now.slice(0, 10) && !["completed", "cancelled", "no_show"].includes(String(r.status)));
    if (p.scope === "past") rows = rows.filter((r) => String(r[f]) < now.slice(0, 10) || ["completed", "cancelled", "no_show"].includes(String(r.status)));
  }
  const sort = (p.sort as string) ?? c.dateField;
  if (sort) {
    const dir = (p.dir ?? (p.sort ? "asc" : "desc")) === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const x = a[sort] as string | number, y = b[sort] as string | number;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true })) * dir;
    });
  }
  if (!p.page) return clone(rows);
  const pageSize = Number(p.pageSize ?? 8), page = Number(p.page);
  return { items: clone(rows.slice((page - 1) * pageSize, page * pageSize)), total: rows.length, page, pageSize };
}

const money = (items: T.InvoiceItem[], gst: number) => {
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = Math.round((subtotal * gst) / 100);
  return { subtotal, tax, total: subtotal + tax };
};
const nextNo = (kind: T.Invoice["kind"]) => {
  const s = db.invoiceSeries;
  const no = `${kind === "receipt" ? s.receiptPrefix : s.invoicePrefix}${s.includeYear ? `-${new Date().getFullYear()}` : ""}-${String(s.nextCounter).padStart(s.padding, "0")}`;
  s.nextCounter += 1;
  return no;
};
const day = (iso: string) => iso.slice(0, 10);

function analytics(range: number) {
  const since = new Date(Date.now() - range * 864e5).toISOString();
  const appts = db.appointments.filter((a) => a.start >= since && a.start <= new Date(Date.now() + 14 * 864e5).toISOString());
  const pays = db.payments.filter((p) => p.date >= since);
  const bucket = range <= 7 ? 1 : range <= 30 ? 5 : 15;
  const series: { label: string; appointments: number; revenue: number; completed: number }[] = [];
  for (let i = range; i > 0; i -= bucket) {
    const from = new Date(Date.now() - i * 864e5), to = new Date(Date.now() - (i - bucket) * 864e5);
    const inB = (d: string) => d >= from.toISOString() && d < to.toISOString();
    series.push({
      label: from.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      appointments: db.appointments.filter((a) => inB(a.start)).length,
      completed: db.appointments.filter((a) => inB(a.start) && a.status === "completed").length,
      revenue: db.payments.filter((p) => inB(p.date) && p.status === "paid").reduce((s, p) => s + p.amount, 0),
    });
  }
  const count = (st: string) => appts.filter((a) => a.status === st).length;
  const byStatus = ["completed", "scheduled", "link_shared", "cancelled", "no_show"].map((s) => ({ name: s, value: count(s) })).filter((s) => s.value > 0);
  const byTherapist = db.therapists.filter((t) => t.status === "active").map((t) => ({
    name: t.name.replace("Dr. ", ""), sessions: appts.filter((a) => a.therapistId === t.id && a.status === "completed").length,
    revenue: pays.filter((p) => p.therapistId === t.id && p.status === "paid").reduce((s, p) => s + p.amount, 0),
  }));
  const paid = pays.filter((p) => p.status === "paid");
  const byMethod = ["UPI", "Card", "Netbanking", "Cash"].map((m) => ({ name: m, value: paid.filter((p) => p.method === m).length })).filter((m) => m.value);
  const finished = appts.filter((a) => ["completed", "cancelled", "no_show"].includes(a.status)).length || 1;
  return {
    totals: {
      appointments: appts.length, revenue: paid.reduce((s, p) => s + p.amount, 0), pending: db.payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0),
      activeClients: db.clients.filter((c) => c.status === "active").length, activeTherapists: db.therapists.filter((t) => t.status === "active").length,
      completionRate: Math.round((count("completed") / finished) * 100), sessions: count("completed"),
      newClients: db.clients.filter((c) => c.joined >= since).length, overdueInvoices: db.invoices.filter((i) => i.status === "overdue").length,
    },
    series, byStatus, byTherapist, byMethod,
    clientActivity: [
      { name: "Active", value: db.clients.filter((c) => c.status === "active").length },
      { name: "Inactive", value: db.clients.filter((c) => c.status === "inactive").length },
      { name: "Archived", value: db.clients.filter((c) => c.status === "archived").length },
    ],
  };
}

type Handler = (ctx: { params: Record<string, string>; query: Record<string, unknown>; body: any }) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
const routes: { method: string; parts: string[]; fn: Handler }[] = [];
const on = (method: string, path: string, fn: Handler) => routes.push({ method, parts: path.split("/").filter(Boolean), fn });
const find = (a: { id: string }[], id: string) => {
  const r = a.find((x) => x.id === id);
  if (!r) throw new ApiError(404, "Not found");
  return r;
};

on("GET", "/analytics", ({ query }) => analytics(Number(query.range ?? 30)));
on("GET", "/settings/clinic", () => clone(db.clinicSettings));
on("PUT", "/settings/clinic", ({ body }) => Object.assign(db.clinicSettings, body));
on("GET", "/settings/invoice-series", () => clone(db.invoiceSeries));
on("PUT", "/settings/invoice-series", ({ body }) => {
  if (body.nextCounter < body.startCounter) throw new ApiError(422, "Next counter cannot be lower than the starting counter");
  return Object.assign(db.invoiceSeries, body);
});
on("GET", "/settings/permissions", () => clone(db.permissions));
on("PUT", "/settings/permissions", ({ body }) => { Object.assign(db.permissions, body); return clone(db.permissions); });
on("GET", "/therapist/working-hours", () => clone(db.workingHours));
on("PUT", "/therapist/working-hours", ({ body }) => Object.assign(db.workingHours, body));

on("POST", "/invoices", ({ body }) => {
  const { subtotal, tax, total } = money(body.items, body.gst);
  const client = find(db.clients, body.clientId) as T.Client;
  const inv: T.Invoice = {
    id: uid("inv"), no: nextNo(body.kind), kind: body.kind, status: body.status ?? "draft", paymentStatus: body.status === "paid" ? "paid" : "unpaid",
    clientId: client.id, clientName: client.name, clientEmail: client.email, therapistId: client.therapistId, therapistName: client.therapistName,
    issueDate: body.issueDate, dueDate: body.dueDate, items: body.items, gst: body.gst, subtotal, tax, total, notes: body.notes,
  };
  db.invoices.unshift(inv);
  return clone(inv);
});
on("POST", "/invoices/:id/email", ({ params }) => {
  const inv = find(db.invoices, params.id) as T.Invoice;
  inv.emailedAt = new Date().toISOString();
  if (inv.status === "draft") inv.status = "sent";
  return clone(inv);
});
on("POST", "/invoices/:id/pdf", ({ params }) => ({ filename: `${(find(db.invoices, params.id) as T.Invoice).no}.pdf` }));
on("POST", "/payments/:id/document", ({ params, body }) => {
  const p = find(db.payments, params.id) as T.Payment;
  if (p.status !== "paid") throw new ApiError(422, "Documents can only be generated for successful payments");
  const existing = db.invoices.find((i) => i.paymentId === p.id);
  const client = find(db.clients, p.clientId) as T.Client;
  const subtotal = Math.round(p.amount / 1.18);
  const inv: T.Invoice = {
    id: existing?.id ?? uid("inv"), no: existing && existing.kind === body.kind ? existing.no : nextNo(body.kind), kind: body.kind, status: "paid", paymentStatus: "paid",
    clientId: client.id, clientName: client.name, clientEmail: client.email, therapistId: p.therapistId, therapistName: p.therapistName,
    issueDate: p.date, dueDate: p.date, items: [{ description: "Therapy session", qty: 1, rate: subtotal }], gst: 18, subtotal, tax: p.amount - subtotal, total: p.amount, paymentId: p.id,
  };
  if (existing) db.invoices[db.invoices.indexOf(existing)] = inv; else db.invoices.unshift(inv);
  p.invoiceId = inv.id;
  return clone(inv);
});
on("POST", "/payments/:id/pay", ({ params }) => {
  const p = find(db.payments, params.id) as T.Payment;
  p.status = "paid"; p.date = new Date().toISOString();
  const a = db.appointments.find((x) => x.id === p.appointmentId);
  if (a) a.paymentStatus = "paid";
  return clone(p);
});
on("POST", "/appointments/:id/share-link", ({ params }) => {
  const a = find(db.appointments, params.id) as T.Appointment;
  if (a.status === "scheduled") a.status = "link_shared";
  return { url: `/join/${a.token}`, appointment: clone(a) };
});
on("POST", "/appointments/:id/complete", ({ params, body }) => {
  const a = find(db.appointments, params.id) as T.Appointment;
  a.status = "completed";
  if (body?.summary) a.summary = body.summary;
  a.transcript = body?.transcript?.length ? body.transcript : a.transcript;
  if (body?.comment) (a.comments ??= []).unshift({ id: uid("cm"), at: new Date().toISOString(), text: body.comment, visibility: body.visibility ?? "private" });
  const c = db.clients.find((x) => x.id === a.clientId);
  if (c) c.lastSession = a.start;
  return clone(a);
});
on("POST", "/appointments/:id/comments", ({ params, body }) => {
  const a = find(db.appointments, params.id) as T.Appointment;
  (a.comments ??= []).unshift({ id: uid("cm"), at: new Date().toISOString(), text: body.text, visibility: body.visibility });
  return clone(a);
});
on("POST", "/appointments", ({ body }) => {
  const c = find(db.clients, body.clientId) as T.Client;
  const s = find(db.services, body.serviceId) as T.Service;
  const t = find(db.therapists, body.therapistId ?? c.therapistId) as T.Therapist;
  const a: T.Appointment = {
    id: uid("a"), clientId: c.id, clientName: c.name, therapistId: t.id, therapistName: t.name, serviceId: s.id, serviceName: s.name,
    start: new Date(body.start).toISOString(), duration: s.duration, mode: body.mode, status: "scheduled", fee: s.price, token: `tok_${uid("")}`,
    calendarSynced: false, notes: body.notes, paymentStatus: "pending",
  };
  db.appointments.unshift(a);
  return clone(a);
});
on("POST", "/clients/invite", ({ body }) => {
  const t = find(db.therapists, body.therapistId) as T.Therapist;
  const c: T.Client = {
    id: uid("c"), name: body.name, email: body.email, phone: body.phone ?? "", age: Number(body.age) || 0, gender: body.gender ?? "Other", therapistId: t.id, therapistName: t.name,
    onboarding: body.sendConsent ? "consent_pending" : "invited", registration: "not_registered", status: "active", joined: new Date().toISOString(),
  };
  db.clients.unshift(c);
  if (body.sendConsent) db.consents.unshift({ id: uid("co"), clientId: c.id, clientName: c.name, therapistId: t.id, type: "DPDPA — Data processing & session recording", status: "pending", requestedAt: new Date().toISOString(), channel: "secure_link" });
  return clone(c);
});
on("POST", "/consents/:id/respond", ({ params, body }) => {
  const co = find(db.consents, params.id) as T.Consent;
  co.status = body.status; co.respondedAt = new Date().toISOString();
  const c = db.clients.find((x) => x.id === co.clientId);
  if (c) c.onboarding = body.status === "provided" ? "consent_provided" : "consent_pending";
  return clone(co);
});
on("POST", "/consents/request", ({ body }) => {
  const c = find(db.clients, body.clientId) as T.Client;
  const co: T.Consent = { id: uid("co"), clientId: c.id, clientName: c.name, therapistId: c.therapistId, type: "DPDPA — Data processing & session recording", status: "pending", requestedAt: new Date().toISOString(), channel: c.registration === "registered" ? "portal" : "secure_link" };
  db.consents.unshift(co);
  if (c.onboarding === "invited") c.onboarding = "consent_pending";
  return clone(co);
});
on("POST", "/therapist-links", ({ body }) => {
  const key = String(body.code).trim().toLowerCase();
  const t = db.therapists.find((x) => x.email.toLowerCase() === key || `tf-${x.id}` === key) as T.Therapist | undefined;
  if (!t || t.status !== "active") throw new ApiError(404, "No active therapist found for that email or code");
  if (db.therapistLinks.some((l) => l.therapistId === t.id && l.clientId === body.clientId && l.status !== "ended")) throw new ApiError(409, "You are already connected with this therapist");
  const l: T.TherapistLink = { id: uid("l"), clientId: body.clientId, therapistId: t.id, therapistName: t.name, specialization: t.specialization, status: "newly_added", since: new Date().toISOString() };
  db.therapistLinks.unshift(l);
  return clone(l);
});

// Secure session-link access (no account required)
const byToken = (token: string) => {
  const a = db.appointments.find((x) => x.token === token);
  if (!a) throw new ApiError(404, "This session link is invalid or has expired");
  return a;
};
on("GET", "/join/:token", ({ params }) => {
  const a = byToken(params.token);
  const c = find(db.clients, a.clientId) as T.Client;
  const consent = db.consents.filter((x) => x.clientId === c.id).sort((x, y) => y.requestedAt.localeCompare(x.requestedAt))[0];
  return clone({ appointment: { id: a.id, start: a.start, duration: a.duration, mode: a.mode, status: a.status, therapistName: a.therapistName, serviceName: a.serviceName }, client: { firstName: c.name.split(" ")[0], registration: c.registration, email: c.email }, consent: consent ? { id: consent.id, status: consent.status } : null });
});
on("POST", "/join/:token/consent", ({ params, body }) => {
  const a = byToken(params.token);
  let co = db.consents.find((x) => x.clientId === a.clientId && x.status === "pending");
  if (!co) {
    co = { id: uid("co"), clientId: a.clientId, clientName: a.clientName, therapistId: a.therapistId, type: "DPDPA — Data processing & session recording", status: "pending", requestedAt: new Date().toISOString(), channel: "secure_link" };
    db.consents.unshift(co);
  }
  co.status = body.status; co.respondedAt = new Date().toISOString();
  const c = find(db.clients, a.clientId) as T.Client;
  c.onboarding = body.status === "provided" ? "consent_provided" : "consent_pending";
  return { ok: true };
});
on("POST", "/join/:token/enter", ({ params }) => {
  const a = byToken(params.token);
  const c = find(db.clients, a.clientId) as T.Client;
  if (c.onboarding !== "consent_provided") throw new ApiError(403, "Consent is required before joining");
  if (["scheduled", "link_shared"].includes(a.status)) a.status = "joined";
  return { appointmentId: a.id, status: a.status };
});
on("POST", "/auth/claim", ({ body }) => {
  const email = String(body.email).toLowerCase();
  const c = db.clients.find((x) => x.email.toLowerCase() === email || (body.token && db.appointments.some((a) => a.token === body.token && a.clientId === x.id)));
  if (!c) return { mapped: null };
  c.registration = "registered"; c.accountId = `acc_${c.id}`;
  return { clientId: c.id, name: c.name, mapped: { appointments: db.appointments.filter((a) => a.clientId === c.id).length, consents: db.consents.filter((x) => x.clientId === c.id).length, documents: db.documents.filter((d) => d.clientId === c.id).length, tasks: db.tasks.filter((t) => t.clientId === c.id).length } };
});

const adminProfiles: Record<string, Record<string, unknown>> = {};
on("GET", "/profile", ({ query }) => {
  const { role, id, name = "", email = "" } = query as Record<string, string>;
  const row = role === "therapist" ? db.therapists.find((t) => t.id === id) : role === "client" ? db.clients.find((c) => c.id === id) : adminProfiles[id];
  return clone(row ?? { id, name, email });
});
on("PUT", "/profile", ({ body }) => {
  const { role, id, ...data } = body as Record<string, unknown> & { role: string; id: string };
  if (role === "admin") return clone(Object.assign((adminProfiles[id] ??= { id }), data));
  const rows = (role === "therapist" ? db.therapists : db.clients) as unknown as Record<string, unknown>[];
  let row = rows.find((r) => r.id === id);
  if (!row) {
    row = role === "therapist"
      ? { id, status: "pending", rating: 0, clientCount: 0, joined: new Date().toISOString(), phone: "", license: "", experience: 0, fee: 0, specialization: "" }
      : { id, status: "active", onboarding: "consent_provided", registration: "registered", therapistId: "", therapistName: "", joined: new Date().toISOString(), phone: "", age: 0, gender: "" };
    rows.unshift(row);
  }
  return clone(Object.assign(row, data));
});
on("GET", "/therapist/dashboard", () => {
  const mine = db.appointments.filter((a) => a.therapistId === db.ME.therapistId);
  const today = day(new Date().toISOString());
  return clone({
    today: mine.filter((a) => day(a.start) === today).sort((a, b) => a.start.localeCompare(b.start)),
    upcoming: mine.filter((a) => a.start > new Date().toISOString() && ["scheduled", "link_shared"].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5),
    stats: {
      clients: db.clients.filter((c) => c.therapistId === db.ME.therapistId && c.status === "active").length,
      sessionsMonth: mine.filter((a) => a.status === "completed" && a.start > new Date(Date.now() - 30 * 864e5).toISOString()).length,
      pendingConsents: db.consents.filter((c) => c.therapistId === db.ME.therapistId && c.status === "pending").length,
      earnings: db.payments.filter((p) => p.therapistId === db.ME.therapistId && p.status === "paid").reduce((s, p) => s + p.amount, 0),
      pendingTasks: db.tasks.filter((t) => t.therapistId === db.ME.therapistId && t.status !== "completed").length,
      avgRating: 4.8,
    },
    weekly: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 864e5);
      return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), sessions: mine.filter((a) => day(a.start) === day(d.toISOString()) && a.status === "completed").length };
    }),
  });
});
on("GET", "/client/dashboard", () => {
  const mine = db.appointments.filter((a) => a.clientId === db.ME.clientId);
  const now = new Date().toISOString();
  return clone({
    next: mine.filter((a) => a.start > now.slice(0, 10) && ["scheduled", "link_shared", "joined", "live"].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null,
    upcoming: mine.filter((a) => a.start > now && ["scheduled", "link_shared"].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4),
    stats: {
      completed: mine.filter((a) => a.status === "completed").length,
      openTasks: db.tasks.filter((t) => t.clientId === db.ME.clientId && t.status !== "completed").length,
      dueAmount: db.payments.filter((p) => p.clientId === db.ME.clientId && p.status !== "paid").reduce((s, p) => s + p.amount, 0),
      therapists: db.therapistLinks.filter((l) => l.clientId === db.ME.clientId && l.status !== "ended").length,
    },
  });
});

export function createMockClient(): ApiClient {
  const call = async <V,>(method: string, path: string, params?: Record<string, unknown>, body?: unknown): Promise<V> => {
    await wait(mockControl.latency + Math.random() * 150);
    if (mockControl.fail) throw new ApiError(503, "Service temporarily unavailable (simulated)");
    const parts = path.split("/").filter(Boolean);
    for (const r of routes) {
      if (r.method !== method || r.parts.length !== parts.length) continue;
      const pr: Record<string, string> = {};
      if (r.parts.every((p, i) => (p.startsWith(":") ? ((pr[p.slice(1)] = decodeURIComponent(parts[i])), true) : p === parts[i]))) return r.fn({ params: pr, query: params ?? {}, body: clone(body) }) as V;
    }
    const [name, id] = parts;
    const c = col(name);
    if (method === "GET" && !id) return list(name, params ?? {}) as V;
    if (method === "GET") return clone(find(c.rows, id)) as V;
    if (method === "POST") { const row = { ...(clone(body) as Row), id: uid(name.slice(0, 2)) }; c.rows.unshift(row); return clone(row) as V; }
    if (method === "PATCH") return clone(Object.assign(find(c.rows, id), clone(body))) as V;
    if (method === "DELETE") { c.rows.splice(c.rows.indexOf(find(c.rows, id) as Row), 1); return undefined as V; }
    throw new ApiError(405, "Method not allowed");
  };
  return {
    get: (p, params) => call("GET", p, params as Record<string, unknown>),
    post: (p, b) => call("POST", p, undefined, b),
    patch: (p, b) => call("PATCH", p, undefined, b),
    put: (p, b) => call("PUT", p, undefined, b),
    delete: (p) => call("DELETE", p),
  };
}
