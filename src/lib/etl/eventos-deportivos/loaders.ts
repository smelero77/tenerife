/**
 * Database loaders with batch upserts for CKAN eventos deportivos tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeEventoRecord,
  SilverEventoRecord,
  FactEventoRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_eventos_deportivos_raw
 */
export async function loadEventosBronze(
  records: BronzeEventoRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_eventos_deportivos_raw')
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
 * Remove duplicates from batch based on unique constraint fields
 */
function deduplicateBatch(batch: SilverEventoRecord[]): SilverEventoRecord[] {
  const seen = new Set<string>();
  const deduplicated: SilverEventoRecord[] = [];

  for (const record of batch) {
    // Create unique key from constraint fields
    const key = `${record.source_resource_id}|${record.evento_nombre}|${record.municipio_nombre}|${record.evento_fecha_inicio}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  return deduplicated;
}

/**
 * Batch upsert into silver_evento_deportivo
 */
export async function loadEventosSilver(
  records: SilverEventoRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // Remove duplicates within the batch
    const deduplicatedBatch = deduplicateBatch(batch);
    const duplicatesRemoved = batch.length - deduplicatedBatch.length;
    
    if (duplicatesRemoved > 0) {
      console.log(`Batch ${i}-${i + batch.length}: Removed ${duplicatesRemoved} duplicates`);
    }

    try {
      const { error } = await supabaseAdmin
        .from('silver_evento_deportivo')
        .upsert(deduplicatedBatch, {
          onConflict: 'source_resource_id,evento_nombre,municipio_nombre,evento_fecha_inicio',
          ignoreDuplicates: false,
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

  return { inserted: 0, updated, errors };
}

/**
 * Refresh aggregated facts in fact_evento_deportivo_municipio_agg
 * Uses stored procedure that aggregates directly from silver layer
 */
export async function refreshEventosFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh facts
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_fact_evento_deportivo_municipio_agg'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count } = await supabaseAdmin
      .from('fact_evento_deportivo_municipio_agg')
      .select('*', { count: 'exact', head: true });

    return { refreshed: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing eventos facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
