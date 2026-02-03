"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { PopulationStats } from "@/lib/queries/demographics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface PopulationEvolutionDashboardProps {
  data: PopulationStats;
}

const chartConfig = {
  population: {
    label: "Población",
    color: "var(--chart-1)",
  },
  locality: {
    label: "Población (Localidad)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function PopulationEvolutionDashboard({ data }: PopulationEvolutionDashboardProps) {
  // Get all unique years from both municipality and locality data
  const allYears = new Set<number>();
  data.evolution.forEach((item) => allYears.add(item.year));
  if (data.localityEvolution) {
    data.localityEvolution.forEach((item) => allYears.add(item.year));
  }
  
  const sortedYears = Array.from(allYears).sort((a, b) => a - b);
  
  // Transform data for chart - combine municipality and locality data
  const chartData = sortedYears.map((year) => {
    const munData = data.evolution.find((item) => item.year === year);
    const locData = data.localityEvolution?.find((item) => item.year === year);
    
    return {
      year: year.toString(),
      population: munData?.population ?? null,
      locality: locData?.population ?? null,
    };
  });

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Población máxima */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Población máxima</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--chart-2)' }}>
                  {formatNumber(data.maxPopulation.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Año {data.maxPopulation.year}
                </p>
              </div>
              <ArrowUp className="h-8 w-8" style={{ color: 'var(--chart-2)' }} />
            </div>
          </CardContent>
        </Card>

        {/* Población mínima */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Población mínima</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--chart-3)' }}>
                  {formatNumber(data.minPopulation.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Año {data.minPopulation.year}
                </p>
              </div>
              <ArrowDown className="h-8 w-8" style={{ color: 'var(--chart-3)' }} />
            </div>
          </CardContent>
        </Card>

        {/* Tendencia */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tendencia</p>
                <p className="text-2xl font-bold text-primary">
                  {data.trend}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.trendPeriod}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Evolución poblacional por censos</h3>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatNumber(value)}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                
                return (
                  <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
                    <div className="font-medium mb-2">Año {label}</div>
                    <div className="space-y-1.5">
                      {payload.map((item, index) => {
                        if (!item.value) return null;
                        
                        const isMunicipio = item.dataKey === 'population';
                        const isLocalidad = item.dataKey === 'locality';
                        const color = isMunicipio 
                          ? 'var(--color-chart-1)' 
                          : isLocalidad 
                            ? 'var(--color-chart-3)' 
                            : item.color || '#000';
                        const name = isMunicipio 
                          ? data.municipalityName 
                          : isLocalidad 
                            ? data.localityName || 'Localidad'
                            : item.name || '';
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {formatNumber(item.value as number)}
                            </span>
                            <span className="text-muted-foreground">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
            <Line
              dataKey="population"
              type="monotone"
              stroke="var(--color-chart-1)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-chart-1)" }}
            />
            {data.localityEvolution && (
              <Line
                dataKey="locality"
                type="monotone"
                stroke="var(--color-chart-3)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "var(--color-chart-3)" }}
              />
            )}
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
