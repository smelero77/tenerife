/**
 * Database loaders with batch upserts for age and sex distribution tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  BronzeAgeRecord,
  BronzeSexRecord,
  BronzeNationalityRecord,
  SilverAgeRecord,
  SilverSexRecord,
  SilverNationalityRecord,
  AgeFactLocalidadRecord,
  AgeFactMunicipioRecord,
  SexFactLocalidadRecord,
  SexFactMunicipioRecord,
  NationalityFactLocalidadRecord,
  NationalityFactMunicipioRecord,
} from './types';
import { BATCH_SIZE } from './constants';

/**
 * Batch insert into bronze_nomenclator_age_raw
 */
export async function loadAgeBronze(
  records: BronzeAgeRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('bronze_nomenclator_age_raw')
      .insert(
        batch.map((r) => ({
          source_file: r.source_file,
          raw_row: r.raw_row,
        }))
      );

    if (error) {
      console.error(`Age Bronze batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Batch insert into bronze_nomenclator_sex_raw
 */
export async function loadSexBronze(
  records: BronzeSexRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('bronze_nomenclator_sex_raw')
      .insert(
        batch.map((r) => ({
          source_file: r.source_file,
          raw_row: r.raw_row,
        }))
      );

    if (error) {
      console.error(`Sex Bronze batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Upsert into silver_population_age
 */
export async function loadAgeSilver(
  records: SilverAgeRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('silver_population_age')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          tipo: r.tipo,
          year: r.year,
          age_group: r.age_group,
          population_total: r.population_total,
        })),
        {
          onConflict: 'ine_code,unit_code,tipo,year,age_group',
        }
      );

    if (error) {
      console.error(`Age Silver batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into silver_population_sex
 */
export async function loadSexSilver(
  records: SilverSexRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('silver_population_sex')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          unit_code: r.unit_code,
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
      console.error(`Sex Silver batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_age_localidad
 */
export async function loadAgeFactsLocalidad(
  records: AgeFactLocalidadRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_age_localidad')
      .upsert(
        batch.map((r) => ({
          localidad_id: r.localidad_id,
          year: r.year,
          age_group: r.age_group,
          population_total: r.population_total,
        })),
        {
          onConflict: 'localidad_id,year,age_group',
        }
      );

    if (error) {
      console.error(`Age Facts Localidad batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_age_municipio
 */
export async function loadAgeFactsMunicipio(
  records: AgeFactMunicipioRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_age_municipio')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          year: r.year,
          age_group: r.age_group,
          population_total: r.population_total,
        })),
        {
          onConflict: 'ine_code,year,age_group',
        }
      );

    if (error) {
      console.error(`Age Facts Municipio batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_sex_localidad
 */
export async function loadSexFactsLocalidad(
  records: SexFactLocalidadRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_sex_localidad')
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
      console.error(`Sex Facts Localidad batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_sex_municipio
 */
export async function loadSexFactsMunicipio(
  records: SexFactMunicipioRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_sex_municipio')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          year: r.year,
          population_total: r.population_total,
          population_male: r.population_male,
          population_female: r.population_female,
        })),
        {
          onConflict: 'ine_code,year',
        }
      );

    if (error) {
      console.error(`Sex Facts Municipio batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Batch insert into bronze_nomenclator_nationality_raw
 */
export async function loadNationalityBronze(
  records: BronzeNationalityRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('bronze_nomenclator_nationality_raw')
      .insert(
        batch.map((r) => ({
          source_file: r.source_file,
          raw_row: r.raw_row,
        }))
      );

    if (error) {
      console.error(`Nationality Bronze batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Upsert into silver_population_nationality
 */
export async function loadNationalitySilver(
  records: SilverNationalityRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('silver_population_nationality')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          tipo: r.tipo,
          year: r.year,
          population_total: r.population_total,
          population_spanish: r.population_spanish,
          population_foreign: r.population_foreign,
        })),
        {
          onConflict: 'ine_code,unit_code,tipo,year',
        }
      );

    if (error) {
      console.error(`Nationality Silver batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_nationality_localidad
 */
export async function loadNationalityFactsLocalidad(
  records: NationalityFactLocalidadRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_nationality_localidad')
      .upsert(
        batch.map((r) => ({
          localidad_id: r.localidad_id,
          year: r.year,
          population_total: r.population_total,
          population_spanish: r.population_spanish,
          population_foreign: r.population_foreign,
        })),
        {
          onConflict: 'localidad_id,year',
        }
      );

    if (error) {
      console.error(`Nationality Facts Localidad batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Upsert into fact_population_nationality_municipio
 */
export async function loadNationalityFactsMunicipio(
  records: NationalityFactMunicipioRecord[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('fact_population_nationality_municipio')
      .upsert(
        batch.map((r) => ({
          ine_code: r.ine_code,
          year: r.year,
          population_total: r.population_total,
          population_spanish: r.population_spanish,
          population_foreign: r.population_foreign,
        })),
        {
          onConflict: 'ine_code,year',
        }
      );

    if (error) {
      console.error(`Nationality Facts Municipio batch error (${i}-${i + batch.length}):`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, updated, errors };
}
