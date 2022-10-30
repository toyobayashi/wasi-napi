cmake_minimum_required(VERSION 3.13.0)

project(wapitest)

add_subdirectory("${CMAKE_SOURCE_DIR}/.." "wapi")
add_library(common STATIC "common.c")
target_link_libraries(common wapi)

add_subdirectory("arg")
add_subdirectory("array")
add_subdirectory("bigint")
add_subdirectory("callback")
add_subdirectory("constructor")
add_subdirectory("conversion")
add_subdirectory("dataview")
add_subdirectory("date")
add_subdirectory("env")
