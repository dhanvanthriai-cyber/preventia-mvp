import { NextResponse } from 'next/server';

/**
 * GET /api/health — lightweight health probe for App Runner / load balancers.
 * Returns 200 OK with a JSON body so the health check passes.
 */
export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

