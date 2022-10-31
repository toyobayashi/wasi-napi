'use strict'
const assert = require('assert')
const { load } = require('../util')

// eslint-disable-next-line camelcase
module.exports = load('typedarray').then(test_typedarray => {
  const byteArray = new Uint8Array(3)
  byteArray[0] = 0
  byteArray[1] = 1
  byteArray[2] = 2
  assert.strictEqual(byteArray.length, 3)

  const doubleArray = new Float64Array(3)
  doubleArray[0] = 0.0
  doubleArray[1] = 1.1
  doubleArray[2] = 2.2
  assert.strictEqual(doubleArray.length, 3)

  // Validate creation of all kinds of TypedArrays
  const buffer = new ArrayBuffer(128)
  const arrayTypes = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
    Uint16Array, Int32Array, Uint32Array, Float32Array,
    Float64Array, BigInt64Array, BigUint64Array]

  arrayTypes.forEach((currentType) => {
    const template = Reflect.construct(currentType, [buffer])
    const theArray = test_typedarray.CreateTypedArray(template, buffer)

    assert.ok(theArray instanceof currentType,
      'Type of new array should match that of the template. ' +
            `Expected type: ${currentType.name}, ` +
            `actual type: ${template.constructor.name}`)
    assert.notStrictEqual(theArray, template)
    assert.strictEqual(theArray.buffer, buffer)
  })

  arrayTypes.forEach((currentType) => {
    const template = Reflect.construct(currentType, [buffer])
    assert.throws(() => {
      test_typedarray.CreateTypedArray(template, buffer, 0, 136)
    }, RangeError)
  })

  const nonByteArrayTypes = [Int16Array, Uint16Array, Int32Array, Uint32Array,
    Float32Array, Float64Array,
    BigInt64Array, BigUint64Array]
  nonByteArrayTypes.forEach((currentType) => {
    const template = Reflect.construct(currentType, [buffer])
    assert.throws(() => {
      test_typedarray.CreateTypedArray(template, buffer,
        currentType.BYTES_PER_ELEMENT + 1, 1)
      console.log(`start of offset ${currentType}`)
    }, RangeError)
  })

  // Test detaching
  arrayTypes.forEach((currentType) => {
    const buffer = Reflect.construct(currentType, [8])
    assert.strictEqual(buffer.length, 8)
    assert.ok(!test_typedarray.IsDetached(buffer.buffer))
    test_typedarray.Detach(buffer)
    assert.ok(test_typedarray.IsDetached(buffer.buffer))
    assert.strictEqual(buffer.length, 0)
  })
  // {
  //   const buffer = test_typedarray.External()
  //   assert.ok(externalResult instanceof Int8Array)
  //   assert.strictEqual(externalResult.length, 3)
  //   assert.strictEqual(externalResult.byteLength, 3)
  //   assert.ok(!test_typedarray.IsDetached(buffer.buffer))
  //   test_typedarray.Detach(buffer)
  //   assert.ok(test_typedarray.IsDetached(buffer.buffer))
  //   assert.ok(externalResult instanceof Int8Array)
  //   assert.strictEqual(buffer.length, 0)
  //   assert.strictEqual(buffer.byteLength, 0)
  // }

  {
    const buffer = new ArrayBuffer(128)
    assert.ok(!test_typedarray.IsDetached(buffer))
  }

  // {
  //   const buffer = test_typedarray.NullArrayBuffer()
  //   assert.ok(buffer instanceof ArrayBuffer)
  //   assert.ok(test_typedarray.IsDetached(buffer))
  // }
})
