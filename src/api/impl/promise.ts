import { type napi_env, type Ptr, type napi_status, Deferred, type napi_deferred, type napi_value } from '@tybys/emnapi-runtime'
import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'

function napi_create_promise (this: IAPI, env: napi_env, deferred: Ptr, promise: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [deferred, promise], () => {
      const p = new Promise<any>((resolve, reject) => {
        const deferredObject = Deferred.create<any>(envObject, { resolve, reject })
        deferred = Number(deferred)
        const view = memory.view
        setValue(view, deferred, deferredObject.id, '*', wasm64)
      })
      promise = Number(promise)

      const value = ctx.addToCurrentScope(envObject, p).id
      const view = memory.view
      setValue(view, promise, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_resolve_deferred (this: IAPI, env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [deferred, resolution], () => {
      const deferredObject = ctx.deferredStore.get(deferred)!
      deferredObject.resolve(ctx.handleStore.get(resolution)!.value)
      return envObject.getReturnStatus()
    })
  })
}

function napi_reject_deferred (this: IAPI, env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [deferred, resolution], () => {
      const deferredObject = ctx.deferredStore.get(deferred)!
      deferredObject.reject(ctx.handleStore.get(resolution)!.value)
      return envObject.getReturnStatus()
    })
  })
}

function napi_is_promise (this: IAPI, env: napi_env, value: napi_value, is_promise: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, is_promise], () => {
      const h = ctx.handleStore.get(value)!
      is_promise = Number(is_promise)
      memory.HEAPU8[is_promise] = h.isPromise() ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

implement('napi_create_promise', napi_create_promise)
implement('napi_resolve_deferred', napi_resolve_deferred)
implement('napi_reject_deferred', napi_reject_deferred)
implement('napi_is_promise', napi_is_promise)
