/**
 * Main orchestrator for CKAN Empresas de Servicios ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchAllRecords } from '@/lib/ckan/client';
import { 
  fetchDataDictionary, 
  fetchDataDictionaryFromResource,
  suggestUniqueKey 
} from '@/lib/ckan/dictionary';
import { transformEmpresaServicioRecord } from './transform';
import {
  loadEmpresasServiciosBronze,
  loadEmpresasServiciosSilver,
  refreshEmpresasServiciosFacts,
} from './loaders';
import {
  RawCkanEmpresaServicioRecord,
  BronzeEmpresaServicioRecord,
  SilverEmpresaServicioRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

const CKAN_DATASET_ID = 'e781a8b2-6d9d-4ae2-9b10-d030a780e442';
const CKAN_RESOURCE_ID = '6f19c491-84c7-4444-9979-357b9a42692c';
const CKAN_BASE_URL = 'https://datos.tenerife.es/ckan/api/3/action';

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
      pipeline_name: 'ckan_empresas_servicios',
      status: 'running',
      metadata: {
        dataset_id: CKAN_DATASET_ID,
        resource_id: CKAN_RESOURCE_ID,
        source: 'CKAN DataStore API',
        base_url: CKAN_BASE_URL,
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
      metadata: metadata ? { ...metadata } : undefined,
    })
    .eq('id', runId);
}

/**
 * Create ETL run step
 */
async function createEtlStep(runId: string, stepName: string): Promise<string> {
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
      error_message: errorMessage,
    })
    .eq('id', stepId);
}

/**
 * Main ETL pipeline function
 */
