const { WASI } = require('wasi')
const { readFileSync } = require('fs')
const { join } = require('path')
const { Context, NodeAPI } = require('../dist/wasm-node-api.js')

function getEntry (targetName) {
  return join(__dirname, `./${targetName}/${targetName}.wasm`)
}

exports.getEntry = getEntry

async function loadPath (request) {
  const wasi = new WASI({})
  const ctx = new Context()
  const api = new NodeAPI(ctx)
  const { instance } = await WebAssembly.instantiate(readFileSync(request), {
    napi: api.imports,
    wasi_snapshot_preview1: wasi.wasiImport
  })
  wasi.initialize(instance)
  api.register(instance.exports.memory, instance)
  return api.exports
}

exports.loadPath = loadPath

exports.load = function (targetName) {
  const request = getEntry(targetName)
  return loadPath(request)
}
