/**
 * Transform and filter CSV rows for Tenerife island
 */

import { RawCsvRow, ParsedRow } from './types';
import { TENERIFE_INE_CODES, POPULATION_YEAR } from './constants';

/**
 * Extract province code (2 digits) from Provincia column
 * Format: "38 Santa Cruz de Tenerife" -> "38"
 */
export function extractProvCode(provincia: string): string | null {
  const match = provincia.match(/^(\d{2})\s/);
  return match ? match[1] : null;
}

/**
 * Extract municipality code (3 digits, padded) from Municipio column
 * Format: "1 Adeje" -> "001"
 * Format: "12 La Laguna" -> "012"
 */
export function extractMuniCode(municipio: string): string | null {
  const match = municipio.match(/^(\d+)\s/);
  if (!match) return null;
  const code = match[1];
  // Pad to 3 digits
  return code.padStart(3, '0');
}

/**
 * Parse population value, handling "N.E." (No Especificado) as 0
 */
export function parsePopulation(value: string): number {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === 'N.E.' || trimmed === 'N.E' || trimmed === '') {
    return 0;
  }
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize unit code by removing spaces
 * "00 02 03" -> "000203"
 */
export function normalizeUnitCode(unitCode: string): string {
  return unitCode.replace(/\s+/g, '');
}

/**
 * Transform and filter a CSV row
 * Returns null if row should be skipped (not Tenerife)
 */
export function transformRow(
  row: RawCsvRow,
  sourceFile: string
): ParsedRow | null {
  // Extract codes
  const prov_code = extractProvCode(row.Provincia);
  const muni_code = extractMuniCode(row.Municipio);

  if (!prov_code || !muni_code) {
    return null;
  }

  // Compute INE code (5 digits)
  const ine_code = prov_code + muni_code;

  // CRITICAL: Skip if not in Tenerife set
  if (!TENERIFE_INE_CODES.has(ine_code)) {
    return null;
  }

  // Normalize unit code
  const unit_code = normalizeUnitCode(row['Código Unidad Poblacional']);

  // Parse population values
  const population_total = parsePopulation(row.Total);
  const population_male = parsePopulation(row.Hombres);
  const population_female = parsePopulation(row.Mujeres);

  return {
    prov_code,
    muni_code,
    ine_code,
    unit_code,
    unit_name: row['Unidad Poblacional'].trim(),
    tipo: row.Tipo,
    population_total,
    population_male,
    population_female,
    year: POPULATION_YEAR,
  };
}
