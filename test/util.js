const { WASI } = require('wasi')
const { readFileSync } = require('fs')
const { join } = require('path')
const { createContext, NAPI } = require('../dist/wasi-napi.js')

const ctx = createContext()

function getEntry (targetName) {
  return join(__dirname, `./${targetName}/${targetName}.wasm`)
}

exports.getEntry = getEntry

async function loadPath (request) {
  const wasi = new WASI({})
  const api = new NAPI(ctx)
  const { instance } = await WebAssembly.instantiate(readFileSync(request), {
    napi: api.imports,
    wasi_snapshot_preview1: wasi.wasiImport
  })
  wasi.initialize(instance)
  api.register(instance)
  return api.exports
}

exports.loadPath = loadPath

exports.load = function (targetName) {
  const request = getEntry(targetName)
  return loadPath(request)
}
