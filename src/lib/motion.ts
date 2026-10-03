import type { Transition, Variants } from "framer-motion";

export const ease = [0.22, 1, 0.36, 1] as const;
export const dur = { fast: 0.15, base: 0.22, slow: 0.4 } as const;
export const tBase: Transition = { duration: dur.base, ease };
export const spring: Transition = { type: "spring", stiffness: 420, damping: 32 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: tBase },
};
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: tBase },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: dur.fast } },
};
