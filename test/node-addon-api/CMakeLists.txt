include(../test.cmake)

set(SRC_LIST
  "addon.cc"
  "binding.cc"
  "error.cc"
)

add_compile_definitions("NAPI_VERSION=8")

# add_executable(naa_binding ${SRC_LIST})
# test(naa_binding)

add_executable(naa_binding_noexcept ${SRC_LIST})
target_compile_definitions(naa_binding_noexcept PUBLIC "NAPI_DISABLE_CPP_EXCEPTIONS")
test(naa_binding_noexcept)

add_executable(naa_binding_noexcept_maybe ${SRC_LIST})
target_compile_definitions(naa_binding_noexcept_maybe PUBLIC "NAPI_DISABLE_CPP_EXCEPTIONS" "NODE_ADDON_API_ENABLE_MAYBE")
test(naa_binding_noexcept_maybe)

add_executable(naa_binding_custom_namespace ${SRC_LIST})
target_compile_definitions(naa_binding_custom_namespace PUBLIC "NAPI_DISABLE_CPP_EXCEPTIONS" "NAPI_CPP_CUSTOM_NAMESPACE=cstm")
test(naa_binding_custom_namespace)
