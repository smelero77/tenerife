/**
 * Main orchestrator for CKAN Oficinas de Información Turística ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchAllRecords } from '@/lib/ckan/client';
import { transformOficinaRecord, mapMunicipioToIneCode, buildMunicipiosMap } from './transform';
import {
  loadOficinasBronze,
  loadOficinasSilver,
  refreshOficinasFacts,
} from './loaders';
import {
  RawCkanOficinaRecord,
  BronzeOficinaRecord,
  SilverOficinaRecord,
} from './types';
import { BATCH_SIZE } from '../nomenclator/constants';

const CKAN_DATASET_ID = '89d42ef7-009b-4ec2-8b9b-f6ed50d19998';
const CKAN_RESOURCE_ID = '907b2423-abb3-4382-ad53-75db4248c152';
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
      pipeline_name: 'ckan_oficinas_informacion_turistica',
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
 * Get all Tenerife municipalities for mapping
 */
async function getTenerifeMunicipios(): Promise<
  Array<{ ine_code: string; municipio_name: string }>
> {
  const { data, error } = await supabaseAdmin
    .from('dim_municipio')
    .select('ine_code, municipio_name')
    .order('municipio_name');

  if (error) {
    throw new Error(`Failed to fetch municipalities: ${error.message}`);
  }

  return data || [];
}

/**
 * Main ETL pipeline function
 */
export async function runOficinasTurismo(): Promise<{
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
    factsRefreshed: 0,
    factsErrors: 0,
  };

  try {
    let rawRecords: Array<Record<string, unknown>> = [];
    let silverRecords: SilverOficinaRecord[] = [];

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
      const bronzeRecords: BronzeOficinaRecord[] = rawRecords.map(
        (record) => ({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: CKAN_RESOURCE_ID,
          raw_row: record,
        })
      );

      const bronzeResult = await loadOficinasBronze(bronzeRecords);
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

    // Step 3: Transform and map municipalities
    const transformStepId = await createEtlStep(runId, 'transform_and_map');
    const transformStart = Date.now();

    try {
      console.log('Loading municipalities for mapping...');
      const municipios = await getTenerifeMunicipios();
      
      // Debug: log all municipality names
      console.log('Municipality names in database:');
      municipios.forEach(m => {
        if (m.municipio_name.toLowerCase().includes('orotava') || 
            m.municipio_name.toLowerCase().includes('realejos') || 
            m.municipio_name.toLowerCase().includes('silos')) {
          console.log(`  - "${m.municipio_name}" (${m.ine_code})`);
        }
      });
      
      const municipiosMap = await buildMunicipiosMap(municipios);
      console.log(`Loaded ${municipios.length} municipalities for mapping`);

      silverRecords = [];

      const unmappedMunicipios = new Set<string>();

      for (const rawRecord of rawRecords) {
        const transformed = transformOficinaRecord(
          rawRecord as RawCkanOficinaRecord,
          CKAN_DATASET_ID,
          CKAN_RESOURCE_ID
        );

        if (!transformed) {
          summary.silverSkipped++;
          continue;
        }

        // Map municipality name to INE code
        let ineCode = await mapMunicipioToIneCode(
          transformed.municipio_nombre,
          municipiosMap
        );

        // Special mapping for airports based on postal codes and known locations
        if (!ineCode) {
          if (transformed.municipio_nombre === 'Aeropuerto del Norte') {
            // Aeropuerto Tenerife Norte is in San Cristóbal de La Laguna (postal code 38297)
            ineCode = '38023'; // San Cristóbal de La Laguna
            console.log(`  Mapped "Aeropuerto del Norte" -> San Cristóbal de La Laguna (38023) based on postal code ${transformed.oficina_codigo_postal}`);
          } else if (transformed.municipio_nombre === 'Aeropuerto del Sur') {
            // Aeropuerto Tenerife Sur is in Granadilla de Abona (postal code 38610, near 38612)
            ineCode = '38018'; // Granadilla de Abona
            console.log(`  Mapped "Aeropuerto del Sur" -> Granadilla de Abona (38018) based on postal code ${transformed.oficina_codigo_postal}`);
          }
        }

        transformed.ine_code = ineCode;

        if (!ineCode) {
          unmappedMunicipios.add(transformed.municipio_nombre);
        }

        silverRecords.push(transformed);
        summary.silverTransformed++;
      }

      console.log(
        `Transformed ${summary.silverTransformed} records, skipped ${summary.silverSkipped}`
      );

      if (unmappedMunicipios.size > 0) {
        console.warn(`⚠️  Warning: ${unmappedMunicipios.size} municipalities could not be mapped to INE codes:`);
        Array.from(unmappedMunicipios).forEach((name) => {
          console.warn(`   - "${name}"`);
        });
      }

      await updateEtlStep(transformStepId, 'completed');
      steps.push({
        stepName: 'transform_and_map',
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
        stepName: 'transform_and_map',
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
      const silverResult = await loadOficinasSilver(silverRecords);
      summary.silverUpserted = silverResult.updated;
      summary.silverErrors = silverResult.errors;

      console.log(`Silver load result: ${silverResult.updated} upserted, ${silverResult.errors} errors`);

      await updateEtlStep(silverStepId, 'completed');
      steps.push({
        stepName: 'load_silver',
        duration: Date.now() - silverStart,
        success: true,
        stats: {
          upserted: silverResult.updated,
          errors: silverResult.errors,
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
      const factsResult = await refreshOficinasFacts();
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
