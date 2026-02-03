/**
 * Municipality summary queries
 * Gets complete municipality data including statistics
 */

import { supabase } from '@/lib/supabase/client';

export interface MunicipalityBasic {
  ine_code: string;
  municipio_name: string;
  island: string;
  province: string;
}

export interface MunicipalityWikimedia {
  coordinates_lat: number | null;
  coordinates_lon: number | null;
  surface_area_km2: number | null;
  altitude_m: number | null;
  postal_code: string | null;
  mayor_name: string | null;
  official_website: string | null;
  foundation_date: string | null;
  town_hall_address: string | null;
  email: string | null;
  phone_number: string | null;
  cif: string | null;
  image_url: string | null;
  coat_of_arms_url: string | null;
  flag_url: string | null;
}

export interface MunicipalitySnapshot {
  population_total_municipio: number;
  number_of_nuclei: number;
  snapshot_date: string;
}

export interface MunicipalityStatistics {
  // Educación
  centros_educativos_culturales: number;
  // Salud
  centros_medicos_farmacias: number;
  // Comercios
  comercios_alimentacion: number;
  locales_comerciales: number;
  comercios_agricultura: number;
  // Deportes
  centros_deportivos_ocio: number;
  instalaciones_deportivas: number;
  // Cultura
  bienes_interes_cultural: number;
  // Otros
  asociaciones_ciudadanas: number;
  empresas_industriales: number;
  empresas_servicios: number;
  alojamientos_agencias_viajes: number;
  establecimientos_hosteleria: number;
  oficinas_turismo: number;
  equipamientos_uso_publico: number;
  instalaciones_residuos: number;
  actividades_formativas: number;
}

export interface MunicipalitySummary {
  basic: MunicipalityBasic;
  wikimedia: MunicipalityWikimedia | null;
  snapshot: MunicipalitySnapshot | null;
  statistics: MunicipalityStatistics;
}

/**
 * Get complete municipality summary by INE code
 */
