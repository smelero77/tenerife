/**
 * Tourism queries
 * Gets tourist accommodations, hospitality, travel agencies, and tourist information offices data
 */

import { supabase } from '@/lib/supabase/client';

// ============================================================================
// Tourist Accommodations (silver_alojamiento_turistico)
// ============================================================================

export interface TouristAccommodation {
  id: string;
  nombre: string;
  modalidad: string; // EXTRAHOTELERA, HOTELERA
  tipo: string; // APARTAMENTO, HOTEL, CASA RURAL, etc.
  direccion: string | null;
  codigo_postal: string | null;
  categoria: string | null; // 3 LLAVES, 4 ESTRELLAS, etc.
  unidades_alojativas: number | null;
  plazas_alojativas: number | null;
  municipio_nombre: string;
}

/**
 * Get tourist accommodations for a municipality
 */
export async function getTouristAccommodationsByIne(
  ineCode: string,
  modalidad?: string | null,
  tipo?: string | null
): Promise<TouristAccommodation[]> {
  let query = supabase
    .from('silver_alojamiento_turistico')
    .select('id, nombre, modalidad, tipo, direccion, codigo_postal, categoria, unidades_alojativas, plazas_alojativas, municipio_nombre')
    .eq('ine_code', ineCode);

  if (modalidad) {
    query = query.eq('modalidad', modalidad);
  }

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query.order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching tourist accommodations:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    modalidad: row.modalidad,
    tipo: row.tipo,
    direccion: row.direccion,
    codigo_postal: row.codigo_postal,
    categoria: row.categoria,
    unidades_alojativas: row.unidades_alojativas,
    plazas_alojativas: row.plazas_alojativas,
    municipio_nombre: row.municipio_nombre,
  }));
}

// ============================================================================
// Hospitality and Restaurant Establishments (silver_establecimiento_hosteleria_restauracion)
// ============================================================================

export interface HospitalityEstablishment {
  id: string;
  nombre: string;
  modalidad: string; // RESTAURACION, HOSTELERIA
  tipo: string; // BAR, RESTAURANTE, etc.
  direccion: string | null;
  codigo_postal: string | null;
  aforo_interior: number | null;
  aforo_terraza: number | null;
  municipio_nombre: string;
}

/**
 * Get hospitality establishments for a municipality
 */
export async function getHospitalityEstablishmentsByIne(
  ineCode: string,
  modalidad?: string | null,
  tipo?: string | null
): Promise<HospitalityEstablishment[]> {
  let query = supabase
    .from('silver_establecimiento_hosteleria_restauracion')
    .select('id, nombre, modalidad, tipo, direccion, codigo_postal, aforo_interior, aforo_terraza, municipio_nombre')
    .eq('ine_code', ineCode);

  if (modalidad) {
    query = query.eq('modalidad', modalidad);
  }

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query.order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching hospitality establishments:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    modalidad: row.modalidad,
    tipo: row.tipo,
    direccion: row.direccion,
    codigo_postal: row.codigo_postal,
    aforo_interior: row.aforo_interior,
    aforo_terraza: row.aforo_terraza,
    municipio_nombre: row.municipio_nombre,
  }));
}

// ============================================================================
// Other Tourism Establishments (silver_alojamiento_agencia_viaje)
// ============================================================================

export interface TourismEstablishment {
  id: string;
  nombre: string;
  tipo: string | null;
  actividad: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  source_resource_id: string;
}

/**
 * Get other tourism establishments for a municipality
 * Excludes accommodations (alojamiento hotelero, alojamiento extrahotelero, vivienda vacacional)
 */
