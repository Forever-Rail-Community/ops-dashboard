// Sentry on the server: errors in API routes and server rendering, and a sample of requests for performance.
// Bundled into the server build by @sentry/nuxt. Off without a DSN (see nuxt.config.ts).
import * as Sentry from '@sentry/nuxt'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.1
  })
}
