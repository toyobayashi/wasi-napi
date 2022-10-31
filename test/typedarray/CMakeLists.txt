include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable("typedarray" ${SRC_LIST})

test("typedarray")
