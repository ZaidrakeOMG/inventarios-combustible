'use strict'

// Pruebas sin SQL Server ni navegador; ejecutan el motor REAL public/pipas.js.
// Ejecutar: npm test
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const fuente = fs.readFileSync(path.join(__dirname, '..', 'public', 'pipas.js'), 'utf8')
const fechaFija = fuente.replace(
  /function fechaHoyISO\(\) \{[\s\S]*?\n\}/,
  "function fechaHoyISO() { return '2026-10-28' }"
)
assert.notEqual(fechaFija, fuente, 'No se encontró la fecha para prueba determinista')

function motor({
  estacionId = 1, producto = 'MAGNA', tanque = 25672, capacidad = 121938,
  venta = 5716, fechaTanque = '2026-10-28 15:19:00',
  estado = 'vigente', compras = [], diasConDato = 7
} = {}) {
  const document = { readyState: 'loading', addEventListener() {} }
  const localStorage = { getItem() { return null }, setItem() {} }
  const crear = new Function('document', 'window', 'localStorage',
    fechaFija + '\nreturn { estaciones, state, propuestaPipaAutomatica, ' +
    'proyeccionDesdePolaris, numeroSql, estacionDetectadaAutomatica, saldoProyectado }')
  const app = crear(document, {}, localStorage)
  const estacion = app.estaciones.find(x => x.id_estacion === estacionId)
  const item = estacion.productos.find(x => x.nombre === producto)
  assert.ok(item, 'Producto de prueba encontrado')
  app.state.polarisEstaciones = [{
    server: '10.20.20.65', no_es: 6953,
    nombre_estacion: estacion.nombre + ', S.A. DE C.V.',
    productos: [{
      nombre_producto: producto, tanque_actual: tanque, capacidad_tanque: capacidad,
      fecha_tanque: fechaTanque, estado_lectura: estado
    }]
  }]
  app.state.promedios = [{
    id_estacion: estacionId, id_producto: item.id_producto,
    promedio_venta: venta, total_ventas_7_dias: venta * 7, dias_con_dato: diasConDato
  }]
  app.state.compras = compras.map(c => ({
    id_estacion: estacionId, id_producto: item.id_producto,
    litros_compra: c.litros || 20000,
    fecha_compra: c.fecha,
    observaciones: c.observaciones || 'Automática'
  }))
  return { ...app, estacion, item }
}

test('conserva los decimales reales de SQL', () => {
  const m = motor()
  assert.equal(m.numeroSql(731.286), 731.286)
  assert.equal(m.numeroSql('731.286'), 731.286)
  assert.equal(m.numeroSql('1,234.500'), 1234.5)
})

test('reconoce los nombres Polaris sin confundir ARY I con II', () => {
  const m = motor()
  const ii = m.estacionDetectadaAutomatica({
    nombre_estacion: 'ARY SUPER SERVICIOS II, S.A. DE C.V.'
  })
  assert.equal(ii.id_estacion, 2)
  assert.equal(m.estacionDetectadaAutomatica({
    nombre_estacion: 'ARY SUPER SERVICIOS VIII, S.A. DE C.V.'
  }), null)
})

test('el cierre de hoy sólo descuenta ventas posteriores al sensor', () => {
  const m = motor()
  const p = m.proyeccionDesdePolaris(m.estacion, m.item, '2026-10-28')
  const restante = (1440 - (15 * 60 + 19)) / 1440
  assert.ok(Math.abs(p.saldo - (25672 - 5716 * restante)) < 0.01)
  assert.ok(Math.abs(m.saldoProyectado(m.estacion, m.item, '2026-10-28') - p.saldo) < 0.01)
})

test('una compra anterior no vuelve a sumarse al tanque físico', () => {
  const m = motor({ compras: [{ fecha: '2026-10-27' }] })
  const real = m.proyeccionDesdePolaris(m.estacion, m.item, '2026-10-28')
  assert.ok(real.saldo < 25672 && real.saldo > 20000)
})

test('ARY I MAGNA cruza el reorden y propone una sola fecha', () => {
  const m = motor()
  const plan = m.propuestaPipaAutomatica()
  assert.equal(plan.candidatos.length, 1)
  assert.equal(plan.candidatos[0].fecha, '2026-10-28')
  assert.equal(plan.candidatos[0].puntoReorden, 20000)
})

test('detecta pedido tardío y propone uno anterior, sin borrar el existente', () => {
  const m = motor({ compras: [{ fecha: '2026-11-01' }] })
  assert.equal(m.propuestaPipaAutomatica().candidatos[0]?.fecha, '2026-10-28')
  assert.equal(m.state.compras.length, 1)
  assert.equal(m.state.compras[0].fecha_compra, '2026-11-01')
})

test('no duplica una pipa pendiente que cubre el reorden', () => {
  const m = motor({ compras: [{ fecha: '2026-10-28' }] })
  assert.equal(m.propuestaPipaAutomatica().candidatos.length, 0)
})

test('una estación de venta alta recibe UNA próxima propuesta, no 14', () => {
  const m = motor({ estacionId: 7, tanque: 54000, capacidad: 101372, venta: 11580 })
  const plan = m.propuestaPipaAutomatica()
  assert.equal(plan.candidatos.length, 1)
  assert.equal(plan.candidatos[0].fecha, '2026-10-30')
})

test('bloquea autoprogramación sin sensor confiable o espacio para la pipa', () => {
  const sensorViejo = motor({ estado: 'desactualizada' })
  assert.equal(sensorViejo.propuestaPipaAutomatica().candidatos.length, 0)
  const sinEspacio = motor({ tanque: 17000, capacidad: 18000 })
  assert.equal(sinEspacio.propuestaPipaAutomatica().candidatos.length, 0)
})

test('sin al menos 3 días de ventas no inventa un promedio para programar', () => {
  const m = motor({ diasConDato: 2 })
  assert.equal(m.propuestaPipaAutomatica().candidatos.length, 0)
})
