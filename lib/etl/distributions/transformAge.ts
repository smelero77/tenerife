/**
 * Transform and filter age CSV rows for Tenerife island
 */

import { RawAgeCsvRow, ParsedAgeRow } from './types';
import { TENERIFE_INE_CODES, POPULATION_YEAR } from './constants';
import { extractProvCode, extractMuniCode, normalizeUnitCode, parsePopulation } from '../nomenclator/transform';

/**
 * Transform a CSV row for a specific year into age distribution rows (one per age group)
 * Returns array of parsed rows (one per age group) or null if should be skipped
 */
export function transformAgeRow(
  row: RawAgeCsvRow,
  year: number,
  sourceFile: string
): ParsedAgeRow[] | null {
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

  // Parse age group populations
  // Note: Ranges vary by year, but we normalize to: 0-15, 16-64, 65+
  const age_0_15 = parsePopulation(yearData.Rango1);
  const age_16_64 = parsePopulation(yearData.Rango2);
  const age_65_plus = parsePopulation(yearData.Rango3);

  // Return array of rows (one per age group)
  return [
    {
      prov_code,
      muni_code,
      ine_code,
      unit_code,
      unit_name: row['Unidad Poblacional'].trim(),
      tipo: row.Tipo,
      year,
      age_group: '0-15',
      population_total: age_0_15,
    },
    {
      prov_code,
      muni_code,
      ine_code,
      unit_code,
      unit_name: row['Unidad Poblacional'].trim(),
      tipo: row.Tipo,
      year,
      age_group: '16-64',
      population_total: age_16_64,
    },
    {
      prov_code,
      muni_code,
      ine_code,
      unit_code,
      unit_name: row['Unidad Poblacional'].trim(),
      tipo: row.Tipo,
      year,
      age_group: '65+',
      population_total: age_65_plus,
    },
  ];
}
