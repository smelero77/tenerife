/**
 * Transform and filter nationality CSV rows for Tenerife island
 */

import { RawNationalityCsvRow, ParsedNationalityRow } from './types';
import { TENERIFE_INE_CODES } from './constants';
import { extractProvCode, extractMuniCode, normalizeUnitCode, parsePopulation } from '../nomenclator/transform';

/**
 * Transform a CSV row for a specific year
 * Returns null if row should be skipped (not Tenerife)
 */
export function transformNationalityRow(
  row: RawNationalityCsvRow,
  year: number,
  sourceFile: string
): ParsedNationalityRow | null {
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

  // Get year-specific data
  const yearData = row.yearData.get(year);
  if (!yearData) {
    return null;
  }

  // Parse population values
  const population_total = parsePopulation(yearData.Total);
  const population_spanish = parsePopulation(yearData.Españoles);
  const population_foreign = parsePopulation(yearData.Extranjeros);

  return {
    prov_code,
    muni_code,
    ine_code,
    unit_code,
    unit_name: row['Unidad Poblacional'].trim(),
    tipo: row.Tipo,
    year,
    population_total,
    population_spanish,
    population_foreign,
  };
}
