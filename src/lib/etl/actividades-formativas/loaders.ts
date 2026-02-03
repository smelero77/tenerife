/**
 * Database loaders with batch upserts for CKAN actividades formativas tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeActividadRecord,
  SilverActividadRecord,
  FactActividadRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_actividades_formativas_raw
 */
export async function loadActividadesBronze(
  records: BronzeActividadRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_actividades_formativas_raw')
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
 * Batch upsert into silver_actividad_formativa_agrocabildo
 */
export async function loadActividadesSilver(
  records: SilverActividadRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_actividad_formativa_agrocabildo')
        .upsert(batch, {
          onConflict: 'source_resource_id,actividad_id',
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
    }
  }

  return { inserted: 0, updated, errors };
}

/**
 * Refresh aggregated facts in fact_actividad_formativa_municipio_agg
 */
export async function refreshActividadesFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Query silver layer to aggregate
    const { data, error: queryError } = await supabaseAdmin
      .from('silver_actividad_formativa_agrocabildo')
      .select('ine_code, actividad_tipo, actividad_estado, actividad_horas')
      .not('ine_code', 'is', null);

    if (queryError) {
      throw queryError;
    }

    // Group and count
    const counts = new Map<string, { total: number; total_horas: number }>();
    for (const record of data || []) {
      const key = `${record.ine_code}|${record.actividad_tipo}|${record.actividad_estado}`;
      const current = counts.get(key) || { total: 0, total_horas: 0 };
      current.total += 1;
      current.total_horas += record.actividad_horas || 0;
      counts.set(key, current);
    }

    // Build fact records
    const factRecords: FactActividadRecord[] = Array.from(counts.entries()).map(
      ([key, stats]) => {
        const [ine_code, actividad_tipo, actividad_estado] = key.split('|');
        return {
          ine_code,
          actividad_tipo,
          actividad_estado,
          total: stats.total,
          total_horas: stats.total_horas,
        };
      }
    );

    // Upsert facts
    if (factRecords.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('fact_actividad_formativa_municipio_agg')
        .upsert(factRecords, {
          onConflict: 'ine_code,actividad_tipo,actividad_estado',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        throw upsertError;
      }
    }

    return { refreshed: factRecords.length, errors: 0 };
  } catch (error) {
    console.error('Error refreshing actividades facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
