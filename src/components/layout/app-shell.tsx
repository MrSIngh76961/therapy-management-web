"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight, Command, LogOut, Menu, Search, ServerCrash, X } from "lucide-react";
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

const isActive = (href: string, path: string) =>
  href.split("/").length <= 2 ? path === href : path === href || path.startsWith(href + "/");

function Brand({ role }: { role: Role }) {
  return (
    <Link
      href={portalHome[role]}
      className="group flex items-center gap-3 px-3 pb-5 pt-1.5 transition-opacity hover:opacity-95"
    >
      <div className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#98143F] via-[#861237] to-[#71102F] font-black text-white shadow-[0_8px_20px_rgba(152,20,63,0.32)]">
        <span className="text-base tracking-tight">T</span>
        <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-[#0D7A55]" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[16px] font-black tracking-[-0.03em] text-[#1F191D]">TheraFlow</span>
        </div>
        <span className="inline-block rounded-md bg-[#F4DCE6] px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-[#71102F]">
          {roleLabel[role]}
        </span>
      </div>
    </Link>
  );
}

function NavList({
  items,
  path,
  onNavigate,
}: {
  items: NavItem[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary" className="scroll-thin flex-1 overflow-y-auto px-1.5 pr-1">
      {items.map((it, i) => {
        const active = isActive(it.href, path);
        return (
          <div key={it.href}>
            {it.section && (
              <div
                className={cn(
                  "px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#A39CA2]",
                  i === 0 ? "pt-1" : "pt-4",
                )}
              >
                {it.section}
              </div>
            )}
            <Link
              href={it.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative my-0.5 flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 select-none",
                active
                  ? "font-extrabold text-[#71102F] shadow-xs"
                  : "text-[#554F54] hover:translate-x-1 hover:bg-[#FAF0F4] hover:text-[#98143F]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-[12px] border border-[#EBC3D3] bg-[#F4DCE6]"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              {active && (
                <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#98143F]" />
              )}
              <it.icon
                className={cn(
                  "relative size-[18px] shrink-0 transition-colors",
                  active ? "text-[#98143F]" : "text-[#888188] group-hover:text-[#98143F]",
                )}
              />
              <span className="relative truncate">{it.label}</span>
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
    const label =
      hit?.label ??
      (i === 0
        ? "Home"
        : /\d|_/.test(p) && p.length > 6
        ? "Details"
        : p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
    return { href, label: i === 0 ? roleLabel[parts[0] as Role] ?? label : label };
  });
}

function GlobalSearch({ items }: { items: NavItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const hits = useMemo(
    () => (q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items.slice(0, 6)),
    [q, items],
  );

  useEffect(() => {
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.querySelector("input")?.focus();
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div ref={ref} className="relative hidden w-[360px] max-w-full md:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#888188]" />
      <input
        role="combobox"
        aria-controls="jump-list"
        aria-expanded={open}
        aria-label="Jump to page"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) {
            router.push(hits[0].href);
            setOpen(false);
            setQ("");
          }
        }}
        placeholder="Search pages or press ⌘K…"
        className="w-full rounded-[14px] border border-[#EDE4E8] bg-[#FAF7F8] py-2 pl-9.5 pr-14 text-xs text-[#1F191D] placeholder:text-[#9A9398] outline-none transition-all duration-150 focus:border-[#98143F] focus:bg-white focus:ring-2 focus:ring-[#98143F]/15"
      />
      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-[#EDE4E8] bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#888188] shadow-xs">
        <Command className="size-2.5" />
        <span>K</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-2 rounded-[16px] border border-[#EDE4E8] bg-white/95 p-2 shadow-pop backdrop-blur-md"
          >
            {hits.length === 0 && (
              <li className="px-3.5 py-2.5 text-xs text-[#6E686F]">No matching pages</li>
            )}
            {hits.map((h) => (
              <li key={h.href}>
                <Link
                  href={h.href}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#3F393D] transition-colors hover:bg-[#F4DCE6] hover:text-[#71102F]"
                >
                  <h.icon className="size-4 text-[#98143F]" />
                  <span>{h.label}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const IDLE_MS = 15 * 60_000,
  WARN_S = 60;
function useIdleLogout(onExpire: () => void) {
  const [warn, setWarn] = useState<number | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (last.current === 0) last.current = Date.now();
    const bump = () => {
      if (warn === null) last.current = Date.now();
    };
    ["mousemove", "keydown", "click", "touchstart"].forEach((e) =>
      window.addEventListener(e, bump, { passive: true }),
    );
    const t = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle > IDLE_MS + WARN_S * 1000) {
        setWarn(null);
        onExpire();
      } else if (idle > IDLE_MS) {
        setWarn(Math.ceil((IDLE_MS + WARN_S * 1000 - idle) / 1000));
      }
    }, 1000);
    return () => {
      clearInterval(t);
      ["mousemove", "keydown", "click", "touchstart"].forEach((e) =>
        window.removeEventListener(e, bump),
      );
    };
  }, [warn, onExpire]);
  return {
    warn,
    stay: () => {
      last.current = Date.now();
      setWarn(null);
    },
  };
}

const subscribeFail = (cb: () => void) => {
  mockControl.listeners.add(cb);
  return () => {
    mockControl.listeners.delete(cb);
  };
};

export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mobile, setMobile] = useState(false);
  const items = navByRole[role];
  const failing = useSyncExternalStore(
    subscribeFail,
    () => mockControl.fail,
    () => false,
  );
  const unread = useList("notifications", { audience: role, read: "false" }, !!user);
  const idle = useIdleLogout(() => {
    logout();
    router.replace(`/login?role=${role}&expired=1`);
  });

  useEffect(() => {
    setMobile(false);
  }, [path]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?role=${role}`);
    else if (user.role !== role) router.replace(portalHome[user.role]);
    else if (!user.profileComplete && !path.endsWith("/profile-setup"))
      router.replace(`${portalHome[role]}/profile-setup`);
  }, [ready, user, role, router, path]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF7F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-3 border-[#F4DCE6] border-t-[#98143F]" />
          <p className="text-xs font-bold text-[#888188]">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const bare = path.endsWith("/profile-setup");
  const trail = crumbs(path, items);

  return (
    <div className="min-h-screen bg-[#FAF7F8] text-[#1F191D]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-[#98143F] focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-pop"
      >
        Skip to content
      </a>

      {!bare && (
        <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-[270px] flex-col border-r border-[#EDE4E8] bg-white/95 px-3.5 py-5 backdrop-blur-md lg:flex">
          <Brand role={role} />
          <NavList items={items} path={path} />
          <div className="mt-3 flex items-center gap-3 border-t border-[#F0E6EB] px-2 pt-4">
            <Avatar name={user.name} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black text-[#1F191D]">{user.name}</div>
              <div className="text-[10px] font-bold text-[#888188]">{roleLabel[role]}</div>
            </div>
            <button
              aria-label="Sign out"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              title="Sign out"
              className="grid size-8 place-items-center rounded-xl text-[#888188] transition-colors hover:bg-[#F4DCE6] hover:text-[#98143F]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>
      )}

      <AnimatePresence>
        {mobile && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#23171B]/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobile(false)}
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-[280px] flex-col border-r border-[#EDE4E8] bg-white px-3.5 py-5 shadow-pop"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Navigation"
            >
              <div className="flex items-start justify-between">
                <Brand role={role} />
                <button
                  aria-label="Close menu"
                  onClick={() => setMobile(false)}
                  className="grid size-8 place-items-center rounded-xl text-[#888188] hover:bg-[#F4DCE6] hover:text-[#98143F]"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavList items={items} path={path} onNavigate={() => setMobile(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(!bare && "lg:ml-[270px] print:!ml-0")}>
        <header className="no-print sticky top-0 z-30 flex h-[70px] items-center justify-between gap-3 border-b border-[#EDE4E8] bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {!bare && (
              <button
                aria-label="Open menu"
                onClick={() => setMobile(true)}
                className="grid size-9 place-items-center rounded-xl border border-[#EDE4E8] text-[#554F54] transition-colors hover:bg-[#F4DCE6] hover:text-[#98143F] lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            )}
            {bare ? <Brand role={role} /> : <GlobalSearch items={items} />}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Dropdown
              label="Developer tools"
              trigger={
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl border transition-colors shadow-xs",
                    failing
                      ? "border-[#F9C2CB] bg-[#FFDBDF] text-[#9F1239]"
                      : "border-[#EDE4E8] bg-white text-[#6E686F] hover:border-[#98143F]/40 hover:text-[#98143F]",
                  )}
                >
                  <ServerCrash className="size-4" />
                </span>
              }
              items={[
                {
                  label: failing ? "Restore API (stop simulating errors)" : "Simulate API outage",
                  onSelect: () => {
                    setMockFail(!mockControl.fail);
                    qc.invalidateQueries();
                    toast(
                      mockControl.fail
                        ? "API outage simulated — pages will show error states"
                        : "API restored",
                      "info",
                    );
                  },
                },
              ]}
            />

            <Link
              href={`${portalHome[role]}/notifications`}
              aria-label={`Notifications${unread.data?.length ? `, ${unread.data.length} unread` : ""}`}
              className="relative grid size-9 place-items-center rounded-xl border border-[#EDE4E8] bg-white text-[#6E686F] shadow-xs transition-colors hover:border-[#98143F]/40 hover:text-[#98143F]"
            >
              <Bell className="size-4" />
              {!!unread.data?.length && (
                <span className="absolute -right-1 -top-1 grid size-4.5 place-items-center rounded-full bg-[#98143F] text-[9px] font-black text-white shadow-xs">
                  {unread.data.length}
                </span>
              )}
            </Link>

            <Dropdown
              label="Account menu"
              trigger={
                <span className="flex items-center gap-2 rounded-xl border border-[#EDE4E8] bg-white py-1 pl-1 pr-3 shadow-xs transition-all hover:border-[#98143F]/40">
                  <Avatar name={user.name} size={30} />
                  <span className="hidden text-xs font-bold text-[#1F191D] sm:block">
                    {user.name.split(" ").slice(0, 2).join(" ")}
                  </span>
                </span>
              }
              items={[
                {
                  label: "Manage profile",
                  onSelect: () => router.push(`${portalHome[role]}/profile`),
                },
                {
                  label: "Sign out",
                  danger: true,
                  icon: <LogOut className="size-3.5" />,
                  onSelect: () => {
                    logout();
                    router.push("/login");
                  },
                },
              ]}
            />
          </div>
        </header>

        {failing && (
          <div
            role="status"
            className="border-b border-[#F9C2CB] bg-[#FFDBDF] px-4 py-2 text-center text-xs font-bold text-[#9F1239]"
          >
            Simulated API outage is on — use the developer server icon in the top header to restore normal operation.
          </div>
        )}

        <main id="main" className="mx-auto max-w-[1450px] p-4 sm:p-7 md:p-8">
          {!bare && (
            <nav aria-label="Breadcrumb" className="no-print mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[#888188]">
              {trail.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3 text-[#A39CA2]" />}
                  {i === trail.length - 1 ? (
                    <span className="font-extrabold text-[#1F191D]">{c.label}</span>
                  ) : (
                    <Link href={c.href} className="transition-colors hover:text-[#98143F]">
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<div className="skeleton h-48 rounded-[18px]" />}>
              {children}
            </Suspense>
          </motion.div>
        </main>
      </div>

      <Modal
        open={idle.warn !== null}
        onClose={idle.stay}
        title="Session about to expire"
        className="w-[min(440px,96vw)]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Sign out
            </Button>
            <Button onClick={idle.stay}>Stay signed in</Button>
          </>
        }
      >
        <p className="text-xs text-[#6E686F]">
          For your security and patient privacy, your session will automatically expire due to inactivity in{" "}
          <b className="font-black text-[#98143F]">{idle.warn ?? 0}s</b>.
        </p>
      </Modal>
    </div>
  );
}
