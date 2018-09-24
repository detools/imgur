import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('search options validations', async (t) => {
  const requests = [
    { args: [], expectedError: 'Search requires a query. Try searching with a query (e.g cats).' },
    { args: [true], expectedError: 'You did not pass a string as a query.' },
    { args: [1], expectedError: 'You did not pass a string as a query.' },
    { args: [{}], expectedError: 'You did not pass a string as a query.' },
  ]

  for (const { args, expectedError } of requests) {
    try {
      await imgur.search(...args)
    } catch (error) {
      t.equal(error, expectedError, `should fail with "${expectedError}"`)
    }
  }
})
