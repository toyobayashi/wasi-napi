import { implement, _private } from '../api'
import type { IAPI } from '../api'
import { setValue } from '../util'
import { EscapableHandleScope, HandleScope } from '../../runtime/HandleScope'
import { Reference } from '../../runtime/Reference'

function napi_open_handle_scope (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const scope = ctx.openScope(envObject, HandleScope)
      result = Number(result)
      const view = memory.view
      setValue(view, result, scope.id, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_close_handle_scope (this: IAPI, env: napi_env, scope: napi_handle_scope): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [scope], () => {
      const scopeObject = ctx.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== ctx.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      ctx.closeScope(envObject, ctx.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_open_escapable_handle_scope (this: IAPI, env: napi_env, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [result], () => {
      const scope = ctx.openScope(envObject, EscapableHandleScope)
      result = Number(result)
      const view = memory.view
      setValue(view, result, scope.id, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_close_escapable_handle_scope (this: IAPI, env: napi_env, scope: napi_escapable_handle_scope): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [scope], () => {
      const scopeObject = ctx.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== ctx.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      ctx.closeScope(envObject, ctx.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_escape_handle (this: IAPI, env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [scope, escapee, result], () => {
      const scopeObject = ctx.scopeStore.get(scope) as EscapableHandleScope
      if (!scopeObject.escapeCalled()) {
        escapee = Number(escapee)
        result = Number(result)

        const newHandle = scopeObject.escape(escapee)
        const value = newHandle ? newHandle.id : 0
        const view = memory.view
        setValue(view, result, value, '*', wasm64)
        return envObject.clearLastError()
      }
      return envObject.setLastError(napi_status.napi_escape_called_twice)
    })
  })
}

function napi_create_reference (
  this: IAPI, env: napi_env,
  value: napi_value,
  initial_refcount: uint32_t,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [value, result], () => {
      const handle = ctx.handleStore.get(value)!
      if (!(handle.isObject() || handle.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const ref = Reference.create(envObject, handle.id, initial_refcount >>> 0, false)
      result = Number(result)
      const view = memory.view
      setValue(view, result, ref.id, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

function napi_delete_reference (
  this: IAPI, env: napi_env,
  ref: napi_ref
): napi_status {
  const { ctx } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [ref], () => {
      Reference.doDelete(ctx.refStore.get(ref)!)
      return envObject.clearLastError()
    })
  })
}

function napi_reference_ref (
  this: IAPI, env: napi_env,
  ref: napi_ref,
  result: Ptr
): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [ref], () => {
      const count = ctx.refStore.get(ref)!.ref()
      if (result) {
        result = Number(result)
        setValue(memory.view, result, count, 'u32')
      }
      return envObject.clearLastError()
    })
  })
}

function napi_reference_unref (
  this: IAPI, env: napi_env,
  ref: napi_ref,
  result: Ptr
): napi_status {
  const { ctx, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [ref], () => {
      const reference = ctx.refStore.get(ref)!
      const refcount = reference.refCount()
      if (refcount === 0) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }
      const count = reference.unref()
      if (result) {
        result = Number(result)
        setValue(memory.view, result, count, 'u32')
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_reference_value (
  this: IAPI, env: napi_env,
  ref: napi_ref,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.checkEnv(env, (envObject) => {
    return ctx.checkArgs(envObject, [ref, result], () => {
      const reference = ctx.refStore.get(ref)!
      const handleId = reference.get()
      result = Number(result)
      const view = memory.view
      setValue(view, result, handleId, '*', wasm64)
      return envObject.clearLastError()
    })
  })
}

implement('napi_open_handle_scope', napi_open_handle_scope)
implement('napi_close_handle_scope', napi_close_handle_scope)
implement('napi_open_escapable_handle_scope', napi_open_escapable_handle_scope)
implement('napi_close_escapable_handle_scope', napi_close_escapable_handle_scope)
implement('napi_escape_handle', napi_escape_handle)

implement('napi_create_reference', napi_create_reference)
implement('napi_delete_reference', napi_delete_reference)
implement('napi_reference_ref', napi_reference_ref)
implement('napi_reference_unref', napi_reference_unref)
implement('napi_get_reference_value', napi_get_reference_value)
