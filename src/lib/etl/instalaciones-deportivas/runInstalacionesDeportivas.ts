/**
 * Main orchestrator for CKAN Instalaciones Deportivas ETL pipeline
 * Loads multiple related resources: installations, sports spaces, complementary spaces, and characteristics
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchAllRecords } from '@/lib/ckan/client';
import { mapMunicipioToIneCode, buildMunicipiosMap } from '../ckan/transform';
import {
  transformInstalacionRecord,
  transformEspacioDeportivoRecord,
  transformEspacioComplementarioRecord,
  transformCaracteristicaInstalacionRecord,
  transformCaracteristicaEspacioRecord,
} from './transform';
import {
  loadInstalacionesDeportivasBronze,
  loadInstalacionesDeportivasSilver,
  loadEspaciosDeportivosSilver,
  loadEspaciosComplementariosSilver,
  loadCaracteristicasInstalacionesSilver,
  loadCaracteristicasEspaciosSilver,
  refreshInstalacionesDeportivasFacts,
} from './loaders';
import {
  RawCkanInstalacionRecord,
  RawCkanEspacioDeportivoRecord,
  RawCkanEspacioComplementarioRecord,
  RawCkanCaracteristicaInstalacionRecord,
  RawCkanCaracteristicaEspacioRecord,
  BronzeInstalacionDeportivaRecord,
  SilverInstalacionDeportivaRecord,
  SilverEspacioDeportivoRecord,
  SilverEspacioComplementarioRecord,
  SilverCaracteristicaInstalacionRecord,
  SilverCaracteristicaEspacioRecord,
} from './types';

const CKAN_DATASET_ID = '92cc7f97-aa47-4df7-876d-24dcdaf747ed';
const CKAN_BASE_URL = 'https://datos.tenerife.es/ckan/api/3/action';

// Resource IDs for each type
const RESOURCE_IDS = {
  instalaciones: '9efc232a-e084-4546-936b-15d5f0262fe0',
  espacios_deportivos: 'af665344-4a48-4be9-b112-700560689240',
  espacios_complementarios: '3291f1ca-3878-47d6-9d6b-106c75fd2059',
  caracteristicas_instalaciones: '99154524-3d95-42d7-8127-f0f2216b3718',
  caracteristicas_espacios: '455d67dc-c7b9-44c9-a685-06f5be0e79d0',
};

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
      pipeline_name: 'ckan_instalaciones_deportivas',
      status: 'running',
      metadata: {
        dataset_id: CKAN_DATASET_ID,
        resources: RESOURCE_IDS,
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
export async function runInstalacionesDeportivas(): Promise<{
  success: boolean;
  runId: string;
  summary: Record<string, number>;
  steps: StepResult[];
}> {
  const runId = await createEtlRun();
  const steps: StepResult[] = [];
  const summary: Record<string, number> = {
    instalacionesFetched: 0,
    espaciosDeportivosFetched: 0,
    espaciosComplementariosFetched: 0,
    caracteristicasInstalacionesFetched: 0,
    caracteristicasEspaciosFetched: 0,
    instalacionesBronzeInserted: 0,
    instalacionesSilverUpserted: 0,
    espaciosDeportivosUpserted: 0,
    espaciosComplementariosUpserted: 0,
    caracteristicasInstalacionesInserted: 0,
    caracteristicasEspaciosInserted: 0,
    factsRefreshed: 0,
  };

  try {
    // Step 1: Fetch all resources from CKAN
    const fetchStepId = await createEtlStep(runId, 'fetch_ckan_data');
    const fetchStart = Date.now();

    let instalacionesRaw: Array<Record<string, unknown>> = [];
    let espaciosDeportivosRaw: Array<Record<string, unknown>> = [];
    let espaciosComplementariosRaw: Array<Record<string, unknown>> = [];
    let caracteristicasInstalacionesRaw: Array<Record<string, unknown>> = [];
    let caracteristicasEspaciosRaw: Array<Record<string, unknown>> = [];

    try {
      console.log('Fetching data from CKAN DataStore...');
      
      console.log('  Fetching instalaciones...');
      instalacionesRaw = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: RESOURCE_IDS.instalaciones,
        limit: 1000,
      });
      summary.instalacionesFetched = instalacionesRaw.length;
      console.log(`  Fetched ${instalacionesRaw.length} instalaciones`);

      console.log('  Fetching espacios deportivos...');
      espaciosDeportivosRaw = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: RESOURCE_IDS.espacios_deportivos,
        limit: 1000,
      });
      summary.espaciosDeportivosFetched = espaciosDeportivosRaw.length;
      console.log(`  Fetched ${espaciosDeportivosRaw.length} espacios deportivos`);

      console.log('  Fetching espacios complementarios...');
      espaciosComplementariosRaw = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: RESOURCE_IDS.espacios_complementarios,
        limit: 1000,
      });
      summary.espaciosComplementariosFetched = espaciosComplementariosRaw.length;
      console.log(`  Fetched ${espaciosComplementariosRaw.length} espacios complementarios`);

      console.log('  Fetching caracteristicas instalaciones...');
      caracteristicasInstalacionesRaw = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: RESOURCE_IDS.caracteristicas_instalaciones,
        limit: 1000,
      });
      summary.caracteristicasInstalacionesFetched = caracteristicasInstalacionesRaw.length;
      console.log(`  Fetched ${caracteristicasInstalacionesRaw.length} caracteristicas instalaciones`);

      console.log('  Fetching caracteristicas espacios...');
      caracteristicasEspaciosRaw = await fetchAllRecords({
        baseUrl: CKAN_BASE_URL,
        resourceId: RESOURCE_IDS.caracteristicas_espacios,
        limit: 1000,
      });
      summary.caracteristicasEspaciosFetched = caracteristicasEspaciosRaw.length;
      console.log(`  Fetched ${caracteristicasEspaciosRaw.length} caracteristicas espacios`);

      await updateEtlStep(fetchStepId, 'completed');
      steps.push({
        stepName: 'fetch_ckan_data',
        duration: Date.now() - fetchStart,
        success: true,
        stats: {
          instalaciones: instalacionesRaw.length,
          espaciosDeportivos: espaciosDeportivosRaw.length,
          espaciosComplementarios: espaciosComplementariosRaw.length,
          caracteristicasInstalaciones: caracteristicasInstalacionesRaw.length,
          caracteristicasEspacios: caracteristicasEspaciosRaw.length,
        },
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

    // Step 2: Load all raw data into Bronze
    const bronzeStepId = await createEtlStep(runId, 'load_bronze');
    const bronzeStart = Date.now();

    try {
      const bronzeRecords: BronzeInstalacionDeportivaRecord[] = [];

      // Add all records to bronze
      for (const record of instalacionesRaw) {
        bronzeRecords.push({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: RESOURCE_IDS.instalaciones,
          resource_type: 'instalaciones',
          raw_row: record,
        });
      }
      for (const record of espaciosDeportivosRaw) {
        bronzeRecords.push({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: RESOURCE_IDS.espacios_deportivos,
          resource_type: 'espacios_deportivos',
          raw_row: record,
        });
      }
      for (const record of espaciosComplementariosRaw) {
        bronzeRecords.push({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: RESOURCE_IDS.espacios_complementarios,
          resource_type: 'espacios_complementarios',
          raw_row: record,
        });
      }
      for (const record of caracteristicasInstalacionesRaw) {
        bronzeRecords.push({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: RESOURCE_IDS.caracteristicas_instalaciones,
          resource_type: 'caracteristicas_instalaciones',
          raw_row: record,
        });
      }
      for (const record of caracteristicasEspaciosRaw) {
        bronzeRecords.push({
          source_dataset_id: CKAN_DATASET_ID,
          source_resource_id: RESOURCE_IDS.caracteristicas_espacios,
          resource_type: 'caracteristicas_espacios',
          raw_row: record,
        });
      }

      const bronzeResult = await loadInstalacionesDeportivasBronze(bronzeRecords);
      summary.instalacionesBronzeInserted = bronzeResult.inserted;

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

    // Step 3: Transform and load installations (must be first)
    const instalacionesStepId = await createEtlStep(runId, 'transform_and_load_instalaciones');
    const instalacionesStart = Date.now();

    try {
      console.log('Loading municipalities for mapping...');
      const municipios = await getTenerifeMunicipios();
      const municipiosMap = await buildMunicipiosMap(municipios);
      console.log(`Loaded ${municipios.length} municipalities for mapping`);

      const instalacionesSilver: SilverInstalacionDeportivaRecord[] = [];
      const unmappedMunicipios = new Set<string>();

      for (const rawRecord of instalacionesRaw) {
        const transformed = transformInstalacionRecord(
          rawRecord as RawCkanInstalacionRecord,
          CKAN_DATASET_ID,
          RESOURCE_IDS.instalaciones
        );

        if (!transformed) {
          continue;
        }

        // Map municipality name to INE code
        const ineCode = await mapMunicipioToIneCode(
          transformed.municipio_nombre,
          municipiosMap
        );
        transformed.ine_code = ineCode;

        if (!ineCode) {
          unmappedMunicipios.add(transformed.municipio_nombre);
        }

        instalacionesSilver.push(transformed);
      }

      if (unmappedMunicipios.size > 0) {
        console.warn(`⚠️  Warning: ${unmappedMunicipios.size} municipalities could not be mapped to INE codes:`);
        Array.from(unmappedMunicipios).forEach((name) => {
          console.warn(`   - "${name}"`);
        });
      }

      console.log(`Loading ${instalacionesSilver.length} installations into Silver...`);
      const instalacionesResult = await loadInstalacionesDeportivasSilver(instalacionesSilver);
      summary.instalacionesSilverUpserted = instalacionesResult.updated;

      await updateEtlStep(instalacionesStepId, 'completed');
      steps.push({
        stepName: 'transform_and_load_instalaciones',
        duration: Date.now() - instalacionesStart,
        success: true,
        stats: {
          upserted: instalacionesResult.updated,
          errors: instalacionesResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(instalacionesStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform_and_load_instalaciones',
        duration: Date.now() - instalacionesStart,
        success: false,
        error: errorMessage,
      });
      throw error;
    }

    // Step 4: Transform and load sports spaces
    const espaciosDeportivosStepId = await createEtlStep(runId, 'transform_and_load_espacios_deportivos');
    const espaciosDeportivosStart = Date.now();

    try {
      const espaciosDeportivosSilver: SilverEspacioDeportivoRecord[] = [];

      for (const rawRecord of espaciosDeportivosRaw) {
        const transformed = transformEspacioDeportivoRecord(
          rawRecord as RawCkanEspacioDeportivoRecord,
          CKAN_DATASET_ID,
          RESOURCE_IDS.espacios_deportivos
        );

        if (!transformed) {
          continue;
        }

        espaciosDeportivosSilver.push(transformed);
      }

      console.log(`Loading ${espaciosDeportivosSilver.length} sports spaces into Silver...`);
      const espaciosResult = await loadEspaciosDeportivosSilver(espaciosDeportivosSilver);
      summary.espaciosDeportivosUpserted = espaciosResult.updated;
      if (espaciosResult.skipped > 0) {
        console.warn(`  Skipped ${espaciosResult.skipped} sports spaces due to invalid installation codes`);
      }

      await updateEtlStep(espaciosDeportivosStepId, 'completed');
      steps.push({
        stepName: 'transform_and_load_espacios_deportivos',
        duration: Date.now() - espaciosDeportivosStart,
        success: true,
        stats: {
          upserted: espaciosResult.updated,
          errors: espaciosResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(espaciosDeportivosStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform_and_load_espacios_deportivos',
        duration: Date.now() - espaciosDeportivosStart,
        success: false,
        error: errorMessage,
      });
      // Don't throw - continue with other resources
    }

    // Step 5: Transform and load complementary spaces
    const espaciosComplementariosStepId = await createEtlStep(runId, 'transform_and_load_espacios_complementarios');
    const espaciosComplementariosStart = Date.now();

    try {
      const espaciosComplementariosSilver: SilverEspacioComplementarioRecord[] = [];

      for (const rawRecord of espaciosComplementariosRaw) {
        const transformed = transformEspacioComplementarioRecord(
          rawRecord as RawCkanEspacioComplementarioRecord,
          CKAN_DATASET_ID,
          RESOURCE_IDS.espacios_complementarios
        );

        if (!transformed) {
          continue;
        }

        espaciosComplementariosSilver.push(transformed);
      }

      console.log(`Loading ${espaciosComplementariosSilver.length} complementary spaces into Silver...`);
      const espaciosComplementariosResult = await loadEspaciosComplementariosSilver(espaciosComplementariosSilver);
      summary.espaciosComplementariosUpserted = espaciosComplementariosResult.updated;
      if (espaciosComplementariosResult.skipped > 0) {
        console.warn(`  Skipped ${espaciosComplementariosResult.skipped} complementary spaces due to invalid installation codes`);
      }

      await updateEtlStep(espaciosComplementariosStepId, 'completed');
      steps.push({
        stepName: 'transform_and_load_espacios_complementarios',
        duration: Date.now() - espaciosComplementariosStart,
        success: true,
        stats: {
          upserted: espaciosComplementariosResult.updated,
          errors: espaciosComplementariosResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(espaciosComplementariosStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform_and_load_espacios_complementarios',
        duration: Date.now() - espaciosComplementariosStart,
        success: false,
        error: errorMessage,
      });
      // Don't throw - continue with other resources
    }

    // Step 6: Transform and load installation characteristics
    const caracteristicasInstalacionesStepId = await createEtlStep(runId, 'transform_and_load_caracteristicas_instalaciones');
    const caracteristicasInstalacionesStart = Date.now();

    try {
      const caracteristicasInstalacionesSilver: SilverCaracteristicaInstalacionRecord[] = [];

      for (const rawRecord of caracteristicasInstalacionesRaw) {
        const transformed = transformCaracteristicaInstalacionRecord(
          rawRecord as RawCkanCaracteristicaInstalacionRecord,
          CKAN_DATASET_ID,
          RESOURCE_IDS.caracteristicas_instalaciones
        );

        if (!transformed) {
          continue;
        }

        caracteristicasInstalacionesSilver.push(transformed);
      }

      console.log(`Loading ${caracteristicasInstalacionesSilver.length} installation characteristics into Silver...`);
      const caracteristicasInstalacionesResult = await loadCaracteristicasInstalacionesSilver(caracteristicasInstalacionesSilver);
      summary.caracteristicasInstalacionesInserted = caracteristicasInstalacionesResult.inserted;
      if (caracteristicasInstalacionesResult.skipped > 0) {
        console.warn(`  Skipped ${caracteristicasInstalacionesResult.skipped} installation characteristics due to invalid installation codes`);
      }

      await updateEtlStep(caracteristicasInstalacionesStepId, 'completed');
      steps.push({
        stepName: 'transform_and_load_caracteristicas_instalaciones',
        duration: Date.now() - caracteristicasInstalacionesStart,
        success: true,
        stats: {
          inserted: caracteristicasInstalacionesResult.inserted,
          errors: caracteristicasInstalacionesResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(caracteristicasInstalacionesStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform_and_load_caracteristicas_instalaciones',
        duration: Date.now() - caracteristicasInstalacionesStart,
        success: false,
        error: errorMessage,
      });
      // Don't throw - continue with other resources
    }

    // Step 7: Transform and load sports space characteristics
    const caracteristicasEspaciosStepId = await createEtlStep(runId, 'transform_and_load_caracteristicas_espacios');
    const caracteristicasEspaciosStart = Date.now();

    try {
      const caracteristicasEspaciosSilver: SilverCaracteristicaEspacioRecord[] = [];

      for (const rawRecord of caracteristicasEspaciosRaw) {
        const transformed = transformCaracteristicaEspacioRecord(
          rawRecord as RawCkanCaracteristicaEspacioRecord,
          CKAN_DATASET_ID,
          RESOURCE_IDS.caracteristicas_espacios
        );

        if (!transformed) {
          continue;
        }

        caracteristicasEspaciosSilver.push(transformed);
      }

      console.log(`Loading ${caracteristicasEspaciosSilver.length} sports space characteristics into Silver...`);
      const caracteristicasEspaciosResult = await loadCaracteristicasEspaciosSilver(caracteristicasEspaciosSilver);
      summary.caracteristicasEspaciosInserted = caracteristicasEspaciosResult.inserted;

      await updateEtlStep(caracteristicasEspaciosStepId, 'completed');
      steps.push({
        stepName: 'transform_and_load_caracteristicas_espacios',
        duration: Date.now() - caracteristicasEspaciosStart,
        success: true,
        stats: {
          inserted: caracteristicasEspaciosResult.inserted,
          errors: caracteristicasEspaciosResult.errors,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(caracteristicasEspaciosStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'transform_and_load_caracteristicas_espacios',
        duration: Date.now() - caracteristicasEspaciosStart,
        success: false,
        error: errorMessage,
      });
      // Don't throw - continue with facts refresh
    }

    // Step 8: Refresh aggregated facts
    const factsStepId = await createEtlStep(runId, 'refresh_facts');
    const factsStart = Date.now();

    try {
      const factsResult = await refreshInstalacionesDeportivasFacts();
      summary.factsRefreshed = factsResult.refreshed;

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
