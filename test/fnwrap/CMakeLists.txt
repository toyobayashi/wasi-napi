include(../test.cmake)

set(SRC_LIST
  "binding.cc"
  "myobject.cc"
  "../entry_point.c"
)

add_executable(fnwrap ${SRC_LIST})

test(fnwrap)
