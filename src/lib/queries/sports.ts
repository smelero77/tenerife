import { supabase } from '@/lib/supabase/client';

export interface ComplementarySpace {
  id: string;
  espacio_complementario_codigo: string;
  espacio_complementario_nombre: string;
  espacio_complementario_tipo?: string;
  espacio_complementario_clase?: string;
}

export interface InstallationCharacteristic {
  id: string;
  categoria: string;
  subcategoria?: string;
  caracteristica: string;
}

export interface SpaceCharacteristic {
  id: string;
  categoria: string;
  caracteristica: string;
}

export interface SportsInstallation {
  id: string;
  instalacion_codigo: string;
  instalacion_nombre: string;
  direccion?: string;
  codigo_postal?: string;
  email?: string;
  telefono_fijo?: string;
  web?: string;
  propiedad?: string;
  tipo_gestion?: string;
  latitud?: number;
  longitud?: number;
  espacios_deportivos?: SportsSpace[];
  espacios_complementarios?: ComplementarySpace[];
  caracteristicas?: InstallationCharacteristic[];
}

export interface SportsSpace {
  id: string;
  espacio_codigo: string;
  espacio_nombre: string;
  espacio_tipo?: string;
  espacio_clase?: string;
  espacio_actividad_principal?: string;
  pavimento_tipo?: string;
  espacio_cerramiento?: string;
  espacio_estado_uso?: string;
  espacio_iluminacion?: string;
  caracteristicas?: SpaceCharacteristic[];
}

export interface SportsCenter {
  id: string;
  centro_nombre: string;
  centro_tipo?: string;
  centro_telefono?: string;
  centro_email?: string;
  centro_web?: string;
  centro_direccion?: string;
  centro_codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  centro_actividad?: string;
}

export interface SportsEvent {
  id: string;
  evento_nombre: string;
  evento_descripcion?: string;
  evento_lugar?: string;
  evento_organizador?: string;
  evento_url?: string;
  evento_fecha_inicio: string;
  evento_fecha_fin?: string;
}

/**
 * Get sports installations by municipality INE code
 */
