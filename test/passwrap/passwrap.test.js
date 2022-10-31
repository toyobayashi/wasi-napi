/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc

const assert = require('assert')
const common = require('../common')
const { load } = require('../util')

const p = load('passwrap')
module.exports = p.then(addon => {
  async function runTest () {
    let obj1 = addon.createObject(10)
    let obj2 = addon.createObject(20)
    const result = addon.add(obj1, obj2)
    assert.strictEqual(result, 30)

    // Make sure the native destructor gets called.
    obj1 = null
    obj2 = null
    await common.gcUntil('8_passing_wrapped',
      () => (addon.finalizeCount() === 2))
  }
  return runTest().catch(err => {
    console.error(err)
    process.exit(1)
  })
})
