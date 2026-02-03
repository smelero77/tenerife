/**
 * Database loaders with batch upserts for CKAN instalaciones deportivas tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeInstalacionDeportivaRecord,
  SilverInstalacionDeportivaRecord,
  SilverEspacioDeportivoRecord,
  SilverEspacioComplementarioRecord,
  SilverCaracteristicaInstalacionRecord,
  SilverCaracteristicaEspacioRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

/**
 * Batch insert into bronze_ckan_instalaciones_deportivas_raw
 */
export async function loadInstalacionesDeportivasBronze(
  records: BronzeInstalacionDeportivaRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('bronze_ckan_instalaciones_deportivas_raw')
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
 * Batch upsert into silver_instalacion_deportiva
 * Validates INE codes against dim_municipio before inserting
 */
export async function loadInstalacionesDeportivasSilver(
  records: SilverInstalacionDeportivaRecord[]
): Promise<{ inserted: number; updated: number; errors: number; invalidIneCodes: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let invalidIneCodes = 0;

  // Get valid INE codes
  const validIneCodes = await getValidIneCodes();

  // Validate and filter records
  const validRecords: SilverInstalacionDeportivaRecord[] = [];
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

    try {
      // Use stored procedure for upsert
      const { error } = await supabaseAdmin.rpc('upsert_instalacion_deportiva_batch', {
        p_records: batch
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

  return { inserted: 0, updated, errors, invalidIneCodes };
}

/**
 * Get all valid installation codes from silver_instalacion_deportiva
 */
async function getValidInstalacionCodigos(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('silver_instalacion_deportiva')
    .select('instalacion_codigo');

  if (error) {
    console.warn('Failed to fetch valid installation codes, will skip validation:', error);
    return new Set();
  }

  return new Set((data || []).map((i) => i.instalacion_codigo));
}

/**
 * Batch upsert into silver_espacio_deportivo
 * Validates that installation codes exist before inserting
 */
export async function loadEspaciosDeportivosSilver(
  records: SilverEspacioDeportivoRecord[]
): Promise<{ inserted: number; updated: number; errors: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  // Get valid installation codes
  const validInstalacionCodigos = await getValidInstalacionCodigos();

  // Filter records to only include those with valid installation codes
  const validRecords: SilverEspacioDeportivoRecord[] = [];
  const invalidInstalacionCodigos = new Set<string>();

  for (const record of records) {
    if (!validInstalacionCodigos.has(record.instalacion_codigo)) {
      invalidInstalacionCodigos.add(record.instalacion_codigo);
      skipped++;
      continue;
    }
    validRecords.push(record);
  }

  if (invalidInstalacionCodigos.size > 0) {
    console.warn(`⚠️  Warning: ${skipped} sports spaces skipped due to invalid installation codes:`);
    Array.from(invalidInstalacionCodigos).slice(0, 10).forEach((codigo) => {
      console.warn(`   - Installation code "${codigo}" not found`);
    });
    if (invalidInstalacionCodigos.size > 10) {
      console.warn(`   ... and ${invalidInstalacionCodigos.size - 10} more`);
    }
  }

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_espacio_deportivo')
        .upsert(batch, {
          onConflict: 'instalacion_codigo,espacio_codigo',
        });

      if (error) {
        console.error(`Espacios deportivos batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        updated += batch.length;
      }
    } catch (error) {
      console.error(`Espacios deportivos batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted: 0, updated, errors, skipped };
}

/**
 * Batch upsert into silver_espacio_complementario
 * Validates that installation codes exist before inserting
 */
export async function loadEspaciosComplementariosSilver(
  records: SilverEspacioComplementarioRecord[]
): Promise<{ inserted: number; updated: number; errors: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  // Get valid installation codes
  const validInstalacionCodigos = await getValidInstalacionCodigos();

  // Filter records to only include those with valid installation codes
  const validRecords: SilverEspacioComplementarioRecord[] = [];
  const invalidInstalacionCodigos = new Set<string>();

  for (const record of records) {
    if (!validInstalacionCodigos.has(record.instalacion_codigo)) {
      invalidInstalacionCodigos.add(record.instalacion_codigo);
      skipped++;
      continue;
    }
    validRecords.push(record);
  }

  if (invalidInstalacionCodigos.size > 0) {
    console.warn(`⚠️  Warning: ${skipped} complementary spaces skipped due to invalid installation codes:`);
    Array.from(invalidInstalacionCodigos).slice(0, 10).forEach((codigo) => {
      console.warn(`   - Installation code "${codigo}" not found`);
    });
    if (invalidInstalacionCodigos.size > 10) {
      console.warn(`   ... and ${invalidInstalacionCodigos.size - 10} more`);
    }
  }

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_espacio_complementario')
        .upsert(batch, {
          onConflict: 'instalacion_codigo,espacio_complementario_codigo',
        });

      if (error) {
        console.error(`Espacios complementarios batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        updated += batch.length;
      }
    } catch (error) {
      console.error(`Espacios complementarios batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted: 0, updated, errors, skipped };
}

/**
 * Batch insert into silver_caracteristica_instalacion
 * Validates that installation codes exist before inserting
 */
export async function loadCaracteristicasInstalacionesSilver(
  records: SilverCaracteristicaInstalacionRecord[]
): Promise<{ inserted: number; errors: number; skipped: number }> {
  let inserted = 0;
  let errors = 0;
  let skipped = 0;

  // Get valid installation codes
  const validInstalacionCodigos = await getValidInstalacionCodigos();

  // Filter records to only include those with valid installation codes
  const validRecords: SilverCaracteristicaInstalacionRecord[] = [];
  const invalidInstalacionCodigos = new Set<string>();

  for (const record of records) {
    if (!validInstalacionCodigos.has(record.instalacion_codigo)) {
      invalidInstalacionCodigos.add(record.instalacion_codigo);
      skipped++;
      continue;
    }
    validRecords.push(record);
  }

  if (invalidInstalacionCodigos.size > 0) {
    console.warn(`⚠️  Warning: ${skipped} installation characteristics skipped due to invalid installation codes:`);
    Array.from(invalidInstalacionCodigos).slice(0, 10).forEach((codigo) => {
      console.warn(`   - Installation code "${codigo}" not found`);
    });
    if (invalidInstalacionCodigos.size > 10) {
      console.warn(`   ... and ${invalidInstalacionCodigos.size - 10} more`);
    }
  }

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_caracteristica_instalacion')
        .insert(batch);

      if (error) {
        console.error(`Caracteristicas instalaciones batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    } catch (error) {
      console.error(`Caracteristicas instalaciones batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted, errors, skipped };
}

/**
 * Batch insert into silver_caracteristica_espacio_deportivo
 * Note: This table doesn't have a unique constraint, so we insert all records
 */
export async function loadCaracteristicasEspaciosSilver(
  records: SilverCaracteristicaEspacioRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin
        .from('silver_caracteristica_espacio_deportivo')
        .insert(batch);

      if (error) {
        console.error(`Caracteristicas espacios batch error (${i}-${i + batch.length}):`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    } catch (error) {
      console.error(`Caracteristicas espacios batch exception (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Refresh aggregated facts in fact_instalacion_deportiva_municipio_agg
 * Uses stored procedure that aggregates directly from silver layer
 */
export async function refreshInstalacionesDeportivasFacts(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh facts
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_fact_instalacion_deportiva_municipio_agg'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count } = await supabaseAdmin
      .from('fact_instalacion_deportiva_municipio_agg')
      .select('*', { count: 'exact', head: true });

    return { refreshed: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error refreshing instalaciones deportivas facts:', error);
    return { refreshed: 0, errors: 1 };
  }
}
