include(../test.cmake)

set(SRC_LIST
  "binding.c"
  "../entry_point.c"
)

add_executable(newtarget ${SRC_LIST})

test(newtarget)
