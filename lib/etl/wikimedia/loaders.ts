/**
 * Database loaders with batch upserts for Wikimedia tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { BronzeWikimediaRecord, SilverWikimediaRecord } from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_wikimedia_raw
 */
export async function loadWikimediaBronze(
  records: BronzeWikimediaRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_wikimedia_raw')
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
 * Batch upsert into silver_wikimedia_municipio
 */
export async function loadWikimediaSilver(
  records: SilverWikimediaRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_wikimedia_municipio')
        .upsert(batch, {
          onConflict: 'ine_code',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Silver batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        // Count as updated since we're using upsert
        updated += batch.length;
      }
    } catch (error) {
      console.error(`Silver batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted: 0, updated, errors };
}
