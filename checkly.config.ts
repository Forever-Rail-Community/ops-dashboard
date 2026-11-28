import { defineConfig } from 'checkly'
import { Frequency } from 'checkly/constructs'

// Checkly (added from the Vercel marketplace) watches the live Operations Center from outside: the checks in
// __checks__/ run on a schedule and alert when one fails. .github/workflows/checkly.yml deploys them from main.
// The free Hobby plan includes 10,000 API check runs and 1,000 browser check runs a month; the schedules stay under.
export default defineConfig({
  projectName: 'Operations Center',
  logicalId: 'ops-dashboard',
  repoUrl: 'https://github.com/Forever-Rail-Community/ops-dashboard',
  checks: {
    locations: ['us-east-1'],
    frequency: Frequency.EVERY_10M,
    tags: ['ops-dashboard'],
    checkMatch: '**/__checks__/**/*.check.ts'
  },
  cli: { runLocation: 'us-east-1' }
})
