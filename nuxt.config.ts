import tailwindcss from '@tailwindcss/vite'

// Upstash Redis (added from the Vercel marketplace) provides the shared storage in production.
// Locally, data is kept in ./.data so you don't need any database to develop.
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['shadcn-nuxt', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
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
    ingestKey: '',
    // Discord user IDs (comma-separated) that are always admins. Set this to your own ID.
    bootstrapAdminIds: '',
    staleAfterSec: 90,
    discord: {
      guildId: '',
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