export async function getTourismEstablishmentsByIne(
  ineCode: string,
  actividad?: string | null
): Promise<TourismEstablishment[]> {
  let query = supabase
    .from('silver_alojamiento_agencia_viaje')
    .select('id, establecimiento_nombre, establecimiento_tipo, establecimiento_actividad, establecimiento_telefono, establecimiento_email, establecimiento_web, establecimiento_direccion, establecimiento_codigo_postal, municipio_nombre, latitud, longitud, source_resource_id')
    .eq('ine_code', ineCode)
    // Exclude accommodations - they are in silver_alojamiento_turistico
    .neq('establecimiento_actividad', 'alojamiento hotelero')
    .neq('establecimiento_actividad', 'alojamiento extrahotelero')
    .neq('establecimiento_actividad', 'vivienda vacacional')
    // Exclude tourist offices - they are in silver_oficina_informacion_turistica
    .neq('establecimiento_actividad', 'oficina de turismo');

  if (actividad) {
    query = query.eq('establecimiento_actividad', actividad);
  }

  const { data, error } = await query.order('establecimiento_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching tourism establishments:', error);
    return [];
  }

  // Additional filter in case some records have null actividad
  const excludedActivities = ['alojamiento hotelero', 'alojamiento extrahotelero', 'vivienda vacacional', 'oficina de turismo'];
  const filtered = (data || []).filter((row) => 
    !row.establecimiento_actividad || !excludedActivities.includes(row.establecimiento_actividad)
  );

  return filtered.map((row) => ({
    id: row.id,
    nombre: row.establecimiento_nombre,
    tipo: row.establecimiento_tipo,
    actividad: row.establecimiento_actividad,
    telefono: row.establecimiento_telefono,
    email: row.establecimiento_email,
    web: row.establecimiento_web,
    direccion: row.establecimiento_direccion,
    codigo_postal: row.establecimiento_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    source_resource_id: row.source_resource_id,
  }));
}

// ============================================================================
// Tourist Information Offices (silver_oficina_informacion_turistica)
// ============================================================================

export interface TouristInformationOffice {
  id: string;
  nombre: string;
  horario: string | null;
  telefono: string | null;
  descripcion: string | null;
  ubicacion: string | null;
  zona: string | null;
  estado: string | null;
  codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
}

/**
 * Get tourist information offices for a municipality
 */
export async function getTouristInformationOfficesByIne(
  ineCode: string
): Promise<TouristInformationOffice[]> {
  const { data, error } = await supabase
    .from('silver_oficina_informacion_turistica')
    .select('id, oficina_nombre, oficina_horario, oficina_telefono, oficina_descripcion, oficina_ubicacion, oficina_zona, oficina_estado, oficina_codigo_postal, municipio_nombre, latitud, longitud')
    .eq('ine_code', ineCode)
    .order('oficina_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching tourist information offices:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.oficina_nombre,
    horario: row.oficina_horario,
    telefono: row.oficina_telefono,
    descripcion: row.oficina_descripcion,
    ubicacion: row.oficina_ubicacion,
    zona: row.oficina_zona,
    estado: row.oficina_estado,
    codigo_postal: row.oficina_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
  }));
}

/**
 * Get unique accommodation types for a municipality
 */
export async function getAccommodationTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_alojamiento_turistico')
    .select('tipo')
    .eq('ine_code', ineCode);

  if (error) {
    console.error('Error fetching accommodation types:', error);
    return [];
  }

  const uniqueTypes = Array.from(
    new Set((data || []).map((row) => row.tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}

/**
 * Get unique hospitality types for a municipality
 */
export async function getHospitalityTypes(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_establecimiento_hosteleria_restauracion')
    .select('tipo')
    .eq('ine_code', ineCode);

  if (error) {
    console.error('Error fetching hospitality types:', error);
    return [];
  }

  const uniqueTypes = Array.from(
    new Set((data || []).map((row) => row.tipo).filter(Boolean))
  ) as string[];

  return uniqueTypes.sort();
}

/**
 * Get unique tourism establishment activities for a municipality
 */
export async function getTourismEstablishmentActivities(ineCode: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_alojamiento_agencia_viaje')
    .select('establecimiento_actividad')
    .eq('ine_code', ineCode)
    .neq('establecimiento_actividad', 'alojamiento hotelero')
    .neq('establecimiento_actividad', 'alojamiento extrahotelero')
    .neq('establecimiento_actividad', 'vivienda vacacional')
    .neq('establecimiento_actividad', 'oficina de turismo')
    .not('establecimiento_actividad', 'is', null);

  if (error) {
    console.error('Error fetching tourism establishment activities:', error);
    return [];
  }

  // Additional filter
  const excludedActivities = ['alojamiento hotelero', 'alojamiento extrahotelero', 'vivienda vacacional', 'oficina de turismo'];
  const filtered = (data || []).filter((row) => 
    row.establecimiento_actividad && !excludedActivities.includes(row.establecimiento_actividad)
  );

  const uniqueActivities = Array.from(
    new Set(filtered.map((row) => row.establecimiento_actividad).filter(Boolean))
  ) as string[];

  return uniqueActivities.sort();
}
