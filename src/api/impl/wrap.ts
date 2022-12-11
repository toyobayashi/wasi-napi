import {
  type napi_env,
  type Ptr,
  type size_t,
  type napi_callback,
  type void_p,
  napi_status,
  napi_property_attributes,
  type napi_value,
  type napi_finalize,
  supportFinalizer,
  NotSupportWeakRefError,
  type void_pp,
  type Const
} from '@tybys/emnapi-runtime'
import { createFunction, defineProperty, implement, unwrap, wrap, _private } from '../api'
import type { IAPI } from '../api'
import { getValue, setValue, UTF8ToString } from '../util'

function napi_define_class (
  this: IAPI, env: napi_env,
  utf8name: Ptr,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Ptr,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory, psize } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, constructor], () => {
      length = Number(length)
      properties = Number(properties)
      property_count = Number(property_count)

      length = length >>> 0
      property_count = property_count >>> 0

      if (property_count > 0) {
        if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!utf8name)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const fresult = createFunction.call(this, envObject, utf8name, length, constructor, callback_data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const F = fresult.f
      const view = memory.view
      const HEAPU8 = memory.HEAPU8

      let propertyName: string | symbol

      for (let i = 0; i < property_count; i++) {
        const propPtr = properties + (i * (psize * 8))
        const utf8Name = getValue(view, propPtr + 0, '*', wasm64)
        const name = getValue(view, propPtr + psize, '*', wasm64)
        const method = getValue(view, propPtr + psize * 2, '*', wasm64)
        const getter = getValue(view, propPtr + psize * 3, '*', wasm64)
        const setter = getValue(view, propPtr + psize * 4, '*', wasm64)
        const value = getValue(view, propPtr + psize * 5, '*', wasm64)
        let attributes = getValue(view, propPtr + psize * 6, '*', wasm64)
        attributes = Number(attributes)
        const data = getValue(view, propPtr + psize * 7, '*', wasm64)

        if (utf8Name) {
          propertyName = UTF8ToString(HEAPU8, Number(utf8Name))
        } else {
          if (!name) {
            return envObject.setLastError(napi_status.napi_name_expected)
          }
          propertyName = ctx.handleStore.get(name)!.value
          if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
            return envObject.setLastError(napi_status.napi_name_expected)
          }
        }

        if ((attributes & napi_property_attributes.napi_static) !== 0) {
          defineProperty.call(this, envObject, F, propertyName, method, getter, setter, value, attributes, data)
          continue
        }
        defineProperty.call(this, envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data)
      }

      const valueHandle = ctx.addToCurrentScope(envObject, F)
      result = Number(result)
      setValue(view, result, valueHandle.id, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_wrap (this: IAPI, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Ptr): napi_status {
  if (!supportFinalizer) {
    if (finalize_cb) {
      const { ctx } = _private.get(this)!
      return ctx.preamble(env, () => {
        throw new NotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)')
      })
    }
    if (result) {
      const { ctx } = _private.get(this)!
      return ctx.preamble(env, () => {
        throw new NotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)')
      })
    }
  }
  return wrap.call(this, WrapType.retrievable, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

function napi_unwrap (this: IAPI, env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return unwrap.call(this, env, js_object, result, UnwrapAction.KeepWrap)
}

function napi_remove_wrap (this: IAPI, env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return unwrap.call(this, env, js_object, result, UnwrapAction.RemoveWrap)
}

function napi_type_tag_object (this: IAPI, env: napi_env, object: napi_value, type_tag: Const<Ptr>): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = ctx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    type_tag = Number(type_tag)
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (value.tag !== null) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const view = memory.view
    value.tag = [
      getValue(view, type_tag, 'u32'),
      getValue(view, type_tag + 4, 'u32'),
      getValue(view, type_tag + 8, 'u32'),
      getValue(view, type_tag + 12, 'u32')
    ]

    return envObject.getReturnStatus()
  })
}

function napi_check_object_type_tag (this: IAPI, env: napi_env, object: napi_value, type_tag: Const<Ptr>, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = ctx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (!result) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    let ret = true
    if (value.tag !== null) {
      type_tag = Number(type_tag)
      const view = memory.view
      for (let i = 0; i < 4; i++) {
        if (getValue(view, type_tag + i * 4, 'u32') !== value.tag[i]) {
          ret = false
          break
        }
      }
    } else {
      ret = false
    }

    result = Number(result)
    memory.HEAPU8[result] = ret ? 1 : 0

    return envObject.getReturnStatus()
  })
}

function napi_add_finalizer (this: IAPI, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Ptr): napi_status {
  if (!supportFinalizer) {
    const { ctx } = _private.get(this)!
    return ctx.preamble(env, () => {
      throw new NotSupportWeakRefError('napi_add_finalizer', 'This API is unavailable')
    })
  }
  return wrap.call(this, WrapType.anonymous, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

implement('napi_define_class', napi_define_class)
implement('napi_wrap', napi_wrap)
implement('napi_unwrap', napi_unwrap)
implement('napi_remove_wrap', napi_remove_wrap)
implement('napi_type_tag_object', napi_type_tag_object)
implement('napi_check_object_type_tag', napi_check_object_type_tag)
implement('napi_add_finalizer', napi_add_finalizer)
