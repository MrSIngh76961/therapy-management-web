"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./button";
import { Modal } from "./overlay";

type Opts = { title: string; description?: string; confirmLabel?: string; danger?: boolean };
const Ctx = createContext<(o: Opts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<Opts | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);
  const confirm = useCallback((o: Opts) => new Promise<boolean>((res) => { resolver.current = res; setOpts(o); }), []);
  const close = (v: boolean) => { resolver.current?.(v); setOpts(null); };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} title={opts?.title ?? ""} className="w-[min(440px,96vw)]"
        footer={<><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button variant={opts?.danger ? "danger" : "primary"} onClick={() => close(true)}>{opts?.confirmLabel ?? "Confirm"}</Button></>}>
        <p className="text-xs leading-relaxed text-muted">{opts?.description ?? "Are you sure you want to continue?"}</p>
      </Modal>
    </Ctx.Provider>
  );
}
