/**
 * ETL pipeline trigger endpoint for nationality distribution
 * Protected with x-etl-admin-token header
 */

import { NextRequest, NextResponse } from 'next/server';
import { runNationalityDistribution2025 } from '@/lib/etl/distributions/runNationalityDistribution2025';

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
    console.log('Starting Nationality Distribution ETL pipeline...');
    const result = await runNationalityDistribution2025();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Nationality Distribution ETL pipeline completed successfully',
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
          message: 'Nationality Distribution ETL pipeline failed',
          runId: result.runId,
          summary: result.summary,
          steps: result.steps,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Nationality Distribution ETL pipeline error:', error);
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
