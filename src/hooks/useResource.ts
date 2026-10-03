"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Paged } from "@/services/types";
import type * as T from "@/services/types";

export interface Resources {
  therapists: T.Therapist; clients: T.Client; services: T.Service; appointments: T.Appointment; payments: T.Payment; invoices: T.Invoice;
  users: T.ClinicUser; notifications: T.AppNotification; tasks: T.Task; documents: T.SharedDocument; feedback: T.Feedback; consents: T.Consent;
  reminders: T.Reminder; "therapist-links": T.TherapistLink;
}
export type ResourceName = keyof Resources;
type Params = Record<string, string | number | undefined>;

export const useList = <K extends ResourceName>(name: K, params: Params = {}, enabled = true) =>
  useQuery({ queryKey: [name, "list", params], queryFn: () => api.get<Resources[K][]>(`/${name}`, params), enabled });

export const usePaged = <K extends ResourceName>(name: K, params: Params) =>
  useQuery({ queryKey: [name, "paged", params], queryFn: () => api.get<Paged<Resources[K]>>(`/${name}`, params), placeholderData: keepPreviousData });

export const useItem = <K extends ResourceName>(name: K, id?: string) =>
  useQuery({ queryKey: [name, "item", id], queryFn: () => api.get<Resources[K]>(`/${name}/${id}`), enabled: !!id });

export function useInvalidate() {
  const qc = useQueryClient();
  return (...names: string[]) => Promise.all(names.map((n) => qc.invalidateQueries({ queryKey: [n] })));
}

/** Mutation that invalidates the listed resource caches (and related dashboards) on success. */
export function useAction<TIn, TOut = unknown>(fn: (input: TIn) => Promise<TOut>, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      [...invalidate, "dashboard", "analytics"].forEach((n) => qc.invalidateQueries({ queryKey: [n] }));
    },
  });
}

export const useCreate = <K extends ResourceName>(name: K, extra: string[] = []) =>
  useAction((body: Partial<Resources[K]>) => api.post<Resources[K]>(`/${name}`, body), [name, ...extra]);
export const useUpdate = <K extends ResourceName>(name: K, extra: string[] = []) =>
  useAction(({ id, ...body }: Partial<Resources[K]> & { id: string }) => api.patch<Resources[K]>(`/${name}/${id}`, body), [name, ...extra]);
export const useRemove = <K extends ResourceName>(name: K, extra: string[] = []) =>
  useAction((id: string) => api.delete(`/${name}/${id}`), [name, ...extra]);

export const useApiQuery = <V,>(key: unknown[], path: string, params?: Params) =>
  useQuery({ queryKey: key, queryFn: () => api.get<V>(path, params) });
