include(../test.cmake)

set(SRC_LIST
  "test_null.c"
  "test_object.c"
  "../entry_point.c"
)

add_executable(object ${SRC_LIST})

test(object)
