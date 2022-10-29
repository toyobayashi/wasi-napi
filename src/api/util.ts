export function toPtr (p: Ptr, wasm64: true): bigint
export function toPtr (p: Ptr, wasm64: false): number
export function toPtr (p: Ptr, wasm64: boolean): Ptr
export function toPtr (p: Ptr, wasm64: boolean): Ptr {
  return wasm64 ? BigInt(p) : Number(p)
}

export class Memory extends WebAssembly.Memory {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (descriptor: WebAssembly.MemoryDescriptor) {
    super(descriptor)
  }

  public get HEAP8 (): Int8Array { return new Int8Array(this.buffer) }
  public get HEAPU8 (): Uint8Array { return new Uint8Array(this.buffer) }
  public get HEAP16 (): Int16Array { return new Int16Array(this.buffer) }
  public get HEAPU16 (): Uint16Array { return new Uint16Array(this.buffer) }
  public get HEAP32 (): Int32Array { return new Int32Array(this.buffer) }
  public get HEAPU32 (): Uint32Array { return new Uint32Array(this.buffer) }
  public get HEAP64 (): BigInt64Array { return new BigInt64Array(this.buffer) }
  public get HEAPU64 (): BigUint64Array { return new BigUint64Array(this.buffer) }
  public get HEAPF32 (): Float32Array { return new Float32Array(this.buffer) }
  public get HEAPF64 (): Float64Array { return new Float64Array(this.buffer) }
  public get view (): DataView { return new DataView(this.buffer) }
}

export function extendMemory (memory: WebAssembly.Memory): Memory {
  if (Object.getPrototypeOf(memory) === WebAssembly.Memory.prototype) {
    Object.setPrototypeOf(memory, Memory.prototype)
  }
  return memory as Memory
}

export type NumberValueType = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'f32' | 'f64'
export type BigIntValueType = 'i64' | 'u64'
export type Type = NumberValueType | BigIntValueType | '*' | 'size'

export function getValue (view: DataView, ptr: number, type: NumberValueType): number
export function getValue (view: DataView, ptr: number, type: BigIntValueType): bigint
export function getValue (view: DataView, ptr: number, type: '*' | 'size', wasm64: boolean): number | bigint
export function getValue (view: DataView, ptr: number, type: Type, wasm64?: boolean): number | bigint {
  switch (type) {
    case 'i8': return view.getInt8(ptr)
    case 'u8': return view.getUint8(ptr)
    case 'i16': return view.getInt16(ptr, true)
    case 'u16': return view.getUint16(ptr, true)
    case 'i32': return view.getInt32(ptr, true)
    case 'u32': return view.getUint32(ptr, true)
    case 'f32': return view.getFloat32(ptr, true)
    case 'f64': return view.getFloat64(ptr, true)
    case 'i64': return view.getBigInt64(ptr, true)
    case 'u64': return view.getBigUint64(ptr, true)
    case '*': return wasm64 ? view.getBigInt64(ptr, true) : view.getInt32(ptr, true)
    case 'size': return wasm64 ? view.getBigUint64(ptr, true) : view.getUint32(ptr, true)
    default: throw new TypeError('Invalid type')
  }
}

export function setValue (view: DataView, ptr: number, value: number, type: NumberValueType): void
export function setValue (view: DataView, ptr: number, value: bigint, type: BigIntValueType): void
export function setValue (view: DataView, ptr: number, value: number | bigint, type: '*' | 'size', wasm64: boolean): void
export function setValue (view: DataView, ptr: number, value: number | bigint, type: Type, wasm64?: boolean): void {
  switch (type) {
    case 'i8': view.setInt8(ptr, Number(value)); return
    case 'u8': view.setUint8(ptr, Number(value)); return
    case 'i16': view.setInt16(ptr, Number(value), true); return
    case 'u16': view.setUint16(ptr, Number(value), true); return
    case 'i32': view.setInt32(ptr, Number(value), true); return
    case 'u32': view.setUint32(ptr, Number(value), true); return
    case 'f32': view.setFloat32(ptr, Number(value), true); return
    case 'f64': view.setFloat64(ptr, Number(value), true); return
    case 'i64': view.setBigInt64(ptr, BigInt(value), true); return
    case 'u64': view.setBigUint64(ptr, BigInt(value), true); return
    case '*': {
      if (wasm64) {
        view.setBigInt64(ptr, BigInt(value), true)
      } else {
        view.setInt32(ptr, Number(value), true)
      }
      return
    }
    case 'size': {
      if (wasm64) {
        view.setBigUint64(ptr, BigInt(value), true)
      } else {
        view.setUint32(ptr, Number(value), true)
      }
    }
  }
}

const UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined

function UTF8ArrayToString (heapOrArray: Uint8Array, idx: number, maxBytesToRead: number): string {
  const endIdx = idx + maxBytesToRead
  let endPtr = idx
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
  }
  let str = ''
  while (idx < endPtr) {
    let u0 = heapOrArray[idx++]
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0)
      continue
    }
    const u1 = heapOrArray[idx++] & 63
    if ((u0 & 224) === 192) {
      str += String.fromCharCode((u0 & 31) << 6 | u1)
      continue
    }
    const u2 = heapOrArray[idx++] & 63
    if ((u0 & 240) === 224) {
      u0 = (u0 & 15) << 12 | u1 << 6 | u2
    } else {
      u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0)
    } else {
      const ch = u0 - 65536
      str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
    }
  }
  return str
}

export function UTF8ToString (heap: Uint8Array, ptr: number, maxBytesToRead: number): string {
  return ptr ? UTF8ArrayToString(heap, ptr, maxBytesToRead) : ''
}

export function stringToUTF8Array (str: string, heap: Uint8Array, outIdx: number, maxBytesToWrite: number): number {
  if (!(maxBytesToWrite > 0)) return 0
  const startIdx = outIdx
  const endIdx = outIdx + maxBytesToWrite - 1
  for (let i = 0; i < str.length; ++i) {
    let u = str.charCodeAt(i)
    if (u >= 55296 && u <= 57343) {
      const u1 = str.charCodeAt(++i)
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break
      heap[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break
      heap[outIdx++] = 192 | u >> 6
      heap[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break
      heap[outIdx++] = 224 | u >> 12
      heap[outIdx++] = 128 | u >> 6 & 63
      heap[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break
      heap[outIdx++] = 240 | u >> 18
      heap[outIdx++] = 128 | u >> 12 & 63
      heap[outIdx++] = 128 | u >> 6 & 63
      heap[outIdx++] = 128 | u & 63
    }
  }
  heap[outIdx] = 0
  return outIdx - startIdx
}

export function lengthBytesUTF8 (str: string): number {
  let len = 0
  for (let i = 0; i < str.length; ++i) {
    const c = str.charCodeAt(i)
    if (c <= 127) {
      len++
    } else if (c <= 2047) {
      len += 2
    } else if (c >= 55296 && c <= 57343) {
      len += 4
      ++i
    } else {
      len += 3
    }
  }
  return len
}

export function stringToUTF16Array (str: string, view: DataView, outPtr: number, maxBytesToWrite: number): number {
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 2147483647
  }
  if (maxBytesToWrite < 2) return 0
  maxBytesToWrite -= 2
  const startPtr = outPtr
  const numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length
  for (let i = 0; i < numCharsToWrite; ++i) {
    const codeUnit = str.charCodeAt(i)
    view.setUint16(outPtr, codeUnit, true)
    outPtr += 2
  }
  view.setUint16(outPtr, 0, true)
  return outPtr - startPtr
}
