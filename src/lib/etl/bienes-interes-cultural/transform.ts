/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanBicRecord, SilverBicRecord } from './types';

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
 * Parse boolean from string ("falso"/"verdadero" or "false"/"true")
 */
function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim().toLowerCase();
  if (str === 'true' || str === 'verdadero') {
    return true;
  }
  if (str === 'false' || str === 'falso') {
    return false;
  }
  return null;
}

/**
 * Validate BIC category
 */
const VALID_CATEGORIES = [
  'ZONA ARQUEOLÓGICA',
  'CONJUNTO HISTÓRICO',
  'MONUMENTO',
  'SITIO HISTÓRICO',
  'JARDÍN HISTÓRICO',
  'ZONA PALEONTOLÓGICA',
  'SITIO ETNOLÓGICO',
];

function isValidCategory(category: string | null): boolean {
  if (!category) {
    return false;
  }
  return VALID_CATEGORIES.includes(category.toUpperCase());
}

/**
 * Transform raw CKAN record to Silver record
 * Returns null if:
 * - Missing required field (bic_nombre, bic_categoria)
 * - Invalid category
 */
export function transformBicRecord(
  rawRecord: RawCkanBicRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverBicRecord | null {
  // Required fields
  const bicNombre = normalizeString(rawRecord.bic_nombre);
  const bicCategoria = normalizeString(rawRecord.bic_categoria);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre) || '';

  if (!bicNombre || !bicCategoria) {
    return null; // Skip records without required fields
  }

  // Validate category
  const categoriaUpper = bicCategoria.toUpperCase();
  if (!isValidCategory(categoriaUpper)) {
    console.warn(`⚠️  Invalid BIC category: "${bicCategoria}", skipping record "${bicNombre}"`);
    return null;
  }

  // Parse boolean for bic_entorno
  const bicEntorno = parseBoolean(rawRecord.bic_entorno);

  // Optional fields
  const bicDescripcion = normalizeString(rawRecord.bic_descripcion);
  const boletin1Nombre = normalizeString(rawRecord.boletin1_nombre);
  const boletin1Url = normalizeString(rawRecord.boletin1_url);
  const boletin2Nombre = normalizeString(rawRecord.boletin2_nombre);
  const boletin2Url = normalizeString(rawRecord.boletin2_url);

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    bic_nombre: bicNombre,
    bic_categoria: categoriaUpper, // Store in uppercase for consistency
    bic_entorno: bicEntorno,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    bic_descripcion: bicDescripcion,
    boletin1_nombre: boletin1Nombre,
    boletin1_url: boletin1Url,
    boletin2_nombre: boletin2Nombre,
    boletin2_url: boletin2Url,
  };
}
