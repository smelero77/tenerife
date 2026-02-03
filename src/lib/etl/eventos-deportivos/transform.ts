/**
 * Transform raw CKAN records to Silver layer records
 * Filters: Only 2026 events, with valid municipio_nombre
 */

import { RawCkanEventoRecord, SilverEventoRecord } from './types';
import { mapMunicipioToIneCode, buildMunicipiosMap } from '../ckan/transform';

/**
 * Normalize string value (trim and handle empty strings)
 */
function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Normalize date string to ISO 8601 format
 * Handles formats like "2026-01-25 10:00:00" or "2026-01-25T10:00:00"
 */
function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  
  // Try to parse and validate
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      return null;
    }
    // Return ISO 8601 format
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Check if date is in year 2026
 */
function isYear2026(dateStr: string | null): boolean {
  if (!dateStr) {
    return false;
  }
  try {
    const date = new Date(dateStr);
    return date.getFullYear() === 2026;
  } catch {
    return false;
  }
}

/**
 * Transform raw CKAN record to Silver record
 * Returns null if:
 * - Missing required fields (evento_nombre, municipio_nombre, evento_fecha_inicio)
 * - municipio_nombre is empty/null
 * - evento_fecha_inicio is not in 2026
 */
export function transformEventoRecord(
  rawRecord: RawCkanEventoRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverEventoRecord | null {
  // Required fields
  const eventoNombre = normalizeString(rawRecord.evento_nombre);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre);
  const fechaInicioStr = normalizeDate(rawRecord.evento_fecha_inicio);

  // Validate required fields
  if (!eventoNombre || !municipioNombre || !fechaInicioStr) {
    return null; // Skip records with missing required fields
  }

  // Filter: Only 2026 events
  if (!isYear2026(fechaInicioStr)) {
    return null; // Skip events not in 2026
  }

  // Optional fields
  const eventoUrl = normalizeString(rawRecord.evento_url);
  const eventoDescripcion = normalizeString(rawRecord.evento_descripcion);
  const eventoLugar = normalizeString(rawRecord.evento_lugar);
  const eventoOrganizador = normalizeString(rawRecord.evento_organizador);
  const fechaFinStr = normalizeDate(rawRecord.evento_fecha_fin);

  // Validate fecha_fin is also in 2026 if provided
  if (fechaFinStr && !isYear2026(fechaFinStr)) {
    return null; // Skip if fecha_fin is not in 2026
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    evento_nombre: eventoNombre,
    evento_url: eventoUrl,
    evento_descripcion: eventoDescripcion,
    evento_lugar: eventoLugar,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    evento_organizador: eventoOrganizador,
    evento_fecha_inicio: fechaInicioStr,
    evento_fecha_fin: fechaFinStr,
  };
}

/**
 * Re-export mapping functions from ckan/transform
 */
export { mapMunicipioToIneCode, buildMunicipiosMap };
