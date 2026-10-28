'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8')

function seccion(inicio, siguiente) {
  const i = server.indexOf(inicio)
  const j = server.indexOf(siguiente, i + inicio.length)
  assert.ok(i >= 0 && j > i, 'Rutas requeridas disponibles')
  return server.slice(i, j)
}

test('promedios siempre usan 7 días anteriores y excluyen el día en curso', () => {
  const ruta = seccion("app.get('/api/pipas/promedios'", "app.post('/api/pipas/promedios'")
  assert.match(ruta, /total_ventas_7_dias.*\/\s*7\.0/)
  assert.match(ruta, /DATEADD\(DAY,\s*-7,\s*f\.fecha_corte\)/)
  assert.match(ruta, /i\.fecha\s*<\s*f\.fecha_corte/)
  assert.match(ruta, /SET TRANSACTION ISOLATION LEVEL READ COMMITTED/)
  assert.doesNotMatch(ruta, /NOLOCK/)
  assert.match(ruta, /ROW_NUMBER\(\) OVER/)
  assert.match(ruta, /PARTITION BY CONVERT\(DATE,\s*i\.fecha\)/)
  assert.match(ruta, /WHERE d\.rn = 1/)
})

test('compra automática usa transacción SQL y no pisa compras existentes', () => {
  const ruta = seccion("app.post('/api/pipas/compras'", "app.get('/api/costos/compras'")
  assert.match(ruta, /if \(automatica\) \{/)
  assert.match(ruta, /BEGIN TRANSACTION/)
  assert.match(ruta, /sp_getapplock/)
  assert.match(ruta, /UPDLOCK,\s*HOLDLOCK/)
  assert.match(ruta, /IF NOT EXISTS/)
  assert.match(ruta, /COMMIT TRANSACTION/)
  assert.match(ruta, /res\.status\(409\)/)
  assert.match(ruta, /litrosCompra !== 20000/)
})

test('rechaza litros ilegibles para que no borren una compra', () => {
  const ruta = seccion("app.post('/api/pipas/compras'", "app.get('/api/costos/compras'")
  assert.match(ruta, /const brutoLitros = req\.body\.litros_compra/)
  assert.match(ruta, /if \(!litrosValidos\)/)
  assert.match(ruta, /res\.status\(400\)/)
})

test('Polaris es base independiente de la base remota de inventarios', () => {
  assert.match(server, /const POLARIS_DATABASE = process\.env\.POLARIS_DATABASE \|\| 'Polaris'/)
  const ruta = seccion("app.get('/api/pipas/polaris/estado'", "app.get('/api/estaciones'")
  assert.match(ruta, /estado_lectura/)
  assert.match(ruta, /fecha_tanque_mas_antigua/)
})
