/**
 * Public equipment queries
 * Gets public use equipment data
 */

import { supabase } from '@/lib/supabase/client';

export interface PublicEquipment {
  id: string;
  equipamiento_nombre: string;
  equipamiento_tipo: string;
  municipio_nombre: string;
  espacio_natural_nombre: string | null;
  puntos_interes: string | null;
  latitud: number | null;
  longitud: number | null;
}

/**
 * Get public equipment for a municipality
 */
export async function getPublicEquipmentByIne(
  ineCode: string
): Promise<PublicEquipment[]> {
  const { data, error } = await supabase
    .from('silver_equipamiento_uso_publico')
    .select('*')
    .eq('ine_code', ineCode)
    .order('equipamiento_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching public equipment:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    equipamiento_nombre: row.equipamiento_nombre,
    equipamiento_tipo: row.equipamiento_tipo,
    municipio_nombre: row.municipio_nombre,
    espacio_natural_nombre: row.espacio_natural_nombre,
    puntos_interes: row.puntos_interes,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
  }));
}

/**
 * Get unique equipment types for dynamic tabs
 */
export async function getEquipmentTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_equipamiento_uso_publico')
    .select('equipamiento_tipo')
    .eq('ine_code', ineCode);

  if (error) {
    console.error('Error fetching equipment types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.equipamiento_tipo) {
      types.add(row.equipamiento_tipo);
    }
  });

  return Array.from(types).sort();
}
