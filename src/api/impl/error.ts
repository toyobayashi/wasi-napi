import { implement, setErrorCode, _private } from '../api'
import type { IAPI } from '../api'
import { abort, getValue, setValue, UTF8ToString } from '../util'

function napi_get_last_error_info (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory, psize, errmsgPtr } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const error_code = envObject.lastError.getErrorCode()
      const view = memory.view
      const messagePointer = getValue(view, errmsgPtr + error_code * psize, '*', wasm64)
      envObject.lastError.setErrorMessage(messagePointer)

      if (error_code === napi_status.napi_ok) {
        envObject.clearLastError()
      }
      result = Number(result)

      const value = envObject.lastError.data
      setValue(view, result, value, '*', wasm64)
      return napi_status.napi_ok
    })
  })
}

function napi_throw (this: IAPI, env: napi_env, error: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [error], () => {
      envObject.tryCatch.setError(ctx.handleStore.get(error)!.value)
      return envObject.clearLastError()
    })
  })
}

function napi_throw_error (this: IAPI, env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    code = Number(code)
    msg = Number(msg)
    const HEAPU8 = memory.HEAPU8
    const error: Error & { code?: string } = new Error(UTF8ToString(HEAPU8, msg))
    if (code) {
      error.code = UTF8ToString(HEAPU8, code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_type_error (this: IAPI, env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    code = Number(code)
    msg = Number(msg)
    const HEAPU8 = memory.HEAPU8
    const error: TypeError & { code?: string } = new TypeError(UTF8ToString(HEAPU8, msg))
    if (code) {
      error.code = UTF8ToString(HEAPU8, code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_range_error (this: IAPI, env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    code = Number(code)
    msg = Number(msg)
    const HEAPU8 = memory.HEAPU8
    const error: RangeError & { code?: string } = new RangeError(UTF8ToString(HEAPU8, msg))
    if (code) {
      error.code = UTF8ToString(HEAPU8, code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function node_api_throw_syntax_error (this: IAPI, env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    code = Number(code)
    msg = Number(msg)
    const HEAPU8 = memory.HEAPU8
    const error: SyntaxError & { code?: string } = new SyntaxError(UTF8ToString(HEAPU8, msg))
    if (code) {
      error.code = UTF8ToString(HEAPU8, code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_is_exception_pending (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const r = envObject.tryCatch.hasCaught()
      result = Number(result)
      memory.HEAPU8[result] = r ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_create_error (this: IAPI, env: napi_env, code: napi_value, msg: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [msg, result], () => {
      const msgValue = ctx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new Error(msgValue)
      const status = setErrorCode.call(this, envObject, error, code, 0)
      if (status !== napi_status.napi_ok) return status
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, error).id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_type_error (this: IAPI, env: napi_env, code: napi_value, msg: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [msg, result], () => {
      const msgValue = ctx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new TypeError(msgValue)
      const status = setErrorCode.call(this, envObject, error, code, 0)
      if (status !== napi_status.napi_ok) return status
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, error).id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_range_error (this: IAPI, env: napi_env, code: napi_value, msg: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [msg, result], () => {
      const msgValue = ctx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new RangeError(msgValue)
      const status = setErrorCode.call(this, envObject, error, code, 0)
      if (status !== napi_status.napi_ok) return status
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, error).id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function node_api_create_syntax_error (this: IAPI, env: napi_env, code: napi_value, msg: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [msg, result], () => {
      const msgValue = ctx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new SyntaxError(msgValue)
      const status = setErrorCode.call(this, envObject, error, code, 0)
      if (status !== napi_status.napi_ok) return status
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, error).id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_and_clear_last_exception (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)

      if (!envObject.tryCatch.hasCaught()) {
        setValue(memory.view, result, 1, '*', wasm64) // ID_UNDEFINED
        return envObject.clearLastError()
      } else {
        const err = envObject.tryCatch.exception()!
        const value = envObject.ensureHandleId(err)
        setValue(memory.view, result, value, '*', wasm64)
        envObject.tryCatch.reset()
      }
      return envObject.clearLastError()
    })
  })
}

function napi_fatal_error (this: IAPI, location: const_char_p, location_len: size_t, message: const_char_p, message_len: size_t): void {
  const { memory } = _private.get(this)!
  location = Number(location)
  location_len = Number(location_len)
  message = Number(message)
  message_len = Number(message_len)
  const HEAPU8 = memory.HEAPU8
  abort('FATAL ERROR: ' + (location_len === -1 ? UTF8ToString(HEAPU8, location) : UTF8ToString(HEAPU8, location, location_len)) + ' ' + (message_len === -1 ? UTF8ToString(HEAPU8, message) : UTF8ToString(HEAPU8, message, message_len)))
}

implement('napi_get_last_error_info', napi_get_last_error_info)
implement('napi_get_and_clear_last_exception', napi_get_and_clear_last_exception)
implement('napi_throw', napi_throw)
implement('napi_throw_error', napi_throw_error)
implement('napi_throw_type_error', napi_throw_type_error)
implement('napi_throw_range_error', napi_throw_range_error)
implement('node_api_throw_syntax_error', node_api_throw_syntax_error)
implement('napi_create_error', napi_create_error)
implement('napi_create_type_error', napi_create_type_error)
implement('napi_create_range_error', napi_create_range_error)
implement('node_api_create_syntax_error', node_api_create_syntax_error)
implement('napi_is_exception_pending', napi_is_exception_pending)
implement('napi_fatal_error', napi_fatal_error)
