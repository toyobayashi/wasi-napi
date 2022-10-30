include(../test.cmake)

set(SRC_LIST
  "test_conversions.c"
  "test_null.c"
  "../entry_point.c"
)

add_executable(conversion ${SRC_LIST})

test(conversion)
