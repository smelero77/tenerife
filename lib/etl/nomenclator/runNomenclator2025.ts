/**
 * Main orchestrator for INE Nomenclátor 2025 ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseCsvStream } from './parseCsv';
import { transformRow } from './transform';
import {
  loadBronze,
  loadSilver,
  loadMunicipios,
  loadEntidadesSingulares,
  loadLocalidades,
  loadPopulationFacts,
  loadMunicipioSnapshots,
} from './loaders';
import {
  ParsedRow,
  BronzeRecord,
  SilverRecord,
  MunicipioRecord,
  EntidadSingularRecord,
  LocalidadRecord,
  PopulationFactRecord,
  MunicipioSnapshotRecord,
} from './types';
import {
  POPULATION_YEAR,
  SNAPSHOT_DATE,
  TENERIFE_PROVINCE,
  TENERIFE_ISLAND,
} from './constants';
import { join } from 'path';

// Use absolute path for CSV file
const CSV_FILE_PATH = join(
  process.cwd(),
  'data',
  'raw',
  'Nomenclator_Semicolon_20260131_190532.csv'
);

// Log the path for debugging
console.log('CSV file path:', CSV_FILE_PATH);

interface StepResult {
  stepName: string;
  duration: number;
  success: boolean;
  error?: string;
  stats?: Record<string, number>;
}

/**
 * Create ETL run record
 */
