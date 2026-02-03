/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanRecord, SilverEquipamientoRecord } from './types';

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
 * Transform raw CKAN record to Silver record
 */
export function transformCkanRecord(
  rawRecord: RawCkanRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverEquipamientoRecord | null {
  // Required fields
  const equipamientoNombre = normalizeString(rawRecord.equipamiento_nombre);
  const equipamientoTipo = normalizeString(rawRecord.equipamiento_tipo);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre);

  // Validate required fields
  if (!equipamientoNombre || !equipamientoTipo || !municipioNombre) {
    return null; // Skip records with missing required fields
  }

  // Optional fields
  const espacioNaturalNombre = normalizeString(rawRecord.espacio_natural_nombre);
  const puntosInteres = normalizeString(rawRecord.puntos_interes);
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
    equipamiento_nombre: equipamientoNombre,
    equipamiento_tipo: equipamientoTipo,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    espacio_natural_nombre: espacioNaturalNombre,
    puntos_interes: puntosInteres,
    latitud: finalLatitud,
    longitud: finalLongitud,
  };
}

/**
 * Normalize string for matching (lowercase, trim, remove extra spaces)
 */
function normalizeForMatching(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/,\s*/g, ' '); // Replace commas with spaces (handle "Realejos, Los" format)
}

/**
 * Generate all possible name variations for a municipality name
 */
function generateNameVariations(name: string): string[] {
  const normalized = normalizeForMatching(name);
  const variations = new Set<string>();

  // Add original normalized
  variations.add(normalized);

  // Handle format "Orotava (La)" -> "La Orotava"
  // Pattern: "word (article)" -> "article word"
  const parenMatch = normalized.match(/^(.+?)\s*\(\s*(la|el|los|las)\s*\)$/);
  if (parenMatch) {
    const [, mainPart, article] = parenMatch;
    variations.add(`${article} ${mainPart}`);
    variations.add(mainPart); // Also add without article
  }

  // Handle format "Realejos, Los" -> "Los Realejos"
  // Pattern: "word, article" -> "article word"
  // Note: normalizeForMatching replaces commas with spaces, so we need to check before normalization
  const originalCommaMatch = name.trim().match(/^(.+?),\s*(la|el|los|las)$/i);
  if (originalCommaMatch) {
    const [, mainPart, article] = originalCommaMatch;
    const normalizedMain = normalizeForMatching(mainPart);
    const normalizedArticle = article.toLowerCase();
    variations.add(`${normalizedArticle} ${normalizedMain}`);
    variations.add(normalizedMain); // Also add without article
  }

  // Also handle format "orotava la" (after normalization from "Orotava, La") -> "la orotava"
  // Pattern: "word article" -> "article word" (when article is at the end)
  // This MUST run before adding articles at the beginning to avoid duplicates
  const spaceArticleMatch = normalized.match(/^(.+?)\s+(la|el|los|las)$/);
  if (spaceArticleMatch) {
    const [, mainPart, article] = spaceArticleMatch;
    variations.add(`${article} ${mainPart}`);
    variations.add(mainPart); // Also add without article
  }

  // Remove articles at the beginning
  variations.add(normalized.replace(/^la\s+/i, ''));
  variations.add(normalized.replace(/^el\s+/i, ''));
  variations.add(normalized.replace(/^los\s+/i, ''));
  variations.add(normalized.replace(/^las\s+/i, ''));

  // Check if article is at the end (from comma format like "Orotava, La" -> "orotava la")
  const hasArticleAtEnd = /^(.+?)\s+(la|el|los|las)$/.test(normalized);
  
  // Add with articles at the beginning if not present
  // But if article is at the end, we already handled it above with spaceArticleMatch
  if (!/^(la|el|los|las)\s+/i.test(normalized) && !hasArticleAtEnd) {
    variations.add(`la ${normalized}`);
    variations.add(`el ${normalized}`);
    variations.add(`los ${normalized}`);
    variations.add(`las ${normalized}`);
  }

  // Also handle reverse: "Los Realejos" -> "Realejos, Los" and "La Orotava" -> "Orotava (La)"
  const articleMatch = normalized.match(/^(la|el|los|las)\s+(.+)$/);
  if (articleMatch) {
    const [, article, mainPart] = articleMatch;
    variations.add(`${mainPart}, ${article}`);
    variations.add(`${mainPart} (${article})`);
    variations.add(mainPart); // Also add without article
  }

  return Array.from(variations);
}

/**
 * Map municipality name to INE code
 * Uses flexible matching with multiple variations
 */
export async function mapMunicipioToIneCode(
  municipioNombre: string,
  municipiosMap: Map<string, string>
): Promise<string | null> {
  // Generate all possible variations of the input name
  const inputVariations = generateNameVariations(municipioNombre);

  // Try direct match with all variations
  for (const variation of inputVariations) {
    if (municipiosMap.has(variation)) {
      return municipiosMap.get(variation) || null;
    }
  }

  // If no exact match, try partial matching (contains)
  const normalizedInput = normalizeForMatching(municipioNombre);
  let bestMatch: string | null = null;
  let bestMatchScore = 0;

  for (const [mapKey, ineCode] of municipiosMap.entries()) {
    // Check if input contains map key or vice versa
    if (normalizedInput.includes(mapKey) || mapKey.includes(normalizedInput)) {
      // Score by length of match (longer is better)
      const matchLength = Math.min(normalizedInput.length, mapKey.length);
      if (matchLength > bestMatchScore) {
        bestMatchScore = matchLength;
        bestMatch = ineCode;
      }
    }
  }

  // Only use partial match if it's a reasonable match (at least 5 characters)
  if (bestMatch && bestMatchScore >= 5) {
    console.log(`  Partial match: "${municipioNombre}" -> "${bestMatch}" (score: ${bestMatchScore})`);
    return bestMatch;
  }

  // Debug: log first few variations if no match found
  if (inputVariations.length > 0) {
    console.log(`  No match for "${municipioNombre}". First variations: ${inputVariations.slice(0, 3).join(', ')}`);
  }

  return null;
}

/**
 * Build municipality name to INE code mapping
 * Creates multiple entries for each municipality to handle name variations
 */
export async function buildMunicipiosMap(
  municipios: Array<{ ine_code: string; municipio_name: string }>
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Debug: track problematic municipalities
  const debugMunicipios = ['orotava', 'realejos', 'silos'];
  
  for (const muni of municipios) {
    // Generate all variations of the municipality name
    const variations = generateNameVariations(muni.municipio_name);

    // Store all variations pointing to the same INE code
    for (const variation of variations) {
      if (!map.has(variation)) {
        map.set(variation, muni.ine_code);
      }
    }

    // Debug: log variations for problematic names
    if (debugMunicipios.some(name => muni.municipio_name.toLowerCase().includes(name))) {
      console.log(`  DB: "${muni.municipio_name}" (${muni.ine_code}) -> variations: ${variations.slice(0, 5).join(', ')}`);
    }
  }

  console.log(`Built municipality map with ${map.size} name variations for ${municipios.length} municipalities`);
  return map;
}
