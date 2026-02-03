/**
 * Main orchestrator for CKAN Bienes de Interés Cultural ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchAllRecords } from '@/lib/ckan/client';
import { 
  fetchDataDictionary, 
  fetchDataDictionaryFromResource,
  suggestUniqueKey 
} from '@/lib/ckan/dictionary';
import { mapMunicipioToIneCode, buildMunicipiosMap } from '../ckan/transform';
import { transformBicRecord } from './transform';
import {
  loadBicBronze,
  loadBicSilver,
  refreshBicFacts,
} from './loaders';
import {
  RawCkanBicRecord,
  BronzeBicRecord,
  SilverBicRecord,
} from './types';

const CKAN_DATASET_ID = '83530250-3418-43d0-8019-18345a211271';
const CKAN_RESOURCE_ID = 'fd0e2bf8-f195-467e-9206-eb4e66287dd8';
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
      pipeline_name: 'ckan_bienes_interes_cultural',
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
export async function runBic(): Promise<{
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
    let silverRecords: SilverBicRecord[] = [];

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
      const bronzeRecords: BronzeBicRecord[] = rawRecords.map(
        (record) => ({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: CKAN_RESOURCE_ID,
          raw_row: record,
        })
      );

      const bronzeResult = await loadBicBronze(bronzeRecords);
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
      console.log('Loading municipalities for mapping...');
      const municipios = await getTenerifeMunicipios();
      const municipiosMap = await buildMunicipiosMap(municipios);
      console.log(`Loaded ${municipios.length} municipalities for mapping`);

      silverRecords = [];

      const unmappedMunicipios = new Set<string>();

      for (const rawRecord of rawRecords) {
        const transformed = transformBicRecord(
          rawRecord as RawCkanBicRecord,
          CKAN_DATASET_ID,
          CKAN_RESOURCE_ID
        );

        if (!transformed) {
          summary.silverSkipped++;
          continue;
        }

        // Special mapping for common variations (check BEFORE normal mapping to avoid warnings)
        let ineCode: string | null = null;
        const municipioUpper = transformed.municipio_nombre.toUpperCase().trim();
        
        // Debug: log the exact value for LAGUNA cases
        if (municipioUpper.includes('LAGUNA')) {
          console.log(`  DEBUG: municipio_nombre="${transformed.municipio_nombre}", municipioUpper="${municipioUpper}"`);
        }
        
        if (municipioUpper === 'LAGUNA (LA)' || municipioUpper === 'LAGUNA, LA' || municipioUpper === 'LA LAGUNA' || municipioUpper === 'LAGUNA') {
          ineCode = '38023'; // San Cristóbal de La Laguna
          console.log(`  Mapped "${transformed.municipio_nombre}" -> San Cristóbal de La Laguna (38023), ineCode=${ineCode}`);
        } else {
          // Map municipality name to INE code
          ineCode = await mapMunicipioToIneCode(
            transformed.municipio_nombre,
            municipiosMap
          );
        }

        transformed.ine_code = ineCode;
        
        // Debug: verify assignment for LAGUNA cases
        if (municipioUpper.includes('LAGUNA')) {
          console.log(`  DEBUG: After assignment, transformed.ine_code="${transformed.ine_code}"`);
        }

        if (!ineCode) {
          unmappedMunicipios.add(transformed.municipio_nombre);
        }

        silverRecords.push(transformed);
        summary.silverTransformed++;
      }

      if (unmappedMunicipios.size > 0) {
        console.warn(`⚠️  Warning: ${unmappedMunicipios.size} municipalities could not be mapped to INE codes:`);
        Array.from(unmappedMunicipios).forEach((name) => {
          console.warn(`   - "${name}"`);
        });
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
      const silverResult = await loadBicSilver(silverRecords);
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
      const factsResult = await refreshBicFacts();
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
