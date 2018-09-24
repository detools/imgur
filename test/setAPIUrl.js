import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#setAPIUrl()', async (t) => {
  const apiURLs = [
    { url: 'https://imgur-apiv3.p.mashape.com/', msg: 'should return the API Url that was set' },
    { url: '', msg: 'should not set an empty API Url' },
    { url: 1024, msg: 'should not set a number' },
    { url: false, msg: 'should not set a boolean' },
  ]

  for (const [index, { url, msg }] of apiURLs.entries()) {
    imgur.setAPIUrl('https://api.imgur.com/3/')
    imgur.setAPIUrl(url)

    t[!index ? 'equal' : 'notEqual'](imgur.getAPIUrl(), url, msg)
  }
})
