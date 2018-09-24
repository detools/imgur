import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#imgurRequest()', async (t) => {
  const requests = [
    { args: [], expectedError: 'You should define an operation' },
    { args: [{}], expectedError: 'Operation is not a string' },
    { args: ['lel'], expectedError: 'On empty payload only "credits" and "search" are accepted' },
    { args: ['blah', 'mbgq7nd'], expectedError: 'Invalid operation' },
  ]

  for (const { args, expectedError } of requests) {
    try {
      await imgur.imgurRequest(...args)
    } catch (error) {
      t.equal(error, expectedError, `should fail with "${expectedError}"`)
    }
  }
})
