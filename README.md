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

### Staying within the free plans

The free Neon plan counts the hours the database is awake, and the free Upstash plan counts commands. The dashboard
keeps both low:

- **The database is only used for things people do** (signing in, posting, editing). The game servers with their
  keys, and what each role may do, are read on almost every request, so a copy is kept in Redis and in each
  instance's memory for a minute (`server/utils/remember.ts`). Reports and page refreshes don't touch the database,
  and Neon can go idle between visits. A role or server change shows up everywhere within that minute.
- **Game servers slow down when nobody's watching.** Pages with live data (the map, the Overview) mark the game as
  watched in Redis. The reply to each report tells the agent; while nobody's watching it reports once a minute
  instead of every few seconds, and doesn't send train history at all. Agents older than 0.11.0 ignore this and
  always send at full pace. (`server/utils/watching.ts`)

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

## Help center

Help articles for the public help site are written here, in the dashboard. The help site itself is a separate project
that reads published articles from `GET /api/public/help` when it builds.

- **Permissions:** "Write and edit help center drafts" (`help.edit`) and "Publish, unpublish, and delete articles; manage
  categories" (`help.publish`). Both start on the Admin role; add them to other roles on the Access tab.
- **Drafts:** each article keeps a draft and a published copy. Saving changes only the draft; the public site shows the
  published copy until someone publishes. Every publish is kept in the article's history.
- **Moving a published article** (category, URL, game, section, or order) shows on the public site right away.
- **Rebuilding the help site:** set `NUXT_HELP_DEPLOY_HOOK` to a deploy hook URL from the help site's Vercel project.
  Publishing, unpublishing, deleting a published article, category changes, and changes to the name, logo, or color in
  Admin > Appearance all call it.
- The help site uses the name, logo, and main color from **Admin > Appearance**, so both sites match.
- **Writing articles:** **Help center** in the sidebar (shown to anyone with `help.edit`). The Categories tab is shown to
  people with `help.publish`. In the editor, Ctrl+S (Cmd+S) saves the draft.
- **Images in articles** are stored in Vercel Blob. In Vercel, open **Storage** and add a **Blob** store to this project;
  it sets `BLOB_READ_WRITE_TOKEN`. Without it, everything else works and the Image button explains what's missing.

## Tickets in Discord

Optional. Each ticket gets a private thread under a tickets channel, with the submitter and the assigned staff member
in it. Replies, status changes and assignments stay in sync both ways, and members can open tickets with `/ticket` or
the buttons `/ticket-panel` posts. Internal notes never go to Discord. Until it's set up, tickets work in the
Operations Center only. **Admin > Discord** shows which settings are in place.

It uses the bot of the Discord application you sign in with:

1. In the Developer Portal, under **Bot**, copy the token and turn on the **Message Content Intent**. Under
   **General Information**, copy the public key and set the **Interactions Endpoint URL** to
   `https://<your dashboard>/api/discord/interactions` (after step 3 is deployed, since Discord checks it).
2. Invite the bot to the server with the `bot` and `applications.commands` scopes and these permissions on the tickets
   channel: View Channel, Send Messages, Send Messages in Threads, Create Private Threads, Manage Threads, Read
   Message History.
3. In Vercel, set `NUXT_DISCORD_BOT_TOKEN`, `NUXT_DISCORD_PUBLIC_KEY`, `NUXT_DISCORD_TICKETS_CHANNEL_ID` and
   `NUXT_DISCORD_BOT_SECRET` (any long random string), then redeploy.
4. In **Admin > Discord**, press **Register commands**. Run `/ticket-panel` in the channel where members ask for help.
5. Replies typed in threads need the always-on bot in `bot/`, which runs on Railway. See `bot/README.md`.

Staff in Discord are recognized by their Discord roles, mapped the same way as at sign-in (Admin > Access): anyone
whose roles include "See and answer all support tickets" counts as staff.

## Customizing

- Name, subtitle, logo, color, and wording: Admin > Appearance. No redeploy needed.
- How long before "agent has gone quiet" shows: `NUXT_STALE_AFTER_SEC` (default 150). Keep it above a minute, since
  agents report once a minute while nobody's watching.

## Adding more shadcn components

The components live in `app/components/ui` and are yours to edit. To add another one (for example a dialog or a switch), run
`npx shadcn-vue@latest add dialog` in this folder. `components.json` is already set up for it. Components are auto-imported by name.

