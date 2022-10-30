import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'
import { HandleStore } from '../../runtime/Handle'

function napi_run_script (this: IAPI, env: napi_env, script: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [script, result], () => {
      const v8Script = ctx.handleStore.get(script)!
      if (!v8Script.isString()) {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const g: typeof globalThis = ctx.handleStore.get(HandleStore.ID_GLOBAL)!.value
      const ret = g.eval(v8Script.value)
      result = Number(result)

      const value = envObject.ensureHandleId(ret)
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

implement('napi_run_script', napi_run_script)
