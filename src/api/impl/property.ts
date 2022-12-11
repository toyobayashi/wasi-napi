import {
  type napi_env,
  type napi_value,
  napi_key_collection_mode,
  napi_key_filter,
  napi_key_conversion,
  type Ptr,
  napi_status,
  supportReflect,
  type const_char_p,
  type uint32_t,
  type size_t,
  type Const
} from '@tybys/emnapi-runtime'
import { defineProperty, implement, _private } from '../api'
import type { IAPI } from '../api'
import { getPropertyNames, getValue, setValue, UTF8ToString } from '../util'

function napi_get_all_property_names (
  this: IAPI, env: napi_env,
  object: napi_value,
  key_mode: napi_key_collection_mode,
  key_filter: napi_key_filter,
  key_conversion: napi_key_conversion,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (key_mode !== napi_key_collection_mode.napi_key_include_prototypes && key_mode !== napi_key_collection_mode.napi_key_own_only) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (key_conversion !== napi_key_conversion.napi_key_keep_numbers && key_conversion !== napi_key_conversion.napi_key_numbers_to_strings) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const names = getPropertyNames(v, key_mode, key_filter, key_conversion)
      result = Number(result)

      const value = ctx.addToCurrentScope(envObject, names).id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property_names (this: IAPI, env: napi_env, object: napi_value, result: Ptr): napi_status {
  return napi_get_all_property_names.call(this,
    env,
    object,
    napi_key_collection_mode.napi_key_include_prototypes,
    napi_key_filter.napi_key_enumerable | napi_key_filter.napi_key_skip_symbols,
    napi_key_conversion.napi_key_numbers_to_strings,
    result
  )
}

function napi_set_property (this: IAPI, env: napi_env, object: napi_value, key: napi_value, value: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [key, value, object], () => {
      const h = ctx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[ctx.handleStore.get(key)!.value] = ctx.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_property (this: IAPI, env: napi_env, object: napi_value, key: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [key, result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      result = Number(result)
      memory.HEAPU8[result] = (ctx.handleStore.get(key)!.value in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property (this: IAPI, env: napi_env, object: napi_value, key: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [key, result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      result = Number(result)

      const value = envObject.ensureHandleId(v[ctx.handleStore.get(key)!.value])
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_property (this: IAPI, env: napi_env, object: napi_value, key: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [key, object], () => {
      const h = ctx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      const propertyKey = ctx.handleStore.get(key)!.value
      if (supportReflect) {
        r = Reflect.deleteProperty(h.value, propertyKey)
      } else {
        try {
          r = delete h.value[propertyKey]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        result = Number(result)
        memory.HEAPU8[result] = r ? 1 : 0
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_own_property (this: IAPI, env: napi_env, object: napi_value, key: napi_value, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [key, result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const prop = ctx.handleStore.get(key)!.value
      if (typeof prop !== 'string' && typeof prop !== 'symbol') {
        return envObject.setLastError(napi_status.napi_name_expected)
      }
      const r = Object.prototype.hasOwnProperty.call(v, ctx.handleStore.get(key)!.value)
      result = Number(result)
      memory.HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_named_property (this: IAPI, env: napi_env, object: napi_value, cname: const_char_p, value: napi_value): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, object], () => {
      const h = ctx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (!cname) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      cname = Number(cname)
      ctx.handleStore.get(object)!.value[UTF8ToString(memory.HEAPU8, cname)] = ctx.handleStore.get(value)!.value
      return napi_status.napi_ok
    })
  })
}

function napi_has_named_property (this: IAPI, env: napi_env, object: napi_value, utf8name: const_char_p, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, object], () => {
      if (!utf8name) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      utf8name = Number(utf8name)
      result = Number(result)
      const HEAPU8 = memory.HEAPU8
      const r = UTF8ToString(HEAPU8, utf8name) in v
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_named_property (this: IAPI, env: napi_env, object: napi_value, utf8name: const_char_p, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, object], () => {
      if (!utf8name) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      utf8name = Number(utf8name)
      result = Number(result)

      const value = envObject.ensureHandleId(v[UTF8ToString(memory.HEAPU8, utf8name)])
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_element (this: IAPI, env: napi_env, object: napi_value, index: uint32_t, value: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, object], () => {
      const h = ctx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[index >>> 0] = ctx.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_element (this: IAPI, env: napi_env, object: napi_value, index: uint32_t, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      result = Number(result)
      memory.HEAPU8[result] = ((index >>> 0) in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_element (this: IAPI, env: napi_env, object: napi_value, index: uint32_t, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, object], () => {
      const h = ctx.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      result = Number(result)

      const value = envObject.ensureHandleId(v[index >>> 0])
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_element (this: IAPI, env: napi_env, object: napi_value, index: uint32_t, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [object], () => {
      const h = ctx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      if (supportReflect) {
        r = Reflect.deleteProperty(h.value, index >>> 0)
      } else {
        try {
          r = delete h.value[index >>> 0]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        result = Number(result)
        memory.HEAPU8[result] = r ? 1 : 0
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_define_properties (
  this: IAPI, env: napi_env,
  object: napi_value,
  property_count: size_t,
  properties: Const<Ptr>
): napi_status {
  const { ctx, wasm64, memory, psize } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    properties = Number(properties)
    property_count = Number(property_count)

    property_count = property_count >>> 0

    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = ctx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
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
      defineProperty.call(this, envObject, maybeObject, propertyName, method, getter, setter, value, attributes, data)
    }
    return napi_status.napi_ok
  })
}

function napi_object_freeze (this: IAPI, env: napi_env, object: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = ctx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.freeze(maybeObject)
    return envObject.getReturnStatus()
  })
}

function napi_object_seal (this: IAPI, env: napi_env, object: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = ctx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.seal(maybeObject)
    return envObject.getReturnStatus()
  })
}

implement('napi_get_all_property_names', napi_get_all_property_names)
implement('napi_get_property_names', napi_get_property_names)
implement('napi_set_property', napi_set_property)
implement('napi_has_property', napi_has_property)
implement('napi_get_property', napi_get_property)
implement('napi_delete_property', napi_delete_property)
implement('napi_has_own_property', napi_has_own_property)
implement('napi_set_named_property', napi_set_named_property)
implement('napi_has_named_property', napi_has_named_property)
implement('napi_get_named_property', napi_get_named_property)
implement('napi_set_element', napi_set_element)
implement('napi_has_element', napi_has_element)
implement('napi_get_element', napi_get_element)
implement('napi_delete_element', napi_delete_element)
implement('napi_define_properties', napi_define_properties)
implement('napi_object_freeze', napi_object_freeze)
implement('napi_object_seal', napi_object_seal)
