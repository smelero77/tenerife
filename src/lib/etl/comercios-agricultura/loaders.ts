/**
 * Database loaders with batch upserts for CKAN comercios agricultura tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeComercioAgriculturaRecord,
  SilverComercioAgriculturaRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_comercios_agricultura_raw
 */
export async function loadComerciosAgriculturaBronze(
  records: BronzeComercioAgriculturaRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_comercios_agricultura_raw')
        .insert(batch);

      if (error) {
        console.error(`Bronze batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    } catch (error) {
      console.error(`Bronze batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Validate INE codes against dim_municipio
 * Returns a Set of valid INE codes
 */
async function getValidIneCodes(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('dim_municipio')
    .select('ine_code');

  if (error) {
    console.warn('Failed to fetch valid INE codes, will skip validation:', error);
    return new Set();
  }

  return new Set((data || []).map((m) => m.ine_code));
}

/**
 * Remove duplicates from batch based on unique constraint fields
 * Uses: source_resource_id, comercio_nombre, ine_code, latitud, longitud
 */
function deduplicateBatch(batch: SilverComercioAgriculturaRecord[]): SilverComercioAgriculturaRecord[] {
  const seen = new Set<string>();
  const deduplicated: SilverComercioAgriculturaRecord[] = [];
  const duplicates: Array<{ key: string; record: SilverComercioAgriculturaRecord }> = [];

  for (const record of batch) {
    // Create unique key from constraint fields
    // Note: If coordinates are null, we fall back to municipio_nombre to avoid issues
    const lat = record.latitud !== null ? record.latitud.toFixed(8) : 'NULL';
    const lon = record.longitud !== null ? record.longitud.toFixed(8) : 'NULL';
    const ineCode = record.ine_code || 'NULL';
    const key = `${record.source_resource_id}|${record.comercio_nombre}|${ineCode}|${lat}|${lon}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    } else {
      // Track duplicates for logging
      duplicates.push({ key, record });
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Duplicados detectados (${duplicates.length}):`);
    for (const dup of duplicates) {
      console.log(`  - ${dup.record.comercio_nombre} (${dup.record.municipio_nombre})`);
      console.log(`    INE Code: ${dup.record.ine_code || 'N/A'}`);
      console.log(`    Dirección: ${dup.record.comercio_direccion || 'N/A'}`);
      console.log(`    Coordenadas: ${dup.record.latitud}, ${dup.record.longitud}`);
    }
  }

  return deduplicated;
}

/**
 * Batch upsert into silver_comercio_agricultura
 * Validates INE codes against dim_municipio before inserting
 */
export async function loadComerciosAgriculturaSilver(
  records: SilverComercioAgriculturaRecord[]
): Promise<{ inserted: number; updated: number; errors: number; invalidIneCodes: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let invalidIneCodes = 0;

  // Get valid INE codes
  const validIneCodes = await getValidIneCodes();

  // Validate and filter records
  const validRecords: SilverComercioAgriculturaRecord[] = [];
  for (const record of records) {
    if (record.ine_code && !validIneCodes.has(record.ine_code)) {
      invalidIneCodes++;
      // Set ine_code to null if invalid
      record.ine_code = null;
    }
    validRecords.push(record);
  }

  if (invalidIneCodes > 0) {
    console.warn(`⚠️  Warning: ${invalidIneCodes} records have invalid INE codes (set to NULL)`);
  }

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);
    
    // Remove duplicates within the batch
    const deduplicatedBatch = deduplicateBatch(batch);
    const duplicatesRemoved = batch.length - deduplicatedBatch.length;
    
    if (duplicatesRemoved > 0) {
      console.log(`Batch ${i}-${i + batch.length}: Removed ${duplicatesRemoved} duplicates`);
    }

    try {
      // Use stored procedure for upsert since we have a functional unique index
      const { error } = await supabaseAdmin.rpc('upsert_comercio_agricultura_batch', {
        p_records: deduplicatedBatch
      });

      if (error) {
        console.error(`Silver batch error (${i}-${i + batch.length}):`, error);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
        if (deduplicatedBatch.length > 0) {
          console.error(`Failed batch sample:`, JSON.stringify(deduplicatedBatch[0], null, 2));
        }
        errors += deduplicatedBatch.length;
      } else {
        // Count as updated since we're using upsert
        updated += deduplicatedBatch.length;
      }
    } catch (error) {
      console.error(`Silver batch exception (${i}-${i + batch.length}):`, error);
      if (error instanceof Error) {
        console.error(`Exception message:`, error.message);
        console.error(`Exception stack:`, error.stack);
      }
      if (deduplicatedBatch.length > 0) {
        console.error(`Failed batch sample:`, JSON.stringify(deduplicatedBatch[0], null, 2));
      }
      errors += deduplicatedBatch.length;
    }
  }

  return { inserted: 0, updated, errors, invalidIneCodes };
}

/**
 * Refresh aggregated facts in fact_comercio_agricultura_municipio_agg
 * Uses stored procedure that aggregates directly from silver layer
 */
export async function refreshComerciosAgriculturaFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh facts
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_fact_comercio_agricultura_municipio_agg'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count } = await supabaseAdmin
      .from('fact_comercio_agricultura_municipio_agg')
      .select('*', { count: 'exact', head: true });

    return { refreshed: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing comercios agricultura facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
