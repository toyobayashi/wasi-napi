import { Reference } from '../runtime/Reference'
import type { Context } from '../runtime/Context'
import { Memory, extendMemory, toPtr, setValue } from './util'
import type { ILastError } from '../runtime/env'

export const _wasm64 = new WeakMap<IAPI, boolean>()
export const _memory = new WeakMap<IAPI, Memory>()
export const _errmsgPtr = new WeakMap<IAPI, number>()
export const _psize = new WeakMap<IAPI, number>()
export const _ctx = new WeakMap<IAPI, Context>()
export const _lastError = new WeakMap<IAPI, ILastError>()
export const _malloc = new WeakMap<IAPI, (size: number | bigint) => (number | bigint)>()
export const _free = new WeakMap<IAPI, (ptr: Ptr) => void>()

export const _memoryPointerDeleter = new WeakMap<IAPI, FinalizationRegistry<Ptr> | undefined>()
export const _arrayBufferMemoryMap = new WeakMap<IAPI, WeakMap<ArrayBuffer, void_p>>()
export const _typedArrayMemoryMap = new WeakMap<IAPI, WeakMap<ArrayBufferView, void_p>>()

export type IAPI = object

export const API: new (ctx: Context, wasm64: boolean) => IAPI =
  function API (this: any, ctx: Context, wasm64: boolean): void {
    _ctx.set(this, ctx)
    _wasm64.set(this, wasm64)
    _psize.set(this, wasm64 ? 8 : 4)
    _memoryPointerDeleter.set(this, typeof FinalizationRegistry === 'function'
      ? new FinalizationRegistry((pointer) => { _free.get(this)!(pointer) })
      : undefined)
    _arrayBufferMemoryMap.set(this, new WeakMap())
    _typedArrayMemoryMap.set(this, new WeakMap())

    this._setMemory = function _setMemory (this: any, m: WebAssembly.Memory, errmsgPtr: number, lastError: ILastError): void {
      if (!(m instanceof WebAssembly.Memory)) {
        throw new TypeError('"instance.exports.memory" property must be a WebAssembly.Memory')
      }
      _memory.set(this, extendMemory(m))
      _errmsgPtr.set(this, errmsgPtr)
      _lastError.set(this, lastError)
    }
  } as any

export function implement (name: string, fn: Function): void {
  API.prototype[name] = fn
}

export function getArrayBufferPointer (this: IAPI, arrayBuffer: ArrayBuffer): void_p {
  const memory = _memory.get(this)!
  const memoryPointerDeleter = _memoryPointerDeleter.get(this)!
  const arrayBufferMemoryMap = _arrayBufferMemoryMap.get(this)!
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

  const wasm64 = _wasm64.get(this)!
  pointer = _malloc.get(this)!(toPtr(arrayBuffer.byteLength, wasm64))
  HEAPU8.set(new Uint8Array(arrayBuffer), Number(pointer))
  arrayBufferMemoryMap.set(arrayBuffer, pointer)
  memoryPointerDeleter.register(arrayBuffer, pointer)
  return pointer
}

export function getViewPointer (this: IAPI, view: ArrayBufferView): void_p {
  const memory = _memory.get(this)!
  const memoryPointerDeleter = _memoryPointerDeleter.get(this)!
  const typedArrayMemoryMap = _typedArrayMemoryMap.get(this)!
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

  const wasm64 = _wasm64.get(this)!
  pointer = _malloc.get(this)!(toPtr(view.byteLength, wasm64))
  HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), Number(pointer))
  typedArrayMemoryMap.set(view, pointer)
  memoryPointerDeleter.register(view, pointer)
  return pointer
}

export function wrap (this: IAPI, type: WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Ptr): napi_status {
  const ctx = _ctx.get(this)!
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
        const view = _memory.get(this)!.view
        const wasm64 = _wasm64.get(this)!
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
