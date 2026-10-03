"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn("skeleton h-4 w-full", className)} />;

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-rose text-wine">{icon ?? <Inbox className="size-6" />}</div>
      <h3 className="text-sm font-extrabold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ message = "Something went wrong while loading this data.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-[#fdecee] text-bad"><AlertTriangle className="size-6" /></div>
      <h3 className="text-sm font-extrabold">Unable to load</h3>
      <p className="mt-1 max-w-sm text-xs text-muted">{message}</p>
      {onRetry && <Button variant="outline" className="mt-4" icon={<RefreshCw className="size-3.5" />} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function QueryBoundary({ query, rows = 4, empty, children }: { query: { isLoading: boolean; isError: boolean; refetch: () => unknown; data?: unknown }; rows?: number; empty?: React.ReactNode; children: React.ReactNode }) {
  if (query.isLoading) return <CardSkeleton rows={rows} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (empty && Array.isArray(query.data) && query.data.length === 0) return <>{empty}</>;
  return <>{children}</>;
}
