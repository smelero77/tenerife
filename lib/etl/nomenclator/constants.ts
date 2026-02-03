/**
 * Constants for INE Nomenclátor ETL pipeline
 */

/**
 * Tenerife island municipality INE codes (5 digits).
 * Only these 31 municipalities will be processed.
 */
export const TENERIFE_INE_CODES = new Set([
  '38001', '38004', '38005', '38006', '38010', '38011', '38012', '38015',
  '38017', '38018', '38019', '38020', '38022', '38023', '38025', '38026',
  '38028', '38031', '38032', '38034', '38035', '38038', '38039', '38040',
  '38041', '38042', '38043', '38044', '38046', '38051', '38052',
]);

/**
 * Year for population data (2025)
 */
export const POPULATION_YEAR = 2025;

/**
 * Snapshot date for gold layer aggregations
 */
export const SNAPSHOT_DATE = '2025-01-01';

/**
 * Province name for Tenerife
 */
export const TENERIFE_PROVINCE = 'Santa Cruz de Tenerife';

/**
 * Island name
 */
export const TENERIFE_ISLAND = 'Tenerife';

/**
 * Batch size for database operations
 */
export const BATCH_SIZE = 500;
