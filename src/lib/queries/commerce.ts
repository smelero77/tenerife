/**
 * Commerce queries
 * Gets commerce data (food stores and commercial premises)
 */

import { supabase } from '@/lib/supabase/client';

export interface FoodStore {
  id: string;
  comercio_nombre: string;
  comercio_tipo: string | null;
  comercio_telefono: string | null;
  comercio_email: string | null;
  comercio_web: string | null;
  comercio_direccion: string | null;
  comercio_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  comercio_actividad: string | null;
}

export interface CommercialPremise {
  id: string;
  local_nombre: string;
  local_tipo: string | null;
  local_telefono: string | null;
  local_email: string | null;
  local_web: string | null;
  local_direccion: string | null;
  local_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  local_actividad: string | null;
}

/**
 * Get food stores for a municipality
 */
export async function getFoodStoresByIne(
  ineCode: string
): Promise<FoodStore[]> {
  const { data, error } = await supabase
    .from('silver_comercio_alimentacion')
    .select('*')
    .eq('ine_code', ineCode)
    .order('comercio_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching food stores:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    comercio_nombre: row.comercio_nombre,
    comercio_tipo: row.comercio_tipo,
    comercio_telefono: row.comercio_telefono,
    comercio_email: row.comercio_email,
    comercio_web: row.comercio_web,
    comercio_direccion: row.comercio_direccion,
    comercio_codigo_postal: row.comercio_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    comercio_actividad: row.comercio_actividad,
  }));
}

/**
 * Get commercial premises for a municipality
 */
export async function getCommercialPremisesByIne(
  ineCode: string
): Promise<CommercialPremise[]> {
  const { data, error } = await supabase
    .from('silver_local_comercial')
    .select('*')
    .eq('ine_code', ineCode)
    .order('local_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching commercial premises:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    local_nombre: row.local_nombre,
    local_tipo: row.local_tipo,
    local_telefono: row.local_telefono,
    local_email: row.local_email,
    local_web: row.local_web,
    local_direccion: row.local_direccion,
    local_codigo_postal: row.local_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    local_actividad: row.local_actividad,
  }));
}

/**
 * Get unique types for food stores
 */
export async function getFoodStoreTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_comercio_alimentacion')
    .select('comercio_tipo')
    .eq('ine_code', ineCode)
    .not('comercio_tipo', 'is', null);

  if (error) {
    console.error('Error fetching food store types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.comercio_tipo) {
      types.add(row.comercio_tipo);
    }
  });

  return Array.from(types).sort();
}

/**
 * Get unique types for commercial premises
 */
export async function getCommercialPremiseTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_local_comercial')
    .select('local_tipo')
    .eq('ine_code', ineCode)
    .not('local_tipo', 'is', null);

  if (error) {
    console.error('Error fetching commercial premise types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.local_tipo) {
      types.add(row.local_tipo);
    }
  });

  return Array.from(types).sort();
}

/**
 * Get last update date for food stores
 */
export async function getFoodStoresLastUpdate(
  ineCode: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('silver_comercio_alimentacion')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.created_at;
}

/**
 * Get last update date for commercial premises
 */
export async function getCommercialPremisesLastUpdate(
  ineCode: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('silver_local_comercial')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.created_at;
}