export async function runEmpresasServicios(): Promise<{
  success: boolean;
  runId: string;
  summary: Record<string, number>;
  steps: StepResult[];
}> {
  const runId = await createEtlRun();
  const steps: StepResult[] = [];
  const summary: Record<string, number> = {
    recordsFetched: 0,
    bronzeInserted: 0,
    bronzeErrors: 0,
    silverTransformed: 0,
    silverSkipped: 0,
    silverUpserted: 0,
    silverErrors: 0,
    silverInvalidIneCodes: 0,
    factsRefreshed: 0,
    factsErrors: 0,
  };

  try {
    let rawRecords: Array<Record<string, unknown>> = [];
    let silverRecords: SilverEmpresaServicioRecord[] = [];

    // Step 1: Fetch data from CKAN
    const fetchStepId = await createEtlStep(runId, 'fetch_ckan_data');
    const fetchStart = Date.now();

    try {
      console.log('Fetching data from CKAN DataStore...');
      rawRecords = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: CKAN_RESOURCE_ID,
        limit: 1000,
      });

      summary.recordsFetched = rawRecords.length;
      console.log(`Fetched ${rawRecords.length} records from CKAN`);

      // Try to fetch data dictionary to understand unique keys
      console.log('\n📋 Consultando diccionario de datos de CKAN...');
      let dictionary = await fetchDataDictionary(CKAN_RESOURCE_ID, CKAN_BASE_URL);
      
      if (!dictionary) {
        dictionary = await fetchDataDictionaryFromResource(CKAN_DATASET_ID, CKAN_BASE_URL);
      }

      if (dictionary) {
        console.log('✓ Diccionario de datos encontrado');
        if (dictionary.primary_key && dictionary.primary_key.length > 0) {
          console.log(`  🔑 Clave primaria definida: ${dictionary.primary_key.join(', ')}`);
        }
        if (dictionary.unique_keys && dictionary.unique_keys.length > 0) {
          console.log(`  🔑 Claves únicas definidas: ${dictionary.unique_keys.join(', ')}`);
        }
        if (!dictionary.primary_key && !dictionary.unique_keys) {
          console.log('  ⚠️  No se encontró clave primaria o única en el diccionario');
          const suggested = suggestUniqueKey(dictionary, rawRecords.slice(0, 100));
          console.log(`  💡 Clave única sugerida (basada en análisis): ${suggested.join(', ')}`);
        }
      } else {
        console.log('⚠️  No se pudo obtener el diccionario de datos');
        // Analyze sample data to suggest unique key
        const suggested = suggestUniqueKey(null, rawRecords.slice(0, 100));
        console.log(`  💡 Clave única sugerida (basada en análisis de datos): ${suggested.join(', ')}`);
      }

      await updateEtlStep(fetchStepId, 'completed');
      steps.push({
        stepName: 'fetch_ckan_data',
        duration: Date.now() - fetchStart,
        success: true,
        stats: { recordsFetched: rawRecords.length },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(fetchStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'fetch_ckan_data',
        duration: Date.now() - fetchStart,
        success: false,
        error: errorMessage,
      });
      throw error;
    }

    // Step 2: Insert into Bronze
    const bronzeStepId = await createEtlStep(runId, 'load_bronze');
    const bronzeStart = Date.now();

    try {
      const bronzeRecords: BronzeEmpresaServicioRecord[] = rawRecords.map(
        (record) => ({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: CKAN_RESOURCE_ID,
          raw_row: record,
        })
      );

      const bronzeResult = await loadEmpresasServiciosBronze(bronzeRecords);
      summary.bronzeInserted = bronzeResult.inserted;
      summary.bronzeErrors = bronzeResult.errors;

      await updateEtlStep(bronzeStepId, 'completed');
      steps.push({
        stepName: 'load_bronze',
        duration: Date.now() - bronzeStart,
        success: true,
        stats: {
          inserted: bronzeResult.inserted,
          errors: bronzeResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(bronzeStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'load_bronze',
        duration: Date.now() - bronzeStart,
        success: false,
        error: errorMessage,
      });
      throw error;
    }

    // Step 3: Transform
    const transformStepId = await createEtlStep(runId, 'transform');
    const transformStart = Date.now();

    try {
      silverRecords = [];

      for (const rawRecord of rawRecords) {
        const transformed = transformEmpresaServicioRecord(
          rawRecord as RawCkanEmpresaServicioRecord,
          CKAN_DATASET_ID,
          CKAN_RESOURCE_ID
        );

        if (!transformed) {
          summary.silverSkipped++;
          continue;
        }

        silverRecords.push(transformed);
        summary.silverTransformed++;
      }

      console.log(
        `Transformed ${summary.silverTransformed} records, skipped ${summary.silverSkipped}`
      );

      await updateEtlStep(transformStepId, 'completed');
      steps.push({
        stepName: 'transform',
        duration: Date.now() - transformStart,
        success: true,
        stats: {
          transformed: summary.silverTransformed,
          skipped: summary.silverSkipped,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(transformStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform',
        duration: Date.now() - transformStart,
        success: false,
        error: errorMessage,
      });
      throw error;
    }

    // Step 4: Upsert into Silver
    const silverStepId = await createEtlStep(runId, 'load_silver');
    const silverStart = Date.now();

    try {
      console.log(`Loading ${silverRecords.length} records into Silver...`);
      if (silverRecords.length > 0) {
        console.log(`Sample record:`, JSON.stringify(silverRecords[0], null, 2));
      }
      const silverResult = await loadEmpresasServiciosSilver(silverRecords);
      summary.silverUpserted = silverResult.updated;
      summary.silverErrors = silverResult.errors;
      summary.silverInvalidIneCodes = silverResult.invalidIneCodes;

      console.log(`Silver load result: ${silverResult.updated} upserted, ${silverResult.errors} errors, ${silverResult.invalidIneCodes} invalid INE codes`);

      await updateEtlStep(silverStepId, 'completed');
      steps.push({
        stepName: 'load_silver',
        duration: Date.now() - silverStart,
        success: true,
        stats: {
          upserted: silverResult.updated,
          errors: silverResult.errors,
          invalidIneCodes: silverResult.invalidIneCodes,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Silver load error:', error);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      await updateEtlStep(silverStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'load_silver',
        duration: Date.now() - silverStart,
        success: false,
        error: errorMessage,
      });
      throw error;
    }

    // Step 5: Refresh aggregated facts
    const factsStepId = await createEtlStep(runId, 'refresh_facts');
    const factsStart = Date.now();

    try {
      const factsResult = await refreshEmpresasServiciosFacts();
      summary.factsRefreshed = factsResult.refreshed;
      summary.factsErrors = factsResult.errors;

      await updateEtlStep(factsStepId, 'completed');
      steps.push({
        stepName: 'refresh_facts',
        duration: Date.now() - factsStart,
        success: true,
        stats: {
          refreshed: factsResult.refreshed,
          errors: factsResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(factsStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'refresh_facts',
        duration: Date.now() - factsStart,
        success: false,
        error: errorMessage,
      });
      // Don't throw - facts refresh is optional
    }

    // Mark run as completed
    await updateEtlRun(runId, 'completed', summary);

    return {
      success: true,
      runId,
      summary,
      steps,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await updateEtlRun(runId, 'failed', { error: errorMessage });
    return {
      success: false,
      runId,
      summary,
      steps,
    };
  }
}
