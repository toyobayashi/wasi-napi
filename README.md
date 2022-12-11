# wasi-napi

[Node-API (version 8)](https://nodejs.org/docs/v16.15.0/api/n-api.html) JavaScript implementation for [wasi-sdk](https://github.com/WebAssembly/wasi-sdk), based on Node.js v16.15.0.

Fork from [https://github.com/toyobayashi/emnapi](https://github.com/toyobayashi/emnapi)

Support browser [(see browser WASI polyfill)](https://github.com/toyobayashi/wasm-util) and Node.js

## Quick Start

You will need to install:

- Node.js `>= v14.6.0`
- wasi-sdk

Verify your environment:

```bash
# add wasi sdk path environment variable
export WASI_SDK_PATH=/opt/wasi-sdk

node -v
npm -v
clang -v
wasm-ld -v
```

### NPM Install

```bash
npm install -D @tybys/wasi-napi

# if you would like to run wasm in browser

# npm install -D memfs-browser
# npm install -D @tybys/wasm-util
```

### Using C

Create `hello.c`.

```c
#include <node_api.h>
#include <string.h>

#define NAPI_CALL(env, the_call)                                \
  do {                                                          \
    if ((the_call) != napi_ok) {                                \
      const napi_extended_error_info *error_info;               \
      napi_get_last_error_info((env), &error_info);             \
      bool is_pending;                                          \
      const char* err_message = error_info->error_message;      \
      napi_is_exception_pending((env), &is_pending);            \
      if (!is_pending) {                                        \
        const char* error_message = err_message != NULL ?       \
          err_message :                                         \
          "empty error message";                                \
        napi_throw_error((env), NULL, error_message);           \
      }                                                         \
      return NULL;                                              \
    }                                                           \
  } while (0)

static napi_value js_hello(napi_env env, napi_callback_info info) {
  napi_value world;
  const char* str = "world";
  size_t str_len = strlen(str);
  NAPI_CALL(env, napi_create_string_utf8(env, str, str_len, &world));
  return world;
}

NAPI_MODULE_INIT() {
  napi_value hello;
  NAPI_CALL(env, napi_create_function(env, "hello", NAPI_AUTO_LENGTH,
                                      js_hello, NULL, &hello));
  NAPI_CALL(env, napi_set_named_property(env, exports, "hello", hello));
  return exports;
}
```

The C code is equivalant to the following JavaScript:

```js
module.exports = (function (exports) {
  const hello = function hello () {
    // native code in js_hello
    const world = 'world'
    return world
  }

  exports.hello = hello
  return exports
})(module.exports)
```

Compile and link:

```bash
clang --target=wasm32-wasi \
      -O3 \
      -I./node_modules/@tybys/wasi-napi/include \
      -mexec-model=reactor \
      -Wl,--initial-memory=16777216 \
      -Wl,--export-dynamic \
      -Wl,--import-undefined \
      -Wl,--export=malloc \
      -Wl,--export=free \
      -Wl,--export-table \
      -o hello.wasm \
      ./node_modules/@tybys/wasi-napi/src/wapi.c \
      hello.c
```

Browser:

```html
<script src="./node_modules/memfs-browser/dist/memfs.min.js"></script>
<script src="./node_modules/@tybys/wasm-util/dist/wasm-util.min.js"></script>
<script src="./node_modules/@tybys/emnapi-runtime/dist/emnapi.min.js"></script>
<script src="./node_modules/@tybys/wasi-napi/dist/wasi-napi.min.js"></script>
<script>
  // Create global context so that we can use it across multiple wasm instance
  // wasiNapi.createContext === emnapi.createContext
  window.wasiNapiContext = wasiNapi.createContext()
</script>

<script type="module">

const vol = memfs.Volume.fromJSON({
  '/home/wasi': null
})
const fs = memfs.createFsFromVolume(vol)
const wasi = new wasmUtil.WASI({
  args: [],
  env: {},
  preopens: {
    '/': '/'
  },
  filesystem: {
    type: 'memfs',
    fs: fs
  }
})
const binding = new wasiNapi.NAPI(wasiNapiContext)

const buffer = await (await fetch('./hello.wasm')).arrayBuffer()
const { instance } = await WebAssembly.instantiate(buffer, {
  wasi_snapshot_preview1: wasi.wasiImport,
  napi: binding.imports
})

wasi.initialize(instance)
binding.register(instance)

const msg = 'hello ' + binding.exports.hello()
window.alert(msg)
</script>
```

If you are using `Visual Studio Code` and have `Live Server` extension installed, you can right click the HTML file in Visual Studio Code source tree and click `Open With Live Server`, then you can see the hello world alert!

Node.js: (do not forget `--experimental-wasi-unstable-preview1` CLI flag)

```js
const fs = require('fs')
const { WASI } = require('wasi')
const { createContext, NAPI } = require('@tybys/wasi-napi')
// createContext === require('@tybys/emnapi-runtime').createContext

global.wasiNapiContext = createContext()

const wasi = new WASI({
  args: process.argv,
  env: process.env
})
const binding = new NAPI(wasiNapiContext)

const buffer = fs.readFileSync('./hello.wasm')

// Node.js can load wasm synchronously
const wasmModule = new WebAssembly.Module(buffer)
const instance = new WebAssembly.Instance(wasmModule, {
  wasi_snapshot_preview1: wasi.wasiImport,
  napi: binding.imports
})

wasi.initialize(instance)
binding.register(instance)

const msg = 'hello ' + binding.exports.hello()
console.log(msg)
```

### Using C++

Alternatively, you can also use [`node-addon-api`](https://github.com/nodejs/node-addon-api) which is official Node-API C++ wrapper, already shipped (v5.0.0) in this package but without Node.js specific API such as `AsyncContext`, `Function::MakeCallback`, etc.

**Note: C++ wrapper can only be used to target Node.js v14.6.0+ and modern browsers those support `FinalizationRegistry` and `WeakRef` ([v8 engine v8.4+](https://v8.dev/blog/v8-release-84))!**

Create `hello.cpp`.

```cpp
#include <napi.h>

Napi::String Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "world");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "hello"),
              Napi::Function::New(env, Method)).Check();
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
```

wasi-sdk does not support C++ exception, so predefine `-DNAPI_DISABLE_CPP_EXCEPTIONS` and `-DNODE_ADDON_API_ENABLE_MAYBE` here.

```bash
clang++ --target=wasm32-wasi \
        -O3 \
        -I./node_modules/@tybys/wasi-napi/include \
        -DNAPI_DISABLE_CPP_EXCEPTIONS \
        -DNODE_ADDON_API_ENABLE_MAYBE \
        -mexec-model=reactor \
        -Wl,--initial-memory=16777216 \
        -Wl,--export-dynamic \
        -Wl,--import-undefined \
        -Wl,--export=malloc \
        -Wl,--export=free \
        -Wl,--export-table \
        -o hello.wasm \
        ./node_modules/@tybys/wasi-napi/src/wapi.c \
        hello.cpp
```

### Using CMake

You will need to install:

- CMake `>= 3.13`
- make

There are several choices to get `make` for Windows user

- Install [mingw-w64](https://www.mingw-w64.org/downloads/), then use `mingw32-make`
- Download [MSVC prebuilt binary of GNU make](https://github.com/toyobayashi/make-win-build/releases), add to `%Path%` then rename it to `mingw32-make`
- Install [Visual Studio 2022](https://visualstudio.microsoft.com/) C++ desktop workload, use `nmake` in `Visual Studio Developer Command Prompt`
- Install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), use `nmake` in `Visual Studio Developer Command Prompt`

Verify your environment:

```bash
cmake --version
make -v

# Windows cmd
# mingw32-make -v

# Visual Studio Developer Command Prompt
# nmake /?
```

Create `CMakeLists.txt`.

```cmake
cmake_minimum_required(VERSION 3.13)

project(wasinapiexample)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/wasi-napi")

add_executable(hello hello.c)
# or add_executable(hello hello.cpp)
set_target_properties(hello PROPERTIES SUFFIX ".wasm")
target_link_libraries(hello wasinapi)
target_link_options(hello PRIVATE
  "-mexec-model=reactor"
  "-Wl,--initial-memory=16777216,--export-dynamic,--import-undefined,--export=malloc,--export=free,--export-table"
)
```

Building, output `build/hello.js` and `build/hello.wasm`.

```bash
mkdir build
cmake -DCMAKE_TOOLCHAIN_FILE=$WASI_SDK_PATH/share/cmake/wasi-sdk.cmake \
      -DWASI_SDK_PREFIX=$WASI_SDK_PATH \
      -DCMAKE_BUILD_TYPE=Release -H. -Bbuild

cmake --build build
```

Windows:

```bat
@echo off

set WASI_SDK_PATH=%WASI_SDK_PATH:\=/%
mkdir build
cmake -DCMAKE_TOOLCHAIN_FILE=%WASI_SDK_PATH%/share/cmake/wasi-sdk.cmake^
      -DWASI_SDK_PREFIX=%WASI_SDK_PATH%^
      -DCMAKE_BUILD_TYPE=Release^
      -H. -Bbuild -G "MinGW Makefiles"

cmake --build build
```

If you have not installed `make` or `mingw32-make` on Windows, execute the following commands in `Visual Studio Developer Command Prompt`.

```bat
@echo off

set WASI_SDK_PATH=%WASI_SDK_PATH:\=/%
mkdir build
cmake -DCMAKE_TOOLCHAIN_FILE=%WASI_SDK_PATH%/share/cmake/wasi-sdk.cmake^
      -DWASI_SDK_PREFIX=%WASI_SDK_PATH%^
      -DCMAKE_MAKE_PROGRAM=nmake^
      -DCMAKE_BUILD_TYPE=Release^
      -H. -Bbuild -G "MinGW Makefiles"

cmake --build build
```

## Building

```bash
git clone https://github.com/toyobayashi/wasi-napi.git
cd ./wasi-napi
npm install
npm run build # output ./packages/*/dist

# test
cd ./test
chmod +x ./build.sh
./build.sh
npm test
cd ..
```