## Not included yet

Dark mode (the dark theme variables are not defined yet),

Rate limiting on `/api/ingest`, update history, and Discord alerts when a route goes down.

## Games

Run8 and Railroader each have their own section: `/run8` and `/railroader`. Railroader's opens on the members' **Overview** (`/railroader`), with the map at `/railroader/map` (the old `/map` address redirects there) and the staff **Game status** at `/railroader/status`.

- **Overview:** what a member needs before joining: whether the railroad is running and for how long, the join code and the game version it needs, the trains out and where, and the latest What's new. It comes from `GET /api/railroader/overview` (needs "View the game overview"), which sends only that; process figures and errors stay on Game status (needs "View route and game status").

- **Choosing a game:** the first visit to `/` asks "Which game are you operating today?". Opening a game's section remembers it in that browser, so later visits to `/` go straight there. The switcher at the top of the sidebar changes game.
- **Separate data:** each game has its own status endpoint (`/api/status/run8`, `/api/status/railroader`) that only returns that game's part of the agent's report. The server machine's load is the one thing both show (to staff), since it's the same machine.
- **Access:** roles work the same in both games for now. A game page someone's role can't use sends them to the first one it can (`app/middleware/auth.global.ts`).
- **Adding a page to a game:** put it under `app/pages/<game>/` and add it to that game's `features` in `app/utils/games.ts`. That list drives the sidebar, the picker, and the page title.

## Railroader map

The Map page (sidebar > Map) draws the Railroader track layout: track colored by speed limit, switches, towns, industries, passenger stops and turntables, with search and zoom. The Map key card beside it is also where each layer is turned on or off.

