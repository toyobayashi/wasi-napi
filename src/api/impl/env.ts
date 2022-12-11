import { type napi_env, type void_p, type napi_finalize, type napi_status, RefBase, type void_pp } from '@tybys/emnapi-runtime'
import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'

function napi_set_instance_data (this: IAPI, env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (envObject.instanceData) {
      RefBase.doDelete(envObject.instanceData)
    }
    envObject.instanceData = new RefBase(envObject, 0, true, finalize_cb, data, finalize_hint)
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (this: IAPI, env: napi_env, data: void_pp): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [data], () => {
      data = Number(data)
      const view = memory.view
      const value = envObject.instanceData ? envObject.instanceData.data() : 0
      setValue(view, data, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

implement('napi_set_instance_data', napi_set_instance_data)
implement('napi_get_instance_data', napi_get_instance_data)
