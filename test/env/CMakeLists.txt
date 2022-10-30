include(../test.cmake)

set(SRC_LIST
  "binding.c"
)

add_executable(env ${SRC_LIST})

test(env)
