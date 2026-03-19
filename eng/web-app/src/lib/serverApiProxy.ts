import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function buildTargetUrl(request: NextRequest, targetPath: string): string {
  const incoming = new URL(request.url);
  const target = new URL(targetPath, API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`);
  target.search = incoming.search;
  return target.toString();
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);

  // Let fetch/runtime compute transport-specific headers for the upstream call.
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-port');
  headers.delete('x-forwarded-proto');

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);

  // These hop-by-hop headers are managed by the platform response layer.
  headers.delete('connection');
  headers.delete('transfer-encoding');
  headers.delete('keep-alive');

  return headers;
}

export async function proxyToApi(request: NextRequest, targetPath: string): Promise<Response> {
  const method = request.method.toUpperCase();
  const url = buildTargetUrl(request, targetPath);
  const headers = buildUpstreamHeaders(request);
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(upstream.headers),
  });
}
