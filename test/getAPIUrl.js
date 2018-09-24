import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#getAPIUrl()', async (t) => {
  const defaultAPIUrl = 'https://api.imgur.com/3/'
  t.equal(imgur.getAPIUrl(), defaultAPIUrl, 'should return the default API URL, if nothing is set')

  const apiUrl = 'https://imgur-apiv3.p.mashape.com/'
  imgur.setAPIUrl(apiUrl)
  t.equal(imgur.getAPIUrl(), apiUrl, 'should return the same API URL that was set')
})
