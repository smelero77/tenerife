/**
 * Education queries
 * Gets educational centers and training activities data
 */

import { supabase } from '@/lib/supabase/client';

export interface EducationalCenter {
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

export interface TrainingActivity {
  id: string;
  actividad_id: string;
  titulo: string;
  tipo: string;
  agencia_nombre: string;
  lugar_nombre: string | null;
  municipio_nombre: string;
  dias: number | null;
  horas: number | null;
  plazas: number | null;
  horario: string | null;
  estado: string;
  inicio: string | null;
  fin: string | null;
  inscripcion_estado: string | null;
}

// Educational center types (exclude cultural centers)
const CULTURAL_CENTER_TYPES = [
  'asociacion cultural',
  'biblioteca ludoteca',
  'centro cultural',
  'museos salas de arte',
];

/**
 * Get educational centers for a municipality
 * Excludes cultural centers (they are in the Culture tab)
 */
export async function getEducationalCentersByIne(
  ineCode: string,
  tipo?: string | null
): Promise<EducationalCenter[]> {
  let query = supabase
    .from('silver_centro_educativo_cultural')
    .select('id, centro_nombre, centro_tipo, centro_telefono, centro_email, centro_web, centro_direccion, centro_codigo_postal, municipio_nombre, latitud, longitud, centro_actividad, source_resource_id')
    .eq('ine_code', ineCode);

  const { data, error } = await query.order('centro_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching educational centers:', error);
    return [];
  }

  // Filter out cultural centers and filter by tipo if provided
  let filtered = (data || []).filter((row) => 
    row.centro_tipo && !CULTURAL_CENTER_TYPES.includes(row.centro_tipo)
  );

  if (tipo) {
    filtered = filtered.filter((row) => row.centro_tipo === tipo);
  }

  return filtered.map((row) => ({
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
 * Get training activities for a municipality
 */
export async function getTrainingActivitiesByIne(
  ineCode: string,
  tipo?: string | null
): Promise<TrainingActivity[]> {
  let query = supabase
    .from('silver_actividad_formativa_agrocabildo')
    .select('id, actividad_id, actividad_titulo, actividad_tipo, agencia_nombre, lugar_nombre, municipio_nombre, actividad_dias, actividad_horas, actividad_plazas, actividad_horario, actividad_estado, actividad_inicio, actividad_fin, inscripcion_estado')
    .eq('ine_code', ineCode);

  // Filter by tipo if provided
  if (tipo) {
    query = query.eq('actividad_tipo', tipo);
  }

  const { data, error } = await query.order('actividad_inicio', { ascending: true });

  if (error) {
    console.error('Error fetching training activities:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    actividad_id: row.actividad_id,
    titulo: row.actividad_titulo,
    tipo: row.actividad_tipo,
    agencia_nombre: row.agencia_nombre,
    lugar_nombre: row.lugar_nombre,
    municipio_nombre: row.municipio_nombre,
    dias: row.actividad_dias,
    horas: row.actividad_horas ? Number(row.actividad_horas) : null,
    plazas: row.actividad_plazas,
    horario: row.actividad_horario,
    estado: row.actividad_estado,
    inicio: row.actividad_inicio,
    fin: row.actividad_fin,
    inscripcion_estado: row.inscripcion_estado,
  }));
}

/**
 * Get unique educational center types for a municipality
 */
export async function getEducationalCenterTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_centro_educativo_cultural')
    .select('centro_tipo')
    .eq('ine_code', ineCode)
    .neq('centro_tipo', 'asociacion cultural')
    .neq('centro_tipo', 'biblioteca ludoteca')
    .neq('centro_tipo', 'centro cultural')
    .neq('centro_tipo', 'museos salas de arte')
    .not('centro_tipo', 'is', null);

  if (error) {
    console.error('Error fetching educational center types:', error);
    return [];
  }

  // Additional filter in case some records slip through
  const filtered = (data || []).filter((row) => 
    row.centro_tipo && !CULTURAL_CENTER_TYPES.includes(row.centro_tipo)
  );

  const uniqueTypes = Array.from(
    new Set(filtered.map((row) => row.centro_tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}

/**
 * Get unique training activity types for a municipality
 */
export async function getTrainingActivityTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_actividad_formativa_agrocabildo')
    .select('actividad_tipo')
    .eq('ine_code', ineCode);

  if (error) {
    console.error('Error fetching training activity types:', error);
    return [];
  }

  const uniqueTypes = Array.from(
    new Set((data || []).map((row) => row.actividad_tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}
