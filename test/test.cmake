function(test TARGET)
  set_target_properties(${TARGET} PROPERTIES SUFFIX ".wasm")
  set_target_properties(${TARGET} PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")
  target_include_directories(${TARGET} PRIVATE "${CMAKE_SOURCE_DIR}/../include")
  add_subdirectory("${CMAKE_SOURCE_DIR}/.." "wapi")
  target_link_libraries(${TARGET} PUBLIC wapi)

  target_link_options(${TARGET} PRIVATE
    # "-v"
    "-mexec-model=reactor"
    "-Wl,--initial-memory=16777216,--export-dynamic,--import-undefined,--export=malloc,--export=free,--export-table"
  )

  if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_link_options(${TARGET} PRIVATE
      "-Wl,--strip-debug"
    )
  endif()
endfunction(test)