- **Who can see it:** the "View the Railroader map" permission (Admin > Access). The data is only sent to signed-in people who have it.
- **Where the data comes from:** the game's own `Map.json`. To refresh it after a game update, run `node scripts/build-map.mjs "path/to/Map.json"` and redeploy. This writes `server/assets/map.json`. If you change what that script writes, raise `MAP_DATA_VERSION` in `shared/utils/mapData.ts` and the `version` in the script together, so browsers fetch the new file instead of a cached one.
- **Track:** drawn by `app/utils/mapTrack.ts`. Far out it is a line colored by speed limit; closer in it sits on a ballast bed so neighboring tracks stay apart; zoomed right in (`DETAIL_SCALE`) it is drawn to scale with two rails and ties, assuming standard gauge.
- **Symbols and the map key:** every symbol is drawn by `app/utils/mapSymbols.ts`. The map and the Map key card (`app/components/map/MapKey.vue`, rows listed in `MAP_KEY` in `app/utils/mapStyle.ts`) both use it, so changing a symbol there changes both.
- **Layout of the code:** `app/utils/map*.ts` (styling, drawing, hit testing, coordinates), `app/composables/useMap*.ts` (camera, input), `app/components/map/*` (the page's parts).
- **Assumptions:** units are meters, speed limits are mph, and a switch is a track point where three pieces meet. The map data doesn't say, so these come from reading the file.
- **Curves:** the file stores track pieces as two end points, not their shape. Each point also has a heading, so `app/utils/mapCurve.ts` draws each piece as a smooth curve between them. This is an approximation that looks right but has not been checked against the game's exact curves.

## Real-world map under the Railroader map

The Map key has a "Real-world map underneath" layer (off by default) that draws the real map (OpenStreetMap data,
CARTO's light or dark style to match the theme) under the track.

- **Setting it up:** get a free key at https://carto.com/basemaps/apikey/ (free for non-commercial use up to
  5 million tile requests a month), add it in Vercel as `NUXT_CARTO_KEY`, and redeploy. Without it the layer is
  shown grayed out with a note.
- **How tiles are served:** the browser asks the dashboard's `/map-tiles/<style>/<z>/<x>/<y>` route, which fetches
  the tile from CARTO with the key and lets Vercel's CDN cache it for 30 days. The key stays on the server, and
  repeat views don't count against CARTO's limit. The route only serves tiles around the railroad.
- **The credit line** under the map ("© OpenStreetMap contributors © CARTO") is required by CARTO's terms and
  must stay visible while the layer is on.
- **Alignment:** the game's world turns out to be the real line at 1:1 (within 1%) with north up.
  `shared/utils/mapGeo.ts` fits it to real depot positions from OpenStreetMap (Bryson City, Andrews, Almond);
  they land 50–170 m from a single straight fit, so that's how far the real map can sit off the drawn track.
  Around Almond the real line was moved for Fontana Lake, so expect the most difference there. To improve the
  fit, add more points to `GEO_CONTROL_POINTS`.
- **Another tile provider:** CARTO says its raster tiles are being phased out in favor of vector tiles. To
  switch, change the URL in `server/routes/map-tiles/[style]/[z]/[x]/[y].get.ts` and the credit line in
  `app/components/map/MapViewer.vue`.
- **Drawing:** `app/utils/mapTiles.ts` places each tile by converting its corners to game coordinates, and shows
  a stretched lower-zoom tile while a sharper one loads.

## Live trains and switches on the Railroader map (prototype)

The map shows what the Railroader server's agent reports, refreshed every 5 seconds while the tab is open:

- **Trains:** an arrow per train (locomotives coupled together) on the track, pointing the way it goes, with a tag
  above it: a direction arrow, its callsign (the lead locomotive's reporting mark and number) and its speed while
  moving. Moving trains have filled tags, stopped ones outlined tags. Tags that would overlap are moved aside or
  stacked, and clicking a tag selects the train (`app/utils/mapTrainTags.ts`). The game's positions are exact, but the drawn curves are an approximation, so each
  train is placed on the drawn line at the same distance along the same piece of track (`app/utils/mapTrains.ts`).
  Its card says where it is: "At <industry>" when it's on track that belongs to an industry (from the map data's
  track spans), otherwise "Near <closest town>".
- **Switches:** shown on the track itself once zoomed in, the way US CTC screens do: the leg a switch isn't lined
  for is drawn open, with a short gap, so the lined route is the one continuous line through it
  (`app/utils/mapSwitches.ts`). The map is to scale, so close to the points both legs overlap; the gap goes where
  the open leg has pulled clear of the lined one, by a little more than the track's drawn width at that zoom. The position comes
  from the tracker pack; which piece is the normal leg and which the reverse comes from the Forever Rail Signals
  mod 0.2.0 or newer (the game's own decoding, sent with the signal layout). A switch missing either shows a
  hollow blue ring.
- **Beside the map:** a Trains tab lists every train (moving first) with its speed, cars and where it is; picking
  one jumps to it. A train's card shows its speed against the posted limit where its lead end is (amber when more
  than 2 mph over), and **Follow** keeps it centered as it moves, until the map is dragged. The map reopens where it
  was left, saved per browser (`rememberAs` on `MapViewer`).
- **Towns and industries:** picking a town shows its card (`MapTownCard.vue`): trains in town, then its industries
  in track order (measured along the track from the end nearest the next town, `app/utils/mapTown.ts`), with
  filter chips by what they do. Opening an industry highlights its track on the map. An industry's card
  (`MapIndustryCard.vue`) shows its types, its track, trains on its track, the nearest trains, and, with tracker
  pack 0.3.0 or newer, the cars on its track (loads and waybills) and passengers waiting at a stop. Industries are
  colored by their main type (`industryType` in `app/utils/mapStyle.ts`).
- When a server stops reporting for longer than `NUXT_STALE_AFTER_SEC`, trains fade, switches keep their last known
  position (their card says "Last known"), and the line above the map says how old the positions are. Anyone who can view the map can see them.

**Where the data comes from:** the Forever Rail Tracker pack, on the machine hosting the session, writes locomotive
positions, switch positions, cars at industries and waiting passengers to the game's log; the agent reads the log
and sends "trains", "switches" and "industries" reports (`server/utils/trainReports.ts`, `industryReports.ts`).
Checked against the real game: its positions are the map's own coordinates, and its track ids match the map data.
**Signals** come from a second, compiled mod, **Forever Rail Signals** (Railroader's "unsafe DLL" mods; the Relay
API can't reach signals). It reads the game's CTC classes the way QbanRambo's Map Plus does, and the agent sends
"signals" (aspects, occupied blocks) and "signallayout" (where signals stand, each block's track). The map draws
each signal as railroad signal plans do: a foot at the right-hand edge of the track (for its trains), a mast
along the track the way they run, and a lamp in the aspect's color (a bar across it for stop, hollow for
restricting). Occupied blocks
are shaded (`app/utils/mapSignals.ts`, `drawSignalShape` in `app/utils/mapSymbols.ts`). The layout is fetched from `/api/railroader/signal-layout` only when its
version in the live data changes.

**Trying it without the game:** add a Railroader server in Admin > Servers, then run (Node.js 22.18 or newer):

    AGENT_KEY=fra_... node scripts/simulate-trains.mjs http://localhost:3000 6

It moves made-up trains along the real track and throws switches now and then, posting what the agent does.

**Code:** `server/utils/trainReports.ts` checks reports, `server/api/railroader/live.get.ts` serves them,
`app/composables/useLiveMap.ts` polls and places trains, and the drawing is in `app/utils/mapDraw.ts`
(`drawTrains`, `drawUnreportedSwitches`), `app/utils/mapTrack.ts` (open legs), `app/utils/mapTrainTags.ts` and `app/utils/mapSymbols.ts`. The agent's setup checks its key with
`server/api/agent/whoami.get.ts`.

**After rebuilding the map data,** also refresh the tracker pack's switch list:
`node tools/write-switch-ids.mjs path/to/server/assets/map.json` in the tracker pack's folder.

## CTC board

**Railroader > CTC board** shows a line the way a dispatcher's CTC screen does: towns left to right, each passing
siding above its main, signal heads by aspect, each switch's position (with a gap on the leg it isn't lined for),
occupied track in red, and track a cleared control point signal sends a train onto in green. It's read-only: work the
railroad from the board, or from the game's own panel. A strip along the top shows the whole line; click it to move the board there.

- **Lines are filled in from the game.** In **Admin > CTC lines**, *Read the lines from the game* works out each line
  from the layout the game server sends (agent 0.15 and host mod 0.7.0 or later). Control points named "X East" and
  "X West" make one town; the blocks joining towns put them in order; each town's main is the track its switches
  line in normal position. Give the line a name and save it. Town names and mileposts can be changed; a town where
  the game's data didn't settle which track is the main is marked, with a button to swap them. After track or
  signals change in the game, *Fill in from the game again* keeps the names and mileposts.
- **Mileposts** without one set are miles measured along the track from the line's first town.
- **No extra Redis use:** the board shows the same live data as the map (`/api/railroader/live`, every 5 seconds
  while open), and reads its lines from the database once per page load.
- **Working the line** (`ctc.control`): click a control point signal to clear it (a signal facing into a town clears
  into the main or the siding) or to stop its control point, and click a switch's N or R to line it normal or
  reverse. Or type `CLR <signal> [N|R]`, `STOP <control point>` or `SW <control point> N|R`. Each command shows SENT,
  then CONFIRMED or REJECTED with the game's reason. Commands go through the same queue as the Game status controls
  and are carried out by the host mod (0.10.0 or later) through the game's own panel code button, so the save must
  be in CTC mode. Blocking track, train symbols and locking the in-game panel aren't possible yet.
- **Alerts:** a train heading for a control point signal at stop, and one stopped at it for 3 minutes or more, with
  Show (moves the board to it) and Silence (10 minutes). Worked out on the board from the live data it already has,
  so they only show while someone has the board open.
- **Who sees it:** *View the Railroader CTC board* (`ctc.view`, given to dispatchers and admins);
  *Clear signals and throw switches from the CTC board* (`ctc.control`, dispatchers and admins);
  *Set up the CTC board's lines* (`admin.lines`, admins).

## Server controls (Railroader)

**Railroader > Game status** has a **Controls** section for each server: *Start the game*, *Save*, *Shut down…* (it
saves first; a link closes without saving), and a box for any other command the agent takes (`status`, `window show`,
`help` and so on). Below them, the latest 20 commands with who sent them and the server's answer.

- **How a command gets there:** it's kept in the database until the server's agent sends its next report; the reply
  hands it over, and the answers come back with later reports. Having the Controls open counts as watching, so the
  agent reports every 5 seconds meanwhile. A command not picked up within 2 minutes is dropped, so it never runs by
  surprise later.
- **Little extra Redis use:** reports reach the database only when a small flag in Redis says a command is waiting,
  and only while someone is watching.
- **Needs** agent 0.16 and host mod 0.9.0 or later. The shutdown warning lists who's on the railroad, which the host
  mod reports from 0.9.0.
- **Who sees it:** *Start, save and shut down the game server, and send it commands* (`server.control`, admins only).
  The Game status page itself needs *View route and game status* (`status.view`), which dispatchers no longer have.

## Grade on the Railroader map

Grades come from the track heights in the map data (`server/assets/map.json`, version 4 and up). Between two track
points the height is taken to change evenly.

- **A train's card** shows the grade under its lead end, a profile of where it has been and the track ahead (2, 5 or
  10 miles or km), and the steepest climb and descent, the top of the climb and the next town ahead. The track ahead
  follows the switches as they're lined, so it needs the switch legs from the Forever Rail Signals mod 0.2.0 or
  newer; without them it stops at the first switch and says why.
