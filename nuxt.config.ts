import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Upstash Redis (added from the Vercel marketplace) provides the shared storage in production.
// Locally, data is kept in ./.data so you don't need any database to develop.
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export default defineNuxtConfig({
  // Old address of the map, from before each game had its own section.
  routeRules: { '/map': { redirect: '/railroader/map' } },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['shadcn-nuxt', 'nuxt-auth-utils'],
  // vue-sonner 2 ships its toast styles separately; without them toasts render unstyled, off screen.
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  vite: { plugins: [tailwindcss()] },

  // shadcn-vue components live in app/components/ui and are auto-imported by name (Button, Card, ...).
  shadcn: { prefix: '', componentDir: '@/components/ui' },

  app: {
    head: {
      title: 'Forever Rail Operations',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]
    }
  },

  // Every key here can be overridden with an env var named NUXT_<KEY> (see .env.example).
  runtimeConfig: {
    // Discord user IDs (comma-separated) that are always admins. Set this to your own ID.
    bootstrapAdminIds: '',
    // A report older than this counts as stale. Agents report every minute while nobody's watching, so leave room.
    staleAfterSec: 150,
    // Free key from https://carto.com/basemaps/apikey/ for the real-world map under the Railroader map.
    // Without it, that layer is simply not offered. Redeploy after setting it.
    cartoKey: '',
    // Vercel deploy hook URL for the public help site. Publishing calls it so the site rebuilds.
    // Without it, articles still save and publish; the help site just updates on its next deploy.
    helpDeployHook: '',
    // Read-write token of the private Vercel Blob store for bug report screenshots (NUXT_BUGS_BLOB_TOKEN).
    bugsBlobToken: '',
    public: {
      mapBackground: Boolean(process.env.NUXT_CARTO_KEY),
      // The Forever Rail status page's address (e.g. https://status.example.com), for the status in the header.
      // Set NUXT_PUBLIC_STATUS_URL; without it the header shows no status.
      statusUrl: '',
      // The public help site's address, linked from the sign-in page. Set NUXT_PUBLIC_HELP_URL; without it there's no link.
      helpUrl: '',
      // This release of the Operations Center, from package.json (Release Please bumps it), and the commit Vercel built.
      appVersion: version,
      appCommit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7)
    },
    discord: {
      guildId: '',
      // Optional channel webhook URLs (see server/utils/discord.ts): announcements get published What's new updates and
      // roadmap status changes (NUXT_DISCORD_UPDATES_WEBHOOK); staff get new feature requests and bug reports
      // (NUXT_DISCORD_STAFF_WEBHOOK).
      updatesWebhook: '',
      staffWebhook: '',
      // The three role-ID lists below are only used once, to fill in the starting Access settings.
      adminRoleIds: '',
      dispatcherRoleIds: '',
      memberRoleIds: ''
    },
    // Sessions expire after 12 hours, so Discord role changes take effect within that window.
    session: { maxAge: 60 * 60 * 12 }
  },

  nitro: {
    storage: upstashUrl
      ? { data: { driver: 'upstash', url: upstashUrl, token: upstashToken } }
      : {},
    devStorage: { data: { driver: 'fs', base: './.data/data' } }
  }
})
