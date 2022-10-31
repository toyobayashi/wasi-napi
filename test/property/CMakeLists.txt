include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(property ${SRC_LIST})

test(property)
