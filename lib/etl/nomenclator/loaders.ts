/**
 * Database loaders with batch upserts for each table
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeRecord,
  SilverRecord,
  MunicipioRecord,
  EntidadSingularRecord,
  LocalidadRecord,
  PopulationFactRecord,
  MunicipioSnapshotRecord,
} from './types';
import { BATCH_SIZE } from './constants';

/**
 * Batch insert into bronze_nomenclator_raw
 */
export async function loadBronze(
  records: BronzeRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('bronze_nomenclator_raw')
      .insert(
        batch.map((r) => ({
          source_file: r.source_file,
          raw_row: r.raw_row,
        }))
      );

    if (error) {
      console.error(`Bronze batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Upsert into silver_nomenclator_units
 */
export async function loadSilver(
  records: SilverRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('silver_nomenclator_units')
      .upsert(
        batch.map((r) => ({
          prov_code: r.prov_code,
          muni_code: r.muni_code,
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          unit_name: r.unit_name,
          tipo: r.tipo,
          year: r.year,
          population_total: r.population_total,
          population_male: r.population_male,
          population_female: r.population_female,
        })),
        {
          onConflict: 'ine_code,unit_code,tipo,year',
        }
      );

    if (error) {
      console.error(`Silver batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      // Upsert doesn't distinguish insert vs update, so we count as inserted
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into dim_municipio
 */
export async function loadMunicipios(
  records: MunicipioRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('dim_municipio')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          municipio_name: r.municipio_name,
          island: r.island,
          province: r.province,
        })),
        {
          onConflict: 'ine_code',
        }
      );

    if (error) {
      console.error(`Municipios batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into dim_entidad_singular
 */
export async function loadEntidadesSingulares(
  records: EntidadSingularRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('dim_entidad_singular')
      .upsert(
        batch.map((r) => ({
          entidad_id: r.entidad_id,
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          entidad_name: r.entidad_name,
        })),
        {
          onConflict: 'ine_code,unit_code',
        }
      );

    if (error) {
      console.error(
        `Entidades batch error (${i}-${i + batch.length}):`,
        error
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into dim_localidad
 */
export async function loadLocalidades(
  records: LocalidadRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('dim_localidad')
      .upsert(
        batch.map((r) => ({
          localidad_id: r.localidad_id,
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          localidad_name: r.localidad_name,
          tipo: r.tipo,
        })),
        {
          onConflict: 'ine_code,unit_code,tipo',
        }
      );

    if (error) {
      console.error(`Localidades batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_localidad
 */
export async function loadPopulationFacts(
  records: PopulationFactRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_localidad')
      .upsert(
        batch.map((r) => ({
          localidad_id: r.localidad_id,
          year: r.year,
          population_total: r.population_total,
          population_male: r.population_male,
          population_female: r.population_female,
        })),
        {
          onConflict: 'localidad_id,year',
        }
      );

    if (error) {
      console.error(
        `Population facts batch error (${i}-${i + batch.length}):`,
        error
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into agg_municipio_snapshot
 */
export async function loadMunicipioSnapshots(
  records: MunicipioSnapshotRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('agg_municipio_snapshot')
      .upsert(
        batch.map((r) => ({
          snapshot_date: r.snapshot_date,
          ine_code: r.ine_code,
          population_total_municipio: r.population_total_municipio,
          number_of_nuclei: r.number_of_nuclei,
        })),
        {
          onConflict: 'snapshot_date,ine_code',
        }
      );

    if (error) {
      console.error(
        `Snapshots batch error (${i}-${i + batch.length}):`,
        error
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}
