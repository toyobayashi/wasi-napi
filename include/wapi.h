#ifndef WAPI_INCLUDE_WAPI_H_
#define WAPI_INCLUDE_WAPI_H_

#include "js_native_api.h"
#include "common.h"

EXTERN_C_START

NAPI_EXTERN int wapi_is_support_weakref();
NAPI_EXTERN int wapi_is_support_bigint();


NAPI_EXTERN
napi_status wapi_create_external_uint8array(napi_env env,
                                            void* external_data,
                                            size_t byte_length,
                                            napi_finalize finalize_cb,
                                            void* finalize_hint,
                                            napi_value* result);

EXTERN_C_END

#endif  // WAPI_H_
