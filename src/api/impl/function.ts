import { type napi_env, type Ptr, type size_t, type napi_callback, type void_p, napi_status, type napi_callback_info, type void_pp, type napi_value, CallbackInfo } from '@tybys/emnapi-runtime'
import { implement, _private, createFunction } from '../api'
import type { IAPI } from '../api'
import { getValue, setValue } from '../util'

function napi_create_function (this: IAPI, env: napi_env, utf8name: Ptr, length: size_t, cb: napi_callback, data: void_p, result: Ptr): napi_status {
  const { ctx, wasm64, memory } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [result, cb], () => {
      const fresult = createFunction.call(this, envObject, utf8name, length, cb, data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const f = fresult.f
      const valueHandle = ctx.addToCurrentScope(envObject, f)
      result = Number(result)

      const value = valueHandle.id
      const view = memory.view
      setValue(view, result, value, '*', wasm64)
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_cb_info (this: IAPI, env: napi_env, cbinfo: napi_callback_info, argc: Ptr, argv: Ptr, this_arg: Ptr, data: void_pp): napi_status {
  if (!env) return napi_status.napi_invalid_arg
  const { ctx, wasm64, memory, psize } = _private.get(this)!
  const envObject = ctx.envStore.get(env)!
  if (!cbinfo) return envObject.setLastError(napi_status.napi_invalid_arg)

  const cbinfoValue: CallbackInfo = ctx.cbInfoStore.get(cbinfo)!

  argc = Number(argc)
  argv = Number(argv)
  const view = memory.view

  if (argv) {
    if (!argc) return envObject.setLastError(napi_status.napi_invalid_arg)
    let argcValue = getValue(view, argc, 'size', wasm64)
    argcValue = Number(argcValue)

    const arrlen = argcValue < cbinfoValue._length ? argcValue : cbinfoValue._length
    let i = 0

    for (; i < arrlen; i++) {
      const argVal = envObject.ensureHandleId(cbinfoValue._args[i])
      setValue(view, argv + i * psize, argVal, '*', wasm64)
    }
    if (i < argcValue) {
      for (; i < argcValue; i++) {
        setValue(view, argv + i * psize, 1, '*', wasm64)
      }
    }
  }
  if (argc) {
    setValue(view, argc, cbinfoValue._length, 'size', wasm64)
  }
  if (this_arg) {
    this_arg = Number(this_arg)

    const v = envObject.ensureHandleId(cbinfoValue._this)
    setValue(view, this_arg, v, '*', wasm64)
  }
  if (data) {
    data = Number(data)
    setValue(view, data, cbinfoValue._data, '*', wasm64)
  }
  return envObject.clearLastError()
}

function napi_call_function (
  this: IAPI, env: napi_env,
  recv: napi_value,
  func: napi_value,
  argc: size_t,
  argv: Ptr,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory, psize } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [recv], () => {
      argc = Number(argc)
      argv = Number(argv)
      result = Number(result)

      argc = argc >>> 0
      if (argc > 0) {
        if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v8recv = ctx.handleStore.get(recv)!.value
      if (!func) return envObject.setLastError(napi_status.napi_invalid_arg)
      const v8func = ctx.handleStore.get(func)!.value as Function
      if (typeof v8func !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = []
      const view = memory.view
      for (let i = 0; i < argc; i++) {
        const argVal = getValue(view, argv + i * psize, '*', wasm64)
        args.push(ctx.handleStore.get(argVal)!.value)
      }
      const ret = v8func.apply(v8recv, args)
      if (result) {
        const v = envObject.ensureHandleId(ret)
        setValue(view, result, v, '*', wasm64)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_new_instance (
  this: IAPI, env: napi_env,
  constructor: napi_value,
  argc: size_t,
  argv: Ptr,
  result: Ptr
): napi_status {
  const { ctx, wasm64, memory, psize } = _private.get(this)!
  return ctx.preamble(env, (envObject) => {
    return ctx.checkArgs(envObject, [constructor], () => {
      argc = Number(argc)
      argv = Number(argv)
      result = Number(result)

      argc = argc >>> 0
      if (argc > 0) {
        if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

      const Ctor: new (...args: any[]) => any = ctx.handleStore.get(constructor)!.value
      if (typeof Ctor !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = Array(argc + 1) as [undefined, ...any[]]
      args[0] = undefined
      const view = memory.view
      for (let i = 0; i < argc; i++) {
        const argVal = getValue(view, argv + i * psize, '*', wasm64)
        args[i + 1] = ctx.handleStore.get(argVal)!.value
      }
      const BoundCtor = Ctor.bind.apply(Ctor, args) as new () => any
      const ret = new BoundCtor()
      if (result) {
        const v = envObject.ensureHandleId(ret)
        setValue(view, result, v, '*', wasm64)
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_new_target (
  this: IAPI, env: napi_env,
  cbinfo: napi_callback_info,
  result: Ptr
): napi_status {
  if (!env) return napi_status.napi_invalid_arg
  const { ctx, wasm64, memory } = _private.get(this)!
  const envObject = ctx.envStore.get(env)!
  if (!cbinfo) return envObject.setLastError(napi_status.napi_invalid_arg)
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

  result = Number(result)

  const cbinfoValue: CallbackInfo = ctx.cbInfoStore.get(cbinfo)!

  const value = cbinfoValue._newTarget ? envObject.ensureHandleId(cbinfoValue._newTarget) : 0
  const view = memory.view
  setValue(view, result, value, '*', wasm64)
  return envObject.clearLastError()
}

implement('napi_create_function', napi_create_function)
implement('napi_get_cb_info', napi_get_cb_info)
implement('napi_call_function', napi_call_function)
implement('napi_new_instance', napi_new_instance)
implement('napi_get_new_target', napi_get_new_target)
