import type { Context } from '../runtime/Context'
import { Env } from '../runtime/env'
import { HandleScope } from '../runtime/HandleScope'
import { API } from './implement'
import { toPtr } from './util'

const kSetMemory = Symbol('kSetMemory')
const kRegistered = Symbol('kRegistered')
const kInstance = Symbol('kInstance')
const kContext = Symbol('kContext')
const kMemory64 = Symbol('kMemory64')
const kPointerSize = Symbol('kPointerSize')

export class NodeAPI {
  public imports: Record<string, any>
  public exports: any
  private [kSetMemory]: Function
  private [kRegistered]: boolean
  private [kInstance]: WebAssembly.Instance | undefined
  private [kContext]: Context
  private [kMemory64]: boolean
  private [kPointerSize]: number

  constructor (ctx: Context, wasm64?: boolean) {
    wasm64 = Boolean(wasm64)
    this[kMemory64] = wasm64
    this[kPointerSize] = wasm64 ? 8 : 4
    this[kContext] = ctx
    const imports = new API(ctx, wasm64) as any
    for (const prop in imports) {
      imports[prop] = imports[prop].bind(imports)
    }
    this[kSetMemory] = imports._setMemory
    delete imports._setMemory
    this.imports = imports
    this.exports = undefined
    this[kRegistered] = false
    this[kInstance] = undefined
  }

  register (memory: WebAssembly.Memory, instance: WebAssembly.Instance): void {
    if (this[kRegistered]) throw new Error('Already registered')
    if (!(instance instanceof WebAssembly.Instance)) {
      throw new TypeError('Invalid wasm instance')
    }
    this[kInstance] = instance
    const {
      napi_register_wasm_v1,
      wapi_get_napi_errors,
      malloc,
      free,
      __indirect_function_table
    } = this[kInstance].exports
    if (typeof napi_register_wasm_v1 !== 'function' ||
        typeof wapi_get_napi_errors !== 'function') {
      throw new TypeError('Invalid Node-API wasm')
    }

    if (typeof malloc !== 'function' || typeof free !== 'function') {
      throw new TypeError('malloc or free is not exported')
    }

    if (!(__indirect_function_table instanceof WebAssembly.Table)) {
      throw new TypeError('table is not exported')
    }

    const wasm64 = this[kMemory64]
    const data = Number(malloc(toPtr(this[kPointerSize] * 2 + 8, wasm64)))
    if (data === 0) throw new Error('malloc failed')

    const lastError = {
      data,
      getErrorCode: () => {
        return new DataView(memory.buffer).getInt32(lastError.data + this[kPointerSize] * 2 + 4, true)
      },
      setErrorCode: (code: napi_status) => {
        new DataView(memory.buffer).setInt32(lastError.data + this[kPointerSize] * 2 + 4, code, true)
      },
      setErrorMessage: (ptr: const_char_p) => {
        if (this[kMemory64]) {
          new DataView(memory.buffer).setBigInt64(lastError.data, BigInt(ptr), true)
        } else {
          new DataView(memory.buffer).setInt32(lastError.data, Number(ptr), true)
        }
      },
      dispose: () => {
        free(this[kMemory64] ? BigInt(lastError.data) : lastError.data)
        lastError.data = 0
      }
    }

    this[kSetMemory](memory, Number(wapi_get_napi_errors()), lastError, malloc, free)
    const dynCalls = {
      call_vp (ptr: Ptr, a: Ptr): void {
        __indirect_function_table.get(Number(ptr))(toPtr(a, wasm64))
      },
      call_vpp (ptr: Ptr, a: Ptr, b: Ptr): void {
        __indirect_function_table.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64))
      },
      call_ppp (ptr: Ptr, a: Ptr, b: Ptr): Ptr {
        return toPtr(__indirect_function_table.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64)), wasm64)
      },
      call_vpip (ptr: Ptr, a: Ptr, b: number, c: Ptr): void {
        __indirect_function_table.get(Number(ptr))(toPtr(a, wasm64), Number(b), toPtr(c, wasm64))
      },
      call_vppp (ptr: Ptr, a: Ptr, b: Ptr, c: Ptr): void {
        __indirect_function_table.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64), toPtr(c, wasm64))
      },
      call_vpppp (ptr: Ptr, a: Ptr, b: Ptr, c: Ptr, d: Ptr): void {
        __indirect_function_table.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64), toPtr(c, wasm64), toPtr(d, wasm64))
      }
    }

    const env = Env.create(this[kContext], dynCalls, lastError)
    const scope = this[kContext].openScope(env, HandleScope)
    let e: any
    try {
      e = env.callIntoModule((envObject) => {
        const exports = {}
        const exportsHandle = scope.add(envObject, exports)
        const napiValue = Number(napi_register_wasm_v1(toPtr(envObject.id, wasm64), toPtr(exportsHandle.id, wasm64)))
        return (!napiValue) ? exports : this[kContext].handleStore.get(napiValue)!.value
      })
    } catch (err) {
      this[kContext].closeScope(env, scope)
      throw err
    }
    this[kContext].closeScope(env, scope)
    this[kRegistered] = true
    this.exports = e
  }
}
