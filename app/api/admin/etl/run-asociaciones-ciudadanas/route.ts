/**
 * ETL pipeline trigger endpoint for CKAN Asociaciones Ciudadanas
 * Protected with x-etl-admin-token header
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAsociacionesCiudadanas } from '@/lib/etl/asociaciones-ciudadanas/runAsociacionesCiudadanas';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Check authentication token
  const adminToken = request.headers.get('x-etl-admin-token');
  const expectedToken = process.env.ETL_ADMIN_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'ETL_ADMIN_TOKEN not configured' },
      { status: 500 }
    );
  }

  if (!adminToken || adminToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid or missing x-etl-admin-token' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting CKAN Asociaciones Ciudadanas ETL pipeline...');
    const result = await runAsociacionesCiudadanas();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'CKAN Asociaciones Ciudadanas ETL pipeline completed successfully',
          runId: result.runId,
          summary: result.summary,
          steps: result.steps,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'CKAN Asociaciones Ciudadanas ETL pipeline failed',
          runId: result.runId,
          summary: result.summary,
          steps: result.steps,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('CKAN Asociaciones Ciudadanas ETL pipeline error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
