import { implement, _ctx, _memory, _wasm64 } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'
import { RefBase } from '../../runtime/RefBase'

function napi_set_instance_data (this: IAPI, env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    if (envObject.instanceData) {
      RefBase.doDelete(envObject.instanceData)
    }
    envObject.instanceData = new RefBase(envObject, 0, true, finalize_cb, data, finalize_hint)
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (this: IAPI, env: napi_env, data: void_pp): napi_status {
  const ctx = _ctx.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [data], () => {
      data = Number(data)
      const view = _memory.get(this)!.view
      const wasm64 = _wasm64.get(this)!
      const value = envObject.instanceData ? envObject.instanceData.data() : 0
      setValue(view, data, value, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

implement('napi_set_instance_data', napi_set_instance_data)
implement('napi_get_instance_data', napi_get_instance_data)
