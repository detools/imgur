import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#setMashapeKey()', async (t) => {
  const apiURLs = [
    { url: '0123456789abcdef', msg: 'should return the Mashape Key that was set' },
    { url: '', msg: 'should not set an empty Mashape Key' },
    { url: 1024, msg: 'should not set a number' },
    { url: false, msg: 'should not set a boolean' },
  ]

  for (const [index, { url, message }] of apiURLs.entries()) {
    imgur.setMashapeKey('0123456789abcdef')
    imgur.setMashapeKey(url)

    t[!index ? 'equal' : 'notEqual'](imgur.getMashapeKey(), url, message)
  }
})
