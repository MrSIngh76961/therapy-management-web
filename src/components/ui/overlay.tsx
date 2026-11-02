"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { pop } from "@/lib/motion";

function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function Modal({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const ref = useOverlay(open, onClose);
  const id = useId();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#23171B]/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              ref={ref}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={id}
              variants={pop}
              initial="hidden"
              animate="show"
              exit="exit"
              className={cn(
                "flex max-h-[90vh] w-[min(640px,96vw)] flex-col rounded-[22px] border border-[#EDE4E8] bg-white shadow-pop outline-none",
                className,
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#F0E6EB] bg-gradient-to-r from-white via-[#FFFBFD] to-[#FFF3EF] px-6 py-4.5">
                <div>
                  <h2 id={id} className="text-base font-extrabold tracking-[-0.01em] text-[#1F191D]">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-xs text-[#6E686F]">{description}</p>}
                </div>
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="grid size-8 place-items-center rounded-xl bg-[#F4DCE6]/60 text-[#71102F] transition-colors hover:bg-[#F4DCE6] hover:text-[#98143F]"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="scroll-thin flex-1 overflow-auto p-6">{children}</div>
              {footer && (
                <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#F0E6EB] bg-[#FAF7F8]/80 px-6 py-3.5">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Drawer({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const ref = useOverlay(open, onClose);
  const id = useId();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex justify-end bg-[#23171B]/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.aside
              ref={ref}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={id}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "flex h-full w-[min(540px,100vw)] flex-col border-l border-[#EDE4E8] bg-white shadow-pop outline-none",
                className,
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#F0E6EB] bg-gradient-to-r from-white via-[#FFFBFD] to-[#FFF3EF] px-6 py-5">
                <div>
                  <h2 id={id} className="text-base font-extrabold tracking-[-0.01em] text-[#1F191D]">
                    {title}
                  </h2>
                  {description && <p className="mt-0.5 text-xs text-[#6E686F]">{description}</p>}
                </div>
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="grid size-8 place-items-center rounded-xl bg-[#F4DCE6]/60 text-[#71102F] transition-colors hover:bg-[#F4DCE6] hover:text-[#98143F]"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="scroll-thin flex-1 overflow-auto p-6">{children}</div>
              {footer && (
                <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#F0E6EB] bg-[#FAF7F8]/80 px-6 py-4">
                  {footer}
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