- **Where it has been** is the train's real path: the agent on the game server keeps 30 minutes of it, one sample
  of every train about every 20 seconds, and sends it while someone is watching. The dashboard keeps the latest copy
  in Redis. `GET /api/railroader/train-history?agent=<server>&train=<train id>` returns it. Needs agent 0.11.0 or newer.
- **Map key > Color track by steepness** colors all track by how steep it is, either way. It replaces the speed
  limit colors while it's on.
- **Code:** `app/utils/mapGrade.ts`, `app/components/map/MapGradePanel.vue`, `server/utils/trainHistory.ts`.
- Not yet checked against a real train: that "climbing" matches the direction a train is actually going.

## Units

Everyone picks **Miles and feet** or **Kilometers and meters** in the account menu (bottom of the sidebar). It's
saved with their account (`user_preferences` table, `GET`/`PUT /api/me/preferences`) and applies to distances,
heights, speeds, the map's scale bar and train tags. The default is miles and feet. Formatting is in
`shared/utils/units.ts`; components use `useUnits()`.

## What's new

People with **Write, publish, and delete What's new updates** (Admin > Access; admins have it) get **Manage > What's
new**. An update is a title and a list of changes, each tagged with the part of the dashboard it's in. Updates stay
drafts until published.

- **Members** see What's new open by itself the next time they sign in after an update is published: the newest in
  full, and the five before it. Unticking **Show this when there's an update** stops that; a megaphone button then
  appears in the top bar, with a dot when there's an update they haven't seen. Both are saved with their account.
