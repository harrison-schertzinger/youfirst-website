"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export interface ChartPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Jun '25"
  revenue: number; // dollars
  expenses: number; // dollars
}

interface Props {
  data: ChartPoint[];
}

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatTooltip(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function FinancialsChart({ data }: Props) {
  // Need at least 2 months with any activity before the chart tells a story.
  const monthsWithActivity = data.filter(
    (d) => d.revenue > 0 || d.expenses > 0,
  ).length;
  const hasRevenueAnywhere = data.some((d) => d.revenue > 0);
  const hasExpensesAnywhere = data.some((d) => d.expenses > 0);

  if (monthsWithActivity < 2) {
    return (
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          12-Month Trend
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          Revenue vs Expenses
        </h2>
        <p className="mt-6 text-center text-sm text-[#6B7280] py-10">
          Not enough history yet — check back next month.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
        12-Month Trend
      </div>
      <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
        Revenue vs Expenses
      </h2>
      <div className="mt-5" style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#F0F1F3" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: "#6B7280", fontSize: 11 }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 11 }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              cursor={{ fill: "rgba(74, 144, 217, 0.04)" }}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                return Number.isFinite(n) ? formatTooltip(n) : String(value ?? "");
              }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                fontSize: 12,
                color: "#0A0A0B",
              }}
              labelStyle={{ color: "#6B7280", fontSize: 11 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#6B7280", paddingTop: 8 }}
              iconType="circle"
            />
            {hasRevenueAnywhere && (
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="#34D399"
                radius={[4, 4, 0, 0]}
              />
            )}
            {hasExpensesAnywhere && (
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
