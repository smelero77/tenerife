/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanOficinaRecord, SilverOficinaRecord } from './types';
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
 * Normalize numeric value (handle strings and numbers)
 */
function normalizeNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
      return null;
    }
    const num = parseFloat(trimmed);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  return null;
}

/**
 * Normalize phone number (handle strings and numbers, max 50 chars)
 */
function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  // Remove .0 suffix if present (e.g., "922161133.0" -> "922161133")
  const cleaned = str.replace(/\.0+$/, '');
  // Truncate to 50 characters max
  return cleaned.length > 50 ? cleaned.substring(0, 50) : cleaned;
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
export function transformOficinaRecord(
  rawRecord: RawCkanOficinaRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverOficinaRecord | null {
  // Required fields
  const oficinaNombre = normalizeString(rawRecord.oficina_nombre);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre);

  // Validate required fields
  if (!oficinaNombre || !municipioNombre) {
    return null; // Skip records with missing required fields
  }

  // Optional fields
  const oficinaHorario = normalizeString(rawRecord.oficina_horario);
  const oficinaTelefono = normalizePhone(rawRecord.oficina_telefono);
  const oficinaDescripcion = normalizeString(rawRecord.oficina_descripcion);
  const oficinaUbicacion = normalizeString(rawRecord.oficina_ubicacion);
  const oficinaZona = normalizeString(rawRecord.oficina_zona);
  const oficinaCodigoPostal = normalizePostalCode(rawRecord.oficina_codigo_postal);
  const oficinaEstado = normalizeString(rawRecord.oficina_estado);
  const latitud = normalizeNumeric(rawRecord.latitud);
  const longitud = normalizeNumeric(rawRecord.longitud);

  // Validate coordinates if provided
  let finalLatitud: number | null = null;
  let finalLongitud: number | null = null;

  if (latitud !== null && latitud >= -90 && latitud <= 90) {
    finalLatitud = latitud;
  }
  if (longitud !== null && longitud >= -180 && longitud <= 180) {
    finalLongitud = longitud;
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    oficina_nombre: oficinaNombre,
    oficina_horario: oficinaHorario,
    oficina_telefono: oficinaTelefono,
    oficina_descripcion: oficinaDescripcion,
    oficina_ubicacion: oficinaUbicacion,
    oficina_zona: oficinaZona,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    oficina_codigo_postal: oficinaCodigoPostal,
    oficina_estado: oficinaEstado,
    latitud: finalLatitud,
    longitud: finalLongitud,
  };
}

/**
 * Re-export mapping functions from ckan/transform
 */
export { mapMunicipioToIneCode, buildMunicipiosMap };
