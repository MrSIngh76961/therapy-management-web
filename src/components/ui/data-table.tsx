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
  key: string; header: string; sortable?: boolean; render?: (row: R) => React.ReactNode;
  hideBelow?: "sm" | "md" | "lg"; className?: string; align?: "right";
}
export interface FilterDef { key: string; label: string; options: { value: string; label: string }[] }

const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

export function useDebounced<V>(v: V, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
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

export function DataTable<K extends ResourceName>({ resource, columns, filters = [], baseParams, searchPlaceholder = "Search…", pageSize = 8, onRowClick, rowActions, toolbar, emptyTitle = "Nothing here yet", emptyDescription, emptyAction, defaultSort, tabs, initialFilters }: Props<K>) {
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
  useEffect(() => { setPage(1); }, [dq, fv, JSON.stringify(baseParams)]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleSort = (k: string) => setSort((s) => (s?.key !== k ? { key: k, dir: "asc" } : s.dir === "asc" ? { key: k, dir: "desc" } : undefined));
  const clear = () => { setQ(""); setFv({}); };
  const cols = rowActions ? 1 : 0;

  return (
    <Card hover={false} className="overflow-hidden">
      {tabs && <div className="border-b border-line p-3">{tabs}</div>}
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9498]" />
          <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full rounded-[10px] border border-line bg-[#faf9f9] py-2.5 pl-9 pr-8 text-xs outline-none focus:border-[#c78398] focus:shadow-[0_0_0_3px_var(--color-rose)]" />
          {q && <button aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999] hover:text-wine"><X className="size-3.5" /></button>}
        </div>
        {filters.map((f) => (
          <select key={f.key} aria-label={f.label} value={fv[f.key] ?? ""} onChange={(e) => setFv((s) => ({ ...s, [f.key]: e.target.value }))} className="rounded-[10px] border border-line bg-white px-3 py-2.5 text-xs outline-none focus:border-[#c78398]">
            <option value="">{f.label}: All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {hasFilters && <Button variant="ghost" size="sm" onClick={clear} icon={<X className="size-3" />}>Reset</Button>}
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (
        <div className={cn("scroll-thin overflow-x-auto transition-opacity", query.isFetching && !query.isLoading && "opacity-60")}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("border-b border-line p-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#999]", c.hideBelow && hide[c.hideBelow], c.align === "right" && "text-right")}>
                    {c.sortable ? (
                      <button onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1 uppercase hover:text-wine", sort?.key === c.key && "text-wine")}>
                        {c.header}
                        {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    ) : c.header}
                  </th>
                ))}
                {cols > 0 && <th className="w-10 border-b border-line" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <tr key={i}>{columns.concat(cols ? [{ key: "x", header: "" }] : []).map((c) => <td key={c.key} className={cn("p-3", c.hideBelow && hide[c.hideBelow])}><Skeleton className="h-4" /></td>)}</tr>
              )) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {query.data?.items.map((row, i) => (
                    <motion.tr key={row.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025, duration: 0.2 }} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row)} onKeyDown={(e) => onRowClick && e.key === "Enter" && onRowClick(row)} className={cn("group", onRowClick && "cursor-pointer")}>
                      {columns.map((c) => (
                        <td key={c.key} className={cn("border-b border-[#f0ecec] p-3 text-[11px] transition-colors group-hover:bg-[#fff8fa]", c.hideBelow && hide[c.hideBelow], c.align === "right" && "text-right", c.className)}>
                          {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? "—")}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="border-b border-[#f0ecec] p-2 text-right transition-colors group-hover:bg-[#fff8fa]">
                          <Dropdown label="Row actions" trigger={<span className="grid size-7 place-items-center rounded-lg text-[#888] hover:bg-rose hover:text-wine"><MoreHorizontal className="size-4" /></span>} items={rowActions(row)} />
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
          {!query.isLoading && total === 0 && (
            hasFilters
              ? <EmptyState icon={<SearchX className="size-6" />} title="No results match your search" description="Try a different keyword or clear the filters." action={<Button variant="soft" onClick={clear}>Clear filters</Button>} />
              : <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
          )}
        </div>
      )}

      {!query.isError && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[11px] text-muted">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="size-3.5" /></Button>
            <span className="px-2 font-semibold text-ink">Page {page} / {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="size-3.5" /></Button>
          </nav>
        </div>
      )}
    </Card>
  );
}

