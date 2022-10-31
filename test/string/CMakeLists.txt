include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable("string" ${SRC_LIST})

test("string")
