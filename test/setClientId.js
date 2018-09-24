import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#setClientId()', async (t) => {
  const apiURLs = [
    { url: 'lolololol', msg: 'should return the client id that was set' },
    { url: '', msg: 'should not set an empty client id' },
    { url: 1024, msg: 'should not set a number' },
    { url: false, msg: 'should not set a boolean' },
  ]

  for (const [index, { url, message }] of apiURLs.entries()) {
    imgur.setClientId('0123456789abcdef')
    imgur.setClientId(url)

    t[!index ? 'equal' : 'notEqual'](imgur.getClientId(), url, message)
  }
})
