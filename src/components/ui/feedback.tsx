"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export const Skeleton = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("skeleton h-4 w-full rounded-xl", className)} />
);

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#FDECF1] to-[#F4DCE6] text-[#98143F] shadow-[0_8px_20px_-4px_rgba(152,20,63,0.18)]">
        {icon ?? <Inbox className="size-7" />}
      </div>
      <h3 className="text-sm font-extrabold text-[#1F191D]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-xs text-[#6E686F]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({
  message = "Something went wrong while loading this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#FFEDEF] to-[#FFDBDF] text-[#9F1239] shadow-[0_8px_20px_-4px_rgba(225,29,72,0.18)]">
        <AlertTriangle className="size-7" />
      </div>
      <h3 className="text-sm font-extrabold text-[#1F191D]">Unable to load content</h3>
      <p className="mt-1.5 max-w-sm text-xs text-[#6E686F]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" icon={<RefreshCw className="size-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function QueryBoundary({
  query,
  rows = 4,
  empty,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; refetch: () => unknown; data?: unknown };
  rows?: number;
  empty?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (query.isLoading) return <CardSkeleton rows={rows} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (empty && Array.isArray(query.data) && query.data.length === 0) return <>{empty}</>;
  return <>{children}</>;
}
