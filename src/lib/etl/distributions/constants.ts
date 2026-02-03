/**
 * Constants for population distribution ETL pipelines
 */

import { TENERIFE_INE_CODES, POPULATION_YEAR, BATCH_SIZE } from '../nomenclator/constants';

// Re-export shared constants
export { TENERIFE_INE_CODES, POPULATION_YEAR, BATCH_SIZE };

/**
 * Age group mappings from CSV to normalized values
 * Note: Ranges vary by year (2025: "Entre 0 y 15", 2024: "Entre 0 y 14")
 * We normalize all to: 0-15, 16-64, 65+
 */
export const AGE_GROUP_MAPPING: Record<string, '0-15' | '16-64' | '65+'> = {
  'Entre 0 y 15': '0-15',
  'Entre 0 y 14': '0-15', // Older years use this range
  'Entre 16 y 64': '16-64',
  'Entre 15 y 64': '16-64', // Older years use this range
  'Más de 65': '65+',
};

/**
 * CSV file paths
 */
export const AGE_CSV_PATH = 'data/raw/edad.csv'; // Age distribution with multiple years (2000-2025)
export const SEX_CSV_PATH = 'data/raw/sexo.csv'; // Sex distribution with multiple years (2000-2025)
export const NATIONALITY_CSV_PATH = 'data/raw/nacionalidad.csv'; // Nationality distribution with multiple years (2000-2025)