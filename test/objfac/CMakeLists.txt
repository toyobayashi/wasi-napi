include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(objfac ${SRC_LIST})

test(objfac)
