include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(scope ${SRC_LIST})

test(scope)
