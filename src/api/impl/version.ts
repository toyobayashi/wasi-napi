import type { napi_env, Ptr, napi_status } from '@tybys/emnapi-runtime'
import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'

function napi_get_version (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      result = Number(result)
      setValue(memory.view, result, 8, 'u32')
      return envObject.clearLastError()
    })
  })
}

implement('napi_get_version', napi_get_version)
