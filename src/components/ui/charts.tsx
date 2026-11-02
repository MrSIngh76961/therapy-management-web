"use client";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { titleCase } from "@/lib/format";

export const chartColors = [
  "#98143F", // Deep Burgundy
  "#2563EB", // Soft Blue
  "#0D7A55", // Mint Emerald
  "#7C3AED", // Lavender Violet
  "#E11D48", // Coral
  "#D97706", // Warm Amber
  "#71102F", // Dark Wine
  "#6E686F", // Muted
];

const axis = { fontSize: 10, fill: "#888188", fontWeight: 500 };
const tip = {
  contentStyle: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    border: "1px solid #EDE4E8",
    fontSize: 11,
    fontWeight: 600,
    color: "#1F191D",
    boxShadow: "0 14px 34px -4px rgba(113, 16, 47, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)",
    padding: "8px 12px",
  },
};

function Shell({ height, children }: { height: number; children: React.ReactElement }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </motion.div>
  );
}

export function TrendChart({
  data,
  xKey,
  yKey,
  height = 240,
  currency,
}: {
  data: object[];
  xKey: string;
  yKey: string;
  height?: number;
  currency?: boolean;
}) {
  return (
    <Shell height={height}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#98143F" stopOpacity={0.32} />
            <stop offset="60%" stopColor="#98143F" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#98143F" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#F3ECF0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} dy={6} />
        <YAxis
          tick={axis}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (currency ? `₹${v >= 1000 ? `${v / 1000}k` : v}` : String(v))}
          dx={-4}
        />
        <Tooltip
          {...tip}
          formatter={(v) => (currency ? `₹${Number(v).toLocaleString("en-IN")}` : String(v))}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke="#98143F"
          strokeWidth={3}
          fill={`url(#g-${yKey})`}
          animationDuration={1000}
        />
      </AreaChart>
    </Shell>
  );
}

export function BarsChart({
  data,
  xKey,
  bars,
  height = 240,
  currency,
}: {
  data: object[];
  xKey: string;
  bars: { key: string; name: string }[];
  height?: number;
  currency?: boolean;
}) {
  return (
    <Shell height={height}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="#F3ECF0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axis} axisLine={false} tickLine={false} dy={6} />
        <YAxis
          tick={axis}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (currency ? `₹${v >= 1000 ? `${v / 1000}k` : v}` : String(v))}
          allowDecimals={false}
          dx={-4}
        />
        <Tooltip {...tip} cursor={{ fill: "rgba(247, 229, 236, 0.4)", radius: 8 }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={chartColors[i % chartColors.length]}
            radius={[8, 8, 2, 2]}
            animationDuration={850}
          />
        ))}
      </BarChart>
    </Shell>
  );
}

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <Shell height={height}>
      <PieChart>
        <Tooltip {...tip} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          formatter={(v) => titleCase(String(v))}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={3}
          animationDuration={900}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={chartColors[i % chartColors.length]}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
        </Pie>
      </PieChart>
    </Shell>
  );
}
