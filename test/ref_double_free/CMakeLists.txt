include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(ref_double_free ${SRC_LIST})

test(ref_double_free)
