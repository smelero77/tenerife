"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHealthServicesByIne, getHealthServicesLastUpdate, type HealthServiceCategory, type HealthService } from "@/lib/queries/health";
import { HealthServiceCard } from "./health-service-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Heart, Stethoscope, Pill, Activity, Store } from "lucide-react";

interface HealthServicesViewProps {
  ineCode: string;
}

const categories: Array<{
  id: HealthServiceCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "hospitales",
    label: "Hospitales",
    icon: Building2,
  },
  {
    id: "centros_salud",
    label: "Centros de salud",
    icon: Heart,
  },
  {
    id: "consultorios_ap",
    label: "Consultorios AP",
    icon: Stethoscope,
  },
  {
    id: "farmacias",
    label: "Farmacias",
    icon: Pill,
  },
  {
    id: "otros_servicios",
    label: "Otros servicios",
    icon: Activity,
  },
  {
    id: "establecimientos",
    label: "Establecimientos",
    icon: Store,
  },
];

export function HealthServicesView({ ineCode }: HealthServicesViewProps) {
  const [activeCategory, setActiveCategory] = useState<HealthServiceCategory>("hospitales");
  const [services, setServices] = useState<HealthService[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getHealthServicesByIne(ineCode, activeCategory),
      getHealthServicesLastUpdate(ineCode)
    ])
      .then(([servicesData, updateDate]) => {
        setServices(servicesData);
        setLastUpdate(updateDate);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading health services:", error);
        setLoading(false);
      });
  }, [ineCode, activeCategory]);

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Centros y servicios sanitarios</h2>
        </div>
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            Última actualización: {formatDate(lastUpdate)}
          </p>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as HealthServiceCategory)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
                <span className="sm:hidden">{category.label.split(" ")[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Records count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          N° de registros: {services.length}
        </p>
      )}

      {/* Services List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((service) => (
            <HealthServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          No hay servicios sanitarios disponibles para esta categoría
        </div>
      )}
    </div>
  );
}
