"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PopulationStats } from "@/lib/queries/demographics";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface PopulationEvolutionDashboardProps {
  data: PopulationStats;
}

function StatHighlight({
  label,
  value,
  subLabel,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  subLabel: string;
  trend: "up" | "down" | "neutral";
  color: string;
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up" ? "#00994d" : trend === "down" ? "#cc9900" : "#666";

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#072357]/5 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-[#072357]/60">{label}</p>
        <p className="text-base sm:text-xl md:text-2xl font-bold" style={{ color }}>
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        <p className="text-[10px] sm:text-xs text-[#072357]/50">{subLabel}</p>
      </div>
      <TrendIcon
        className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
        style={{ color: trendColor }}
      />
    </div>
  );
}

export function PopulationEvolutionDashboard({ data }: PopulationEvolutionDashboardProps) {
  // Transform data for chart - combine municipality and locality data
  const chartData = data.evolution.map((item) => {
    const locData = data.localityEvolution?.find(
      (loc) => loc.year === item.year
    );
    return {
      year: item.year,
      population: item.population,
      locality: locData?.population,
    };
  });

  // Determine trend direction
  const trendDirection =
    data.trend === "Crecimiento"
      ? "up"
      : data.trend === "Decrecimiento"
      ? "down"
      : "neutral";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats highlights - responsive grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatHighlight
          label="Pob. máxima"
          value={data.maxPopulation.value}
          subLabel={`Año ${data.maxPopulation.year}`}
          trend="up"
          color="#00994d"
        />
        <StatHighlight
          label="Pob. mínima"
          value={data.minPopulation.value}
          subLabel={`Año ${data.minPopulation.year}`}
          trend="down"
          color="#cc9900"
        />
        <StatHighlight
          label="Tendencia"
          value={data.trend}
          subLabel={data.trendPeriod}
          trend={trendDirection}
          color="#0066cc"
        />
      </div>

      {/* Population chart */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#072357]/5">
        <h4 className="text-xs sm:text-sm font-semibold text-[#072357] mb-3 sm:mb-4">
          Evolución poblacional por censos
        </h4>
        <div className="h-36 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                vertical={false}
                stroke="#072357"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 9, fill: "#072357" }}
                tickLine={false}
                axisLine={{ stroke: "#072357", strokeOpacity: 0.1 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#072357" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (value / 1000).toFixed(0) + "k"}
                domain={["dataMin - 500", "dataMax + 500"]}
                width={35}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  
                  return (
                    <div
                      className="bg-[#072357] rounded-xl p-3 border-none"
                      style={{ fontSize: "12px" }}
                    >
                      <p className="text-white font-medium mb-2">Año {label}</p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => {
                          if (entry.value === null || entry.value === undefined) return null;
                          const displayValue = formatNumber(entry.value);
                          const displayName =
                            entry.dataKey === "population"
                              ? data.municipalityName
                              : data.localityName || "Localidad";
                          const color =
                            entry.dataKey === "population" ? "#0088cc" : "#cc9900";
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 shrink-0 rounded-sm"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-white font-mono font-medium tabular-nums">
                                {displayValue}
                              </span>
                              <span className="text-white/70">{displayName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="population"
                stroke="#0088cc"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#0088cc" }}
              />
              {data.localityEvolution && (
                <Line
                  type="monotone"
                  dataKey="locality"
                  stroke="#cc9900"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#cc9900" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
