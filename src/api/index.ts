import type { Context } from '../runtime/Context'
import { Env, ILastError } from '../runtime/env'
import { HandleScope } from '../runtime/HandleScope'
import { API } from './implement'
import { getValue, setValue, toPtr } from './util'

const kSetMemory = Symbol('kSetMemory')
const kRegistered = Symbol('kRegistered')
const kInstance = Symbol('kInstance')
const kContext = Symbol('kContext')
const kMemory64 = Symbol('kMemory64')
const kPointerSize = Symbol('kPointerSize')

/** @public */
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
    this.exports = {}
    this[kRegistered] = false
    this[kInstance] = undefined
  }

  register (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table): void {
    if (this[kRegistered]) throw new Error('Already registered')
    if (!(instance instanceof WebAssembly.Instance)) {
      throw new TypeError('Invalid wasm instance')
    }
    this[kInstance] = instance
    const {
      napi_register_wasm_v1,
      wapi_error_messages_get,
      malloc,
      free
    } = this[kInstance].exports
    if (typeof napi_register_wasm_v1 !== 'function' ||
        typeof wapi_error_messages_get !== 'function') {
      throw new TypeError('Invalid Node-API wasm')
    }

    if (typeof malloc !== 'function') {
      throw new TypeError('malloc is not exported')
    }

    if (typeof free !== 'function') {
      throw new TypeError('free is not exported')
    }

    memory = memory ?? this[kInstance].exports.memory as WebAssembly.Memory
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error('Invalid memory')
    }
    table = table ?? this[kInstance].exports.__indirect_function_table as WebAssembly.Table
    if (!(table instanceof WebAssembly.Table)) {
      throw new TypeError('Invalid table')
    }

    const wasm64 = this[kMemory64]
    const data = Number(malloc(toPtr(this[kPointerSize] * 2 + 8, wasm64)))
    if (data === 0) throw new Error('malloc failed')

    const lastError: ILastError = {
      data,
      getErrorCode: () => {
        return getValue(new DataView(memory!.buffer), lastError.data + this[kPointerSize] * 2 + 4, 'i32')
      },
      setErrorCode: (code: napi_status) => {
        setValue(new DataView(memory!.buffer), lastError.data + this[kPointerSize] * 2 + 4, code, 'i32')
      },
      setErrorMessage: (ptr: const_char_p) => {
        setValue(new DataView(memory!.buffer), lastError.data, ptr, '*', wasm64)
      },
      dispose: () => {
        free(toPtr(lastError.data, wasm64))
        lastError.data = 0
      }
    }

    this[kSetMemory](memory, Number(wapi_error_messages_get()), malloc, free)
    const dynCalls = {
      call_vp (ptr: Ptr, a: Ptr): void {
        table!.get(Number(ptr))(toPtr(a, wasm64))
      },
      call_vpp (ptr: Ptr, a: Ptr, b: Ptr): void {
        table!.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64))
      },
      call_ppp (ptr: Ptr, a: Ptr, b: Ptr): Ptr {
        return toPtr(table!.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64)), wasm64)
      },
      call_vpip (ptr: Ptr, a: Ptr, b: number, c: Ptr): void {
        table!.get(Number(ptr))(toPtr(a, wasm64), Number(b), toPtr(c, wasm64))
      },
      call_vppp (ptr: Ptr, a: Ptr, b: Ptr, c: Ptr): void {
        table!.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64), toPtr(c, wasm64))
      },
      call_vpppp (ptr: Ptr, a: Ptr, b: Ptr, c: Ptr, d: Ptr): void {
        table!.get(Number(ptr))(toPtr(a, wasm64), toPtr(b, wasm64), toPtr(c, wasm64), toPtr(d, wasm64))
      }
    }

    const env = Env.create(this[kContext], dynCalls, lastError)
    const scope = this[kContext].openScope(env, HandleScope)
    let e: any
    try {
      e = env.callIntoModule((envObject) => {
        const exports = this.exports
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