async function createEtlRun(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('etl_runs')
    .insert({
      pipeline_name: 'nomenclator_2025_tenerife',
      status: 'running',
      metadata: {
        year: POPULATION_YEAR,
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

/**
 * Update ETL run status
 */
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

/**
 * Create ETL run step
 */
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

/**
 * Update ETL run step
 */
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

/**
 * Main ETL pipeline orchestrator
 */
export async function runNomenclator2025(): Promise<{
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
    let bronzeRecords: BronzeRecord[] = [];
    let silverRecords: SilverRecord[] = [];
    const municipioMap = new Map<string, MunicipioRecord>();
    let tenerifeRowCount = 0;

    try {
      console.log(`Reading CSV from: ${CSV_FILE_PATH}`);
      let rowCount = 0;
      for await (const rawRow of parseCsvStream(CSV_FILE_PATH)) {
        rowCount++;
        summary.totalRowsProcessed++;

        // Transform and filter
        const parsed = transformRow(rawRow, CSV_FILE_PATH);
        if (!parsed) {
          summary.skippedRows++;
          continue;
        }

        // Tenerife row found
        tenerifeRowCount++;
        summary.tenerifeRows++;

        // Build bronze record
        bronzeRecords.push({
          source_file: CSV_FILE_PATH,
          raw_row: rawRow as unknown as Record<string, unknown>,
        });

        // Build silver record
        silverRecords.push({
          prov_code: parsed.prov_code,
          muni_code: parsed.muni_code,
          ine_code: parsed.ine_code,
          unit_code: parsed.unit_code,
          unit_name: parsed.unit_name,
          tipo: parsed.tipo,
          year: parsed.year,
          population_total: parsed.population_total,
          population_male: parsed.population_male,
          population_female: parsed.population_female,
        });

        // Extract municipality name from Municipio column
        const muniMatch = rawRow.Municipio.match(/^\d+\s+(.+)$/);
        const municipioName = muniMatch ? muniMatch[1] : rawRow.Municipio;

        // Track municipality (upsert later)
        if (!municipioMap.has(parsed.ine_code)) {
          municipioMap.set(parsed.ine_code, {
            ine_code: parsed.ine_code,
            municipio_name: municipioName,
            island: TENERIFE_ISLAND,
            province: TENERIFE_PROVINCE,
          });
        }
      }
      
      console.log(`Total rows parsed: ${rowCount}, Tenerife rows: ${tenerifeRowCount}`);

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
      const bronzeResult = await loadBronze(bronzeRecords);
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
      const silverResult = await loadSilver(silverRecords);
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

    // Step 4: Load Municipalities
    const step4Id = await createEtlStep(runId, 'load_municipios');
    const step4Start = Date.now();
    try {
      const municipiosArray = Array.from(municipioMap.values());
      const municipiosResult = await loadMunicipios(municipiosArray);
      const step4Duration = Date.now() - step4Start;
      await updateEtlStep(step4Id, 'completed');
      steps.push({
        stepName: 'load_municipios',
        duration: step4Duration,
        success: true,
        stats: municipiosResult,
      });
      summary.municipiosInserted = municipiosResult.inserted;
    } catch (error) {
      const step4Duration = Date.now() - step4Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step4Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_municipios',
        duration: step4Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 5: Build and load Entidades Singulares (ES)
    const step5Id = await createEtlStep(runId, 'load_entidades_singulares');
    const step5Start = Date.now();
    try {
      const entidadesRecords: EntidadSingularRecord[] = silverRecords
        .filter((r) => r.tipo === 'ES')
        .map((r) => ({
          entidad_id: `${r.ine_code}-${r.unit_code}`,
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          entidad_name: r.unit_name,
        }));

      const entidadesResult = await loadEntidadesSingulares(entidadesRecords);
      const step5Duration = Date.now() - step5Start;
      await updateEtlStep(step5Id, 'completed');
      steps.push({
        stepName: 'load_entidades_singulares',
        duration: step5Duration,
        success: true,
        stats: entidadesResult,
      });
      summary.entidadesInserted = entidadesResult.inserted;
    } catch (error) {
      const step5Duration = Date.now() - step5Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step5Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_entidades_singulares',
        duration: step5Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 6: Build and load Localidades (NUC/DIS)
    const step6Id = await createEtlStep(runId, 'load_localidades');
    const step6Start = Date.now();
    try {
      const localidadesRecords: LocalidadRecord[] = silverRecords
        .filter((r) => r.tipo === 'NUC' || r.tipo === 'DIS')
        .map((r) => ({
          localidad_id: `${r.ine_code}-${r.unit_code}`,
          ine_code: r.ine_code,
          unit_code: r.unit_code,
          localidad_name: r.unit_name,
          tipo: r.tipo as 'NUC' | 'DIS',
        }));

      const localidadesResult = await loadLocalidades(localidadesRecords);
      const step6Duration = Date.now() - step6Start;
      await updateEtlStep(step6Id, 'completed');
      steps.push({
        stepName: 'load_localidades',
        duration: step6Duration,
        success: true,
        stats: localidadesResult,
      });
      summary.localidadesInserted = localidadesResult.inserted;
    } catch (error) {
      const step6Duration = Date.now() - step6Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step6Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_localidades',
        duration: step6Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 7: Build and load Population Facts (NUC/DIS only)
    const step7Id = await createEtlStep(runId, 'load_population_facts');
    const step7Start = Date.now();
    try {
      const populationFacts: PopulationFactRecord[] = silverRecords
        .filter((r) => r.tipo === 'NUC' || r.tipo === 'DIS')
        .map((r) => ({
          localidad_id: `${r.ine_code}-${r.unit_code}`,
          year: r.year,
          population_total: r.population_total,
          population_male: r.population_male,
          population_female: r.population_female,
        }));

      const factsResult = await loadPopulationFacts(populationFacts);
      const step7Duration = Date.now() - step7Start;
      await updateEtlStep(step7Id, 'completed');
      steps.push({
        stepName: 'load_population_facts',
        duration: step7Duration,
        success: true,
        stats: factsResult,
      });
      summary.populationFactsInserted = factsResult.inserted;
    } catch (error) {
      const step7Duration = Date.now() - step7Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step7Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_population_facts',
        duration: step7Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // Step 8: Build and load Gold snapshots
    const step8Id = await createEtlStep(runId, 'load_municipio_snapshots');
    const step8Start = Date.now();
    try {
      // Get population totals from tipo='M' rows
      const municipioPopulations = new Map<string, number>();
      for (const record of silverRecords) {
        if (record.tipo === 'M') {
          municipioPopulations.set(record.ine_code, record.population_total);
        }
      }

      // Count NUC per municipality
      const nucCounts = new Map<string, number>();
      for (const record of silverRecords) {
        if (record.tipo === 'NUC') {
          nucCounts.set(
            record.ine_code,
            (nucCounts.get(record.ine_code) || 0) + 1
          );
        }
      }

      // Build snapshot records
      const snapshotRecords: MunicipioSnapshotRecord[] = Array.from(
        municipioMap.keys()
      ).map((ine_code) => ({
        snapshot_date: SNAPSHOT_DATE,
        ine_code,
        population_total_municipio:
          municipioPopulations.get(ine_code) || 0,
        number_of_nuclei: nucCounts.get(ine_code) || 0,
      }));

      const snapshotsResult = await loadMunicipioSnapshots(snapshotRecords);
      const step8Duration = Date.now() - step8Start;
      await updateEtlStep(step8Id, 'completed');
      steps.push({
        stepName: 'load_municipio_snapshots',
        duration: step8Duration,
        success: true,
        stats: snapshotsResult,
      });
      summary.snapshotsInserted = snapshotsResult.inserted;
    } catch (error) {
      const step8Duration = Date.now() - step8Start;
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      await updateEtlStep(step8Id, 'failed', errorMsg);
      steps.push({
        stepName: 'load_municipio_snapshots',
        duration: step8Duration,
        success: false,
        error: errorMsg,
      });
      throw error;
    }

    // All steps completed
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
