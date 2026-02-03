/**
 * Database loaders with batch upserts for CKAN Bienes de Interés Cultural tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeBicRecord,
  SilverBicRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_bic_raw
 */
export async function loadBicBronze(
  records: BronzeBicRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_bic_raw')
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
 * Uses: source_resource_id, bic_nombre, ine_code, municipio_nombre
 */
function deduplicateBatch(batch: SilverBicRecord[]): SilverBicRecord[] {
  const seen = new Set<string>();
  const deduplicated: SilverBicRecord[] = [];
  const duplicates: Array<{ key: string; record: SilverBicRecord }> = [];

  for (const record of batch) {
    // Create unique key from constraint fields
    const ineCode = record.ine_code || 'NULL';
    const municipioNombre = record.municipio_nombre || 'NULL';
    const key = `${record.source_resource_id}|${record.bic_nombre}|${ineCode}|${municipioNombre}`;
    
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
      console.log(`  - ${dup.record.bic_nombre} (${dup.record.municipio_nombre})`);
      console.log(`    Categoría: ${dup.record.bic_categoria}`);
      console.log(`    INE Code: ${dup.record.ine_code || 'N/A'}`);
    }
  }

  return deduplicated;
}

/**
 * Batch upsert into silver_bic
 * Validates INE codes against dim_municipio before inserting
 */
export async function loadBicSilver(
  records: SilverBicRecord[]
): Promise<{ inserted: number; updated: number; errors: number; invalidIneCodes: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let invalidIneCodes = 0;

  // Get valid INE codes
  const validIneCodes = await getValidIneCodes();

  // Validate and filter records
  const validRecords: SilverBicRecord[] = [];
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
      // Debug: log a sample record with LAGUNA to verify ine_code is present
      const lagunaRecord = deduplicatedBatch.find(r => 
        r.municipio_nombre && r.municipio_nombre.toUpperCase().includes('LAGUNA')
      );
      if (lagunaRecord) {
        console.log(`  DEBUG Loader: Sample LAGUNA record before RPC:`, {
          bic_nombre: lagunaRecord.bic_nombre,
          municipio_nombre: lagunaRecord.municipio_nombre,
          ine_code: lagunaRecord.ine_code,
          ine_code_type: typeof lagunaRecord.ine_code
        });
      }
      
      // Use stored procedure for upsert since we have a functional unique index
      const { error } = await supabaseAdmin.rpc('upsert_bic_batch', {
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
 * Refresh aggregated facts in fact_bic_municipio_agg
 * Uses stored procedure that aggregates directly from silver layer
 */
export async function refreshBicFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh facts
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_fact_bic_municipio_agg'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count } = await supabaseAdmin
      .from('fact_bic_municipio_agg')
      .select('*', { count: 'exact', head: true });

    return { refreshed: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing BIC facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
