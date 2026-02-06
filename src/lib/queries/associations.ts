/**
 * Associations queries
 * Gets citizen associations data
 */

import { supabase } from '@/lib/supabase/client';

export interface CitizenAssociation {
  id: string;
  asociacion_nombre: string;
  asociacion_siglas: string | null;
  asociacion_cif: string | null;
  asociacion_telefono: string | null;
  asociacion_email: string | null;
  asociacion_web: string | null;
  asociacion_direccion: string | null;
  asociacion_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  asociacion_actividad: string | null;
  asociacion_ambito: string | null;
}

/**
 * Get citizen associations for a municipality
 */
export async function getCitizenAssociationsByIne(
  ineCode: string
): Promise<CitizenAssociation[]> {
  const { data, error } = await supabase
    .from('silver_asociacion_ciudadana')
    .select('*')
    .eq('ine_code', ineCode)
    .order('asociacion_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching citizen associations:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    asociacion_nombre: row.asociacion_nombre,
    asociacion_siglas: row.asociacion_siglas,
    asociacion_cif: row.asociacion_cif,
    asociacion_telefono: row.asociacion_telefono,
    asociacion_email: row.asociacion_email,
    asociacion_web: row.asociacion_web,
    asociacion_direccion: row.asociacion_direccion,
    asociacion_codigo_postal: row.asociacion_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    asociacion_actividad: row.asociacion_actividad,
    asociacion_ambito: row.asociacion_ambito,
  }));
}

/**
 * Get unique activity types for dynamic tabs
 */
export async function getAssociationActivityTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_asociacion_ciudadana')
    .select('asociacion_actividad')
    .eq('ine_code', ineCode)
    .not('asociacion_actividad', 'is', null);

  if (error) {
    console.error('Error fetching association activity types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.asociacion_actividad) {
      types.add(row.asociacion_actividad);
    }
  });

  return Array.from(types).sort();
}
