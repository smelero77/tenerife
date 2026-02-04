/**
 * Public administration queries
 * Gets public administrations and services data
 */

import { supabase } from '@/lib/supabase/client';

export interface PublicAdministration {
  id: string;
  nombre: string;
  tipo: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  actividad: string | null;
  source_resource_id: string;
}

/**
 * Get public administrations for a municipality
 */
export async function getPublicAdministrationsByIne(
  ineCode: string,
  tipo?: string | null
): Promise<PublicAdministration[]> {
  let query = supabase
    .from('silver_administracion_servicio_publico')
    .select('id, administracion_nombre, administracion_tipo, administracion_telefono, administracion_email, administracion_web, administracion_direccion, administracion_codigo_postal, municipio_nombre, latitud, longitud, administracion_actividad, source_resource_id')
    .eq('ine_code', ineCode);

  // Filter by tipo if provided
  if (tipo) {
    query = query.eq('administracion_tipo', tipo);
  }

  const { data, error } = await query.order('administracion_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching public administrations:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.administracion_nombre,
    tipo: row.administracion_tipo,
    telefono: row.administracion_telefono,
    email: row.administracion_email,
    web: row.administracion_web,
    direccion: row.administracion_direccion,
    codigo_postal: row.administracion_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    actividad: row.administracion_actividad,
    source_resource_id: row.source_resource_id,
  }));
}

/**
 * Get unique administration types for a municipality
 */
export async function getAdministrationTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_administracion_servicio_publico')
    .select('administracion_tipo')
    .eq('ine_code', ineCode)
    .not('administracion_tipo', 'is', null);

  if (error) {
    console.error('Error fetching administration types:', error);
    return [];
  }

  const uniqueTypes = Array.from(
    new Set((data || []).map((row) => row.administracion_tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}
