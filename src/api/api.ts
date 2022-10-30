import { Reference } from '../runtime/Reference'
import type { Context } from '../runtime/Context'
import { Memory, extendMemory, toPtr, setValue, UTF8ToString } from './util'
import type { Env, ILastError } from '../runtime/env'
import { CallbackInfo } from '../runtime/CallbackInfo'
import { HandleScope } from '../runtime/HandleScope'
import { canSetFunctionName, supportBigInt, supportFinalizer, supportNewFunction } from '../runtime/util'

export interface IWrap {
  wasm64: boolean
  memory: Memory
  errmsgPtr: number
  psize: number
  ctx: Context
  lastError: ILastError
  malloc: (size: number | bigint) => (number | bigint)
  free: (ptr: Ptr) => void

  memoryPointerDeleter: FinalizationRegistry<Ptr> | undefined
  arrayBufferMemoryMap: WeakMap<ArrayBuffer, void_p>
  typedArrayMemoryMap: WeakMap<ArrayBufferView, void_p>
}

export const _private = new WeakMap<IAPI, IWrap>()

export type IAPI = object

export const API: new (ctx: Context, wasm64: boolean) => IAPI =
  function API (this: any, ctx: Context, wasm64: boolean): void {
    const wrap: IWrap = {
      ctx,
      wasm64,
      psize: wasm64 ? 8 : 4,
      errmsgPtr: 0,
      lastError: undefined!,
      malloc: undefined!,
      free: undefined!,
      memory: undefined!,
      memoryPointerDeleter: typeof FinalizationRegistry === 'function'
        ? new FinalizationRegistry((pointer) => { wrap.free(pointer) })
        : undefined,
      arrayBufferMemoryMap: new WeakMap(),
      typedArrayMemoryMap: new WeakMap()
    }

    _private.set(this, wrap)

    this._setMemory = function _setMemory (
      this: any,
      m: WebAssembly.Memory,
      errmsgPtr: number,
      lastError: ILastError,
      malloc: (size: number | bigint) => (number | bigint),
      free: (ptr: Ptr) => void
    ): void {
      if (!(m instanceof WebAssembly.Memory)) {
        throw new TypeError('"instance.exports.memory" property must be a WebAssembly.Memory')
      }
      const wrap = _private.get(this)!
      wrap.memory = extendMemory(m)
      wrap.errmsgPtr = errmsgPtr
      wrap.lastError = lastError
      wrap.malloc = malloc
      wrap.free = free
    }
  } as any

export function implement (name: string, fn: Function): void {
  API.prototype[name] = fn
}

function napi_set_last_error (this: IAPI, env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status {
  const { ctx } = _private.get(this)!
  const envObject = ctx.envStore.get(env)!
  return envObject.setLastError(error_code, engine_error_code, engine_reserved)
}

function napi_clear_last_error (this: IAPI, env: napi_env): napi_status {
  const { ctx } = _private.get(this)!
  const envObject = ctx.envStore.get(env)!
  return envObject.clearLastError()
}

function wapi_is_support_weakref (): number {
  return supportFinalizer ? 1 : 0
}

function wapi_is_support_bigint (): number {
  return supportBigInt ? 1 : 0
}

implement('napi_set_last_error', napi_set_last_error)
implement('napi_clear_last_error', napi_clear_last_error)
implement('wapi_is_support_weakref', wapi_is_support_weakref)
implement('wapi_is_support_bigint', wapi_is_support_bigint)

export function getArrayBufferPointer (this: IAPI, arrayBuffer: ArrayBuffer): void_p {
  const wrap = _private.get(this)!
  const memory = wrap.memory
  const memoryPointerDeleter = wrap.memoryPointerDeleter
  const arrayBufferMemoryMap = wrap.arrayBufferMemoryMap
  if ((!memoryPointerDeleter) || (arrayBuffer === memory.buffer)) {
    return 0
  }

  const HEAPU8 = memory.HEAPU8
  let pointer: void_p
  if (arrayBufferMemoryMap.has(arrayBuffer)) {
    pointer = arrayBufferMemoryMap.get(arrayBuffer)!
    HEAPU8.set(new Uint8Array(arrayBuffer), Number(pointer))
    return pointer
  }

  const wasm64 = wrap.wasm64
  pointer = wrap.malloc(toPtr(arrayBuffer.byteLength, wasm64))
  HEAPU8.set(new Uint8Array(arrayBuffer), Number(pointer))
  arrayBufferMemoryMap.set(arrayBuffer, pointer)
  memoryPointerDeleter.register(arrayBuffer, pointer)
  return pointer
}

export function getViewPointer (this: IAPI, view: ArrayBufferView): void_p {
  const wrap = _private.get(this)!
  const memory = wrap.memory
  const memoryPointerDeleter = wrap.memoryPointerDeleter
  const typedArrayMemoryMap = wrap.typedArrayMemoryMap
  if (!memoryPointerDeleter) {
    return 0
  }
  const HEAPU8 = memory.HEAPU8
  if (view.buffer === HEAPU8.buffer) {
    return view.byteOffset
  }

  let pointer: void_p
  if (typedArrayMemoryMap.has(view)) {
    pointer = typedArrayMemoryMap.get(view)!
    HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), Number(pointer))
    return pointer
  }

  const wasm64 = wrap.wasm64
  pointer = wrap.malloc(toPtr(view.byteLength, wasm64))
  HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), Number(pointer))
  typedArrayMemoryMap.set(view, pointer)
  memoryPointerDeleter.register(view, pointer)
  return pointer
}

