include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(fnfac ${SRC_LIST})

test(fnfac)
