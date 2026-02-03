/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanAlojamientoRecord, SilverAlojamientoRecord } from './types';
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
 * Normalize integer value (handle strings and numbers)
 */
function normalizeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : Math.floor(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
      return null;
    }
    const num = parseInt(trimmed, 10);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  return null;
}

/**
 * Normalize postal code (handle strings and numbers, max 10 chars)
 */
function normalizePostalCode(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  // Truncate to 10 characters max
  return str.length > 10 ? str.substring(0, 10) : str;
}

/**
 * Transform raw CKAN record to Silver record
 */
export function transformAlojamientoRecord(
  rawRecord: RawCkanAlojamientoRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverAlojamientoRecord | null {
  // Required fields
  const municipioNombre = normalizeString(rawRecord.municipio);
  const modalidad = normalizeString(rawRecord.modalidad);
  const tipo = normalizeString(rawRecord.tipo);
  const nombre = normalizeString(rawRecord.nombre);

  // Validate required fields
  if (!municipioNombre || !modalidad || !tipo || !nombre) {
    return null; // Skip records with missing required fields
  }

  // Validate modalidad
  const modalidadUpper = modalidad.toUpperCase();
  if (modalidadUpper !== 'EXTRAHOTELERA' && modalidadUpper !== 'HOTELERA') {
    return null; // Skip records with invalid modalidad
  }

  // Optional fields
  const direccion = normalizeString(rawRecord.direccion);
  const codigoPostal = normalizePostalCode(rawRecord.codigo_postal);
  const categoria = normalizeString(rawRecord.categoria);
  const unidadesAlojativas = normalizeInteger(rawRecord.unidades_alojativas);
  const plazasAlojativas = normalizeInteger(rawRecord.plazas_alojativas);

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    modalidad: modalidadUpper,
    tipo: tipo,
    nombre: nombre,
    direccion: direccion,
    codigo_postal: codigoPostal,
    categoria: categoria,
    unidades_alojativas: unidadesAlojativas,
    plazas_alojativas: plazasAlojativas,
  };
}

/**
 * Re-export mapping functions from ckan/transform
 */
export { mapMunicipioToIneCode, buildMunicipiosMap };
