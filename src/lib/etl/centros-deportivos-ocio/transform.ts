/**
 * Transform raw CKAN records to Silver layer records
 * Uses municipio_codigo from CSV (INE code) to validate against dim_municipio
 */

import { RawCkanCentroRecord, SilverCentroRecord } from './types';

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
 * Normalize numeric value (latitud, longitud, telefono)
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
 * Normalize postal code (max 10 characters, remove decimals)
 */
function normalizePostalCode(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // Handle numeric values (e.g., 38108.0)
  const str = typeof value === 'number' 
    ? Math.floor(value).toString() 
    : String(value).trim().split('.')[0]; // Remove decimal part
  
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  // Truncate to 10 characters if needed
  return str.length > 10 ? str.substring(0, 10) : str;
}

/**
 * Normalize phone number (remove decimals, keep as string)
 */
function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // Handle numeric values (e.g., 680283526.0)
  const str = typeof value === 'number' 
    ? Math.floor(value).toString() 
    : String(value).trim().split('.')[0]; // Remove decimal part
  
  return str === '' ? null : str;
}

/**
 * Build full address from components
 */
function buildAddress(
  tipoViaDescripcion: string | null,
  direccionNombreVia: string | null,
  direccionNumero: string | null,
  referencia: string | null
): string | null {
  const parts: string[] = [];
  
  if (tipoViaDescripcion) parts.push(tipoViaDescripcion);
  if (direccionNombreVia) parts.push(direccionNombreVia);
  if (direccionNumero) parts.push(direccionNumero);
  if (referencia) parts.push(referencia);
  
  const address = parts.join(' ').trim();
  return address === '' ? null : address;
}

/**
 * Extract activity type from actividad_tipo
 * Format: "actividades deporte ocio" -> "actividades deporte ocio"
 * Could also extract a more specific type if needed
 */
function extractActivityType(actividadTipo: string | null): string | null {
  if (!actividadTipo) {
    return null;
  }
  
  return actividadTipo.trim() || null;
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
export function transformCentroRecord(
  rawRecord: RawCkanCentroRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverCentroRecord | null {
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

  // Get INE code from municipio_codigo field
  const codigoMunicipio = normalizeString(rawRecord.municipio_codigo);
  let ineCode: string | null = null;
  
  if (codigoMunicipio && isValidIneCode(codigoMunicipio)) {
    ineCode = codigoMunicipio;
  }

  // Extract activity type
  const actividad = extractActivityType(rawRecord.actividad_tipo ?? null);

  // Build address
  const direccion = buildAddress(
    normalizeString(rawRecord.tipo_via_descripcion),
    normalizeString(rawRecord.direccion_nombre_via),
    normalizeString(rawRecord.direccion_numero),
    normalizeString(rawRecord.referencia)
  );

  // Optional fields
  const tipo = actividad; // Use actividad_tipo as tipo
  const telefono = normalizePhone(rawRecord.telefono);
  const email = normalizeString(rawRecord.email);
  const web = normalizeString(rawRecord.web);
  const codigoPostal = normalizePostalCode(rawRecord.direccion_codigo_postal);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre) || ''; // Default to empty string for NOT NULL

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    centro_nombre: nombre,
    centro_tipo: tipo,
    centro_telefono: telefono,
    centro_email: email,
    centro_web: web,
    centro_direccion: direccion,
    centro_codigo_postal: codigoPostal,
    municipio_nombre: municipioNombre,
    ine_code: ineCode, // Will be validated against dim_municipio in loaders
    latitud,
    longitud,
    centro_actividad: actividad,
  };
}
