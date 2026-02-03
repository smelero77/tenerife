/**
 * ETL pipeline trigger endpoint for CKAN Instalaciones Residuos
 * Protected with x-etl-admin-token header
 */

import { NextRequest, NextResponse } from 'next/server';
import { runInstalacionesResiduos } from '@/lib/etl/instalaciones-residuos/runInstalacionesResiduos';

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
    console.log('Starting CKAN Instalaciones Residuos ETL pipeline...');
    const result = await runInstalacionesResiduos();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'CKAN Instalaciones Residuos ETL pipeline completed successfully',
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
          message: 'CKAN Instalaciones Residuos ETL pipeline failed',
          runId: result.runId,
          summary: result.summary,
          steps: result.steps,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('CKAN Instalaciones Residuos ETL pipeline error:', error);
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
