// Sentry in the browser: errors in the pages, and a sample of page loads and requests for performance.
// Off without a DSN (see nuxt.config.ts). No session replays, and no personal data beyond what an error carries.
import * as Sentry from '@sentry/nuxt'

// The release (the commit) is set by the build, matching the uploaded source maps.
const { sentry } = useRuntimeConfig().public

if (sentry.dsn) {
  Sentry.init({
    dsn: sentry.dsn,
    environment: sentry.environment,
    sendDefaultPii: false,
    // A tenth of page loads and requests; the free plan includes 5M spans a month.
    tracesSampleRate: 0.1
  })
}
