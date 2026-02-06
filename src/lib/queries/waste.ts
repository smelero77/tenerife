/**
 * Waste installations queries
 * Gets waste treatment facilities data
 */

import { supabase } from '@/lib/supabase/client';

export interface WasteInstallation {
  id: string;
  instalacion_nombre: string;
  titular: string | null;
  gestiona: string | null;
  telefono: string | null;
  descripcion: string | null;
  direccion: string | null;
  direccion_tipo_via: string | null;
  direccion_nombre_via: string | null;
  direccion_numero: string | null;
  direccion_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  horario_1: string | null;
  horario_2: string | null;
}

/**
 * Get waste installations for a municipality
 */
export async function getWasteInstallationsByIne(
  ineCode: string
): Promise<WasteInstallation[]> {
  const { data, error } = await supabase
    .from('silver_instalacion_residuo')
    .select('*')
    .eq('ine_code', ineCode)
    .order('instalacion_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching waste installations:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    instalacion_nombre: row.instalacion_nombre,
    titular: row.titular,
    gestiona: row.gestiona,
    telefono: row.telefono,
    descripcion: row.descripcion,
    direccion: row.direccion,
    direccion_tipo_via: row.direccion_tipo_via,
    direccion_nombre_via: row.direccion_nombre_via,
    direccion_numero: row.direccion_numero,
    direccion_codigo_postal: row.direccion_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    horario_1: row.horario_1,
    horario_2: row.horario_2,
  }));
}
