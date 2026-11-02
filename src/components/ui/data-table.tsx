"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MoreHorizontal, Search, SearchX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { usePaged, type ResourceName, type Resources } from "@/hooks/useResource";
import { Dropdown, type MenuItem } from "./dropdown";
import { EmptyState, ErrorState, Skeleton } from "./feedback";
import { Card } from "./card";
import { Button } from "./button";

export interface Column<R> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: R) => React.ReactNode;
  hideBelow?: "sm" | "md" | "lg";
  className?: string;
  align?: "right";
}
export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const hide = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function useDebounced<V>(v: V, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

interface Props<K extends ResourceName> {
  resource: K;
  columns: Column<Resources[K]>[];
  filters?: FilterDef[];
  baseParams?: Record<string, string | number | undefined>;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: Resources[K]) => void;
  rowActions?: (row: Resources[K]) => MenuItem[];
  toolbar?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  tabs?: React.ReactNode;
  initialFilters?: Record<string, string>;
}

export function DataTable<K extends ResourceName>({
  resource,
  columns,
  filters = [],
  baseParams,
  searchPlaceholder = "Search…",
  pageSize = 8,
  onRowClick,
  rowActions,
  toolbar,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  defaultSort,
  tabs,
  initialFilters,
}: Props<K>) {
  const [q, setQ] = useState("");
  const [fv, setFv] = useState<Record<string, string>>(initialFilters ?? {});
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const params = { ...baseParams, q: dq, ...fv, page, pageSize, sort: sort?.key, dir: sort?.dir };
  const query = usePaged(resource, params);
  const hasFilters = !!dq || Object.values(fv).some(Boolean);
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [dq, fv, JSON.stringify(baseParams)]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSort = (k: string) =>
    setSort((s) =>
      s?.key !== k ? { key: k, dir: "asc" } : s.dir === "asc" ? { key: k, dir: "desc" } : undefined,
    );
  const clear = () => {
    setQ("");
    setFv({});
  };
  const cols = rowActions ? 1 : 0;

  return (
    <Card hover={false} className="overflow-hidden border border-[#EDE4E8] bg-white/95 shadow-card">
      {tabs && <div className="border-b border-[#F0E6EB] bg-[#FFFDFE] p-3 sm:p-4">{tabs}</div>}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#F0E6EB] bg-gradient-to-r from-white via-[#FFFBFD] to-[#FFF3EF] p-3.5 sm:p-4">
        <div className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[#888188]" />
          <input
            aria-label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-[12px] border border-[#EDE4E8] bg-white py-2 pl-9 pr-8 text-xs text-[#1F191D] placeholder:text-[#A39CA2] outline-none transition-all focus:border-[#98143F] focus:ring-2 focus:ring-[#98143F]/15"
          />
          {q && (
            <button
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888188] hover:text-[#98143F]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {filters.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={fv[f.key] ?? ""}
            onChange={(e) => setFv((s) => ({ ...s, [f.key]: e.target.value }))}
            className="rounded-[12px] border border-[#EDE4E8] bg-white px-3 py-2 text-xs font-medium text-[#4A4449] outline-none transition-all hover:border-[#DECED5] focus:border-[#98143F] focus:ring-2 focus:ring-[#98143F]/15"
          >
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} icon={<X className="size-3" />}>
            Reset
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (
        <div className={cn("scroll-thin overflow-x-auto transition-opacity", query.isFetching && !query.isLoading && "opacity-60")}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#EDE4E8] bg-[#FAF5F7]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "p-3.5 text-left text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#716A70]",
                      c.hideBelow && hide[c.hideBelow],
                      c.align === "right" && "text-right",
                    )}
                  >
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 font-extrabold uppercase transition-colors hover:text-[#98143F]",
                          sort?.key === c.key && "text-[#98143F]",
                        )}
                      >
                        {c.header}
                        {sort?.key === c.key &&
                          (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
                {cols > 0 && <th className="w-10 border-b border-[#EDE4E8] bg-[#FAF5F7]" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4ECF0]">
              {query.isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                  <tr key={i}>
                    {columns.concat(cols ? [{ key: "x", header: "" }] : []).map((c) => (
                      <td key={c.key} className={cn("p-3.5", c.hideBelow && hide[c.hideBelow])}>
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {query.data?.items.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={() => onRowClick?.(row)}
                      onKeyDown={(e) => onRowClick && e.key === "Enter" && onRowClick(row)}
                      className={cn(
                        "group transition-colors duration-150",
                        onRowClick && "cursor-pointer hover:bg-gradient-to-r hover:from-[#FFF8FA] hover:to-[#FFF4F7]",
                        !onRowClick && "hover:bg-[#FFFDFE]",
                      )}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "p-3.5 text-xs text-[#2A2428]",
                            c.hideBelow && hide[c.hideBelow],
                            c.align === "right" && "text-right",
                            c.className,
                          )}
                        >
                          {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? "—")}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="p-2 text-right">
                          <Dropdown
                            label="Row actions"
                            trigger={
                              <span className="grid size-7 place-items-center rounded-lg text-[#888188] transition-colors hover:bg-[#F4DCE6] hover:text-[#98143F]">
                                <MoreHorizontal className="size-4" />
                              </span>
                            }
                            items={rowActions(row)}
                          />
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
          {!query.isLoading && total === 0 && (
            hasFilters ? (
              <EmptyState
                icon={<SearchX className="size-6 text-[#98143F]" />}
                title="No results match your search"
                description="Try a different keyword or clear the active filters."
                action={
                  <Button variant="soft" onClick={clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
            )
          )}
        </div>
      )}

      {!query.isError && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EDE4E8] bg-[#FAF7F8]/80 px-4 py-3 text-xs text-[#6E686F]">
          <span>
            Showing <b className="text-[#1F191D]">{(page - 1) * pageSize + 1}</b>–<b className="text-[#1F191D]">{Math.min(page * pageSize, total)}</b> of <b className="text-[#1F191D]">{total}</b>
          </span>
          <nav aria-label="Pagination" className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-[#1F191D] shadow-xs">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </nav>
        </div>
      )}
    </Card>
  );
}
