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
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 40, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.22 }} className="pointer-events-auto flex max-w-[340px] items-center gap-2 rounded-xl bg-[#28252a] px-3.5 py-3 text-xs text-white shadow-pop">
                <I className={t.kind === "error" ? "size-4 text-[#ff8da1]" : t.kind === "success" ? "size-4 text-[#6fd3ac]" : "size-4 text-[#9fbce6]"} />
                {t.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
