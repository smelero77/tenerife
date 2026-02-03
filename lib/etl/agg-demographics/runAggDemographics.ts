/**
 * Main orchestrator for Aggregated Demographics ETL pipeline
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { refreshAggDemographics } from './loaders';

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
      pipeline_name: 'agg_demographics',
      status: 'running',
      metadata: {
        source: 'fact_population_* tables',
        description: 'Pre-calculated demographics aggregations',
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
export async function runAggDemographics(): Promise<{
  success: boolean;
  runId: string;
  summary: Record<string, number>;
  steps: StepResult[];
}> {
  const runId = await createEtlRun();
  const summary: Record<string, number> = {};
  const steps: StepResult[] = [];

  try {
    console.log('Starting Aggregated Demographics ETL pipeline...');

    // Step 1: Refresh aggregated demographics
    const refreshStepId = await createEtlStep(runId, 'refresh_agg_demographics');
    const refreshStart = Date.now();

    try {
      const refreshResult = await refreshAggDemographics();
      summary.refreshed = refreshResult.refreshed;
      summary.errors = refreshResult.errors;

      await updateEtlStep(refreshStepId, 'completed');
      steps.push({
        stepName: 'refresh_agg_demographics',
        duration: Date.now() - refreshStart,
        success: true,
        stats: {
          refreshed: refreshResult.refreshed,
          errors: refreshResult.errors,
        },
      });

      console.log(
        `Aggregated demographics refreshed: ${refreshResult.refreshed} records, ${refreshResult.errors} errors`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await updateEtlStep(refreshStepId, 'failed', errorMessage);
      steps.push({
        stepName: 'refresh_agg_demographics',
        duration: Date.now() - refreshStart,
        success: false,
        error: errorMessage,
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
