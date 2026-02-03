/**
 * Main orchestrator for Wikimedia/Wikidata ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { findWikidataIdByIneCode, fetchWikidataEntity, transformWikidataToSilver } from './fetchWikidata';
import { loadWikimediaBronze, loadWikimediaSilver } from './loaders';
import { BronzeWikimediaRecord, SilverWikimediaRecord } from './types';
import { TENERIFE_INE_CODES } from '../nomenclator/constants';

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
      pipeline_name: 'wikimedia_enrichment_tenerife',
      status: 'running',
      metadata: {
        scope: 'Tenerife',
        source: 'Wikidata API',
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create ETL run: ${error?.message || 'Unknown error'}`);
  }

  return data.id;
}

/**
 * Update ETL run status
 */
async function updateEtlRun(runId: string, status: 'completed' | 'failed', summary: Record<string, number>) {
  await supabaseAdmin
    .from('etl_runs')
    .update({
      status,
      ended_at: new Date().toISOString(),
      summary,
    })
    .eq('id', runId);
}

/**
 * Create ETL step record
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
    throw new Error(`Failed to create ETL step: ${error?.message || 'Unknown error'}`);
  }

  return data.id;
}

/**
 * Update ETL step status
 */
async function updateEtlStep(stepId: string, status: 'completed' | 'failed', errorMessage?: string) {
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
 * Get all Tenerife municipalities from dim_municipio
 */
async function getTenerifeMunicipalities(): Promise<Array<{ ine_code: string; municipio_name: string }>> {
  const { data, error } = await supabaseAdmin
    .from('dim_municipio')
    .select('ine_code, municipio_name')
    .in('ine_code', Array.from(TENERIFE_INE_CODES))
    .order('ine_code');

  if (error) {
    throw new Error(`Failed to fetch municipalities: ${error.message}`);
  }

  return data || [];
}

/**
 * Main ETL pipeline function
 */
export async function runWikimediaETL(): Promise<{
  success: boolean;
  runId: string;
  summary: Record<string, number>;
  steps: StepResult[];
}> {
  const runId = await createEtlRun();
  const steps: StepResult[] = [];
  const summary: Record<string, number> = {
    municipalitiesProcessed: 0,
    wikidataFound: 0,
    wikidataNotFound: 0,
    errors: 0,
    bronzeInserted: 0,
    bronzeErrors: 0,
    silverUpdated: 0,
    silverErrors: 0,
  };

  try {
    // Step 1: Fetch municipalities and query Wikidata
    const step1Id = await createEtlStep(runId, 'fetch_wikidata');
    const step1Start = Date.now();
    const bronzeRecords: BronzeWikimediaRecord[] = [];
    const silverRecords: SilverWikimediaRecord[] = [];

    try {
      const municipalities = await getTenerifeMunicipalities();
      console.log(`Found ${municipalities.length} municipalities to process`);

      for (const muni of municipalities) {
        summary.municipalitiesProcessed++;

        try {
          // Rate limiting: wait 1 second between requests
          if (summary.municipalitiesProcessed > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          console.log(`Processing ${muni.ine_code} - ${muni.municipio_name}`);

          // Find Wikidata ID by INE code
          const qid = await findWikidataIdByIneCode(muni.ine_code);

          if (!qid) {
            console.log(`  No Wikidata entity found for INE code ${muni.ine_code}`);
            summary.wikidataNotFound++;

            // Store in bronze as "not_found"
            bronzeRecords.push({
              ine_code: muni.ine_code,
              source_type: 'wikidata',
              api_endpoint: 'https://query.wikidata.org/sparql?query=...',
              raw_response: { query: 'P772', ine_code: muni.ine_code },
              status: 'not_found',
            });
            continue;
          }

          summary.wikidataFound++;
          console.log(`  Found Wikidata ID: ${qid}`);

          // Fetch entity data
          const entity = await fetchWikidataEntity(qid);

          if (!entity) {
            console.log(`  Failed to fetch entity data for ${qid}`);
            summary.errors++;

            bronzeRecords.push({
              ine_code: muni.ine_code,
              source_type: 'wikidata',
              api_endpoint: `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}`,
              raw_response: { qid, error: 'Entity not found' },
              status: 'error',
              error_message: 'Entity not found',
            });
            continue;
          }

          // Store raw response in bronze
          bronzeRecords.push({
            ine_code: muni.ine_code,
            source_type: 'wikidata',
            api_endpoint: `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}`,
            raw_response: entity as unknown as Record<string, unknown>,
            status: 'success',
          });

          // Transform to silver record
          const silverRecord = await transformWikidataToSilver(muni.ine_code, entity);
          silverRecords.push(silverRecord);

          console.log(`  Extracted data: ${JSON.stringify(silverRecord, null, 2)}`);
        } catch (error) {
          console.error(`Error processing ${muni.ine_code}:`, error);
          summary.errors++;

          bronzeRecords.push({
            ine_code: muni.ine_code,
            source_type: 'wikidata',
            api_endpoint: 'unknown',
            raw_response: { error: error instanceof Error ? error.message : 'Unknown error' },
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const step1Duration = Date.now() - step1Start;
      await updateEtlStep(step1Id, 'completed');
      steps.push({
        stepName: 'fetch_wikidata',
        duration: step1Duration,
        success: true,
        stats: {
          municipalitiesProcessed: summary.municipalitiesProcessed,
          wikidataFound: summary.wikidataFound,
          wikidataNotFound: summary.wikidataNotFound,
          errors: summary.errors,
        },
      });
    } catch (error) {
      const step1Duration = Date.now() - step1Start;
      await updateEtlStep(step1Id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      steps.push({
        stepName: 'fetch_wikidata',
        duration: step1Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    // Step 2: Load bronze
    const step2Id = await createEtlStep(runId, 'load_bronze');
    const step2Start = Date.now();

    try {
      const bronzeResult = await loadWikimediaBronze(bronzeRecords);
      summary.bronzeInserted = bronzeResult.inserted;
      summary.bronzeErrors = bronzeResult.errors;

      const step2Duration = Date.now() - step2Start;
      await updateEtlStep(step2Id, 'completed');
      steps.push({
        stepName: 'load_bronze',
        duration: step2Duration,
        success: true,
        stats: {
          inserted: bronzeResult.inserted,
          errors: bronzeResult.errors,
        },
      });
    } catch (error) {
      const step2Duration = Date.now() - step2Start;
      await updateEtlStep(step2Id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      steps.push({
        stepName: 'load_bronze',
        duration: step2Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    // Step 3: Load silver
    const step3Id = await createEtlStep(runId, 'load_silver');
    const step3Start = Date.now();

    try {
      const silverResult = await loadWikimediaSilver(silverRecords);
      summary.silverUpdated = silverResult.updated;
      summary.silverErrors = silverResult.errors;

      const step3Duration = Date.now() - step3Start;
      await updateEtlStep(step3Id, 'completed');
      steps.push({
        stepName: 'load_silver',
        duration: step3Duration,
        success: true,
        stats: {
          updated: silverResult.updated,
          errors: silverResult.errors,
        },
      });
    } catch (error) {
      const step3Duration = Date.now() - step3Start;
      await updateEtlStep(step3Id, 'failed', error instanceof Error ? error.message : 'Unknown error');
      steps.push({
        stepName: 'load_silver',
        duration: step3Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
    await updateEtlRun(runId, 'failed', summary);
    return {
      success: false,
      runId,
      summary,
      steps,
    };
  }
}
