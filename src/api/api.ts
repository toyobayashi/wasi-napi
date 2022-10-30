import { Reference } from '../runtime/Reference'
import type { Context } from '../runtime/Context'
import { Memory, extendMemory, toPtr, setValue } from './util'
import type { ILastError } from '../runtime/env'

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
