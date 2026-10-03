# TheraFlow

One Next.js (App Router) app with three role-based portals: `/admin/*` (clinic owner), `/therapist/*`, `/client/*`, plus the account-free secure session link `/join/[token]`.

Stack: Next.js, TypeScript, Tailwind v4, Framer Motion, React Hook Form + Zod, TanStack Query, Recharts, Lucide.

## Run
```
npm install
npm run dev     # webpack dev server
npm run build && npm start
```
Demo login: pick a role tab on `/login` and press "Use demo account" (any 6+ char password; "wrong" simulates an error).
Developer tools menu (top bar) can simulate an API outage to see error states.

## Architecture
- `src/services/api.ts` — single API entry point. Without `NEXT_PUBLIC_API_BASE_URL` it uses the in-memory mock (`services/mock`); with it, a REST client (`services/http.ts`) talks to the real backend (reusable by mobile apps).
- `src/services/providers/` — integration interfaces (`VideoProvider`, `TranscriptionProvider`, `PaymentProvider`, `CalendarProvider`, `StorageProvider`, `NotificationProvider`), mock implementations, and the swap point `registry.ts`.
- `src/components/ui` — shared design system; `src/features/{admin,therapist,client,shared,join}` — role-aware views reused across portals.
- Client journey states (invited, consent pending/provided, link shared, joined, completed, guest → registered) are modelled in the mock data; `/auth/claim` maps link/consent records onto a newly registered account.