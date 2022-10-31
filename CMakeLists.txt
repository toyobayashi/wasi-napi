cmake_minimum_required(VERSION 3.13)

project(wasinapi)

option(WAPI_INSTALL_SRC "WAPI_INSTALL_SRC" OFF)

set(WAPI_SRC "${CMAKE_CURRENT_SOURCE_DIR}/src/wapi.c")
set(WAPI_INCLUDE "${CMAKE_CURRENT_SOURCE_DIR}/include")

add_library(wasinapi STATIC ${WAPI_SRC})
target_include_directories(wasinapi PUBLIC ${WAPI_INCLUDE})

install(TARGETS wasinapi DESTINATION "lib/${PROJECT_NAME}")
install(TARGETS wasinapi DESTINATION "lib/${CMAKE_LIBRARY_ARCHITECTURE}")
install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/include/common.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/wapi.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/js_native_api_types.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/js_native_api.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/napi-inl.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/napi.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/node_api_types.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/node_api.h
  DESTINATION "include/${PROJECT_NAME}")

if(WAPI_INSTALL_SRC)
  install(FILES
      ${WAPI_SRC}
    DESTINATION "src/${PROJECT_NAME}")
endif()