export async function getMunicipalitySummaryByIne(
  ineCode: string
): Promise<MunicipalitySummary | null> {
  // Get basic municipality data
  const { data: basicData, error: basicError } = await supabase
    .from('dim_municipio')
    .select('ine_code, municipio_name, island, province')
    .eq('ine_code', ineCode)
    .single();

  if (basicError || !basicData) {
    return null;
  }

  const basic: MunicipalityBasic = basicData;

  // Get Wikimedia data (may not exist)
  const { data: wikimediaData } = await supabase
    .from('silver_wikimedia_municipio')
    .select('*')
    .eq('ine_code', ineCode)
    .single();

  const wikimedia: MunicipalityWikimedia | null = wikimediaData
    ? {
        coordinates_lat: wikimediaData.coordinates_lat
          ? Number(wikimediaData.coordinates_lat)
          : null,
        coordinates_lon: wikimediaData.coordinates_lon
          ? Number(wikimediaData.coordinates_lon)
          : null,
        surface_area_km2: wikimediaData.surface_area_km2
          ? Number(wikimediaData.surface_area_km2)
          : null,
        altitude_m: wikimediaData.altitude_m
          ? Number(wikimediaData.altitude_m)
          : null,
        postal_code: wikimediaData.postal_code || null,
        mayor_name: wikimediaData.mayor_name || null,
        official_website: wikimediaData.official_website || null,
        foundation_date: wikimediaData.foundation_date || null,
        town_hall_address: wikimediaData.town_hall_address || null,
        email: wikimediaData.email || null,
        phone_number: wikimediaData.phone_number || null,
        cif: wikimediaData.cif || null,
        image_url: wikimediaData.image_url || null,
        coat_of_arms_url: wikimediaData.coat_of_arms_url || null,
        flag_url: wikimediaData.flag_url || null,
      }
    : null;

  // Get most recent snapshot
  const { data: snapshotData } = await supabase
    .from('agg_municipio_snapshot')
    .select('population_total_municipio, number_of_nuclei, snapshot_date')
    .eq('ine_code', ineCode)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  const snapshot: MunicipalitySnapshot | null = snapshotData
    ? {
        population_total_municipio: snapshotData.population_total_municipio,
        number_of_nuclei: snapshotData.number_of_nuclei,
        snapshot_date: snapshotData.snapshot_date,
      }
    : null;

  // Get statistics from fact tables
  const statistics: MunicipalityStatistics = {
    centros_educativos_culturales: await getStatisticCount(
      'fact_centro_educativo_cultural_municipio_agg',
      ineCode
    ),
    centros_medicos_farmacias: await getStatisticCount(
      'fact_centro_medico_farmacia_municipio_agg',
      ineCode
    ),
    comercios_alimentacion: await getStatisticCount(
      'fact_comercio_alimentacion_municipio_agg',
      ineCode
    ),
    locales_comerciales: await getStatisticCount(
      'fact_local_comercial_municipio_agg',
      ineCode
    ),
    comercios_agricultura: await getStatisticCount(
      'fact_comercio_agricultura_municipio_agg',
      ineCode
    ),
    centros_deportivos_ocio: await getStatisticCount(
      'fact_centro_deportivo_ocio_municipio_agg',
      ineCode
    ),
    instalaciones_deportivas: await getStatisticCount(
      'fact_instalacion_deportiva_municipio_agg',
      ineCode
    ),
    bienes_interes_cultural: await getStatisticCount(
      'fact_bic_municipio_agg',
      ineCode
    ),
    asociaciones_ciudadanas: await getStatisticCount(
      'fact_asociacion_ciudadana_municipio_agg',
      ineCode
    ),
    empresas_industriales: await getStatisticCount(
      'fact_empresa_industrial_municipio_agg',
      ineCode
    ),
    empresas_servicios: await getStatisticCount(
      'fact_empresa_servicio_municipio_agg',
      ineCode
    ),
    alojamientos_agencias_viajes: await getStatisticCount(
      'fact_alojamiento_agencia_municipio_agg',
      ineCode
    ),
    establecimientos_hosteleria: await getStatisticCount(
      'fact_establecimiento_hosteleria_municipio_agg',
      ineCode
    ),
    oficinas_turismo: await getStatisticCount(
      'fact_oficina_turismo_municipio_agg',
      ineCode
    ),
    equipamientos_uso_publico: await getStatisticCount(
      'fact_equipamiento_municipio_agg',
      ineCode
    ),
    instalaciones_residuos: await getStatisticCount(
      'fact_instalacion_residuo_municipio_agg',
      ineCode
    ),
    actividades_formativas: await getStatisticCount(
      'fact_actividad_formativa_municipio_agg',
      ineCode
    ),
  };

  return {
    basic,
    wikimedia,
    snapshot,
    statistics,
  };
}

/**
 * Helper to get total count from a fact table
 */
async function getStatisticCount(
  tableName: string,
  ineCode: string
): Promise<number> {
  // Different fact tables have different count column names
  const countColumnMap: Record<string, string> = {
    fact_centro_educativo_cultural_municipio_agg: 'total_centros',
    fact_centro_medico_farmacia_municipio_agg: 'total_establecimientos',
    fact_comercio_alimentacion_municipio_agg: 'total_comercios',
    fact_local_comercial_municipio_agg: 'total_locales',
    fact_comercio_agricultura_municipio_agg: 'total_comercios',
    fact_centro_deportivo_ocio_municipio_agg: 'total_centros',
    fact_instalacion_deportiva_municipio_agg: 'total_instalaciones',
    fact_bic_municipio_agg: 'total_bic',
    fact_asociacion_ciudadana_municipio_agg: 'total_asociaciones',
    fact_empresa_industrial_municipio_agg: 'total_empresas',
    fact_empresa_servicio_municipio_agg: 'total_empresas',
    fact_alojamiento_agencia_municipio_agg: 'total_establecimientos',
    fact_establecimiento_hosteleria_municipio_agg: 'total',
    fact_oficina_turismo_municipio_agg: 'total',
    fact_equipamiento_municipio_agg: 'total',
    fact_instalacion_residuo_municipio_agg: 'total_instalaciones',
    fact_actividad_formativa_municipio_agg: 'total',
  };

  const countColumn = countColumnMap[tableName] || 'total';

  const { data, error } = await supabase
    .from(tableName)
    .select(countColumn)
    .eq('ine_code', ineCode);

  if (error || !data) {
    return 0;
  }

  // Sum all counts (some tables have multiple rows per municipality)
  return data.reduce((sum, row) => {
    const count = row[countColumn];
    return sum + (typeof count === 'number' ? count : 0);
  }, 0);
}
