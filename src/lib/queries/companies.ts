/**
 * Companies queries
 * Gets industrial and service companies data
 */

import { supabase } from '@/lib/supabase/client';

export interface IndustrialCompany {
  id: string;
  empresa_nombre: string;
  empresa_tipo: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  empresa_web: string | null;
  empresa_direccion: string | null;
  empresa_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  empresa_actividad: string | null;
}

export interface ServiceCompany {
  id: string;
  empresa_nombre: string;
  empresa_tipo: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  empresa_web: string | null;
  empresa_direccion: string | null;
  empresa_codigo_postal: string | null;
  municipio_nombre: string;
  latitud: number | null;
  longitud: number | null;
  empresa_actividad: string | null;
}

/**
 * Get industrial companies for a municipality
 */
export async function getIndustrialCompaniesByIne(
  ineCode: string
): Promise<IndustrialCompany[]> {
  const { data, error } = await supabase
    .from('silver_empresa_industrial')
    .select('*')
    .eq('ine_code', ineCode)
    .order('empresa_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching industrial companies:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    empresa_nombre: row.empresa_nombre,
    empresa_tipo: row.empresa_tipo,
    empresa_telefono: row.empresa_telefono,
    empresa_email: row.empresa_email,
    empresa_web: row.empresa_web,
    empresa_direccion: row.empresa_direccion,
    empresa_codigo_postal: row.empresa_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    empresa_actividad: row.empresa_actividad,
  }));
}

/**
 * Get service companies for a municipality
 */
export async function getServiceCompaniesByIne(
  ineCode: string
): Promise<ServiceCompany[]> {
  const { data, error } = await supabase
    .from('silver_empresa_servicio')
    .select('*')
    .eq('ine_code', ineCode)
    .order('empresa_nombre', { ascending: true });

  if (error) {
    console.error('Error fetching service companies:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    empresa_nombre: row.empresa_nombre,
    empresa_tipo: row.empresa_tipo,
    empresa_telefono: row.empresa_telefono,
    empresa_email: row.empresa_email,
    empresa_web: row.empresa_web,
    empresa_direccion: row.empresa_direccion,
    empresa_codigo_postal: row.empresa_codigo_postal,
    municipio_nombre: row.municipio_nombre,
    latitud: row.latitud ? Number(row.latitud) : null,
    longitud: row.longitud ? Number(row.longitud) : null,
    empresa_actividad: row.empresa_actividad,
  }));
}

/**
 * Get unique types for industrial companies
 */
export async function getIndustrialCompanyTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_empresa_industrial')
    .select('empresa_tipo')
    .eq('ine_code', ineCode)
    .not('empresa_tipo', 'is', null);

  if (error) {
    console.error('Error fetching industrial company types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.empresa_tipo) {
      types.add(row.empresa_tipo);
    }
  });

  return Array.from(types).sort();
}

/**
 * Get unique types for service companies
 */
export async function getServiceCompanyTypes(
  ineCode: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('silver_empresa_servicio')
    .select('empresa_tipo')
    .eq('ine_code', ineCode)
    .not('empresa_tipo', 'is', null);

  if (error) {
    console.error('Error fetching service company types:', error);
    return [];
  }

  const types = new Set<string>();
  (data || []).forEach((row) => {
    if (row.empresa_tipo) {
      types.add(row.empresa_tipo);
    }
  });

  return Array.from(types).sort();
}
