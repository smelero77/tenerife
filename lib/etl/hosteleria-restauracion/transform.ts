/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanEstablecimientoRecord, SilverEstablecimientoRecord } from './types';
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
export function transformEstablecimientoRecord(
  rawRecord: RawCkanEstablecimientoRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverEstablecimientoRecord | null {
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
  if (modalidadUpper !== 'RESTAURACION' && modalidadUpper !== 'HOSTELERIA') {
    return null; // Skip records with invalid modalidad
  }

  // Optional fields
  const direccion = normalizeString(rawRecord.direccion);
  const codigoPostal = normalizePostalCode(rawRecord.codigo_postal);
  const aforoInterior = normalizeInteger(rawRecord.aforo_interior);
  const aforoTerraza = normalizeInteger(rawRecord.aforo_terraza);

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
    aforo_interior: aforoInterior,
    aforo_terraza: aforoTerraza,
  };
}

/**
 * Re-export mapping functions from ckan/transform
 */
export { mapMunicipioToIneCode, buildMunicipiosMap };
