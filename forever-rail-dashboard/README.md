# Forever Rail Operations Dashboard

Nuxt 4 + Nuxt UI. Discord login only. Built for Vercel. Shows the status of each Run8 route
instance, fed by the `forever-rail-agent` program running on the game server.

## Who can see what

| Dashboard role | Gets it from | Sees |
| --- | --- | --- |
| member | Any server member, or the roles in `NUXT_DISCORD_MEMBER_ROLE_IDS` | Route name, port, online/offline, running time |
| dispatcher | A role in `NUXT_DISCORD_DISPATCHER_ROLE_IDS` | Everything above, plus CPU, memory, process ID, server stats, unmapped-port warnings |
| admin | A role in `NUXT_DISCORD_ADMIN_ROLE_IDS` | Same as dispatcher for now (reserved for future controls) |

Roles are read from Discord at sign-in and last 12 hours. People who aren't in the server, or have no
matching role when member roles are set, are turned away with a message.

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

Fill in `.env` first. Locally, data is stored in `./.data`, so no database is needed.
Test without the real agent:

```
curl -X POST http://localhost:3000/api/ingest -H "Authorization: Bearer YOUR_INGEST_KEY" -H "Content-Type: application/json" -d @sample.json
```

(`npm run mock` in the agent folder prints a valid sample body.)

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Nuxt is detected automatically.
2. In Vercel, open **Storage** (or the Marketplace) and add **Upstash Redis** to the project. It sets
   the storage variables for you.
3. Add the environment variables from `.env.example` in **Settings > Environment Variables**.
   Generate secrets with `openssl rand -base64 32`.
4. Deploy, then add the live `/auth/discord` redirect URL in the Discord portal.

## 4. Connect the agent

In the agent folder, set `ingestUrl` in `agent.config.json` to `https://YOUR-DOMAIN/api/ingest`, and put the
same value as `NUXT_INGEST_KEY` into the agent's `.env` as `INGEST_KEY`.

## Customizing

- Name, subtitle, logo: `app/utils/site.ts` (put the logo file in `public/`).
- Colors: the `--color-brand-*` values in `app/assets/css/main.css`.
- How long before "agent has gone quiet" shows: `NUXT_STALE_AFTER_SEC` (default 90).

## Not included yet

Rate limiting on `/api/ingest`, update history, and Discord alerts when a route goes down.
