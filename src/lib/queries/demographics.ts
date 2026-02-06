/**
 * Demographics queries
 * Gets population data by municipality and localities
 */

import { supabase } from '@/lib/supabase/client';

export interface DemographicsRow {
  name: string;
  localidad_id: string | null; // null for municipality row
  total: number;
  mujeres: number;
  hombres: number;
  espanoles: number;
  extranjeros: number;
  age_0_14: number;
  age_15_64: number;
  age_65_plus: number;
}

export interface DemographicsData {
  municipality: DemographicsRow;
  localities: DemographicsRow[];
  year: number;
}

/**
 * Get demographics data for a municipality and its localities
 * Uses pre-calculated aggregated tables for fast queries
 */
export async function getDemographicsByIne(
  ineCode: string
): Promise<DemographicsData | null> {
  // Get the most recent year available for this municipality
  const { data: munData } = await supabase
    .from('agg_demographics_municipio')
    .select('year, municipio_name, total, mujeres, hombres, espanoles, extranjeros, age_0_14, age_15_64, age_65_plus')
    .eq('ine_code', ineCode)
    .order('year', { ascending: false })
    .limit(1)
    .single();

  if (!munData) {
    return null;
  }

  const year = munData.year;

  // Helper function to convert values to integers
  const toInt = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const municipality: DemographicsRow = {
    name: munData.municipio_name,
    localidad_id: null,
    total: toInt(munData.total),
    mujeres: toInt(munData.mujeres),
    hombres: toInt(munData.hombres),
    espanoles: toInt(munData.espanoles),
    extranjeros: toInt(munData.extranjeros),
    age_0_14: toInt(munData.age_0_14),
    age_15_64: toInt(munData.age_15_64),
    age_65_plus: toInt(munData.age_65_plus),
  };

  // Get all localities for this municipality and year
  const { data: localitiesData } = await supabase
    .from('agg_demographics_localidad')
    .select('localidad_id, localidad_name, total, mujeres, hombres, espanoles, extranjeros, age_0_14, age_15_64, age_65_plus')
    .eq('ine_code', ineCode)
    .eq('year', year)
    .order('localidad_name', { ascending: true });

  const localities: DemographicsRow[] = (localitiesData || []).map((loc) => {
    // Ensure all numeric values are properly converted to numbers
    const toInt = (val: unknown): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    return {
      name: loc.localidad_name,
      localidad_id: loc.localidad_id,
      total: toInt(loc.total),
      mujeres: toInt(loc.mujeres),
      hombres: toInt(loc.hombres),
      espanoles: toInt(loc.espanoles),
      extranjeros: toInt(loc.extranjeros),
      age_0_14: toInt(loc.age_0_14),
      age_15_64: toInt(loc.age_15_64),
      age_65_plus: toInt(loc.age_65_plus),
    };
  });

  return {
    municipality,
    localities,
    year,
  };
}

export interface PopulationEvolutionData {
  year: number;
  population: number;
}

export interface PopulationStats {
  maxPopulation: {
    year: number;
    value: number;
  };
  minPopulation: {
    year: number;
    value: number;
  };
  trend: 'Alcista' | 'Bajista' | 'Estable';
  trendPeriod: string; // e.g., "Últimos 5 años", "Últimos 3 años", etc.
  evolution: PopulationEvolutionData[];
  municipalityName: string; // Name of the municipality
  localityEvolution?: PopulationEvolutionData[]; // Evolution data for selected locality
  localityName?: string; // Name of selected locality
}

/**
 * Get historical population evolution for a municipality and optionally a locality
 */
export async function getPopulationEvolution(
  ineCode: string,
  selectedTownName?: string
): Promise<PopulationStats | null> {
  // Get municipality name
  const { data: municipalityData } = await supabase
    .from('dim_municipio')
    .select('municipio_name')
    .eq('ine_code', ineCode)
    .single();

  if (!municipalityData) {
    return null;
  }

  // Get all historical population data for this municipality
  const { data: historyData } = await supabase
    .from('fact_population_sex_municipio')
    .select('year, population_total')
    .eq('ine_code', ineCode)
    .order('year', { ascending: true });

  if (!historyData || historyData.length === 0) {
    return null;
  }

  const evolution: PopulationEvolutionData[] = historyData.map((row) => ({
    year: row.year,
    population: row.population_total,
  }));

  // Find max and min
  const maxEntry = historyData.reduce((max, curr) => 
    curr.population_total > max.population_total ? curr : max
  );
  const minEntry = historyData.reduce((min, curr) => 
    curr.population_total < min.population_total ? curr : min
  );

  // Calculate trend (compare first and last, and recent trend)
  const firstYear = historyData[0];
  const lastYear = historyData[historyData.length - 1];
  const firstValue = firstYear.population_total;
  const lastValue = lastYear.population_total;
  
  // Recent trend (last 5 years if available, otherwise use all available data)
  const recentYears = historyData.slice(-5);
  const recentTrend = recentYears.length >= 2 
    ? recentYears[recentYears.length - 1].population_total - recentYears[0].population_total
    : lastValue - firstValue;

  let trend: 'Alcista' | 'Bajista' | 'Estable';
  if (recentTrend > 0) {
    trend = 'Alcista';
  } else if (recentTrend < 0) {
    trend = 'Bajista';
  } else {
    trend = 'Estable';
  }

  // Determine period based on actual years used for trend calculation
  let trendPeriod: string;
  if (recentYears.length >= 5) {
    trendPeriod = 'Últimos 5 años';
  } else if (recentYears.length >= 3) {
    trendPeriod = `Últimos ${recentYears.length} años`;
  } else if (recentYears.length >= 2) {
    trendPeriod = `Últimos ${recentYears.length} años`;
  } else {
    const yearsSpan = lastYear.year - firstYear.year;
    trendPeriod = `${yearsSpan} años`;
  }

  // Get locality evolution data if a town is selected
  let localityEvolution: PopulationEvolutionData[] | undefined;
  if (selectedTownName) {
    // First, get the localidad_id from dim_localidad
    const { data: localityData } = await supabase
      .from('dim_localidad')
      .select('localidad_id')
      .eq('ine_code', ineCode)
      .ilike('localidad_name', selectedTownName)
      .limit(1)
      .single();

    if (localityData) {
      // Get historical population data for this locality
      const { data: localityHistoryData } = await supabase
        .from('fact_population_sex_localidad')
        .select('year, population_total')
        .eq('localidad_id', localityData.localidad_id)
        .order('year', { ascending: true });

      if (localityHistoryData && localityHistoryData.length > 0) {
        localityEvolution = localityHistoryData.map((row) => ({
          year: row.year,
          population: row.population_total,
        }));
      }
    }
  }

  return {
    maxPopulation: {
      year: maxEntry.year,
      value: maxEntry.population_total,
    },
    minPopulation: {
      year: minEntry.year,
      value: minEntry.population_total,
    },
    trend,
    trendPeriod,
    evolution,
    municipalityName: municipalityData.municipio_name,
    localityEvolution,
    localityName: selectedTownName,
  };
}
