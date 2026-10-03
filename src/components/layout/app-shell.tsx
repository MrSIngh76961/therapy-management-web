"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight, LogOut, Menu, Search, ServerCrash, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { portalHome, useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { navByRole, roleLabel, type NavItem } from "@/lib/nav";
import { useList } from "@/hooks/useResource";
import { mockControl, setMockFail } from "@/services/mock/transport";
import type { Role } from "@/services/types";
import { useQueryClient } from "@tanstack/react-query";

const isActive = (href: string, path: string) => (href.split("/").length <= 2 ? path === href : path === href || path.startsWith(href + "/"));

function Brand({ role }: { role: Role }) {
  return (
    <Link href={portalHome[role]} className="flex items-center gap-2.5 px-2.5 pb-5 pt-1.5">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-wine to-[#d15d7d] font-extrabold text-white shadow-[0_8px_22px_#8616372e]">T</div>
      <div><b className="text-[15px]">TheraFlow</b><small className="mt-0.5 block text-[10px] text-[#999]">{roleLabel[role]} Portal</small></div>
    </Link>
  );
}

function NavList({ items, path, onNavigate }: { items: NavItem[]; path: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="scroll-thin flex-1 overflow-y-auto pr-0.5">
      {items.map((it, i) => {
        const active = isActive(it.href, path);
        return (
          <div key={it.href}>
            {it.section && <div className={cn("px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#aaa]", i === 0 ? "pt-1" : "pt-4")}>{it.section}</div>}
            <Link href={it.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("relative my-0.5 flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-xs transition-all duration-200", active ? "font-bold text-wine" : "text-[#666] hover:translate-x-0.5 hover:bg-[#faf3f5] hover:text-wine")}>
              {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-[11px] bg-rose" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <it.icon className="relative size-[17px] shrink-0" />
              <span className="relative">{it.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function crumbs(path: string, items: NavItem[]) {
  const parts = path.split("/").filter(Boolean);
  return parts.map((p, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const hit = items.find((n) => n.href === href);
    const label = hit?.label ?? (i === 0 ? "Home" : /\d|_/.test(p) && p.length > 6 ? "Details" : p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
    return { href, label: i === 0 ? roleLabel[parts[0] as Role] ?? label : label };
  });
}

function GlobalSearch({ items }: { items: NavItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => (q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items.slice(0, 6)), [q, items]);
  useEffect(() => {
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); ref.current?.querySelector("input")?.focus(); } };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, []);
  return (
    <div ref={ref} className="relative hidden w-[340px] max-w-full md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9a9498]" />
      <input role="combobox" aria-controls="jump-list" aria-expanded={open} aria-label="Jump to page" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { router.push(hits[0].href); setOpen(false); setQ(""); } }} placeholder="Jump to a page…  (Ctrl K)" className="w-full rounded-[11px] border border-line bg-[#faf9f9] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#c78398] focus:shadow-[0_0_0_3px_var(--color-rose)]" />
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 right-0 z-40 mt-1.5 rounded-xl border border-line bg-white p-1.5 shadow-pop">
            {hits.length === 0 && <li className="px-3 py-2 text-xs text-muted">No matching pages</li>}
            {hits.map((h) => (
              <li key={h.href}><Link href={h.href} onClick={() => { setOpen(false); setQ(""); }} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-rose hover:text-wine"><h.icon className="size-4" />{h.label}</Link></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const IDLE_MS = 15 * 60_000, WARN_S = 60;
function useIdleLogout(onExpire: () => void) {
  const [warn, setWarn] = useState<number | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (last.current === 0) last.current = Date.now();
    const bump = () => { if (warn === null) last.current = Date.now(); };
    ["mousemove", "keydown", "click", "touchstart"].forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle > IDLE_MS + WARN_S * 1000) { setWarn(null); onExpire(); }
      else if (idle > IDLE_MS) setWarn(Math.ceil((IDLE_MS + WARN_S * 1000 - idle) / 1000));
    }, 1000);
    return () => { clearInterval(t); ["mousemove", "keydown", "click", "touchstart"].forEach((e) => window.removeEventListener(e, bump)); };
  }, [warn, onExpire]);
  return { warn, stay: () => { last.current = Date.now(); setWarn(null); } };
}

const subscribeFail = (cb: () => void) => { mockControl.listeners.add(cb); return () => { mockControl.listeners.delete(cb); }; };

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mobile, setMobile] = useState(false);
  const items = navByRole[role];
  const failing = useSyncExternalStore(subscribeFail, () => mockControl.fail, () => false);
  const unread = useList("notifications", { audience: role, read: "false" }, !!user);
  const idle = useIdleLogout(() => { logout(); router.replace(`/login?role=${role}&expired=1`); });

  useEffect(() => { setMobile(false); }, [path]);
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?role=${role}`);
    else if (user.role !== role) router.replace(portalHome[user.role]);
    else if (!user.profileComplete && !path.endsWith("/profile-setup")) router.replace(`${portalHome[role]}/profile-setup`);
  }, [ready, user, role, router, path]);

  if (!ready || !user || user.role !== role) {
    return <div className="grid min-h-screen place-items-center"><div className="skeleton h-10 w-40" role="status" aria-label="Loading" /></div>;
  }
  const bare = path.endsWith("/profile-setup");
  const trail = crumbs(path, items);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-wine focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      {!bare && (
        <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-[264px] flex-col border-r border-line bg-white px-3.5 py-5 lg:flex">
          <Brand role={role} />
          <NavList items={items} path={path} />
          <div className="mt-3 flex items-center gap-2.5 border-t border-line px-2 pt-3.5">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{user.name}</div><div className="text-[10px] text-muted">{roleLabel[role]}</div></div>
            <button aria-label="Sign out" onClick={() => { logout(); router.push("/login"); }} className="rounded-lg p-1.5 text-[#888] hover:bg-rose hover:text-wine"><LogOut className="size-4" /></button>
          </div>
        </aside>
      )}

      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-50 bg-[#23171b73] backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)}>
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "tween", duration: 0.25 }} className="flex h-full w-[272px] flex-col bg-white px-3.5 py-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Navigation">
              <div className="flex items-start justify-between"><Brand role={role} /><button aria-label="Close menu" onClick={() => setMobile(false)} className="rounded-lg p-1.5"><X className="size-5" /></button></div>
              <NavList items={items} path={path} onNavigate={() => setMobile(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(!bare && "lg:ml-[264px] print:!ml-0")}>
        <header className="no-print sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            {!bare && <button aria-label="Open menu" onClick={() => setMobile(true)} className="rounded-lg p-2 hover:bg-rose lg:hidden"><Menu className="size-5" /></button>}
            {bare ? <Brand role={role} /> : <GlobalSearch items={items} />}
          </div>
          <div className="flex items-center gap-2">
            <Dropdown label="Developer tools" trigger={<span className={cn("grid size-9 place-items-center rounded-[10px] border border-line", failing ? "bg-[#fdecee] text-bad" : "bg-white text-[#777] hover:text-wine")}><ServerCrash className="size-4" /></span>} items={[
              { label: failing ? "Restore API (stop simulating errors)" : "Simulate API outage", onSelect: () => { setMockFail(!mockControl.fail); qc.invalidateQueries(); toast(mockControl.fail ? "API outage simulated — pages will show error states" : "API restored", "info"); } },
            ]} />
            <Link href={`${portalHome[role]}/notifications`} aria-label={`Notifications${unread.data?.length ? `, ${unread.data.length} unread` : ""}`} className="relative grid size-9 place-items-center rounded-[10px] border border-line bg-white text-[#777] transition-colors hover:text-wine">
              <Bell className="size-4" />
              {!!unread.data?.length && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-wine text-[9px] font-bold text-white">{unread.data.length}</span>}
            </Link>
            <Dropdown label="Account menu" trigger={<span className="flex items-center gap-2 rounded-[10px] border border-line bg-white py-1 pl-1 pr-2.5 hover:border-[#d9bbc4]"><Avatar name={user.name} size={28} /><span className="hidden text-xs font-semibold sm:block">{user.name.split(" ").slice(0, 2).join(" ")}</span></span>} items={[
              { label: "Profile", onSelect: () => router.push(`${portalHome[role]}/profile`) },
              { label: "Sign out", danger: true, icon: <LogOut className="size-3.5" />, onSelect: () => { logout(); router.push("/login"); } },
            ]} />
          </div>
        </header>
        {failing && <div role="status" className="bg-[#fdecee] px-4 py-1.5 text-center text-[11px] font-semibold text-bad">Simulated API outage is on — use the server icon to restore.</div>}
        <main id="main" className="mx-auto max-w-[1450px] p-4 sm:p-7">
          {!bare && (
            <nav aria-label="Breadcrumb" className="no-print mb-3 flex flex-wrap items-center gap-1 text-[11px] text-muted">
              {trail.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3" />}
                  {i === trail.length - 1 ? <span className="font-semibold text-ink">{c.label}</span> : <Link href={c.href} className="hover:text-wine">{c.label}</Link>}
                </span>
              ))}
            </nav>
          )}
          <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}><Suspense fallback={<div className="skeleton h-40" />}>{children}</Suspense></motion.div>
        </main>
      </div>

      <Modal open={idle.warn !== null} onClose={idle.stay} title="Session about to expire" className="w-[min(420px,96vw)]" footer={<><Button variant="outline" onClick={() => { logout(); router.push("/login"); }}>Sign out</Button><Button onClick={idle.stay}>Stay signed in</Button></>}>
        <p className="text-xs text-muted">For your security you will be signed out after inactivity in {idle.warn ?? 0}s.</p>
      </Modal>
    </div>
  );
}

