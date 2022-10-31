function(test TARGET)
  set_target_properties(${TARGET} PROPERTIES SUFFIX ".wasm")
  set_target_properties(${TARGET} PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}")
  target_link_libraries(${TARGET} PUBLIC common)

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
