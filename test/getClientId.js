import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#getClientId()', async (t) => {
  t.equal(
    imgur.getClientId(),
    process.env.IMGUR_CLIENT_ID || 'f0ea04148a54268',
    'should return the default client id, if nothing is set'
  )

  const clientId = '123456789abcdef'
  imgur.setClientId(clientId)
  t.equal(imgur.getClientId(), clientId, 'should return the same client that was set')
})
