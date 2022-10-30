include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(constructor ${SRC_LIST})

test(constructor)
