export interface Analytics {
  totals: { appointments: number; revenue: number; pending: number; activeClients: number; activeTherapists: number; completionRate: number; sessions: number; newClients: number; overdueInvoices: number };
  series: { label: string; appointments: number; revenue: number; completed: number }[];
  byStatus: { name: string; value: number }[];
  byTherapist: { name: string; sessions: number; revenue: number }[];
  byMethod: { name: string; value: number }[];
  clientActivity: { name: string; value: number }[];
}
