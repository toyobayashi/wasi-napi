import { HandleStore } from '../../runtime/Handle'
import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'

function napi_get_boolean (this: IAPI, env: napi_env, value: bool, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const view = memory.view

      const v = value === 0 ? HandleStore.ID_FALSE : HandleStore.ID_TRUE
      setValue(view, Number(result), v, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_global (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const view = memory.view

      const value = HandleStore.ID_GLOBAL
      setValue(view, Number(result), value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_null (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const view = memory.view
      const value = HandleStore.ID_NULL
      setValue(view, Number(result), value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_get_undefined (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const view = memory.view
      const value = HandleStore.ID_UNDEFINED
      setValue(view, Number(result), value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

implement('napi_get_boolean', napi_get_boolean)
implement('napi_get_global', napi_get_global)
implement('napi_get_null', napi_get_null)
implement('napi_get_undefined', napi_get_undefined)
