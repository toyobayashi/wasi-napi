import { supportBigInt, NotSupportBigIntError, napi_status } from '@tybys/emnapi-runtime'
import type { const_char16_t_p, const_char_p, double, int, int32_t, napi_env, Ptr, size_t, uint32_t } from '@tybys/emnapi-runtime'
import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue, UTF16ToString, UTF8ToString } from '../util'

function napi_create_int32 (this: IAPI, env: napi_env, value: int32_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const view = memory.view

      const v = ctx.addToCurrentScope(envObject, value).id
      setValue(view, result, v, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_uint32 (this: IAPI, env: napi_env, value: uint32_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const view = memory.view

      const v = ctx.addToCurrentScope(envObject, value >>> 0).id
      setValue(view, result, v, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_int64 (this: IAPI, env: napi_env, low: int32_t, high: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [high], () => {
      const value = Number(low)
      const v1 = ctx.addToCurrentScope(envObject, value).id
      high = Number(high)
      const view = memory.view
      setValue(view, high, v1, '*', wasm64)

      return envObject.clearLastError()
    })
  })
}

function napi_create_double (this: IAPI, env: napi_env, value: double, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const v = ctx.addToCurrentScope(envObject, value).id
      const view = memory.view
      setValue(view, result, v, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_latin1 (this: IAPI, env: napi_env, str: const_char_p, length: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      str = Number(str)
      length = Number(length)
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const { view, HEAPU8 } = memory

      let latin1String = ''
      let len = 0
      if (length === -1) {
        while (true) {
          const ch = HEAPU8[str]
          if (!ch) break
          latin1String += String.fromCharCode(ch)
          str++
        }
      } else {
        while (len < length) {
          const ch = HEAPU8[str]
          if (!ch) break
          latin1String += String.fromCharCode(ch)
          len++
          str++
        }
      }
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, latin1String).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf16 (this: IAPI, env: napi_env, str: const_char16_t_p, length: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      str = Number(str)
      length = Number(length)

      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const { view } = memory

      const utf16String = length === -1 ? UTF16ToString(view, str) : UTF16ToString(view, str, length * 2)
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, utf16String).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf8 (this: IAPI, env: napi_env, str: const_char_p, length: size_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      str = Number(str)
      length = Number(length)

      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const { view, HEAPU8 } = memory
      const utf8String = length === -1 ? UTF8ToString(HEAPU8, str) : UTF8ToString(HEAPU8, str, length)
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, utf8String).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_int64 (this: IAPI, env: napi_env, low: int32_t, high: int32_t): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (!supportBigInt) {
      envObject.tryCatch.setError(new NotSupportBigIntError('napi_create_bigint_int64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return ctx.checkArgs(envObject, [high], () => {
      const value = low as unknown as BigInt

      const v1 = ctx.addToCurrentScope(envObject, value).id
      high = Number(high)

      const view = memory.view
      setValue(view, high, v1, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_uint64 (this: IAPI, env: napi_env, low: int32_t, high: int32_t): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (!supportBigInt) {
      envObject.tryCatch.setError(new NotSupportBigIntError('napi_create_bigint_uint64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return ctx.checkArgs(envObject, [high], () => {
      const value = low as unknown as BigInt
      const v1 = ctx.addToCurrentScope(envObject, value).id
      high = Number(high)

      const view = memory.view
      setValue(view, high, v1, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_words (this: IAPI, env: napi_env, sign_bit: int, word_count: size_t, words: Ptr, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!supportBigInt) {
      throw new NotSupportBigIntError('napi_create_bigint_words', 'This API is unavailable')
    }
    return ctx.checkArgs(envObject, [result], () => {
      words = Number(words)
      word_count = Number(word_count)
      word_count = word_count >>> 0
      if (word_count > 2147483647) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
        throw new RangeError('Maximum BigInt size exceeded')
      }
      const { view, HEAPU32 } = memory
      let value: bigint = BigInt(0)
      for (let i = 0; i < word_count; i++) {
        const low = HEAPU32[(words + (i * 8)) >> 2]
        const high = HEAPU32[(words + (i * 8) + 4) >> 2]
        const wordi = BigInt(low) | (BigInt(high) << BigInt(32))
        value += wordi << BigInt(64 * i)
      }
      value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1))
      result = Number(result)

      const v = ctx.addToCurrentScope(envObject, value).id

      setValue(view, result, v, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

implement('napi_create_int32', napi_create_int32)
implement('napi_create_uint32', napi_create_uint32)
implement('napi_create_int64', napi_create_int64)
implement('napi_create_double', napi_create_double)
implement('napi_create_bigint_int64', napi_create_bigint_int64)
implement('napi_create_bigint_uint64', napi_create_bigint_uint64)
implement('napi_create_bigint_words', napi_create_bigint_words)
implement('napi_create_string_latin1', napi_create_string_latin1)

implement('napi_create_string_utf16', napi_create_string_utf16)

implement('napi_create_string_utf8', napi_create_string_utf8)
