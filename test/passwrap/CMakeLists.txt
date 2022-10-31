include(../test.cmake)

set(SRC_LIST
  "binding.cc"
  "myobject.cc"
  "../entry_point.c"
)

add_executable(passwrap ${SRC_LIST})

test(passwrap)
