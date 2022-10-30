import { implement, _private, getArrayBufferPointer, getViewPointer } from '../api'
import type { IAPI } from '../api'
import { getValue, setValue, lengthBytesUTF8, stringToUTF8Array, stringToUTF16Array } from '../util'
import { supportBigInt } from '../../runtime/util'
import { NotSupportBigIntError } from '../../runtime/errors'
import type { ExternalHandle } from '../../runtime/Handle'

function napi_get_array_length (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (!handle.isArray()) {
        return envObject.setLastError(napi_status.napi_array_expected)
      }
      const view = memory.view
      setValue(view, Number(result), handle.value.length >>> 0, 'u32')
      return envObject.clearLastError()
    })
  })
}

function napi_get_arraybuffer_info (this: IAPI, env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [arraybuffer], () => {
      const handle = ctx.handleStore.get(arraybuffer)!
      if (!handle.isArrayBuffer()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (data) {
        data = Number(data)

        const p = getArrayBufferPointer.call(this, handle.value)
        const view = memory.view
        setValue(view, data, p, '*', wasm64)
      }
      if (byte_length) {
        byte_length = Number(byte_length)
        const view = memory.view
        setValue(view, byte_length, handle.value.byteLength, '*', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_prototype (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (handle.value == null) {
        envObject.tryCatch.setError(new TypeError('Cannot convert undefined or null to object'))
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      let v: any
      try {
        v = handle.isObject() || handle.isFunction() ? handle.value : Object(handle.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      result = Number(result)

      const p = envObject.ensureHandleId(Object.getPrototypeOf(v))
      const view = memory.view
      setValue(view, result, p, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_typedarray_info (
  this: IAPI,
  env: napi_env,
  typedarray: napi_value,
  type: Ptr,
  length: Ptr,
  data: void_pp,
  arraybuffer: Ptr,
  byte_offset: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [typedarray], () => {
      const handle = ctx.handleStore.get(typedarray)!
      if (!handle.isTypedArray()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v = handle.value
      const view = memory.view
      if (type) {
        type = Number(type)
        if (v instanceof Int8Array) {
          setValue(view, type, napi_typedarray_type.napi_int8_array, 'i32')
        } else if (v instanceof Uint8Array) {
          setValue(view, type, napi_typedarray_type.napi_uint8_array, 'i32')
        } else if (v instanceof Uint8ClampedArray) {
          setValue(view, type, napi_typedarray_type.napi_uint8_clamped_array, 'i32')
        } else if (v instanceof Int16Array) {
          setValue(view, type, napi_typedarray_type.napi_int16_array, 'i32')
        } else if (v instanceof Uint16Array) {
          setValue(view, type, napi_typedarray_type.napi_uint16_array, 'i32')
        } else if (v instanceof Int32Array) {
          setValue(view, type, napi_typedarray_type.napi_int32_array, 'i32')
        } else if (v instanceof Uint32Array) {
          setValue(view, type, napi_typedarray_type.napi_uint32_array, 'i32')
        } else if (v instanceof Float32Array) {
          setValue(view, type, napi_typedarray_type.napi_float32_array, 'i32')
        } else if (v instanceof Float64Array) {
          setValue(view, type, napi_typedarray_type.napi_float64_array, 'i32')
        } else if (v instanceof BigInt64Array) {
          setValue(view, type, napi_typedarray_type.napi_bigint64_array, 'i32')
        } else if (v instanceof BigUint64Array) {
          setValue(view, type, napi_typedarray_type.napi_biguint64_array, 'i32')
        }
      }

      if (length) {
        length = Number(length)
        setValue(view, length, v.length, 'size', wasm64)
      }
      let buffer: ArrayBuffer
      if (data || arraybuffer) {
        buffer = v.buffer
        if (data) {
          data = Number(data)

          const p = getViewPointer.call(this, v)
          setValue(view, data, p, '*', wasm64)
        }
        if (arraybuffer) {
          arraybuffer = Number(arraybuffer)

          const ab = envObject.ensureHandleId(buffer)
          setValue(view, arraybuffer, ab, '*', wasm64)
        }
      }
      if (byte_offset) {
        byte_offset = Number(byte_offset)
        setValue(view, byte_offset, v.byteOffset, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_dataview_info (
  this: IAPI,
  env: napi_env,
  dataview: napi_value,
  byte_length: Ptr,
  data: void_pp,
  arraybuffer: Ptr,
  byte_offset: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [dataview], () => {
      const handle = ctx.handleStore.get(dataview)!
      if (!handle.isDataView()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v = handle.value as DataView
      const view = memory.view

      if (byte_length) {
        byte_length = Number(byte_length)
        setValue(view, byte_length, v.byteLength, 'size', wasm64)
      }
      let buffer: ArrayBuffer
      if (data || arraybuffer) {
        buffer = v.buffer
        if (data) {
          data = Number(data)

          const p = getViewPointer.call(this, v)
          setValue(view, data, p, '*', wasm64)
        }
        if (arraybuffer) {
          arraybuffer = Number(arraybuffer)

          const ab = envObject.ensureHandleId(buffer)
          setValue(view, arraybuffer, ab, '*', wasm64)
        }
      }
      if (byte_offset) {
        byte_offset = Number(byte_offset)
        setValue(view, byte_offset, v.byteOffset, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_date_value (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (!handle.isDate()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const view = memory.view
      setValue(view, Number(result), (handle.value as Date).valueOf(), 'f64')
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_value_bool (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'boolean') {
        return envObject.setLastError(napi_status.napi_boolean_expected)
      }
      const view = memory.view
      setValue(view, Number(result), handle.value ? 1 : 0, 'u8')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_double (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      const view = memory.view
      setValue(view, Number(result), handle.value, 'f64')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_int64 (this: IAPI, env: napi_env, value: napi_value, result: Ptr, lossless: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (!supportBigInt) {
      envObject.tryCatch.setError(new NotSupportBigIntError('napi_get_value_bigint_int64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return ctx.checkArgs(envObject, [value, result, lossless], () => {
      const handle = ctx.handleStore.get(value)!
      let numberValue = handle.value
      if (typeof numberValue !== 'bigint') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      lossless = Number(lossless)
      result = Number(result)
      const view = memory.view
      if ((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63)))) {
        setValue(view, lossless, 1, 'u8')
      } else {
        setValue(view, lossless, 0, 'u8')
        numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
        if (numberValue >= (BigInt(1) << BigInt(63))) {
          numberValue = numberValue - (BigInt(1) << BigInt(64))
        }
      }
      const low = Number(numberValue & BigInt(0xffffffff))
      const high = Number(numberValue >> BigInt(32))
      setValue(view, result, low, 'i32')
      setValue(view, result + 4, high, 'i32')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_uint64 (this: IAPI, env: napi_env, value: napi_value, result: Ptr, lossless: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (!supportBigInt) {
      envObject.tryCatch.setError(new NotSupportBigIntError('napi_get_value_bigint_uint64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return ctx.checkArgs(envObject, [value, result, lossless], () => {
      const handle = ctx.handleStore.get(value)!
      let numberValue = handle.value
      if (typeof numberValue !== 'bigint') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      lossless = Number(lossless)
      result = Number(result)
      const view = memory.view
      if ((numberValue >= BigInt(0)) && (numberValue < (BigInt(1) << BigInt(64)))) {
        setValue(view, lossless, 1, 'u8')
      } else {
        setValue(view, lossless, 0, 'u8')
        numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
      }
      const low = Number(numberValue & BigInt(0xffffffff))
      const high = Number(numberValue >> BigInt(32))
      setValue(view, result, low, 'u32')
      setValue(view, result + 4, high, 'u32')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_words (
  this: IAPI,
  env: napi_env,
  value: napi_value,
  sign_bit: Ptr,
  word_count: Ptr,
  words: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (!supportBigInt) {
      envObject.tryCatch.setError(new NotSupportBigIntError('napi_get_value_bigint_words', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return ctx.checkArgs(envObject, [value, word_count], () => {
      const handle = ctx.handleStore.get(value)!
      if (!handle.isBigInt()) {
        return envObject.setLastError(napi_status.napi_bigint_expected)
      }
      const isMinus = handle.value < BigInt(0)

      sign_bit = Number(sign_bit)
      words = Number(words)
      word_count = Number(word_count)
      const view = memory.view

      let word_count_int = getValue(view, word_count, 'size', wasm64)
      word_count_int = Number(word_count_int)

      let wordCount = 0
      let bigintValue: bigint = isMinus ? (handle.value * BigInt(-1)) : handle.value
      while (bigintValue !== BigInt(0)) {
        wordCount++
        bigintValue = bigintValue >> BigInt(64)
      }
      bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value
      if (!sign_bit && !words) {
        word_count_int = wordCount
        setValue(view, word_count, word_count_int, 'size', wasm64)
      } else {
        if (!sign_bit) return envObject.setLastError(napi_status.napi_invalid_arg)
        if (!words) return envObject.setLastError(napi_status.napi_invalid_arg)
        const wordsArr = []
        while (bigintValue !== BigInt(0)) {
          const uint64 = bigintValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
          wordsArr.push(uint64)
          bigintValue = bigintValue >> BigInt(64)
        }
        const len = Math.min(word_count_int, wordsArr.length)
        for (let i = 0; i < len; i++) {
          const low = Number(wordsArr[i] & BigInt(0xffffffff))
          const high = Number(wordsArr[i] >> BigInt(32))
          setValue(view, words + (i * 8), low, 'u32')
          setValue(view, words + 4 + (i * 8), high, 'u32')
        }
        setValue(view, sign_bit, isMinus ? 1 : 0, 'i32')
        setValue(view, word_count, len, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_external (this: IAPI, env: napi_env, value: napi_value, result: void_pp): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (!handle.isExternal()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const p = (handle as ExternalHandle).data()
      const view = memory.view

      setValue(view, Number(result), p, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_int32 (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      const view = memory.view
      setValue(view, Number(result), handle.value, 'i32')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_int64 (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      const numberValue = handle.value
      result = Number(result)
      const view = memory.view
      if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
        setValue(view, result, 0, 'i32')
        setValue(view, result + 4, 0, 'i32')
      } else if (numberValue < -9223372036854776000) {
        setValue(view, result, 0, 'i32')
        setValue(view, result + 4, 0x80000000, 'i32')
      } else if (numberValue >= 9223372036854776000) {
        setValue(view, result, 0xffffffff, 'u32')
        setValue(view, result + 4, 0x7fffffff, 'u32')
      } else {
        let tempDouble
        const tempI64 = [numberValue >>> 0, (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)]
        setValue(view, result, tempI64[0], 'i32')
        setValue(view, result + 4, tempI64[1], 'i32')
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_latin1 (this: IAPI, env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value], () => {
      result = Number(result)
      buf = Number(buf)
      buf_size = Number(buf_size)

      buf_size = buf_size >>> 0
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const { view, HEAPU8 } = memory

      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        setValue(view, result, handle.value.length, 'size', wasm64)
      } else if (buf_size !== 0) {
        let copied: number = 0
        for (let i = 0; i < buf_size - 1; ++i) {
          HEAPU8[buf + i] = handle.value.charCodeAt(i) & 0xff
          copied++
        }
        HEAPU8[buf + copied] = 0
        if (result) {
          setValue(view, result, copied, 'size', wasm64)
        }
      } else if (result) {
        setValue(view, result, 0, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_utf8 (this: IAPI, env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value], () => {
      result = Number(result)
      buf = Number(buf)
      buf_size = Number(buf_size)

      buf_size = buf_size >>> 0
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const { view, HEAPU8 } = memory

      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        const strLength = lengthBytesUTF8(handle.value)
        setValue(view, result, strLength, 'size', wasm64)
      } else if (buf_size !== 0) {
        const copied = stringToUTF8Array(handle.value, HEAPU8, buf, buf_size)
        if (result) {
          setValue(view, result, copied, 'size', wasm64)
        }
      } else if (result) {
        setValue(view, result, 0, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_utf16 (this: IAPI, env: napi_env, value: napi_value, buf: char16_t_p, buf_size: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value], () => {
      result = Number(result)
      buf = Number(buf)
      buf_size = Number(buf_size)

      buf_size = buf_size >>> 0
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const view = memory.view

      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        setValue(view, result, handle.value.length, 'size', wasm64)
      } else if (buf_size !== 0) {
        const copied = stringToUTF16Array(handle.value, view, buf, buf_size * 2)
        if (result) {
          setValue(view, result, copied / 2, 'size', wasm64)
        }
      } else if (result) {
        setValue(view, result, 0, 'size', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_uint32 (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      const view = memory.view
      setValue(view, Number(result), handle.value, 'u32')
      return envObject.clearLastError()
    })
  })
}

implement('napi_get_array_length', napi_get_array_length)
implement('napi_get_arraybuffer_info', napi_get_arraybuffer_info)
implement('napi_get_prototype', napi_get_prototype)
implement('napi_get_typedarray_info', napi_get_typedarray_info)
implement('napi_get_dataview_info', napi_get_dataview_info)
implement('napi_get_date_value', napi_get_date_value)
implement('napi_get_value_bool', napi_get_value_bool)
implement('napi_get_value_double', napi_get_value_double)
implement('napi_get_value_bigint_int64', napi_get_value_bigint_int64)
implement('napi_get_value_bigint_uint64', napi_get_value_bigint_uint64)
implement('napi_get_value_bigint_words', napi_get_value_bigint_words)
implement('napi_get_value_external', napi_get_value_external)
implement('napi_get_value_int32', napi_get_value_int32)
implement('napi_get_value_int64', napi_get_value_int64)
implement('napi_get_value_string_latin1', napi_get_value_string_latin1)
implement('napi_get_value_string_utf8', napi_get_value_string_utf8)

implement('napi_get_value_string_utf16', napi_get_value_string_utf16)
implement('napi_get_value_uint32', napi_get_value_uint32)
