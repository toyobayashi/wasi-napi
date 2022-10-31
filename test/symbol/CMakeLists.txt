include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable("symbol" ${SRC_LIST})

test("symbol")
