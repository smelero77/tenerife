/**
 * Transform raw CKAN records to Silver layer records
 * Uses codigo_municipio from CSV (INE code) to validate against dim_municipio
 */

import { RawCkanInstalacionRecord, SilverInstalacionRecord } from './types';

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
 * Normalize numeric value (latitud, longitud)
 */
function normalizeNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  return num;
}

/**
 * Normalize postal code (max 10 characters)
 */
function normalizePostalCode(value: unknown): string | null {
  const str = normalizeString(value);
  if (!str) {
    return null;
  }
  // Truncate to 10 characters if needed
  return str.length > 10 ? str.substring(0, 10) : str;
}

/**
 * Validate INE code format (5 digits)
 */
function isValidIneCode(code: string | null): boolean {
  if (!code) {
    return false;
  }
  return /^[0-9]{5}$/.test(code);
}

/**
 * Transform raw CKAN record to Silver record
 * Returns null if:
 * - Missing required field (nombre)
 */
export function transformInstalacionRecord(
  rawRecord: RawCkanInstalacionRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverInstalacionRecord | null {
  // Required field
  const nombre = normalizeString(rawRecord.nombre);
  if (!nombre) {
    return null; // Skip records without name
  }

  // Parse coordinates
  const latitud = normalizeNumeric(rawRecord.latitud);
  const longitud = normalizeNumeric(rawRecord.longitud);

  // Validate coordinates if both are present
  if (latitud !== null && (latitud < -90 || latitud > 90)) {
    return null; // Invalid latitude
  }
  if (longitud !== null && (longitud < -180 || longitud > 180)) {
    return null; // Invalid longitude
  }

  // Get INE code from codigo_municipio field
  const codigoMunicipio = normalizeString(rawRecord.codigo_municipio);
  let ineCode: string | null = null;
  
  if (codigoMunicipio && isValidIneCode(codigoMunicipio)) {
    ineCode = codigoMunicipio;
  }

  // Optional fields
  const titular = normalizeString(rawRecord.titular);
  const gestiona = normalizeString(rawRecord.gestiona);
  const telefono = normalizeString(rawRecord.telefono);
  const descripcion = normalizeString(rawRecord.descripcion);
  const direccion = normalizeString(rawRecord.direccion);
  const direccionTipoVia = normalizeString(rawRecord.direccion_tipo_via);
  const direccionNombreVia = normalizeString(rawRecord.direccion_nombre_via);
  const direccionNumero = normalizeString(rawRecord.direccion_numero);
  const direccionCodigoPostal = normalizePostalCode(rawRecord.direccion_codigo_postal);
  const municipioNombre = normalizeString(rawRecord.municipio) || ''; // Default to empty string for NOT NULL constraint
  const horario1 = normalizeString(rawRecord.horario_1);
  const horario2 = normalizeString(rawRecord.horario_2);

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    instalacion_nombre: nombre,
    latitud,
    longitud,
    titular,
    gestiona,
    telefono,
    descripcion,
    direccion,
    direccion_tipo_via: direccionTipoVia,
    direccion_nombre_via: direccionNombreVia,
    direccion_numero: direccionNumero,
    direccion_codigo_postal: direccionCodigoPostal,
    municipio_nombre: municipioNombre,
    ine_code: ineCode, // Will be validated against dim_municipio in loaders
    horario_1: horario1,
    horario_2: horario2,
  };
}
