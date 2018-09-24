import test from 'tape-async'
import imgur from '../lib/imgur.js'

test('#getMashapeKey()', async (t) => {
  const mashapeKey = '123456789abcdef'
  imgur.setMashapeKey(mashapeKey)

  t.equal(imgur.getMashapeKey(), mashapeKey, 'should return the same client that was set')
})
