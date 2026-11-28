import { BrowserCheck, Frequency } from 'checkly/constructs'
import * as path from 'node:path'

// Hourly, so it stays within the plan's 1,000 browser runs a month (about 720).
new BrowserCheck('sign-in', {
  name: 'Sign-in page',
  frequency: Frequency.EVERY_1H,
  code: { entrypoint: path.join(__dirname, 'sign-in.spec.ts') }
})
