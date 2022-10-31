include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(promise ${SRC_LIST})

test(promise)
