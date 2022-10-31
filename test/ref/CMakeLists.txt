include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(ref ${SRC_LIST})

test(ref)
