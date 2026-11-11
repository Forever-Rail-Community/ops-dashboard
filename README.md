# Forever Rail Operations Dashboard

Nuxt 4 + shadcn-vue (shadcn/ui for Vue) + Tailwind CSS 4. Discord login only. Built for Vercel. Shows the status of each Run8 route
instance, fed by the `forever-rail-agent` program running on the game server.

## Who can see and change what

Everything below is edited from the **Admin** page on the site, not in code.

- **Roles** are named sets of permissions (view route status, see CPU and memory, change appearance, manage access, view activity).
  Three roles are created at the start: Member, Dispatcher, and Admin. You can rename them, change what they can do, and add more.
- **Discord roles** are linked to dashboard roles on the Access tab. "Any server member" gives a role to everyone in your server.
  A person can match several roles and gets everything from all of them.
- **Bootstrap admins**: the Discord user IDs in `NUXT_BOOTSTRAP_ADMIN_IDS` are always admins, so a wrong setting on the
  Access page can never lock you out.
- Changes to roles take effect on the person's next page load. Their Discord roles are re-read when they sign in again
  (sessions last 12 hours).
- **Appearance** covers the site name, subtitle, logo, main color, and the wording used on the site.
- **Activity** lists recent admin changes, with who made them.

## 1. Create the Discord application

1. Go to https://discord.com/developers/applications and create an application.
2. Under **OAuth2**, copy the **Client ID** and **Client Secret**.
3. Under **OAuth2 > Redirects**, add both:
   - `http://localhost:3000/auth/discord`
   - `https://YOUR-DOMAIN/auth/discord`
4. In Discord, turn on Developer Mode (User Settings > Advanced). Then right-click the server to copy its
   **server ID**, and right-click roles (Server Settings > Roles) to copy **role IDs**.

## 2. Run it locally

```
copy .env.example .env      (macOS/Linux: cp .env.example .env)
npm install
npm run dev
```

Fill in `.env` first. Set `DATABASE_URL` to a Postgres database (a free Neon database works for development too). Route status data is kept in `./.data` locally.
Test without the real agent:

```
curl -X POST http://localhost:3000/api/ingest -H "Authorization: Bearer YOUR_INGEST_KEY" -H "Content-Type: application/json" -d @sample.json
```

(`npm run mock` in the agent folder prints a valid sample body.)

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Nuxt is detected automatically.
2. In Vercel, open **Storage** (or the Marketplace) and add **Upstash Redis** to the project. It sets
   the storage variables for you.
3. Also add **Neon Postgres** from the Marketplace. It sets `DATABASE_URL` for you. The tables are created
   automatically the first time the site runs.
4. Add the environment variables from `.env.example` in **Settings > Environment Variables**. The ones you must set are the
   Discord client ID and secret, `NUXT_APP_SECRET`, `NUXT_INGEST_KEY`, `NUXT_DISCORD_GUILD_ID`, and `NUXT_BOOTSTRAP_ADMIN_IDS`.
   Generate secrets with `openssl rand -base64 32`.
5. Deploy, then add the live `/auth/discord` redirect URL in the Discord portal. Everyone has to sign in again after this update.

## 4. Connect the agent

In the agent folder, set `ingestUrl` in `agent.config.json` to `https://YOUR-DOMAIN/api/ingest`, and put the
same value as `NUXT_INGEST_KEY` into the agent's `.env` as `INGEST_KEY`.

## Customizing

- Name, subtitle, logo, color, and wording: Admin > Appearance. No redeploy needed.
- How long before "agent has gone quiet" shows: `NUXT_STALE_AFTER_SEC` (default 90).

## Adding more shadcn components

The components live in `app/components/ui` and are yours to edit. To add another one (for example a dialog or a switch), run
`npx shadcn-vue@latest add dialog` in this folder. `components.json` is already set up for it. Components are auto-imported by name.

## Not included yet

Dark mode (the dark theme variables are not defined yet),

Rate limiting on `/api/ingest`, update history, and Discord alerts when a route goes down.

## Railroader map

The Map page (sidebar > Map) draws the Railroader track layout: track colored by speed limit, switches, towns, industries, passenger stops and turntables, with search, zoom and layer toggles.

- **Who can see it:** the "View the Railroader map" permission (Admin > Access). The data is only sent to signed-in people who have it.
- **Where the data comes from:** the game's own `Map.json`. To refresh it after a game update, run `node scripts/build-map.mjs "path/to/Map.json"` and redeploy. This writes `server/assets/map.json`.
- **Layout of the code:** `app/utils/map*.ts` (styling, drawing, hit testing, coordinates), `app/composables/useMap*.ts` (camera, input), `app/components/map/*` (the page's parts).
- **Assumptions:** units are meters, speed limits are mph, and a switch is a track point where three pieces meet. The map data doesn't say, so these come from reading the file.
