/**
 * Culture queries
 * Gets cultural centers and Bienes de Interés Cultural (BIC) data
 */

import { supabase } from '@/lib/supabase/client';

// ============================================================================
// Cultural Centers (from silver_centro_educativo_cultural)
// ============================================================================

export interface CulturalCenter {
  id: string;
  nombre: string;
  tipo: string; // asociacion cultural, biblioteca ludoteca, centro cultural, museos salas de arte
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

// Cultural center types to include
const CULTURAL_CENTER_TYPES = [
  'asociacion cultural',
  'biblioteca ludoteca',
  'centro cultural',
  'museos salas de arte',
];

/**
 * Get cultural centers for a municipality
 */
export async function getCulturalCentersByIne(
  ineCode: string,
  tipo?: string | null
): Promise<CulturalCenter[]> {
  let query = supabase
    .from('silver_centro_educativo_cultural')
    .select('id, centro_nombre, centro_tipo, centro_telefono, centro_email, centro_web, centro_direccion, centro_codigo_postal, municipio_nombre, latitud, longitud, centro_actividad, source_resource_id')
    .eq('ine_code', ineCode)
    .in('centro_tipo', CULTURAL_CENTER_TYPES);

  if (tipo) {
    query = query.eq('centro_tipo', tipo);
  }

  const { data, error } = await query.order('centro_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching cultural centers:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.centro_nombre,
    tipo: row.centro_tipo,
    telefono: row.centro_telefono,
    email: row.centro_email,
    web: row.centro_web,
    direccion: row.centro_direccion,
    codigo_postal: row.centro_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    actividad: row.centro_actividad,
    source_resource_id: row.source_resource_id,
  }));
}

/**
 * Get unique cultural center types for a municipality
 */
export async function getCulturalCenterTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_centro_educativo_cultural')
    .select('centro_tipo')
    .eq('ine_code', ineCode)
    .in('centro_tipo', CULTURAL_CENTER_TYPES);

  if (error) {
    console.error('Error fetching cultural center types:', error);
    return [];
  }

  const uniqueTypes = Array.from(
    new Set((data || []).map((row) => row.centro_tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}

// ============================================================================
// Bienes de Interés Cultural (BIC)
// ============================================================================

export interface BienInteresCultural {
  id: string;
  nombre: string;
  categoria: string; // ZONA ARQUEOLÓGICA, CONJUNTO HISTÓRICO, MONUMENTO, etc.
  entorno: boolean | null;
  descripcion: string | null;
  boletin1_nombre: string | null;
  boletin1_url: string | null;
  boletin2_nombre: string | null;
  boletin2_url: string | null;
  municipio_nombre: string;
}

/**
 * Get Bienes de Interés Cultural for a municipality
 */
export async function getBienesInteresCulturalByIne(
  ineCode: string,
  categoria?: string | null
): Promise<BienInteresCultural[]> {
  let query = supabase
    .from('silver_bic')
    .select('id, bic_nombre, bic_categoria, bic_entorno, bic_descripcion, boletin1_nombre, boletin1_url, boletin2_nombre, boletin2_url, municipio_nombre')
    .eq('ine_code', ineCode);

  if (categoria) {
    query = query.eq('bic_categoria', categoria);
  }

  const { data, error } = await query.order('bic_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching BIC:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.bic_nombre,
    categoria: row.bic_categoria,
    entorno: row.bic_entorno,
    descripcion: row.bic_descripcion,
    boletin1_nombre: row.boletin1_nombre,
    boletin1_url: row.boletin1_url,
    boletin2_nombre: row.boletin2_nombre,
    boletin2_url: row.boletin2_url,
    municipio_nombre: row.municipio_nombre,
  }));
}

/**
 * Get unique BIC categories for a municipality
 */
export async function getBICCategories(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_bic')
    .select('bic_categoria')
    .eq('ine_code', ineCode);

  if (error) {
    console.error('Error fetching BIC categories:', error);
    return [];
  }

  const uniqueCategories = Array.from(
    new Set((data || []).map((row) => row.bic_categoria).filter(Boolean))
  ) as string[];

  return uniqueCategories.sort();
}