export async function getSportsInstallationsByIne(
  ineCode: string
): Promise<SportsInstallation[]> {

  const { data, error } = await supabase
    .from('silver_instalacion_deportiva')
    .select('*')
    .eq('ine_code', ineCode)
    .order('instalacion_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching sports installations:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch sports spaces, complementary spaces, and characteristics for each installation
  const installationsWithSpaces = await Promise.all(
    data.map(async (installation) => {
      // Fetch sports spaces
      const { data: spaces } = await supabase
        .from('silver_espacio_deportivo')
        .select('*')
        .eq('instalacion_codigo', installation.instalacion_codigo)
        .order('espacio_nombre', { ascending: true });

      // Fetch complementary spaces
      const { data: complementarySpaces } = await supabase
        .from('silver_espacio_complementario')
        .select('*')
        .eq('instalacion_codigo', installation.instalacion_codigo)
        .order('espacio_complementario_nombre', { ascending: true });

      // Fetch installation characteristics
      const { data: installationCharacteristics } = await supabase
        .from('silver_caracteristica_instalacion')
        .select('*')
        .eq('instalacion_codigo', installation.instalacion_codigo)
        .order('categoria', { ascending: true });

      // Fetch characteristics for each sports space
      const spacesWithCharacteristics = await Promise.all(
        (spaces || []).map(async (space) => {
          const { data: spaceCharacteristics } = await supabase
            .from('silver_caracteristica_espacio_deportivo')
            .select('*')
            .eq('espacio_codigo', space.espacio_codigo)
            .order('categoria', { ascending: true });

          return {
            id: space.id,
            espacio_codigo: space.espacio_codigo,
            espacio_nombre: space.espacio_nombre,
            espacio_tipo: space.espacio_tipo || undefined,
            espacio_clase: space.espacio_clase || undefined,
            espacio_actividad_principal:
              space.espacio_actividad_principal || undefined,
            pavimento_tipo: space.pavimento_tipo || undefined,
            espacio_cerramiento: space.espacio_cerramiento || undefined,
            espacio_estado_uso: space.espacio_estado_uso || undefined,
            espacio_iluminacion: space.espacio_iluminacion || undefined,
            caracteristicas:
              spaceCharacteristics?.map((char) => ({
                id: char.id,
                categoria: char.categoria,
                caracteristica: char.caracteristica,
              })) || [],
          };
        })
      );

      return {
        id: installation.id,
        instalacion_codigo: installation.instalacion_codigo,
        instalacion_nombre: installation.instalacion_nombre,
        direccion: undefined, // La tabla no tiene campo direccion directo
        codigo_postal: installation.codigo_postal || undefined,
        email: installation.email || undefined,
        telefono_fijo: installation.telefono_fijo || undefined,
        web: installation.web || undefined,
        propiedad: installation.propiedad || undefined,
        tipo_gestion: installation.tipo_gestion || undefined,
        latitud: installation.latitud ? Number(installation.latitud) : undefined,
        longitud: installation.longitud
          ? Number(installation.longitud)
          : undefined,
        espacios_deportivos: spacesWithCharacteristics,
        espacios_complementarios:
          complementarySpaces?.map((comp) => ({
            id: comp.id,
            espacio_complementario_codigo: comp.espacio_complementario_codigo,
            espacio_complementario_nombre: comp.espacio_complementario_nombre,
            espacio_complementario_tipo: comp.espacio_complementario_tipo || undefined,
            espacio_complementario_clase: comp.espacio_complementario_clase || undefined,
          })) || [],
        caracteristicas:
          installationCharacteristics?.map((char) => ({
            id: char.id,
            categoria: char.categoria,
            subcategoria: char.subcategoria || undefined,
            caracteristica: char.caracteristica,
          })) || [],
      };
    })
  );

  return installationsWithSpaces;
}

/**
 * Get unique installation types for dynamic tabs
 */
export async function getInstallationTypes(): Promise<string[]> {

  const { data, error } = await supabase
    .from('silver_instalacion_deportiva')
    .select('tipo_gestion')
    .not('tipo_gestion', 'is', null);

  if (error || !data) {
    return [];
  }

  const types = Array.from(
    new Set(data.map((item) => item.tipo_gestion).filter(Boolean))
  ) as string[];

  return types.sort();
}

/**
 * Get sports centers by municipality INE code
 */
export async function getSportsCentersByIne(
  ineCode: string
): Promise<SportsCenter[]> {

  const { data, error } = await supabase
    .from('silver_centro_deportivo_ocio')
    .select('*')
    .eq('ine_code', ineCode)
    .order('centro_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching sports centers:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((center) => ({
    id: center.id,
    centro_nombre: center.centro_nombre,
    centro_tipo: center.centro_tipo || undefined,
    centro_telefono: center.centro_telefono || undefined,
    centro_email: center.centro_email || undefined,
    centro_web: center.centro_web || undefined,
    centro_direccion: center.centro_direccion || undefined,
    centro_codigo_postal: center.centro_codigo_postal || undefined,
    latitud: center.latitud ? Number(center.latitud) : undefined,
    longitud: center.longitud ? Number(center.longitud) : undefined,
    centro_actividad: center.centro_actividad || undefined,
  }));
}

/**
 * Get unique center types for dynamic tabs
 */
export async function getSportsCenterTypes(): Promise<string[]> {

  const { data, error } = await supabase
    .from('silver_centro_deportivo_ocio')
    .select('centro_tipo')
    .not('centro_tipo', 'is', null);

  if (error || !data) {
    return [];
  }

  const types = Array.from(
    new Set(data.map((item) => item.centro_tipo).filter(Boolean))
  ) as string[];

  return types.sort();
}

/**
 * Get sports events by municipality INE code (only future events)
 */
export async function getSportsEventsByIne(
  ineCode: string
): Promise<SportsEvent[]> {

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('silver_evento_deportivo')
    .select('*')
    .eq('ine_code', ineCode)
    .gte('evento_fecha_inicio', now)
    .order('evento_fecha_inicio', { ascending: true });

  if (error) {
    console.error('Error fetching sports events:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((event) => ({
    id: event.id,
    evento_nombre: event.evento_nombre,
    evento_descripcion: event.evento_descripcion || undefined,
    evento_lugar: event.evento_lugar || undefined,
    evento_organizador: event.evento_organizador || undefined,
    evento_url: event.evento_url || undefined,
    evento_fecha_inicio: event.evento_fecha_inicio,
    evento_fecha_fin: event.evento_fecha_fin || undefined,
  }));
}

/**
 * Get last update date for sports installations
 */
export async function getSportsInstallationsLastUpdate(
  ineCode: string
): Promise<Date | null> {

  const { data, error } = await supabase
    .from('silver_instalacion_deportiva')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.created_at);
}

/**
 * Get last update date for sports centers
 */
export async function getSportsCentersLastUpdate(
  ineCode: string
): Promise<Date | null> {

  const { data, error } = await supabase
    .from('silver_centro_deportivo_ocio')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.created_at);
}

/**
 * Get last update date for sports events
 */
export async function getSportsEventsLastUpdate(
  ineCode: string
): Promise<Date | null> {

  const { data, error } = await supabase
    .from('silver_evento_deportivo')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.created_at);
}
