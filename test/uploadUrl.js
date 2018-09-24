import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#uploadUrl()', async (t) => {
  try {
    await imgur.uploadUrl()
  } catch (error) {
    t.equal(error, 'You pass an empty url', 'should fail with no url')
  }

  try {
    await imgur.uploadUrl('blarg')
  } catch (error) {
    t.equal(error, 'You provided an invalid url (protocol)', 'should fail with on a malformed url')
  }
})
