/**
 * Agriculture queries
 * Gets agricultural commerce data
 */

import { supabase } from '@/lib/supabase/client';

export interface AgriculturalCommerce {
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

/**
 * Get agricultural commerce for a municipality
 */
export async function getAgriculturalCommerceByIne(
  ineCode: string
): Promise<AgriculturalCommerce[]> {
  const { data, error } = await supabase
    .from('silver_comercio_agricultura')
    .select('*')
    .eq('ine_code', ineCode)
    .order('comercio_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching agricultural commerce:', error);
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
 * Get unique types for dynamic tabs
 */
export async function getAgriculturalCommerceTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_comercio_agricultura')
    .select('comercio_tipo')
    .eq('ine_code', ineCode)
    .not('comercio_tipo', 'is', null);

  if (error) {
    console.error('Error fetching agricultural commerce types:', error);
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
 * Get last update date for agricultural commerce
 */
export async function getAgriculturalCommerceLastUpdate(
  ineCode: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('silver_comercio_agricultura')
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
