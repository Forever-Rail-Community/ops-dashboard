# Operations Center bot

Forwards messages typed in Discord ticket threads to the Operations Center. Discord only sends typed messages over
a live connection, so this runs all the time (on Railway). Everything else the bot does (creating threads, the ticket
card and its buttons, `/ticket` and `/ticket-panel`) runs inside the Operations Center and needs nothing here.

If this process is down, nothing is lost: when it starts again it catches up on messages sent in the meantime, for
tickets updated in the last 30 days.

## What it forwards

Messages in threads under the tickets channel, except those from bots (including itself), webhooks and Discord's
system notices. The Operations Center keeps a message only when it's from the ticket's submitter or from someone
whose Discord roles give the "See and answer all support tickets" permission (Admin > Access). Each message is saved once, even if it's
forwarded twice. Attachments are noted by file name only for now.

## Setup

1. In the Discord Developer Portal, open the application used for sign-in. Under **Bot**, turn on the
   **Message Content Intent**.
2. On Railway, create a service from this repository with the root directory set to `bot`. Railway runs
   `npm start`.
3. Add these variables to the service:

   | Variable | Value |
   | --- | --- |
   | `DISCORD_BOT_TOKEN` | The bot token (the same as `NUXT_DISCORD_BOT_TOKEN` in Vercel) |
   | `DASHBOARD_URL` | The Operations Center's address, for example `https://ops.example.vercel.app` |
   | `BOT_SECRET` | A long random string, the same as `NUXT_DISCORD_BOT_SECRET` in Vercel |
   | `TICKETS_CHANNEL_ID` | The tickets channel (the same as `NUXT_DISCORD_TICKETS_CHANNEL_ID` in Vercel) |

4. Deploy. The log shows `Signed in as …` and how many threads it caught up on.

Make a secret with `openssl rand -hex 32`. If you change it, change it in both places.
