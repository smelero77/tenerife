"use client";

import { useState, useEffect } from "react";
import { DataNavigation, type DataCategory } from "@/components/navigation/data-navigation";
import { DemographicsTable } from "@/components/demographics/demographics-table";
import { PopulationEvolutionDashboard } from "@/components/demographics/population-evolution-dashboard";
import { getDemographicsByIne, getPopulationEvolution } from "@/lib/queries/demographics";
import { HealthServicesView } from "@/components/health/health-services-view";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MunicipalityDataViewProps {
  ineCode: string;
  selectedTownName?: string;
}

export function MunicipalityDataView({ ineCode, selectedTownName }: MunicipalityDataViewProps) {
  const [activeCategory, setActiveCategory] = useState<DataCategory>("demografia");
  const [demographicsData, setDemographicsData] = useState<Awaited<ReturnType<typeof getDemographicsByIne>> | null>(null);
  const [populationEvolution, setPopulationEvolution] = useState<Awaited<ReturnType<typeof getPopulationEvolution>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  // Load demographics when category changes to demografia
  useEffect(() => {
    if (activeCategory === "demografia") {
      setLoading(true);
      setLoadingEvolution(true);
      
      Promise.all([
        getDemographicsByIne(ineCode),
        getPopulationEvolution(ineCode, selectedTownName)
      ])
        .then(([demographics, evolution]) => {
          setDemographicsData(demographics);
          setPopulationEvolution(evolution);
          setLoading(false);
          setLoadingEvolution(false);
        })
        .catch((error) => {
          console.error("Error loading demographics:", error);
          setLoading(false);
          setLoadingEvolution(false);
        });
    }
  }, [activeCategory, ineCode, selectedTownName]);

  return (
    <div className="space-y-6">
      <DataNavigation
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {activeCategory === "demografia" && (
        <>
          {loadingEvolution ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : populationEvolution ? (
            <PopulationEvolutionDashboard data={populationEvolution} />
          ) : null}
          
          {loading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : demographicsData ? (
            <div className="mt-6">
              <DemographicsTable data={demographicsData} selectedTownName={selectedTownName} />
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No hay datos demográficos disponibles
            </div>
          )}
        </>
      )}

      {activeCategory === "educacion" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              Próximamente: Datos de Educación
            </div>
          </CardContent>
        </Card>
      )}

      {activeCategory === "sanidad" && (
        <HealthServicesView ineCode={ineCode} />
      )}

      {activeCategory === "cultura" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              Próximamente: Datos de Cultura
            </div>
          </CardContent>
        </Card>
      )}

      {activeCategory === "turismo" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              Próximamente: Datos de Turismo
            </div>
          </CardContent>
        </Card>
      )}

      {activeCategory === "comercios" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              Próximamente: Datos de Comercios
            </div>
          </CardContent>
        </Card>
      )}

      {activeCategory === "agricultura" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              Próximamente: Datos de Agricultura
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
