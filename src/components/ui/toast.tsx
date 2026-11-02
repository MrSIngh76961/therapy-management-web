"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { uid } from "@/lib/format";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; kind: ToastKind; message: string };
type Ctx = { toast: (message: string, kind?: ToastKind) => void };

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = uid("t");
    setItems((s) => [...s.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3400);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[99] flex flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.94 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex max-w-[360px] items-center gap-3 rounded-[16px] border border-white/10 bg-[#1F191D]/95 px-4 py-3.5 text-xs font-semibold text-white shadow-pop backdrop-blur-md"
              >
                <I
                  className={
                    t.kind === "error"
                      ? "size-4.5 shrink-0 text-[#FB7185]"
                      : t.kind === "success"
                      ? "size-4.5 shrink-0 text-[#34D399]"
                      : "size-4.5 shrink-0 text-[#60A5FA]"
                  }
                />
                <span className="leading-snug">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
