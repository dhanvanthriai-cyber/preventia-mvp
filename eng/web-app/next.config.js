/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const nextConfig = {
  // Standalone output — required for the production Docker image (Dockerfile.prod)
  // Produces a self-contained server.js + node_modules bundle in .next/standalone
  output: 'standalone',

  // Transpile the local @preventia/shared package plus all ESM-only
  // transitive deps of stream-chat-react (micromark-*, remark-*, hast-*, etc.)
  // These ship as pure ESM and Webpack 5 can't bundle them without transpilation.
  transpilePackages: [
    '@preventia/shared',
    // stream-chat-react ESM deps
    'stream-chat-react',
    'react-markdown',
    'remark-gfm',
    'remark-parse',
    'remark-rehype',
    'rehype-stringify',
    'hast-util-to-jsx-runtime',
    'hast-util-to-html',
    'hast-util-raw',
    'micromark',
    'micromark-core-commonmark',
    'micromark-extension-gfm',
    'micromark-extension-gfm-autolink-literal',
    'micromark-extension-gfm-footnote',
    'micromark-extension-gfm-strikethrough',
    'micromark-extension-gfm-table',
    'micromark-extension-gfm-tagfilter',
    'micromark-extension-gfm-task-list-item',
    'micromark-util-character',
    'micromark-util-chunked',
    'micromark-util-classify-character',
    'micromark-util-combine-extensions',
    'micromark-util-decode-numeric-character-reference',
    'micromark-util-decode-string',
    'micromark-util-encode',
    'micromark-util-html-tag-name',
    'micromark-util-normalize-identifier',
    'micromark-util-resolve-all',
    'micromark-util-sanitize-uri',
    'micromark-util-subtokenize',
    'micromark-util-symbol',
    'micromark-util-types',
    'mdast-util-from-markdown',
    'mdast-util-gfm',
    'mdast-util-gfm-autolink-literal',
    'mdast-util-gfm-footnote',
    'mdast-util-gfm-strikethrough',
    'mdast-util-gfm-table',
    'mdast-util-gfm-task-list-item',
    'mdast-util-to-hast',
    'mdast-util-to-markdown',
    'estree-util-is-identifier-name',
    'linkifyjs',
    'unist-util-position',
    'unist-util-stringify-position',
    'unist-util-visit',
    'unist-util-visit-parents',
    'unist-util-is',
    'vfile',
    'vfile-message',
  ],

  // Allow environment-driven API base URL
  env: {
    NEXT_PUBLIC_API_BASE_URL: API_BASE,
  },

  // Stub out browser-only packages that leak in via @preventia/shared
  // on the server side. @daily-co/daily-js uses RTCPeerConnection / window
  // and must never be evaluated during SSR.
  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '@daily-co/daily-js': false,
      };
    }
    return config;
  },

  // Proxy /api/** → Spring Boot backend.
  // /api/logout is a Next.js Route Handler — it must NOT be proxied.
  // We list it as a separate no-op so it falls through to the filesystem handler.
  async rewrites() {
    return [
      // ✅ Exclude /api/logout — handled by src/app/api/logout/route.ts
      // (no rewrite entry = Next.js serves its own route handler first)

      // Proxy everything else under /api/ to Spring Boot
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE}/api/v1/:path*`,
      },
      {
        source: '/api/actuator/:path*',
        destination: `${API_BASE}/actuator/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
