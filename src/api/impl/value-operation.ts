import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'
import type { Handle } from '../../runtime/Handle'

function napi_typeof (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const v = ctx.handleStore.get(value)!
      result = Number(result)
      const view = memory.view
      if (v.isNumber()) {
        setValue(view, result, napi_valuetype.napi_number, 'i32')
      } else if (v.isBigInt()) {
        setValue(view, result, napi_valuetype.napi_bigint, 'i32')
      } else if (v.isString()) {
        setValue(view, result, napi_valuetype.napi_string, 'i32')
      } else if (v.isFunction()) {
        setValue(view, result, napi_valuetype.napi_function, 'i32')
      } else if (v.isExternal()) {
        setValue(view, result, napi_valuetype.napi_external, 'i32')
      } else if (v.isObject()) {
        setValue(view, result, napi_valuetype.napi_object, 'i32')
      } else if (v.isBoolean()) {
        setValue(view, result, napi_valuetype.napi_boolean, 'i32')
      } else if (v.isUndefined()) {
        setValue(view, result, napi_valuetype.napi_undefined, 'i32')
      } else if (v.isSymbol()) {
        setValue(view, result, napi_valuetype.napi_symbol, 'i32')
      } else if (v.isNull()) {
        setValue(view, result, napi_valuetype.napi_null, 'i32')
      } else {
      // Should not get here unless V8 has added some new kind of value.
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      return envObject.clearLastError()
    })
  })
}

function napi_coerce_to_bool (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      result = Number(result)

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = handle.value ? ctx.HandleStore.ID_TRUE : ctx.HandleStore.ID_FALSE
      const view = memory.view
      setValue(view, result, v, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_number (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (handle.isBigInt()) {
        throw new TypeError('Cannot convert a BigInt value to a number')
      }
      result = Number(result)

      const v = ctx.addToCurrentScope(envObject, Number(handle.value)).id
      const view = memory.view
      setValue(view, result, v, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_object (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      result = Number(result)

      const v = envObject.ensureHandleId(Object(handle.value))
      const view = memory.view
      setValue(view, result, v, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_string (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (handle.isSymbol()) {
        throw new TypeError('Cannot convert a Symbol value to a string')
      }
      result = Number(result)

      const v = ctx.addToCurrentScope(envObject, String(handle.value)).id
      const view = memory.view
      setValue(view, result, v, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_instanceof (this: IAPI, env: napi_env, object: napi_value, constructor: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [object, result, constructor], () => {
      result = Number(result)
      const HEAPU8 = memory.HEAPU8
      HEAPU8[result] = 0
      const ctor = ctx.handleStore.get(constructor)!
      if (!ctor.isFunction()) {
        return envObject.setLastError(napi_status.napi_function_expected)
      }
      const val = ctx.handleStore.get(object)!.value
      const ret = val instanceof ctor.value
      HEAPU8[result] = ret ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_is_array (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const h = ctx.handleStore.get(value)!
      result = Number(result)
      memory.HEAPU8[result] = h.isArray() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_arraybuffer (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const h = ctx.handleStore.get(value)!
      result = Number(result)
      memory.HEAPU8[result] = h.isArrayBuffer() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_date (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const h = ctx.handleStore.get(value)!
      result = Number(result)
      memory.HEAPU8[result] = h.isDate() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_error (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const val = ctx.handleStore.get(value)!.value
      result = Number(result)
      memory.HEAPU8[result] = val instanceof Error ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_typedarray (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const h = ctx.handleStore.get(value)!
      result = Number(result)
      memory.HEAPU8[result] = h.isTypedArray() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_dataview (this: IAPI, env: napi_env, value: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const h = ctx.handleStore.get(value)!
      result = Number(result)
      memory.HEAPU8[result] = h.isDataView() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_strict_equals (this: IAPI, env: napi_env, lhs: napi_value, rhs: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [lhs, rhs, result], () => {
      const lv = ctx.handleStore.get(lhs)!.value
      const rv = ctx.handleStore.get(rhs)!.value
      result = Number(result)
      memory.HEAPU8[result] = (lv === rv) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_detach_arraybuffer (this: IAPI, env: napi_env, arraybuffer: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [arraybuffer], () => {
      const value = ctx.handleStore.get(arraybuffer)!.value
      if (!(value instanceof ArrayBuffer)) {
        if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
          return envObject.setLastError(napi_status.napi_detachable_arraybuffer_expected)
        }
        return envObject.setLastError(napi_status.napi_arraybuffer_expected)
      }

      try {
        const messageChannel = new MessageChannel()
        messageChannel.port1.postMessage(value, [value])
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_is_detached_arraybuffer (this: IAPI, env: napi_env, arraybuffer: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [arraybuffer, result], () => {
      const h: Handle<ArrayBuffer> = ctx.handleStore.get(arraybuffer)!
      result = Number(result)
      const HEAPU8 = memory.HEAPU8
      if (h.isArrayBuffer() && h.value.byteLength === 0) {
        try {
          // eslint-disable-next-line no-new
          new Uint8Array(h.value)
        } catch (_) {
          HEAPU8[result] = 1
          return envObject.getReturnStatus()
        }
      }
      HEAPU8[result] = 0
      return envObject.getReturnStatus()
    })
  })
}

implement('napi_typeof', napi_typeof)
implement('napi_coerce_to_bool', napi_coerce_to_bool)
implement('napi_coerce_to_number', napi_coerce_to_number)
implement('napi_coerce_to_object', napi_coerce_to_object)
implement('napi_coerce_to_string', napi_coerce_to_string)
implement('napi_instanceof', napi_instanceof)
implement('napi_is_array', napi_is_array)
implement('napi_is_arraybuffer', napi_is_arraybuffer)
implement('napi_is_date', napi_is_date)
implement('napi_is_error', napi_is_error)
implement('napi_is_typedarray', napi_is_typedarray)
implement('napi_is_dataview', napi_is_dataview)
implement('napi_strict_equals', napi_strict_equals)
implement('napi_detach_arraybuffer', napi_detach_arraybuffer)
implement('napi_is_detached_arraybuffer', napi_is_detached_arraybuffer)
