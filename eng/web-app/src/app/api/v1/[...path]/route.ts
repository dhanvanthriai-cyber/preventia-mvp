import { NextRequest } from 'next/server';
import { proxyToApi } from '@/lib/serverApiProxy';

export const dynamic = 'force-dynamic';

function getTargetPath(path: string[] | undefined): string {
  const joined = (path ?? []).join('/');
  return `/api/v1/${joined}`;
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  return proxyToApi(request, getTargetPath(path));
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}
