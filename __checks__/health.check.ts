import { ApiCheck, AssertionBuilder } from 'checkly/constructs'
import { SITE_URL } from './site'

// Every 10 minutes: the site answers, and it can reach its database and Redis (server/api/public/health.get.ts).
// About 4,300 runs a month.
new ApiCheck('health', {
  name: 'Operations Center health',
  request: {
    method: 'GET',
    url: `${SITE_URL}/api/public/health`,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.database').equals(true),
      AssertionBuilder.jsonBody('$.storage').equals(true),
      AssertionBuilder.responseTime().lessThan(5000)
    ]
  }
})
