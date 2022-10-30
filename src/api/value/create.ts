import { implement, wrap, _ctx, _memory, _wasm64 } from '../api'
import type { IAPI } from '../api'
import { createTypedArray, setValue, UTF8ToString } from '../util'
import { supportFinalizer } from '../../runtime/util'
import { NotSupportWeakRefError } from '../../runtime/errors'
import { ExternalHandle } from '../../runtime/Handle'
import { Reference } from '../../runtime/Reference'

function napi_create_array (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!

      const value = ctx.addToCurrentScope(envObject, []).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_array_with_length (this: IAPI, env: napi_env, length: size_t, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      length = Number(length)
      result = Number(result)
      length = length >>> 0
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!

      const value = ctx.addToCurrentScope(envObject, new Array(length)).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_arraybuffer (this: IAPI, env: napi_env, byte_length: size_t, _data: void_pp, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      byte_length = Number(byte_length)
      result = Number(result)
      byte_length = byte_length >>> 0
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!

      const value = ctx.addToCurrentScope(envObject, new ArrayBuffer(byte_length)).id
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_create_date (this: IAPI, env: napi_env, time: double, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)

      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!
      const value = ctx.addToCurrentScope(envObject, new Date(time)).id
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_create_external (this: IAPI, env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      if (!supportFinalizer && finalize_cb) {
        throw new NotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)')
      }
      const externalHandle = ExternalHandle.createExternal(envObject, data)
      ctx.getCurrentScope()!.addHandle(externalHandle)
      if (finalize_cb) {
        Reference.create(envObject, externalHandle.id, 0, true, finalize_cb, data, finalize_hint)
      }
      result = Number(result)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!
      setValue(view, result, externalHandle.id, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

/* function napi_create_external_arraybuffer (
  this: IAPI, env: napi_env,
  _external_data: void_p,
  _byte_length: size_t,
  _finalize_cb: napi_finalize,
  _finalize_hint: void_p,
  _result: Ptr
): napi_status {
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
} */

function napi_create_object (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!
      const value = ctx.addToCurrentScope(envObject, {}).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_create_symbol (this: IAPI, env: napi_env, description: napi_value, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!
      if (!description) {
        // eslint-disable-next-line symbol-description
        const value = ctx.addToCurrentScope(envObject, Symbol()).id
        setValue(view, result, value, '*', wasm64)
      } else {
        const handle = ctx.handleStore.get(description)!
        const desc = handle.value
        if (typeof desc !== 'string') {
          return envObject.setLastError(napi_status.napi_string_expected)
        }
        const v = ctx.addToCurrentScope(envObject, Symbol(desc)).id
        setValue(view, result, v, '*', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_create_typedarray (
  this: IAPI, env: napi_env,
  type: napi_typedarray_type,
  length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Ptr
): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [arraybuffer, result], () => {
      const handle = ctx.handleStore.get(arraybuffer)!
      const buffer = handle.value
      if (!(buffer instanceof ArrayBuffer)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const retCallback = (out: ArrayBufferView): napi_status => {
        result = Number(result)

        const view = _memory.get(this)!.view
        const wasm64 = _wasm64.get(this)!
        const value = ctx.addToCurrentScope(envObject, out).id
        setValue(view, result, value, '*', wasm64)
        return envObject.getReturnStatus()
      }

      switch (type) {
        case napi_typedarray_type.napi_int8_array:
          return createTypedArray(envObject, Int8Array, 1, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_uint8_array:
          return createTypedArray(envObject, Uint8Array, 1, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_uint8_clamped_array:
          return createTypedArray(envObject, Uint8ClampedArray, 1, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_int16_array:
          return createTypedArray(envObject, Int16Array, 2, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_uint16_array:
          return createTypedArray(envObject, Uint16Array, 2, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_int32_array:
          return createTypedArray(envObject, Int32Array, 4, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_uint32_array:
          return createTypedArray(envObject, Uint32Array, 4, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_float32_array:
          return createTypedArray(envObject, Float32Array, 4, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_float64_array:
          return createTypedArray(envObject, Float64Array, 8, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_bigint64_array:
          return createTypedArray(envObject, BigInt64Array, 8, buffer, byte_offset, length, retCallback)
        case napi_typedarray_type.napi_biguint64_array:
          return createTypedArray(envObject, BigUint64Array, 8, buffer, byte_offset, length, retCallback)
        default:
          return envObject.setLastError(napi_status.napi_invalid_arg)
      }
    })
  })
}

function napi_create_dataview (
  this: IAPI, env: napi_env,
  byte_length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Ptr
): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [arraybuffer, result], () => {
      byte_length = Number(byte_length)
      byte_offset = Number(byte_offset)
      byte_length = byte_length >>> 0
      byte_offset = byte_offset >>> 0
      const handle = ctx.handleStore.get(arraybuffer)!
      const buffer = handle.value
      if (!(buffer instanceof ArrayBuffer)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      if ((byte_length + byte_offset) > buffer.byteLength) {
        const err: RangeError & { code?: string } = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in')
        err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS'
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }

      const dataview = new DataView(buffer, byte_offset, byte_length)
      result = Number(result)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!

      const value = ctx.addToCurrentScope(envObject, dataview).id
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function node_api_symbol_for (this: IAPI, env: napi_env, utf8description: const_char_p, length: size_t, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      length = Number(length)
      utf8description = Number(utf8description)
      result = Number(result)
      const { view, HEAPU8 } = _memory.get(this)!
      const wasm64 = _wasm64.get(this)!

      const descriptionString = length === -1 ? UTF8ToString(HEAPU8, utf8description) : UTF8ToString(HEAPU8, utf8description, length)

      const value = ctx.addToCurrentScope(envObject, Symbol.for(descriptionString)).id
      setValue(view, result, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function wapi_create_external_uint8array (
  this: IAPI,
  env: napi_env,
  external_data: void_p,
  byte_length: size_t,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Ptr
): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      byte_length = Number(byte_length)
      external_data = Number(external_data)
      result = Number(result)

      byte_length = byte_length >>> 0

      if (!external_data) {
        byte_length = 0
      }

      if (byte_length > 2147483647) {
        throw new RangeError('Cannot create a Uint8Array larger than 2147483647 bytes')
      }
      const { view, HEAPU8 } = _memory.get(this)!
      const wasm64 = _wasm64.get(this)!
      if ((external_data + byte_length) > HEAPU8.buffer.byteLength) {
        throw new RangeError('Memory out of range')
      }
      if (!supportFinalizer && finalize_cb) {
        throw new NotSupportWeakRefError('emnapi_create_external_uint8array', 'Parameter "finalize_cb" must be 0(NULL)')
      }
      const u8arr = new Uint8Array(HEAPU8.buffer, external_data, byte_length)
      const handle = ctx.addToCurrentScope(envObject, u8arr)
      if (finalize_cb) {
        const status = wrap.call(this, WrapType.anonymous, env, handle.id, external_data, finalize_cb, finalize_hint, 0)
        if (status === napi_status.napi_pending_exception) {
          const err = envObject.tryCatch.extractException()
          envObject.clearLastError()
          throw err
        } else if (status !== napi_status.napi_ok) {
          return envObject.setLastError(status)
        }
      }
      setValue(view, result, handle.id, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

implement('napi_create_array', napi_create_array)
implement('napi_create_array_with_length', napi_create_array_with_length)
implement('napi_create_arraybuffer', napi_create_arraybuffer)
implement('napi_create_date', napi_create_date)
implement('napi_create_external', napi_create_external)
// implement('napi_create_external_arraybuffer', napi_create_external_arraybuffer, ['napi_set_last_error'])
implement('wapi_create_external_uint8array', wapi_create_external_uint8array)
implement('napi_create_object', napi_create_object)
implement('napi_create_symbol', napi_create_symbol)
implement('napi_create_typedarray', napi_create_typedarray)
implement('napi_create_dataview', napi_create_dataview)
implement('node_api_symbol_for', node_api_symbol_for)
