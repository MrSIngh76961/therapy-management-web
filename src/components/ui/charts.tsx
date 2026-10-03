"use client";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { titleCase } from "@/lib/format";

export const chartColors = ["#861637", "#d45a7b", "#557cb4", "#389474", "#c58a27", "#9c8f95"];
const axis = { fontSize: 10, fill: "#9a9498" };
const tip = { contentStyle: { borderRadius: 12, border: "1px solid #e8e1e3", fontSize: 11, boxShadow: "0 12px 36px #351c2514" } };

function Shell({ height, children }: { height: number; children: React.ReactElement }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </motion.div>
  );
}

export function TrendChart({ data, xKey, yKey, height = 240, currency }: { data: object[]; xKey: string; yKey: string; height?: number; currency?: boolean }) {
  return (
    <Shell height={height}>
      <AreaChart data={data} margin={{ left: -12, right: 6, top: 6 }}>
        <defs><linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#861637" stopOpacity={0.28} /><stop offset="100%" stopColor="#861637" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#f0ecec" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => (currency ? `₹${v / 1000}k` : String(v))} />
        <Tooltip {...tip} formatter={(v) => (currency ? `₹${Number(v).toLocaleString("en-IN")}` : String(v))} />
        <Area type="monotone" dataKey={yKey} stroke="#861637" strokeWidth={2.5} fill={`url(#g-${yKey})`} animationDuration={900} />
      </AreaChart>
    </Shell>
  );
}

export function BarsChart({ data, xKey, bars, height = 240, currency }: { data: object[]; xKey: string; bars: { key: string; name: string }[]; height?: number; currency?: boolean }) {
  return (
    <Shell height={height}>
      <BarChart data={data} margin={{ left: -12, right: 6, top: 6 }}>
        <CartesianGrid stroke="#f0ecec" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => (currency ? `₹${v / 1000}k` : String(v))} allowDecimals={false} />
        <Tooltip {...tip} cursor={{ fill: "#faeef1" }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={chartColors[i]} radius={[6, 6, 2, 2]} animationDuration={800} />)}
      </BarChart>
    </Shell>
  );
}

export function DonutChart({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <Shell height={height}>
      <PieChart>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => titleCase(String(v))} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} animationDuration={900}>
          {data.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
        </Pie>
      </PieChart>
    </Shell>
  );
}
