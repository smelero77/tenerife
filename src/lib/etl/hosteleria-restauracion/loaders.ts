/**
 * Database loaders with batch upserts for CKAN hostelería y restauración tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeEstablecimientoRecord,
  SilverEstablecimientoRecord,
  FactEstablecimientoRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_hosteleria_restauracion_raw
 */
export async function loadEstablecimientosBronze(
  records: BronzeEstablecimientoRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_hosteleria_restauracion_raw')
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
function deduplicateBatch(batch: SilverEstablecimientoRecord[]): SilverEstablecimientoRecord[] {
  const seen = new Set<string>();
  const deduplicated: SilverEstablecimientoRecord[] = [];

  for (const record of batch) {
    // Create unique key from constraint fields
    const key = `${record.source_resource_id}|${record.municipio_nombre}|${record.nombre}|${record.direccion || ''}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  return deduplicated;
}

/**
 * Batch upsert into silver_establecimiento_hosteleria_restauracion
 */
export async function loadEstablecimientosSilver(
  records: SilverEstablecimientoRecord[]
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
        .from('silver_establecimiento_hosteleria_restauracion')
        .upsert(deduplicatedBatch, {
          onConflict: 'source_resource_id,municipio_nombre,nombre,direccion',
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
 * Refresh aggregated facts in fact_establecimiento_hosteleria_municipio_agg
 */
export async function refreshEstablecimientosFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Query silver layer to aggregate
    const { data, error: queryError } = await supabaseAdmin
      .from('silver_establecimiento_hosteleria_restauracion')
      .select('ine_code, modalidad, tipo, aforo_interior, aforo_terraza')
      .not('ine_code', 'is', null);

    if (queryError) {
      throw queryError;
    }

    // Group and count
    const counts = new Map<string, { total: number; total_aforo_interior: number; total_aforo_terraza: number }>();
    for (const record of data || []) {
      const key = `${record.ine_code}|${record.modalidad}|${record.tipo}`;
      const current = counts.get(key) || { total: 0, total_aforo_interior: 0, total_aforo_terraza: 0 };
      current.total += 1;
      current.total_aforo_interior += record.aforo_interior || 0;
      current.total_aforo_terraza += record.aforo_terraza || 0;
      counts.set(key, current);
    }

    // Build fact records
    const factRecords: FactEstablecimientoRecord[] = Array.from(counts.entries()).map(
      ([key, stats]) => {
        const [ine_code, modalidad, tipo] = key.split('|');
        return {
          ine_code,
          modalidad,
          tipo,
          total: stats.total,
          total_aforo_interior: stats.total_aforo_interior,
          total_aforo_terraza: stats.total_aforo_terraza,
        };
      }
    );

    // Upsert facts
    if (factRecords.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('fact_establecimiento_hosteleria_municipio_agg')
        .upsert(factRecords, {
          onConflict: 'ine_code,modalidad,tipo',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        throw upsertError;
      }
    }

    return { refreshed: factRecords.length, errors: 0 };
  } catch (error) {
    console.error('Error refreshing establecimientos facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
