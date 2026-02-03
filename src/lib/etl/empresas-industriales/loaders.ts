/**
 * Database loaders with batch upserts for CKAN empresas industriales tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeEmpresaIndustrialRecord,
  SilverEmpresaIndustrialRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_empresas_industriales_raw
 */
export async function loadEmpresasIndustrialesBronze(
  records: BronzeEmpresaIndustrialRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_empresas_industriales_raw')
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
 */
function deduplicateBatch(batch: SilverEmpresaIndustrialRecord[]): SilverEmpresaIndustrialRecord[] {
  const seen = new Set<string>();
  const deduplicated: SilverEmpresaIndustrialRecord[] = [];

  for (const record of batch) {
    // Create unique key matching the functional unique index:
    // source_resource_id, empresa_nombre, municipio_nombre, latitud, longitud, direccion
    const latitudStr = record.latitud != null ? record.latitud.toString() : '';
    const longitudStr = record.longitud != null ? record.longitud.toString() : '';
    const direccionStr = record.empresa_direccion || '';
    const municipioStr = record.municipio_nombre || '';
    
    const key = `${record.source_resource_id}|${record.empresa_nombre}|${municipioStr}|${latitudStr}|${longitudStr}|${direccionStr}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  return deduplicated;
}

/**
 * Batch upsert into silver_empresa_industrial
 * Validates INE codes against dim_municipio before inserting
 */
export async function loadEmpresasIndustrialesSilver(
  records: SilverEmpresaIndustrialRecord[]
): Promise<{ inserted: number; updated: number; errors: number; invalidIneCodes: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let invalidIneCodes = 0;

  // Get valid INE codes
  const validIneCodes = await getValidIneCodes();

  // Validate and filter records
  const validRecords: SilverEmpresaIndustrialRecord[] = [];
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
      const { error } = await supabaseAdmin.rpc('upsert_empresa_industrial_batch', {
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
 * Refresh aggregated facts in fact_empresa_industrial_municipio_agg
 * Uses stored procedure that aggregates directly from silver layer
 */
export async function refreshEmpresasIndustrialesFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh facts
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_fact_empresa_industrial_municipio_agg'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count } = await supabaseAdmin
      .from('fact_empresa_industrial_municipio_agg')
      .select('*', { count: 'exact', head: true });

    return { refreshed: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing empresas industriales facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
