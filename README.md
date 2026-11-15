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
Test without a game server: add a server in **Admin > Servers**, put its key in the agent's `.env`, set the
agent's `ingestUrl` to `http://localhost:3000/api/ingest`, and run `node agent.mjs --mock --once` in the agent folder.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository and import it in Vercel. Nuxt is detected automatically.
2. In Vercel, open **Storage** (or the Marketplace) and add **Upstash Redis** to the project. It sets
   the storage variables for you.
3. Also add **Neon Postgres** from the Marketplace. It sets `DATABASE_URL` for you. The tables are created
   automatically the first time the site runs.
4. Add the environment variables from `.env.example` in **Settings > Environment Variables**. The ones you must set are the
   Discord client ID and secret, `NUXT_APP_SECRET`, `NUXT_DISCORD_GUILD_ID`, and `NUXT_BOOTSTRAP_ADMIN_IDS`.
   Generate secrets with `openssl rand -base64 32`.
5. Deploy, then add the live `/auth/discord` redirect URL in the Discord portal. Everyone has to sign in again after this update.

## 4. Connect the game servers

Each game server runs its own copy of the agent with its own key:

1. In **Admin > Servers**, add the server: a name (like `run8-server`) and its game. Copy the key line it shows. It is shown once.
   (Lost it? Press **New key** on that row; the old key stops working.)
2. On that server, double-click **ForeverRailAgent.exe** and answer its questions (the dashboard's address and the
   key). It works out the game from the key. See the agent's README.

**How reports work:** the key decides which server and game a report belongs to; the dashboard stores only a hash of it.
A report carries one or more kinds of data (today only `status`). Each game's handlers are in `server/utils/ingest.ts`.
To add a new kind later (live chat, a leaderboard), add a collector to the agent's `games/<game>/` folder and a handler
there. Kinds the dashboard doesn't handle yet are skipped, not refused. Removing a server in Admin also removes it
from the status pages.

**Database steps** are listed by name in `server/utils/db.ts` and each runs once. Add new steps at the end, and never
rename one that has shipped.

## Customizing

- Name, subtitle, logo, color, and wording: Admin > Appearance. No redeploy needed.
- How long before "agent has gone quiet" shows: `NUXT_STALE_AFTER_SEC` (default 90).

## Adding more shadcn components

The components live in `app/components/ui` and are yours to edit. To add another one (for example a dialog or a switch), run
`npx shadcn-vue@latest add dialog` in this folder. `components.json` is already set up for it. Components are auto-imported by name.

## Not included yet

Dark mode (the dark theme variables are not defined yet),

Rate limiting on `/api/ingest`, update history, and Discord alerts when a route goes down.

## Games

Run8 and Railroader each have their own section: `/run8` and `/railroader` (the map is at `/railroader/map`; the old `/map` address redirects there).

- **Choosing a game:** the first visit to `/` asks "Which game are you operating today?". Opening a game's section remembers it in that browser, so later visits to `/` go straight there. The switcher at the top of the sidebar changes game.
- **Separate data:** each game has its own status endpoint (`/api/status/run8`, `/api/status/railroader`) that only returns that game's part of the agent's report. The server machine's load is the one thing both show (to staff), since it's the same machine.
- **Access:** roles work the same in both games for now.
- **Adding a page to a game:** put it under `app/pages/<game>/` and add it to that game's `features` in `app/utils/games.ts`. That list drives the sidebar, the picker, and the page title.

## Railroader map

The Map page (sidebar > Map) draws the Railroader track layout: track colored by speed limit, switches, towns, industries, passenger stops and turntables, with search, zoom and layer toggles.

- **Who can see it:** the "View the Railroader map" permission (Admin > Access). The data is only sent to signed-in people who have it.
- **Where the data comes from:** the game's own `Map.json`. To refresh it after a game update, run `node scripts/build-map.mjs "path/to/Map.json"` and redeploy. This writes `server/assets/map.json`. If you change what that script writes, raise `MAP_DATA_VERSION` in `shared/utils/mapData.ts` and the `version` in the script together, so browsers fetch the new file instead of a cached one.
- **Symbols and the map key:** every symbol is drawn by `app/utils/mapSymbols.ts`. The map and the Map key card both use it, so changing a symbol there changes both.
- **Layout of the code:** `app/utils/map*.ts` (styling, drawing, hit testing, coordinates), `app/composables/useMap*.ts` (camera, input), `app/components/map/*` (the page's parts).
- **Assumptions:** units are meters, speed limits are mph, and a switch is a track point where three pieces meet. The map data doesn't say, so these come from reading the file.
- **Curves:** the file stores track pieces as two end points, not their shape. Each point also has a heading, so `app/utils/mapCurve.ts` draws each piece as a smooth curve between them. This is an approximation that looks right but has not been checked against the game's exact curves.

## Live trains and switches on the Railroader map (prototype)

The map shows what the Railroader server's agent reports, refreshed every 5 seconds while the tab is open:

- **Trains:** an arrow per train (locomotives coupled together), pointing the way it goes, filled when moving
  and outlined when stopped. The game's positions are exact, but the drawn curves are an approximation, so each
  train is placed on the drawn line at the same distance along the same piece of track (`app/utils/mapTrains.ts`).
  Its card says where it is: "At <industry>" when it's on track that belongs to an industry (from the map data's
  track spans), otherwise "Near <closest town>".
- **Switches:** green when open (lined straight), red when closed (thrown to the diverging route), blue when the
  game hasn't reported it. Shown once zoomed in, like before.
- When a server stops reporting for longer than `NUXT_STALE_AFTER_SEC`, trains and switches fade and the line above
  the map says how old the positions are. Anyone who can view the map can see them.

**Where the data comes from:** the Forever Rail Tracker pack, on the machine hosting the session, writes locomotive
positions and switch positions to the game's log; the agent reads the log and sends "trains" and "switches" reports.
Checked against the real game: its positions are the map's own coordinates, and its track ids match the map data.
Not available from the game's mod API: signal aspects, and which switches are CTC/ABS controlled.

**Trying it without the game:** add a Railroader server in Admin > Servers, then run (Node.js 22.18 or newer):

    AGENT_KEY=fra_... node scripts/simulate-trains.mjs http://localhost:3000 6

It moves made-up trains along the real track and throws switches now and then, posting what the agent does.

**Code:** `server/utils/trainReports.ts` checks reports, `server/api/railroader/live.get.ts` serves them,
`app/composables/useLiveMap.ts` polls and places trains, and the drawing is in `app/utils/mapDraw.ts`
(`drawTrains`, `drawSwitches`) and `app/utils/mapSymbols.ts`. The agent's setup checks its key with
`server/api/agent/whoami.get.ts`.

**After rebuilding the map data,** also refresh the tracker pack's switch list:
`node tools/write-switch-ids.mjs path/to/server/assets/map.json` in the tracker pack's folder.

## Light and dark mode

The sun/moon button in the top bar (and on the sign-in page) switches between Light, Dark, and System, which follows the device setting. The choice is remembered in that browser only. The dark colors are the `.dark` block in `app/assets/css/main.css`; the logic is `app/composables/useTheme.ts`. The brand color from Admin > Appearance is used in both themes. The map has its own dark colors: both palettes are in `app/utils/mapStyle.ts`.
