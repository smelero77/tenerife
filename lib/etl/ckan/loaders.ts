/**
 * Database loaders with batch upserts for CKAN equipamientos tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeEquipamientoRecord,
  SilverEquipamientoRecord,
  FactEquipamientoRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_equipamientos_raw
 */
export async function loadEquipamientosBronze(
  records: BronzeEquipamientoRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_equipamientos_raw')
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
 * Batch upsert into silver_equipamiento_uso_publico
 */
export async function loadEquipamientosSilver(
  records: SilverEquipamientoRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_equipamiento_uso_publico')
        .upsert(batch, {
          onConflict: 'source_resource_id,equipamiento_nombre,municipio_nombre,equipamiento_tipo',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Silver batch error (${i}-${i + batch.length}):`, error);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
        if (batch.length > 0) {
          console.error(`Failed batch sample:`, JSON.stringify(batch[0], null, 2));
        }
        errors += batch.length;
      } else {
        // Count as updated since we're using upsert
        updated += batch.length;
      }
    } catch (error) {
      console.error(`Silver batch exception (${i}-${i + batch.length}):`, error);
      if (error instanceof Error) {
        console.error(`Exception message:`, error.message);
        console.error(`Exception stack:`, error.stack);
      }
      if (batch.length > 0) {
        console.error(`Failed batch sample:`, JSON.stringify(batch[0], null, 2));
      }
      errors += batch.length;
      // Don't re-throw - continue processing other batches
    }
  }

  return { inserted: 0, updated, errors };
}

/**
 * Refresh aggregated facts in fact_equipamiento_municipio_agg
 */
export async function refreshEquipamientosFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Use a SQL query to aggregate and upsert
    const { error } = await supabaseAdmin.rpc('refresh_equipamientos_facts');

    if (error) {
      // If the function doesn't exist, use a direct query
      const { data, error: queryError } = await supabaseAdmin
        .from('silver_equipamiento_uso_publico')
        .select('ine_code, equipamiento_tipo')
        .not('ine_code', 'is', null);

      if (queryError) {
        throw queryError;
      }

      // Group and count
      const counts = new Map<string, number>();
      for (const record of data || []) {
        const key = `${record.ine_code}|${record.equipamiento_tipo}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      // Build fact records
      const factRecords: FactEquipamientoRecord[] = Array.from(counts.entries()).map(
        ([key, total]) => {
          const [ine_code, equipamiento_tipo] = key.split('|');
          return { ine_code, equipamiento_tipo, total };
        }
      );

      // Upsert facts
      if (factRecords.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from('fact_equipamiento_municipio_agg')
          .upsert(factRecords, {
            onConflict: 'ine_code,equipamiento_tipo',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      return { refreshed: factRecords.length, errors: 0 };
    }

    return { refreshed: 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing equipamientos facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