export function setErrorCode (this: IAPI, envObject: Env, error: Error & { code?: string }, code: napi_value, code_string: const_char_p): napi_status {
  if (code || code_string) {
    let codeValue: string
    if (code) {
      codeValue = _private.get(this)!.ctx.handleStore.get(code)!.value
      if (typeof codeValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
    } else {
      code_string = Number(code_string)
      codeValue = UTF8ToString(_private.get(this)!.memory.HEAPU8, code_string)
    }
    error.code = codeValue
  }
  return napi_status.napi_ok
}

export function createFunction<F extends (...args: any[]) => any> (this: IAPI, envObject: Env, utf8name: Ptr, length: size_t, cb: napi_callback, data: void_p): { status: napi_status; f: F } {
  length = Number(length)
  utf8name = Number(utf8name)
  cb = Number(cb)
  const { ctx, memory } = _private.get(this)!
  const HEAPU8 = memory.HEAPU8

  const functionName = (!utf8name || !length) ? '' : (length === -1 ? UTF8ToString(HEAPU8, utf8name) : UTF8ToString(HEAPU8, utf8name, length))

  let f: F

  const makeFunction = () => function (this: any): any {
    'use strict'
    const newTarget = this && this instanceof f ? this.constructor : undefined
    const cbinfo = CallbackInfo.create(
      envObject,
      this,
      data,
      arguments.length,
      Array.prototype.slice.call(arguments),
      newTarget
    )
    const scope = ctx.openScope(envObject, HandleScope)
    let r: napi_value
    try {
      r = envObject.callIntoModule((envObject) => {
        const napiValue = envObject.emnapiGetDynamicCalls.call_ppp(cb, envObject.id, cbinfo.id)
        return (!napiValue) ? undefined : ctx.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      cbinfo.dispose()
      ctx.closeScope(envObject, scope)
      throw err
    }
    cbinfo.dispose()
    ctx.closeScope(envObject, scope)
    return r
  }

  if (functionName === '') {
    f = makeFunction() as F
  } else {
    if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
      return { status: napi_status.napi_invalid_arg, f: undefined! }
    }
    if (supportNewFunction) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      f = (new Function('_',
        'return function ' + functionName + '(){' +
          '"use strict";' +
          'return _.apply(this,arguments);' +
        '};'
      ))(makeFunction())
    } else {
      f = makeFunction() as F
      if (canSetFunctionName) {
        Object.defineProperty(f, 'name', {
          value: functionName
        })
      }
    }
  }

  return { status: napi_status.napi_ok, f }
}

export function defineProperty (this: IAPI, envObject: Env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
  const { ctx } = _private.get(this)!
  if (getter || setter) {
    let localGetter: () => any
    let localSetter: (v: any) => void
    if (getter) {
      localGetter = createFunction.call(this, envObject, 0, 0, getter, data).f
    }
    if (setter) {
      localSetter = createFunction.call(this, envObject, 0, 0, setter, data).f
    }
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      get: localGetter!,
      set: localSetter!
    }
    Object.defineProperty(obj, propertyName, desc)
  } else if (method) {
    const localMethod = createFunction.call(this, envObject, 0, 0, method, data).f
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: localMethod
    }
    Object.defineProperty(obj, propertyName, desc)
  } else {
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: ctx.handleStore.get(value)!.value
    }
    Object.defineProperty(obj, propertyName, desc)
  }
}

export function wrap (this: IAPI, type: WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Ptr): napi_status {
  const { ctx, memory, wasm64 } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [js_object], () => {
      const value = ctx.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      if (type === WrapType.retrievable) {
        if (value.wrapped !== 0) {
          return envObject.setLastError(napi_status.napi_invalid_arg)
        }
      } else if (type === WrapType.anonymous) {
        if (!finalize_cb) return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      let reference: Reference
      if (result) {
        if (!finalize_cb) return envObject.setLastError(napi_status.napi_invalid_arg)
        reference = Reference.create(envObject, value.id, 0, false, finalize_cb, native_object, finalize_hint)
        result = Number(result)
        const view = memory.view
        setValue(view, result, reference.id, '*', wasm64)
      } else {
        reference = Reference.create(envObject, value.id, 0, true, finalize_cb, native_object, !finalize_cb ? finalize_cb : finalize_hint)
      }

      if (type === WrapType.retrievable) {
        value.wrapped = reference.id
      }
      return envObject.getReturnStatus()
    })
  })
}

export function unwrap (this: IAPI, env: napi_env, js_object: napi_value, result: void_pp, action: UnwrapAction): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [js_object], () => {
      if (action === UnwrapAction.KeepWrap) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const value = ctx.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const referenceId = value.wrapped
      const ref = ctx.refStore.get(referenceId)
      if (!ref) return envObject.setLastError(napi_status.napi_invalid_arg)
      if (result) {
        result = Number(result)

        const data = ref.data()
        setValue(memory.view, result, data, '*', wasm64)
      }
      if (action === UnwrapAction.RemoveWrap) {
        value.wrapped = 0
        Reference.doDelete(ref)
      }
      return envObject.getReturnStatus()
    })
  })
}