- **Discord:** with `NUXT_DISCORD_UPDATES_WEBHOOK` set to the announcements channel's webhook (Discord channel > Edit channel >
  Integrations > Webhooks > New webhook > Copy webhook URL), publishing can also post the update there. Editing a
  posted update edits the Discord message; deleting it deletes the message. Mentions in update text never ping
  anyone. If Discord refuses, the update still saves and the editor says so.
- **Code:** `server/utils/updates.ts`, `app/pages/updates.vue`, `app/components/updates/`.
- Permissions are read at sign-in, so people need to sign out and back in to see the new menu item.

## Roadmap and feature requests

**Community > Roadmap**, for everyone signed in: what's **Planned**, **In progress** and **Complete**, each item tagged
Run8, Railroader or Dashboard, and filterable by that. Complete shows the latest eight, with more on request.

- **Feature requests:** anyone can suggest one (up to 5 a day) and give each request one vote; the person asking
  votes for it automatically. The form lists existing requests with similar titles, so people vote instead of
  repeating them. Sort by most wanted or newest.
- **Staff** (the **Manage the roadmap and answer feature requests** permission; admins have it) add, edit, move and
  remove roadmap items, and for each request can:
  - **Accept** it: it becomes a Planned roadmap item, keeping its votes and who asked;
  - **Decline** it with a reason the person sees, or **Reopen** a declined one;
  - **Merge** it into another request: its votes move there (one per person), and it leaves the list;
  - **Reply**, shown on the request; **Hide** it from members (staff still see it).
  Removing a roadmap item that came from a request opens that request again.
- **What's new:** completed items not yet in an update are offered in the update editor; adding one adds it as a
  change, and publishing marks the item "Shipped in" that update on the roadmap.
- **Discord:** moving an item between columns can be announced in the announcements channel
  (`NUXT_DISCORD_UPDATES_WEBHOOK`); every new request goes to a staff channel (`NUXT_DISCORD_STAFF_WEBHOOK`). Both
  optional. Webhook code is shared in `server/utils/discord.ts`.
- **Code:** `server/utils/roadmap.ts`, `app/pages/roadmap.vue`, `app/components/roadmap/`.

