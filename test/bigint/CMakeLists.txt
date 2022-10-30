include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(bigint ${SRC_LIST})

test(bigint)
