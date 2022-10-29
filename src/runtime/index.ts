export { EnvStore } from './EnvStore'
export { ScopeStore } from './ScopeStore'
export { RefStore } from './RefStore'
export { DeferredStore } from './DeferredStore'
export { CallbackInfoStore } from './CallbackInfoStore'
export { HandleStore, Handle, ExternalHandle } from './Handle'

export {
  supportReflect,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  TypedArray,
  TryCatch
} from './util'

export {
  EmnapiError,
  NotSupportWeakRefError,
  NotSupportBigIntError
} from './errors'

export {
  Store,
  IStoreValue
} from './Store'

export {
  HandleScope,
  EscapableHandleScope,
  IHandleScope
} from './HandleScope'

export {
  Env,
  ILastError
} from './env'

export {
  RefTracker
} from './RefTracker'

export {
  Finalizer,
  EnvReferenceMode
} from './Finalizer'

export {
  RefBase
} from './RefBase'

export {
  Reference
} from './Reference'

export {
  Deferred,
  IDeferrdValue
} from './Deferred'

export {
  CallbackInfo
} from './CallbackInfo'

export { Context } from './Context'

// declare const __VERSION__: string

// Object.defineProperty(exports, 'version', {
//   configurable: true,
//   enumerable: true,
//   writable: false,
//   value: __VERSION__
// })