## Bug reports

**Community > Bug reports**, for everyone signed in. Reports are private: each person sees their own, with its status
(**New**, **Confirmed**, **Fixed**, **Won't fix**) and any staff reply.

- **Reporting:** what's wrong, where (the same parts as What's new, plus "Somewhere else"), what happened, and up to
  3 screenshots (paste, drop or pick). The browser shrinks screenshots to at most 1920 pixels and WebP before
  uploading. Up to 5 reports a day per person.
- **Staff** (the **See and answer all bug reports** permission; admins have it) get an **All reports** tab: filter
  by status, set the status, reply to the reporter, link the report to a roadmap item (the item then shows "Bug
  fix"), or delete it with its screenshots. New reports go to the Discord staff channel (`NUXT_DISCORD_STAFF_WEBHOOK`).
- **Screenshots are private.** They're stored in a separate, *private* Vercel Blob store (the help center's store is
  public) and only served through `GET /api/bugs/screenshots/<id>`, which checks the viewer is the reporter or staff.
  To set it up: Vercel > the project > **Storage** > **Create** > **Blob**, set access to **Private**, create it, open
  the store and copy its `BLOB_READ_WRITE_TOKEN` value, and add it to the project as `NUXT_BUGS_BLOB_TOKEN`. Redeploy.
  Without it, bug reports work and the screenshot picker is hidden. (In local development without a token,
  screenshots are kept in local storage so the flow can be tried.)
- Hobby includes 1 GB of Blob storage, 2,000 uploads and 10,000 reads a month (Vercel's pricing page, November 2026);
  if that runs out Blob pauses for 30 days rather than charging.
- **Code:** `server/utils/bugs.ts`, `server/utils/screenshots.ts`, `app/pages/bugs.vue`, `app/components/bugs/`.

## Status in the header

With `NUXT_PUBLIC_STATUS_URL` set to the status page's address (for example `https://status.example.com`), the top bar
shows the overall status next to the theme button; hovering lists each group's main components, and clicking opens
the status page. It reads the status page's public `/api/summary` once a minute (the status page caches it for 60
seconds). Without the setting, nothing is shown. Redeploy after setting it. Code: `app/components/StatusWidget.vue`.

## Sign-in page

People sign in with Discord. The page names the Discord role they need (Admin > Appearance > Sign-in page; renaming it
there only changes the wording, Access decides who gets in) and links to the help site (`NUXT_PUBLIC_HELP_URL`) and
the status page (`NUXT_PUBLIC_STATUS_URL`) when those are set.

Behind the sign-in, the Railroader map is drawn as line art with each train where it is now, and small cards appear
as trains start and stop, named signals change and servers come up. When nothing is running, one card says so.

- **Public:** `GET /api/public/pulse` gives anyone locomotive numbers, speeds, car counts, the nearest town and named
  signals' aspects, plus whether Run8 and Railroader are up. No player names and no map data. Admins can turn it off
  for everyone in Admin > Appearance; the endpoint then answers 404.
- **Visitors** can turn it off for themselves ("Turn off live background", bottom left). That's kept in their browser
  and stops all requests. Updates also stop while the tab is hidden, and reduced motion turns the movement off.
- **The drawing** is `public/railroad-outline.svg`, made from the map data: run `node scripts/build-outline.mjs` after
  `build-map.mjs` whenever the map changes. Run8 isn't drawn yet: there's no Run8 track data in the project.
- **Code:** `server/api/public/pulse.get.ts`, `app/composables/usePulseFeed.ts`, `app/pages/login.vue`,
  `app/components/login/`.

## Notice banner

A banner across the top of every page, the sign-in page included, for things like "still in early development".
Admins set the text in Admin > Appearance > Notice; empty hides it. People can close it, which lasts until the text
changes (kept in a cookie, so it doesn't flash on load). Signed-in people also get a "Report a bug" link.
Code: `app/components/NoticeBanner.vue`.

## Light and dark mode

The sun/moon button in the top bar (and on the sign-in page) switches between Light, Dark, and System, which follows the device setting. The choice is remembered in that browser only. The dark colors are the `.dark` block in `app/assets/css/main.css`; the logic is `app/composables/useTheme.ts`. The brand color from Admin > Appearance is used in both themes. The map has its own dark colors: both palettes are in `app/utils/mapStyle.ts`.
