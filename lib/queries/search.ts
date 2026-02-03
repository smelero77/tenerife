/**
 * Search queries for municipalities and towns
 * All queries use public anon key (no RLS needed for public data)
 */

import { supabase } from '@/lib/supabase/client';

export interface MunicipalitySearchResult {
  ine_code: string;
  municipio_name: string;
  island: string;
  province: string;
}

export interface TownSearchResult {
  localidad_id: string;
  localidad_name: string;
  ine_code: string;
  tipo: 'NUC' | 'DIS';
  municipio_name: string; // Joined from dim_municipio
}

/**
 * Search municipalities by name (minimum 3 characters)
 * Returns all matching results (no limit)
 */
export async function searchMunicipalities(
  query: string
): Promise<MunicipalitySearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  const { data, error } = await supabase
    .from('dim_municipio')
    .select('ine_code, municipio_name, island, province')
    .ilike('municipio_name', `%${query}%`)
    .order('municipio_name', { ascending: true });

  if (error) {
    console.error('Error searching municipalities:', error);
    return [];
  }

  return data || [];
}

/**
 * Search towns/localities by name (minimum 3 characters)
 * Returns all matching results with municipality name joined
 */
export async function searchTowns(query: string): Promise<TownSearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  // First, get the towns matching the query (case insensitive)
  const { data: townsData, error: townsError } = await supabase
    .from('dim_localidad')
    .select('localidad_id, localidad_name, ine_code, tipo')
    .ilike('localidad_name', `%${query}%`)
    .order('localidad_name', { ascending: true });

  if (townsError) {
    console.error('Error searching towns:', townsError);
    return [];
  }

  if (!townsData || townsData.length === 0) {
    return [];
  }

  // Get unique municipality codes
  const ineCodes = [...new Set(townsData.map((t) => t.ine_code))];

  // Get municipality names
  const { data: municipalitiesData, error: municipalitiesError } =
    await supabase
      .from('dim_municipio')
      .select('ine_code, municipio_name')
      .in('ine_code', ineCodes);

  if (municipalitiesError) {
    console.error('Error fetching municipalities:', municipalitiesError);
    // Return towns without municipality names
    return townsData.map((town) => ({
      localidad_id: town.localidad_id,
      localidad_name: town.localidad_name,
      ine_code: town.ine_code,
      tipo: town.tipo as 'NUC' | 'DIS',
      municipio_name: '',
    }));
  }

  // Create a map for quick lookup
  const municipalityMap = new Map(
    (municipalitiesData || []).map((m) => [m.ine_code, m.municipio_name])
  );

  // Combine the data
  return townsData.map((town) => ({
    localidad_id: town.localidad_id,
    localidad_name: town.localidad_name,
    ine_code: town.ine_code,
    tipo: town.tipo as 'NUC' | 'DIS',
    municipio_name: municipalityMap.get(town.ine_code) || '',
  }));
}

/**
 * Get town and its municipality
 */
export async function getTownAndMunicipality(
  localidadId: string
): Promise<{
  town: TownSearchResult | null;
  municipality: MunicipalitySearchResult | null;
}> {
  const { data: townData, error: townError } = await supabase
    .from('dim_localidad')
    .select(`
      localidad_id,
      localidad_name,
      ine_code,
      tipo,
      dim_municipio:municipio_name
    `)
    .eq('localidad_id', localidadId)
    .single();

  if (townError || !townData) {
    return { town: null, municipality: null };
  }

  const town: TownSearchResult = {
    localidad_id: townData.localidad_id,
    localidad_name: townData.localidad_name,
    ine_code: townData.ine_code,
    tipo: townData.tipo as 'NUC' | 'DIS',
    municipio_name:
      typeof townData.dim_municipio === 'object' &&
      townData.dim_municipio !== null
        ? (townData.dim_municipio as { municipio_name: string }).municipio_name
        : '',
  };

  // Get municipality data
  const { data: municipalityData, error: municipalityError } = await supabase
    .from('dim_municipio')
    .select('ine_code, municipio_name, island, province')
    .eq('ine_code', town.ine_code)
    .single();

  if (municipalityError || !municipalityData) {
    return { town, municipality: null };
  }

  return {
    town,
    municipality: municipalityData as MunicipalitySearchResult,
  };
}
