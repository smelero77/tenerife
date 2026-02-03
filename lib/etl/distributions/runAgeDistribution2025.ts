/**
 * Main orchestrator for Age Distribution 2025 ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseAgeCsvStream } from './parseAgeCsv';
import { transformAgeRow } from './transformAge';
import {
  loadAgeBronze,
  loadAgeSilver,
  loadAgeFactsLocalidad,
  loadAgeFactsMunicipio,
} from './loaders';
import {
  BronzeAgeRecord,
  SilverAgeRecord,
  AgeFactLocalidadRecord,
  AgeFactMunicipioRecord,
} from './types';
import { AGE_CSV_PATH } from './constants';
import { join } from 'path';

const CSV_FILE_PATH = join(process.cwd(), AGE_CSV_PATH);

interface StepResult {
  stepName: string;
  duration: number;
  success: boolean;
  error?: string;
  stats?: Record<string, number>;
}

async function createEtlRun(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('etl_runs')
    .insert({
      pipeline_name: 'age_distribution_multi_year_tenerife',
      status: 'running',
        metadata: {
          years: '2000-2025',
          scope: 'Tenerife',
          source_file: CSV_FILE_PATH,
        },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create ETL run: ${error?.message}`);
  }

  return data.id;
}

async function updateEtlRun(
  runId: string,
  status: 'completed' | 'failed',
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin
    .from('etl_runs')
    .update({
      status,
      ended_at: new Date().toISOString(),
      metadata,
    })
    .eq('id', runId);
}

async function createEtlStep(
  runId: string,
  stepName: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('etl_run_steps')
    .insert({
      run_id: runId,
      step_name: stepName,
      status: 'running',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create ETL step: ${error?.message}`);
  }

  return data.id;
}

async function updateEtlStep(
  stepId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await supabaseAdmin
    .from('etl_run_steps')
    .update({
      status,
      ended_at: new Date().toISOString(),
      error_message: errorMessage || null,
    })
    .eq('id', stepId);
}

export async function runAgeDistribution2025(): Promise<{
  success: boolean;
  runId: string;
  steps: StepResult[];
  summary: Record<string, number>;
}> {
  const runId = await createEtlRun();
  const steps: StepResult[] = [];
  const summary: Record<string, number> = {
    totalRowsProcessed: 0,
    tenerifeRows: 0,
    skippedRows: 0,
  };

  try {
    // Step 1: Parse CSV and filter Tenerife
    const step1Id = await createEtlStep(runId, 'parse_csv_filter_tenerife');
    const step1Start = Date.now();
    const bronzeRecords: BronzeAgeRecord[] = [];
    const silverRecords: SilverAgeRecord[] = [];
    let tenerifeRowCount = 0;

    try {
      console.log(`Reading Age CSV from: ${CSV_FILE_PATH}`);
      for await (const { row: rawRow, year } of parseAgeCsvStream(CSV_FILE_PATH)) {
        summary.totalRowsProcessed++;

        // Transform and filter (returns array of age group rows)
        const parsedRows = transformAgeRow(rawRow, year, CSV_FILE_PATH);
        if (!parsedRows || parsedRows.length === 0) {
          summary.skippedRows++;
          continue;
        }

        // Tenerife row found
        tenerifeRowCount++;
        summary.tenerifeRows++;

        // Build bronze record (one per original CSV row, not per year)
        // Track which base rows we've already added to bronze to avoid duplicates
        const existingBronzeKey = bronzeRecords.find(r => {
          const br = r.raw_row as {
            Provincia?: string;
            Municipio?: string;
            'Código Unidad Poblacional'?: string;
            Tipo?: string;
          };
          return br.Provincia === rawRow.Provincia &&
                 br.Municipio === rawRow.Municipio &&
                 br['Código Unidad Poblacional'] === rawRow['Código Unidad Poblacional'] &&
                 br.Tipo === rawRow.Tipo;
        });
        
        if (!existingBronzeKey) {
          bronzeRecords.push({
            source_file: CSV_FILE_PATH,
            raw_row: {
              Provincia: rawRow.Provincia,
              Municipio: rawRow.Municipio,
              'Código Unidad Poblacional': rawRow['Código Unidad Poblacional'],
              'Unidad Poblacional': rawRow['Unidad Poblacional'],
              Tipo: rawRow.Tipo,
              yearData: Object.fromEntries(rawRow.yearData),
            } as unknown as Record<string, unknown>,
          });
        }

        // Build silver records (one per age group per year)
        for (const parsed of parsedRows) {
          silverRecords.push({
            ine_code: parsed.ine_code,
            unit_code: parsed.unit_code,
            tipo: parsed.tipo,
            year: parsed.year,
            age_group: parsed.age_group,
            population_total: parsed.population_total,
          });
        }
      }

      const step1Duration = Date.now() - step1Start;
      await updateEtlStep(step1Id, 'completed');
      steps.push({
        stepName: 'parse_csv_filter_tenerife',
        duration: step1Duration,
        success: true,
        stats: {
          totalRows: summary.totalRowsProcessed,
          tenerifeRows: tenerifeRowCount,
          skippedRows: summary.skippedRows,
        },
      });
    } catch (error) {
      const step1Duration = Date.now() - step1Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step1Id, 'failed', errorMsg);
      steps.push({
        stepName: 'parse_csv_filter_tenerife',
        duration: step1Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 2: Load Bronze
    const step2Id = await createEtlStep(runId, 'load_bronze');
    const step2Start = Date.now();
    try {
      const bronzeResult = await loadAgeBronze(bronzeRecords);
      const step2Duration = Date.now() - step2Start;
      await updateEtlStep(step2Id, 'completed');
      steps.push({
        stepName: 'load_bronze',
        duration: step2Duration,
        success: true,
        stats: bronzeResult,
      });
      summary.bronzeInserted = bronzeResult.inserted;
      summary.bronzeErrors = bronzeResult.errors;
    } catch (error) {
      const step2Duration = Date.now() - step2Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step2Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_bronze',
        duration: step2Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 3: Load Silver
    const step3Id = await createEtlStep(runId, 'load_silver');
    const step3Start = Date.now();
    try {
      const silverResult = await loadAgeSilver(silverRecords);
      const step3Duration = Date.now() - step3Start;
      await updateEtlStep(step3Id, 'completed');
      steps.push({
        stepName: 'load_silver',
        duration: step3Duration,
        success: true,
        stats: silverResult,
      });
      summary.silverInserted = silverResult.inserted;
      summary.silverErrors = silverResult.errors;
    } catch (error) {
      const step3Duration = Date.now() - step3Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step3Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_silver',
        duration: step3Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 4: Build and load Age Facts Localidad (NUC/DIS only)
    const step4Id = await createEtlStep(runId, 'load_age_facts_localidad');
    const step4Start = Date.now();
    try {
      const ageFactsLocalidad: AgeFactLocalidadRecord[] = silverRecords
        .filter((r) => r.tipo === 'NUC' || r.tipo === 'DIS')
        .map((r) => ({
          localidad_id: `${r.ine_code}-${r.unit_code}`,
          year: r.year,
          age_group: r.age_group,
          population_total: r.population_total,
        }));

      const factsResult = await loadAgeFactsLocalidad(ageFactsLocalidad);
      const step4Duration = Date.now() - step4Start;
      await updateEtlStep(step4Id, 'completed');
      steps.push({
        stepName: 'load_age_facts_localidad',
        duration: step4Duration,
        success: true,
        stats: factsResult,
      });
      summary.ageFactsLocalidadInserted = factsResult.inserted;
    } catch (error) {
      const step4Duration = Date.now() - step4Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step4Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_age_facts_localidad',
        duration: step4Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 5: Build and load Age Facts Municipio (Tipo='M' only)
    const step5Id = await createEtlStep(runId, 'load_age_facts_municipio');
    const step5Start = Date.now();
    try {
      const ageFactsMunicipio: AgeFactMunicipioRecord[] = silverRecords
        .filter((r) => r.tipo === 'M')
        .map((r) => ({
          ine_code: r.ine_code,
          year: r.year,
          age_group: r.age_group,
          population_total: r.population_total,
        }));

      const factsResult = await loadAgeFactsMunicipio(ageFactsMunicipio);
      const step5Duration = Date.now() - step5Start;
      await updateEtlStep(step5Id, 'completed');
      steps.push({
        stepName: 'load_age_facts_municipio',
        duration: step5Duration,
        success: true,
        stats: factsResult,
      });
      summary.ageFactsMunicipioInserted = factsResult.inserted;
    } catch (error) {
      const step5Duration = Date.now() - step5Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step5Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_age_facts_municipio',
        duration: step5Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    await updateEtlRun(runId, 'completed', { summary, steps });

    return {
      success: true,
      runId,
      steps,
      summary,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateEtlRun(runId, 'failed', {
      error: errorMsg,
      summary,
      steps,
    });
    return {
      success: false,
      runId,
      steps,
      summary,
    };
  }
}
