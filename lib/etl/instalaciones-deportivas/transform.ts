/**
 * Transform raw CKAN records to Silver layer records
 */

import {
  RawCkanInstalacionRecord,
  RawCkanEspacioDeportivoRecord,
  RawCkanEspacioComplementarioRecord,
  RawCkanCaracteristicaInstalacionRecord,
  RawCkanCaracteristicaEspacioRecord,
  SilverInstalacionDeportivaRecord,
  SilverEspacioDeportivoRecord,
  SilverEspacioComplementarioRecord,
  SilverCaracteristicaInstalacionRecord,
  SilverCaracteristicaEspacioRecord,
} from './types';

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
  const str = typeof value === 'number' 
    ? Math.floor(value).toString() 
    : String(value).trim().split('.')[0];
  
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  return str.length > 10 ? str.substring(0, 10) : str;
}

/**
 * Normalize phone number (remove decimals, keep as string)
 */
function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = typeof value === 'number' 
    ? Math.floor(value).toString() 
    : String(value).trim().split('.')[0];
  
  if (str === '0') {
    return null;
  }
  
  return str === '' ? null : str;
}

/**
 * Parse ISO date string to Date object
 */
function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Transform raw installation record to Silver record
 */
export function transformInstalacionRecord(
  rawRecord: RawCkanInstalacionRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverInstalacionDeportivaRecord | null {
  // Required fields
  const instalacionCodigo = normalizeString(rawRecord.instalacion_codigo);
  const instalacionNombre = normalizeString(rawRecord.instalacion_nombre);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre) || '';

  if (!instalacionCodigo || !instalacionNombre) {
    return null; // Skip records without required fields
  }

  // Parse coordinates
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
    instalacion_codigo: instalacionCodigo,
    instalacion_nombre: instalacionNombre,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    codigo_postal: normalizePostalCode(rawRecord.codigo_postal),
    email: normalizeString(rawRecord.email),
    telefono_fijo: normalizePhone(rawRecord.telefono_fijo),
    web: normalizeString(rawRecord.web),
    fax: normalizePhone(rawRecord.fax),
    propiedad: normalizeString(rawRecord.propiedad),
    tipo_gestion: normalizeString(rawRecord.tipo_gestion),
    observaciones: normalizeString(rawRecord.observaciones),
    longitud: finalLongitud,
    latitud: finalLatitud,
    ultima_modificacion: parseDate(rawRecord.ultima_modificacion),
  };
}

/**
 * Transform raw sports space record to Silver record
 */
export function transformEspacioDeportivoRecord(
  rawRecord: RawCkanEspacioDeportivoRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverEspacioDeportivoRecord | null {
  // Required fields
  const instalacionCodigo = normalizeString(rawRecord.instalacion_codigo);
  const espacioCodigo = normalizeString(rawRecord.espacio_codigo);
  const espacioNombre = normalizeString(rawRecord.espacio_nombre);

  if (!instalacionCodigo || !espacioCodigo || !espacioNombre) {
    return null; // Skip records without required fields
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    instalacion_codigo: instalacionCodigo,
    espacio_codigo: espacioCodigo,
    espacio_nombre: espacioNombre,
    espacio_tipo: normalizeString(rawRecord.espacio_tipo),
    espacio_clase: normalizeString(rawRecord.espacio_clase),
    espacio_actividad_principal: normalizeString(rawRecord.espacio_actividad_principal),
    pavimento_tipo: normalizeString(rawRecord.pavimento_tipo),
    pavimento_conservacion: normalizeString(rawRecord.pavimento_conservacion),
    espacio_cerramiento: normalizeString(rawRecord.espacio_cerramiento),
    espacio_estado_uso: normalizeString(rawRecord.espacio_estado_uso),
    espacio_calefaccion: normalizeString(rawRecord.espacio_calefaccion),
    espacio_climatizacion: normalizeString(rawRecord.espacio_climatizacion),
    espacio_iluminacion: normalizeString(rawRecord.espacio_iluminacion),
    ultima_modificacion: parseDate(rawRecord.ultima_modificacion),
  };
}

/**
 * Transform raw complementary space record to Silver record
 */
export function transformEspacioComplementarioRecord(
  rawRecord: RawCkanEspacioComplementarioRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverEspacioComplementarioRecord | null {
  // Required fields
  const instalacionCodigo = normalizeString(rawRecord.instalacion_codigo);
  const espacioComplementarioCodigo = normalizeString(rawRecord.espacio_complementario_codigo);
  const espacioComplementarioNombre = normalizeString(rawRecord.espacio_complementario_nombre);

  if (!instalacionCodigo || !espacioComplementarioCodigo || !espacioComplementarioNombre) {
    return null; // Skip records without required fields
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    instalacion_codigo: instalacionCodigo,
    espacio_complementario_codigo: espacioComplementarioCodigo,
    espacio_complementario_nombre: espacioComplementarioNombre,
    espacio_complementario_tipo: normalizeString(rawRecord.espacio_complementario_tipo),
    espacio_complementario_clase: normalizeString(rawRecord.espacio_complementario_clase),
    ultima_modificacion: parseDate(rawRecord.ultima_modificacion),
  };
}

/**
 * Transform raw installation characteristic record to Silver record
 */
export function transformCaracteristicaInstalacionRecord(
  rawRecord: RawCkanCaracteristicaInstalacionRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverCaracteristicaInstalacionRecord | null {
  // Required fields
  const instalacionCodigo = normalizeString(rawRecord.instalacion_codigo);
  const instalacionNombre = normalizeString(rawRecord.instalacion_nombre);
  const categoria = normalizeString(rawRecord.categoria);
  const caracteristica = normalizeString(rawRecord.caracteristica);

  if (!instalacionCodigo || !instalacionNombre || !categoria || !caracteristica) {
    return null; // Skip records without required fields
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    instalacion_codigo: instalacionCodigo,
    instalacion_nombre: instalacionNombre,
    categoria,
    subcategoria: normalizeString(rawRecord.subcategoria),
    caracteristica,
  };
}

/**
 * Transform raw sports space characteristic record to Silver record
 */
export function transformCaracteristicaEspacioRecord(
  rawRecord: RawCkanCaracteristicaEspacioRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverCaracteristicaEspacioRecord | null {
  // Required fields
  const espacioCodigo = normalizeString(rawRecord.espacio_codigo);
  const espacioNombre = normalizeString(rawRecord.espacio_nombre);
  const categoria = normalizeString(rawRecord.categoria);
  const caracteristica = normalizeString(rawRecord.caracteristica);

  if (!espacioCodigo || !espacioNombre || !categoria || !caracteristica) {
    return null; // Skip records without required fields
  }

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    espacio_codigo: espacioCodigo,
    espacio_nombre: espacioNombre,
    categoria,
    caracteristica,
  };
}
