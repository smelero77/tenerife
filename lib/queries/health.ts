/**
 * Health services queries
 * Gets health centers, hospitals, pharmacies and medical services data
 */

import { supabase } from '@/lib/supabase/client';

export interface HealthService {
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

export type HealthServiceCategory = 
  | 'hospitales'
  | 'centros_salud'
  | 'consultorios_ap'
  | 'farmacias'
  | 'otros_servicios'
  | 'establecimientos';

/**
 * Get health services for a municipality by category
 */
export async function getHealthServicesByIne(
  ineCode: string,
  category?: HealthServiceCategory
): Promise<HealthService[]> {
  let query = supabase
    .from('silver_centro_medico_farmacia')
    .select('id, establecimiento_nombre, establecimiento_tipo, establecimiento_telefono, establecimiento_email, establecimiento_web, establecimiento_direccion, establecimiento_codigo_postal, municipio_nombre, latitud, longitud, establecimiento_actividad, source_resource_id')
    .eq('ine_code', ineCode);

  // Filter by category if provided
  if (category) {
    switch (category) {
      case 'hospitales':
        query = query.ilike('establecimiento_tipo', '%servicios hospitalarios%');
        break;
      case 'centros_salud':
        query = query.or('establecimiento_tipo.ilike.%centro%salud%,establecimiento_actividad.ilike.%centro%salud%');
        break;
      case 'consultorios_ap':
        query = query.or('establecimiento_tipo.ilike.%consultorio%,establecimiento_actividad.ilike.%consultorio%,establecimiento_tipo.ilike.%atención%primaria%');
        break;
      case 'farmacias':
        query = query.or('establecimiento_tipo.ilike.%farmacia%,establecimiento_actividad.ilike.%farmacia%');
        break;
      case 'establecimientos':
        query = query.or('establecimiento_tipo.ilike.%establecimiento%,establecimiento_actividad.ilike.%establecimiento%');
        break;
      case 'otros_servicios':
        // Everything that doesn't match the other categories
        query = query
          .not('establecimiento_tipo.ilike.%hospital%')
          .not('establecimiento_tipo.ilike.%centro%salud%')
          .not('establecimiento_tipo.ilike.%consultorio%')
          .not('establecimiento_tipo.ilike.%atención%primaria%')
          .not('establecimiento_tipo.ilike.%farmacia%')
          .not('establecimiento_tipo.ilike.%establecimiento%');
        break;
    }
  }

  const { data, error } = await query.order('establecimiento_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching health services:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.establecimiento_nombre,
    tipo: row.establecimiento_tipo,
    telefono: row.establecimiento_telefono,
    email: row.establecimiento_email,
    web: row.establecimiento_web,
    direccion: row.establecimiento_direccion,
    codigo_postal: row.establecimiento_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud,
    longitud: row.longitud,
    actividad: row.establecimiento_actividad,
    source_resource_id: row.source_resource_id,
  }));
}

/**
 * Get last update date for health services
 */
export async function getHealthServicesLastUpdate(ineCode: string): Promise<Date | null> {
  const { data } = await supabase
    .from('silver_centro_medico_farmacia')
    .select('created_at')
    .eq('ine_code', ineCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.created_at ? new Date(data.created_at) : null;
}
