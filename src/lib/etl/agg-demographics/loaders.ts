/**
 * Loaders for aggregated demographics tables
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Refresh aggregated demographics tables
 * Uses stored procedure that aggregates directly from fact tables
 */
export async function refreshAggDemographics(): Promise<{
  refreshed: number;
  errors: number;
}> {
  try {
    // Call stored procedure to refresh aggregated demographics
    const { error: refreshError } = await supabaseAdmin.rpc(
      'refresh_agg_demographics'
    );

    if (refreshError) {
      throw refreshError;
    }

    // Get count of refreshed records
    const { count: munCount } = await supabaseAdmin
      .from('agg_demographics_municipio')
      .select('*', { count: 'exact', head: true });

    const { count: locCount } = await supabaseAdmin
      .from('agg_demographics_localidad')
      .select('*', { count: 'exact', head: true });

    return { 
      refreshed: (munCount || 0) + (locCount || 0), 
      errors: 0 
    };
  } catch (error) {
    console.error('Error refreshing aggregated demographics:', error);
    return { refreshed: 0, errors: 1 };
  }
}
