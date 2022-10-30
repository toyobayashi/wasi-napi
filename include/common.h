#ifndef WAPI_INCLUDE_COMMON_H_
#define WAPI_INCLUDE_COMMON_H_

#define NAPI_EXTERN __attribute__((__import_module__("napi")))
#define NAPI_MODULE_EXPORT __attribute__((visibility("default")))

#ifdef __cplusplus
#define EXTERN_C_START extern "C" {
#define EXTERN_C_END }
#else
#define EXTERN_C_START
#define EXTERN_C_END
#endif

#endif
