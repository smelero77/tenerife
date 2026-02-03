/**
 * ETL pipeline trigger endpoint for CKAN Centros Médicos y Farmacias
 * Protected with x-etl-admin-token header
 */

import { NextRequest, NextResponse } from 'next/server';
import { runCentrosMedicosFarmacias } from '@/lib/etl/centros-medicos-farmacias/runCentrosMedicosFarmacias';

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
    console.log('Starting CKAN Centros Médicos y Farmacias ETL pipeline...');
    const result = await runCentrosMedicosFarmacias();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'CKAN Centros Médicos y Farmacias ETL pipeline completed successfully',
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
          message: 'CKAN Centros Médicos y Farmacias ETL pipeline failed',
          runId: result.runId,
          summary: result.summary,
          steps: result.steps,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('CKAN Centros Médicos y Farmacias ETL pipeline error:', error);
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
