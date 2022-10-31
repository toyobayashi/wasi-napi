include(../test.cmake)

set(SRC_LIST
  "binding.c"
)

add_executable("version" ${SRC_LIST})

test("version")
