include(../test.cmake)

set(SRC_LIST
  "myobject.cc"
  "../entry_point.c"
)

add_executable(objwrap ${SRC_LIST})

test(objwrap)
