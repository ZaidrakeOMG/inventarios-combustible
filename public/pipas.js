const LOGO_SRC = '/imagenes/Ary%20Logo%20A%20%281%29.png'
const DIAS_BUSQUEDA_INVENTARIO_FICTICIO = 30
const ROBOT_EXPORT_STORAGE_KEY = 'pipas_export_robot_oculto'
const COLOR_EXPORT_LILA = '#e8e2ee'
const COLOR_EXPORT_LILA_SUAVE = '#f8f7fb'
const COLOR_EXPORT_BLANCO = '#ffffff'
const COLOR_EXPORT_GRIS = '#d9d9d9'
const POLARIS_LIVE_REFRESH_MS = 15000

const estaciones = [
  {
    id_estacion: 1,
    nombre: 'ARY SUPER SERVICIOS I',
    clase: 'ary-1',
    aliases: ['ARY SUPER SERVICIOS I', 'ARY SUPERSERVICIOS I', 'ARY I'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 121938, punto_reorden: 20000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 81285, punto_reorden: 11000 },
      { id_producto: 3, nombre: 'DIESEL', capacidad_tanque: 57901, punto_reorden: 10000 }
    ]
  },
  {
    id_estacion: 2,
    nombre: 'ARY SUPER SERVICIOS II',
    clase: 'ary-2',
    aliases: ['ARY SUPER SERVICIOS II', 'ARY SUPERSERVICIOS II', 'ARY II'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 61554, punto_reorden: 20000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 61423, punto_reorden: 11000 },
      { id_producto: 3, nombre: 'DIESEL', capacidad_tanque: 60891, punto_reorden: 10000 }
    ]
  },
  {
    id_estacion: 3,
    nombre: 'ARY SUPER SERVICIOS III',
    clase: 'ary-3',
    aliases: ['ARY SUPER SERVICIOS III', 'ARY SUPERSERVICIOS III', 'ARY III'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 60726, punto_reorden: 13000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 50035, punto_reorden: 10000 }
    ]
  },
  {
    id_estacion: 4,
    nombre: 'ARY SUPER SERVICIOS IV',
    clase: 'ary-4',
    aliases: ['ARY SUPER SERVICIOS IV', 'ARY SUPERSERVICIOS IV', 'ARY IV'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 100040, punto_reorden: 20000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 81071, punto_reorden: 11000 },
      { id_producto: 3, nombre: 'DIESEL', capacidad_tanque: 120455, punto_reorden: 10000 }
    ]
  },
  {
    id_estacion: 5,
    nombre: 'ARY SUPER EXPRESS V',
    clase: 'ary-5',
    aliases: ['ARY SUPER EXPRESS V', 'ARY SUPEREXPRESS V', 'ARY SUPER SERVICIOS V', 'ARY SUPERSERVICIOS V', 'ARY V'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 61551, punto_reorden: 20000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 41067, punto_reorden: 11000 }
    ]
  },
  {
    id_estacion: 6,
    nombre: 'ARY SUPER SERVICIOS VI',
    clase: 'ary-6',
    aliases: ['ARY SUPER SERVICIOS VI', 'ARY SUPERSERVICIOS VI', 'ARY VI'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 80000, punto_reorden: 25000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 40000, punto_reorden: 11000 },
      { id_producto: 3, nombre: 'DIESEL', capacidad_tanque: 100000, punto_reorden: 20000 }
    ]
  },
  {
    id_estacion: 7,
    nombre: 'SERVICIO APACHE',
    clase: 'apache',
    aliases: ['SERVICIO APACHE', 'SERVICIOS APACHE', 'APACHE'],
    productos: [
      { id_producto: 1, nombre: 'MAGNA', capacidad_tanque: 101372, punto_reorden: 25000 },
      { id_producto: 2, nombre: 'PREMIUM', capacidad_tanque: 60922, punto_reorden: 15000 },
      { id_producto: 3, nombre: 'DIESEL', capacidad_tanque: 101482, punto_reorden: 20000 }
    ]
  }
]

const state = {
  fechaBase: '',
  fechaInicio: '',
  fechaFin: '',
  inventarios: [],
  inventariosRango: [],
  promedios: [],
  compras: [],
  cargando: false,
  historialSemanas: [],
  polarisEstaciones: [],
  polarisErrores: [],
  polarisActualizando: false,
  imagenCompras: {
    inicio: '',
    fin: '',
    compras: [],
    buscado: false
  }
}

let polarisLiveTimer = null

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))

function fechaHoyISO() {
  const fecha = new Date()
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function fechaLocal(fechaISO) {
  const [a, m, d] = String(fechaISO).split('-').map(Number)
  return new Date(a, m - 1, d)
}

function fechaMasDiasISO(fechaISO, dias) {
  const fecha = fechaLocal(fechaISO)
  fecha.setDate(fecha.getDate() + dias)
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function diffDias(inicio, fin) {
  const a = fechaLocal(inicio)
  const b = fechaLocal(fin)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function proximoLunes(fechaISO) {
  const fecha = fechaLocal(fechaISO)
  const diaSemanaNumero = fecha.getDay()
  const faltan = diaSemanaNumero === 1 ? 7 : (8 - diaSemanaNumero) % 7
  fecha.setDate(fecha.getDate() + faltan)
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function aplicarSiguienteSemana() {
  state.fechaInicio = state.fechaBase
  state.fechaFin = proximoLunes(state.fechaInicio)
}

function moverSemana(dias) {
  const movimiento = Number(dias || 0)

  if (movimiento > 0) {
    // La siguiente semana debe continuar desde el último día mostrado.
    // Ejemplo: si la semana termina en lunes 25 con 30,080,
    // la siguiente arranca martes 26 con 30,080 - promedio de venta.
    const fechaFinActual = state.fechaFin || proximoLunes(state.fechaBase)
    state.historialSemanas.push(state.fechaBase)
    state.fechaBase = fechaMasDiasISO(fechaFinActual, 1)
  } else if (movimiento < 0) {
    // Si venimos de Semana siguiente, regresamos exactamente al inicio anterior.
    // Si no hay historial, usamos una semana calendario hacia atrás como respaldo.
    state.fechaBase = state.historialSemanas.pop() || fechaMasDiasISO(state.fechaBase, -7)
  }

  aplicarSiguienteSemana()
  const fechaBaseInput = $('#fechaBase')
  if (fechaBaseInput) fechaBaseInput.value = state.fechaBase
}

function rangoFechas(inicio, fin) {
  const total = diffDias(inicio, fin)
  if (total < 0) return []
  return Array.from({ length: Math.min(total + 1, 45) }, (_, i) => fechaMasDiasISO(inicio, i))
}

function fechaBonita(fechaISO) {
  if (!fechaISO) return ''
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  const partes = String(fechaISO).split('-')
  if (partes.length !== 3) return fechaISO
  return `${Number(partes[2])}/${meses[Number(partes[1]) - 1]}/${partes[0]}`
}

function diaSemana(fechaISO) {
  if (!fechaISO) return ''
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[fechaLocal(fechaISO).getDay()]
}

function diaCorto(fechaISO) {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return dias[fechaLocal(fechaISO).getDay()]
}

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

function productoKey(nombre) {
  const valor = normalizarTexto(nombre)
  if (valor.includes('MAGNA')) return 'MAGNA'
  if (valor.includes('PREMIUM')) return 'PREMIUM'
  if (valor.includes('DIESEL') || valor.includes('DIESELE') || valor.includes('DISEL')) return 'DIESEL'
  return valor
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0

  let limpio = String(value).trim().replace(/\s+/g, '')
  if (!limpio) return 0

  limpio = limpio.replace(/[^0-9.,-]/g, '')

  const negativo = limpio.startsWith('-')
  limpio = limpio.replace(/-/g, '')

  const tieneComa = limpio.includes(',')
  const tienePunto = limpio.includes('.')

  if (tieneComa && tienePunto) {
    const ultimoPunto = limpio.lastIndexOf('.')
    const ultimaComa = limpio.lastIndexOf(',')

    if (ultimoPunto > ultimaComa) {
      limpio = limpio.replace(/,/g, '')
    } else {
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    }
  } else if (tieneComa && !tienePunto) {
    if (/^\d{1,3}(,\d{3})+$/.test(limpio)) {
      limpio = limpio.replace(/,/g, '')
    } else {
      limpio = limpio.replace(',', '.')
    }
  } else if (tienePunto && !tieneComa) {
    if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
      limpio = limpio.replace(/\./g, '')
    }
  }

  if (negativo) limpio = `-${limpio}`

  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}

function formatoNumero(n, decimales = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: true
  }).format(numberValue(n))
}

function litros(n) {
  return formatoNumero(Math.round(numberValue(n)), 0)
}

function valorCero(valor) {
  return numberValue(valor) === 0
}

function fondajePorcentajeValor(fondaje) {
  return numberValue(fondaje) * 0.05
}

function capacidadTanqueValor(producto) {
  // La capacidad del tanque también es un dato de Polaris. Si el servidor
  // está desconectado, conservar la capacidad configurada para esa estación.
  const estacion = estaciones.find(item => item.productos.includes(producto))
  const capacidadPolaris = estacion ? capacidadTanquePolaris(estacion, producto) : null
  return capacidadPolaris !== null && capacidadPolaris > 0
    ? capacidadPolaris
    : numberValue(producto.capacidad_tanque ?? producto.fondaje)
}

function fondajeValor(producto) {
  return capacidadTanqueValor(producto) * 0.05
}

function capacidadMaximaValor(producto) {
  return capacidadTanqueValor(producto) - fondajeValor(producto)
}

function obtenerToast() {
  let toast = $('#toast')

  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast'
    document.body.appendChild(toast)
  }

  return toast
}

function notify(message) {
  const toast = obtenerToast()
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2600)
}

function estacionCoincide(row, estacion) {
  const nombre = normalizarTexto(row.nombre_estacion || row.estacion || row.estacion_nombre || '')
  if (!nombre) return false

  return estacion.aliases.some(alias => {
    const aliasNormalizado = normalizarTexto(alias)
    return nombre === aliasNormalizado ||
      nombre.startsWith(aliasNormalizado) ||
      aliasNormalizado.startsWith(nombre)
  })
}

function buscarEstacionPolaris(estacion) {
  return state.polarisEstaciones.find(row => estacionCoincide(row, estacion)) || null
}

function buscarProductoPolaris(estacion, producto) {
  const estacionPolaris = buscarEstacionPolaris(estacion)
  if (!estacionPolaris || !Array.isArray(estacionPolaris.productos)) return null

  const clave = productoKey(producto.nombre)

  return estacionPolaris.productos.find(row => {
    return productoKey(row.nombre_producto || row.Producto || row.producto || '') === clave
  }) || null
}

function valorPolaris(row, campo) {
  if (!row || row[campo] === null || row[campo] === undefined || row[campo] === '') return null
  const numero = Number(row[campo])
  return Number.isFinite(numero) ? numero : null
}

function tanqueActualPolaris(estacion, producto) {
  return valorPolaris(buscarProductoPolaris(estacion, producto), 'tanque_actual')
}

function capacidadTanquePolaris(estacion, producto) {
  return valorPolaris(buscarProductoPolaris(estacion, producto), 'capacidad_tanque')
}

function porcentajeTanquePolaris(estacion, producto) {
  const actual = tanqueActualPolaris(estacion, producto)
  const capacidadPolaris = capacidadTanquePolaris(estacion, producto)
  const capacidad = capacidadPolaris !== null && capacidadPolaris > 0
    ? capacidadPolaris
    : capacidadTanqueValor(producto)

  if (actual === null || capacidad <= 0) return null
  return Math.max(0, Math.min(100, (actual / capacidad) * 100))
}

function fechaHoraBrevePolaris(valor) {
  const texto = String(valor || '')
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!match) return ''

  return `${match[3]}/${match[2]} ${match[4]}:${match[5]}`
}

function textoTanquePolaris(estacion, producto) {
  const actual = tanqueActualPolaris(estacion, producto)
  if (actual === null) return 'Sin lectura'

  const porcentaje = porcentajeTanquePolaris(estacion, producto)
  return porcentaje === null
    ? `${litros(actual)} L`
    : `${litros(actual)} L · ${Math.round(porcentaje)}%`
}

function tituloTanquePolaris(estacion, producto) {
  const row = buscarProductoPolaris(estacion, producto)
  if (!row) return 'Sin lectura disponible de Polaris'

  const fecha = fechaHoraBrevePolaris(row.fecha_tanque)
  const estacionPolaris = buscarEstacionPolaris(estacion)
  const servidor = estacionPolaris ? estacionPolaris.server : ''

  return [
    'Lectura actual del tanque en Polaris',
    fecha ? `Actualizado: ${fecha}` : '',
    servidor ? `Servidor: ${servidor}` : ''
  ].filter(Boolean).join(' · ')
}

function renderTanquePolaris(estacion, producto) {
  const actual = tanqueActualPolaris(estacion, producto)
  const clase = actual === null ? ' sin-lectura' : ''
  const claveProducto = productoKey(producto.nombre)

  return `
    <span
      class="tanque-live${clase}"
      data-polaris-live-estacion="${estacion.id_estacion}"
      data-polaris-live-producto="${escaparHTML(claveProducto)}"
      title="${escaparHTML(tituloTanquePolaris(estacion, producto))}"
    >${escaparHTML(textoTanquePolaris(estacion, producto))}</span>
  `
}

function fuenteInventarioInicial(estacion, producto) {
  const row = buscarInventario(estacion, producto)
  const capturado = Number(row?.id_inventario) > 0
  const previo = row && numberValue(row.inventario_inicial) > 0
  let texto = 'Sin inventario capturado'
  if (capturado) texto = 'Inventarios Combustibles'
  else if (previo) texto = 'Inventarios Combustibles · Cierre anterior'
  else if (esInventarioFicticio(estacion, producto, state.fechaBase)) texto = 'Proyección desde Inventarios Combustibles'
  return `<div class="polaris-inicial-source">${escaparHTML(texto)}</div>`
}

function idsBase(estacion, producto) {
  return {
    id_estacion: Number(estacion.id_estacion || 0),
    id_producto: Number(producto.id_producto || 0)
  }
}

function buscarInventario(estacion, producto) {
  const ids = idsBase(estacion, producto)
  const porId = state.inventarios.find(row => {
    return Number(row.id_estacion) === ids.id_estacion && Number(row.id_producto) === ids.id_producto
  })

  if (porId) return porId

  const prod = productoKey(producto.nombre)

  return state.inventarios.find(row => {
    const rowProducto = productoKey(row.nombre_producto || row.producto || row.producto_nombre || '')
    return estacionCoincide(row, estacion) && rowProducto === prod
  })
}

function buscarPromedio(estacion, producto) {
  const ids = idsBase(estacion, producto)
  const porId = state.promedios.find(row => {
    return Number(row.id_estacion) === ids.id_estacion && Number(row.id_producto) === ids.id_producto
  })

  if (porId) return porId

  const prod = productoKey(producto.nombre)

  return state.promedios.find(row => {
    const rowProducto = productoKey(row.nombre_producto || row.producto || row.producto_nombre || '')
    return estacionCoincide(row, estacion) && rowProducto === prod
  })
}

function obtenerIds(estacion, producto) {
  const ids = idsBase(estacion, producto)
  const inv = buscarInventario(estacion, producto)
  const prom = buscarPromedio(estacion, producto)

  return {
    id_estacion: Number((inv && inv.id_estacion) || (prom && prom.id_estacion) || ids.id_estacion || 0),
    id_producto: Number((inv && inv.id_producto) || (prom && prom.id_producto) || ids.id_producto || 0)
  }
}

function inventarioInicialRealBase(estacion, producto) {
  const row = buscarInventario(estacion, producto)
  if (!row) return 0
  return numberValue(row.inventario_inicial ?? row.saldo_inicial ?? row.saldoInicial ?? row.inicial ?? row.inventarioInicial)
}

function inventarioInicial(estacion, producto) {
  const inventarioDiaBase = inventarioRealDia(estacion, producto, state.fechaBase)

  if (inventarioDiaBase) return valorInventarioReal(inventarioDiaBase)

  const inventarioRealBase = inventarioInicialRealBase(estacion, producto)
  if (inventarioRealBase > 0) return inventarioRealBase

  return inventarioInicialFicticio(estacion, producto, state.fechaBase)
}

function fechaFilaInventario(row) {
  return String(row.fecha_reporte || row.fecha || row.fecha_inventario || row.fecha_captura || '').slice(0, 10)
}

function filaConInventario(row) {
  // Una fila por CROSS JOIN o con cierre previo no es un inventario capturado.
  return !!row && Number(row.id_inventario) > 0
}

function buscarInventarioEnLista(lista, estacion, producto, fecha) {
  const ids = idsBase(estacion, producto)
  const fechaBuscada = String(fecha || '').slice(0, 10)
  const prod = productoKey(producto.nombre)

  const porId = lista.find(row => {
    return fechaFilaInventario(row) === fechaBuscada && Number(row.id_estacion) === ids.id_estacion && Number(row.id_producto) === ids.id_producto
  })

  if (porId) return porId

  return lista.find(row => {
    const rowProducto = productoKey(row.nombre_producto || row.producto || row.producto_nombre || '')
    return fechaFilaInventario(row) === fechaBuscada && estacionCoincide(row, estacion) && rowProducto === prod
  })
}

function buscarInventarioDia(estacion, producto, fecha) {
  return buscarInventarioEnLista(state.inventariosRango, estacion, producto, fecha)
}

function inventarioRealDia(estacion, producto, fecha) {
  const row = buscarInventarioDia(estacion, producto, fecha)
  return filaConInventario(row) ? row : null
}

function promedioVenta(estacion, producto) {
  const row = buscarPromedio(estacion, producto)
  return row ? numberValue(row.promedio_venta) : 0
}

function fuentePromedio(estacion, producto) {
  const row = buscarPromedio(estacion, producto)
  return row ? String(row.fuente || row.origen || 'PENDIENTE_INICIAL').toUpperCase() : 'PENDIENTE_INICIAL'
}

function claseFuente(estacion, producto) {
  return buscarPromedio(estacion, producto) ? 'calculado' : 'pendiente'
}

function textoFuente(estacion, producto) {
  const row = buscarPromedio(estacion, producto)
  if (!row) return 'Promedio no disponible'
  const dias = Number(row.dias_con_dato || 0)
  if (dias === 0) return 'Sin registros en los 7 días'
  return dias < 7 ? `Automático · 7 días (${dias}/7 registrados)` : 'Automático · 7 días'
}

function claseEstatus(inventario, punto) {
  if (numberValue(inventario) === 0) return 'sin-dato'
  if (numberValue(inventario) <= numberValue(punto)) return 'reorden'
  return 'ok'
}

function textoEstatus(inventario, punto) {
  if (numberValue(inventario) === 0) return 'Sin dato'
  if (numberValue(inventario) <= numberValue(punto)) return 'Reorden'
  return 'Normal'
}

function compraDia(estacion, producto, fecha) {
  const ids = obtenerIds(estacion, producto)

  return state.compras
    .filter(item => String(item.fecha_compra).slice(0, 10) === fecha)
    .filter(item => Number(item.id_estacion) === ids.id_estacion && Number(item.id_producto) === ids.id_producto)
    .reduce((total, item) => total + numberValue(item.litros_compra), 0)
}

function compraCuentaEnSaldo(fechaCompra, fechaSaldo, inventarioDia = null, opciones = {}) {
  const fechaCompraISO = String(fechaCompra || '').slice(0, 10)
  const fechaSaldoISO = String(fechaSaldo || '').slice(0, 10)
  const fechaBase = String(state.fechaBase || '').slice(0, 10)
  const hoy = fechaHoyISO()
  const permitirComprasAnteriores = opciones.permitirComprasAnteriores === true
  const fechaMinCompra = String(opciones.fechaMinCompra || '').slice(0, 10)

  if (!fechaCompraISO || !fechaSaldoISO) return false

  // La compra capturada en una fecha D se suma hasta el día siguiente (D + 1).
  // Ejemplo: compra de hoy -> afecta el inventario/saldo inicial de mañana.
  if (fechaMasDiasISO(fechaCompraISO, 1) !== fechaSaldoISO) return false

  // Para inventario ficticio se permite reconstruir el saldo desde el último
  // inventario real; ahí sí deben contar las compras posteriores a ese real.
  if (fechaMinCompra && fechaCompraISO < fechaMinCompra) return false

  if (!permitirComprasAnteriores) {
    // En la proyección normal no se suman compras anteriores a la fecha
    // seleccionada; esas ya deben venir consideradas en el inventario real.
    if (fechaBase && fechaCompraISO < fechaBase) return false

    // Tampoco se suman compras de días pasados en inventarios reales.
    if (fechaCompraISO < hoy) return false
  }

  // Si existe inventario real para el día donde se aplicaría la compra,
  // no se vuelve a sumar para evitar duplicarla.
  if (inventarioDia) return false

  return true
}

function compraDiaAplicada(estacion, producto, fecha, inventarioDia = null) {
  const fechaSaldo = String(fecha || '').slice(0, 10)
  if (!fechaSaldo) return 0

  const fechaCompra = fechaMasDiasISO(fechaSaldo, -1)
  if (!compraCuentaEnSaldo(fechaCompra, fechaSaldo, inventarioDia)) return 0
  return compraDia(estacion, producto, fechaCompra)
}

function comprasAcumuladas(estacion, producto, fecha) {
  const ids = obtenerIds(estacion, producto)
  const fechaLimite = String(fecha || '').slice(0, 10)

  return state.compras
    .filter(item => Number(item.id_estacion) === ids.id_estacion && Number(item.id_producto) === ids.id_producto)
    .filter(item => {
      const fechaCompra = String(item.fecha_compra).slice(0, 10)
      const fechaAplicacion = fechaMasDiasISO(fechaCompra, 1)
      const inventarioDia = inventarioRealDia(estacion, producto, fechaAplicacion)

      return fechaAplicacion <= fechaLimite && compraCuentaEnSaldo(fechaCompra, fechaAplicacion, inventarioDia)
    })
    .reduce((total, item) => total + numberValue(item.litros_compra), 0)
}

function primerValorPositivo(valores) {
  for (const valor of valores) {
    const numero = numberValue(valor)
    if (numero > 0) return numero
  }
  return null
}

function primerValorNumerico(valores) {
  for (const valor of valores) {
    if (valor === null || valor === undefined || valor === '') continue
    const numero = numberValue(valor)
    if (Number.isFinite(numero)) return numero
  }
  return 0
}

function valoresInicialesInventario(inventarioDia) {
  return [
    inventarioDia.inventario_inicial,
    inventarioDia.saldo_inicial,
    inventarioDia.saldoInicial,
    inventarioDia.inicial,
    inventarioDia.inventarioInicial
  ]
}

function valoresFinalesInventario(inventarioDia) {
  return [
    inventarioDia.inventario_final,
    inventarioDia.saldo_final,
    inventarioDia.saldoFinal,
    inventarioDia.final,
    inventarioDia.inventarioFinal
  ]
}

function valorInventarioReal(inventarioDia) {
  if (!inventarioDia) return 0

  const iniciales = valoresInicialesInventario(inventarioDia)
  const finales = valoresFinalesInventario(inventarioDia)

  // Preferir saldos positivos capturados. Si algún campo viene en 0 como
  // placeholder, no debe pisar un inventario real positivo del mismo registro.
  const positivoInicial = primerValorPositivo(iniciales)
  if (positivoInicial !== null) return positivoInicial

  const positivoFinal = primerValorPositivo(finales)
  if (positivoFinal !== null) return positivoFinal

  const inicialNumerico = primerValorNumerico(iniciales)
  if (inicialNumerico !== 0) return inicialNumerico

  return primerValorNumerico(finales)
}

function valorInventarioCierre(inventarioDia) {
  if (!inventarioDia) return 0

  const iniciales = valoresInicialesInventario(inventarioDia)
  const finales = valoresFinalesInventario(inventarioDia)

  // Para continuar una proyección ficticia se usa el cierre cuando existe.
  // Si el cierre viene en 0 pero el inicial tiene valor, se toma el inicial;
  // así no arranca desde cero y no genera negativos falsos como -12,100.
  const positivoFinal = primerValorPositivo(finales)
  if (positivoFinal !== null) return positivoFinal

  const positivoInicial = primerValorPositivo(iniciales)
  if (positivoInicial !== null) return positivoInicial

  const finalNumerico = primerValorNumerico(finales)
  if (finalNumerico !== 0) return finalNumerico

  return primerValorNumerico(iniciales)
}

function ultimoInventarioRealAntes(estacion, producto, fecha) {
  const fechaLimite = String(fecha || '').slice(0, 10)
  if (!fechaLimite) return null

  return state.inventariosRango
    .filter(row => fechaFilaInventario(row) && fechaFilaInventario(row) < fechaLimite)
    .filter(row => buscarInventarioEnLista([row], estacion, producto, fechaFilaInventario(row)) === row)
    .filter(filaConInventario)
    .sort((a, b) => fechaFilaInventario(b).localeCompare(fechaFilaInventario(a)))[0] || null
}

function compraDiaAplicadaFicticia(estacion, producto, fecha, fechaMinCompra = '') {
  const fechaSaldo = String(fecha || '').slice(0, 10)
  if (!fechaSaldo) return 0

  const inventarioDia = inventarioRealDia(estacion, producto, fechaSaldo)
  const fechaCompra = fechaMasDiasISO(fechaSaldo, -1)

  if (!compraCuentaEnSaldo(fechaCompra, fechaSaldo, inventarioDia, {
    permitirComprasAnteriores: true,
    fechaMinCompra
  })) return 0

  return compraDia(estacion, producto, fechaCompra)
}

function inventarioInicialFicticio(estacion, producto, fecha) {
  const fechaBaseFicticia = String(fecha || '').slice(0, 10)
  const ultimo = ultimoInventarioRealAntes(estacion, producto, fechaBaseFicticia)

  if (!ultimo) return 0

  const fechaUltimo = fechaFilaInventario(ultimo)
  const promedio = promedioVenta(estacion, producto)
  let saldo = valorInventarioCierre(ultimo)

  // Inventario inicial ficticio:
  // reconstruye día por día desde el último inventario real. Con la navegación
  // corregida, Semana siguiente arranca al día siguiente del último día mostrado;
  // así, si el lunes quedó en 30,080, el siguiente inicio queda en
  // 30,080 - promedio de venta, sin saltar días.
  rangoFechas(fechaMasDiasISO(fechaUltimo, 1), fechaBaseFicticia).forEach(fechaActual => {
    const inventarioDia = inventarioRealDia(estacion, producto, fechaActual)

    if (inventarioDia) {
      saldo = valorInventarioReal(inventarioDia)
      return
    }

    saldo = saldo - promedio + compraDiaAplicadaFicticia(estacion, producto, fechaActual, fechaUltimo)
  })

  return saldo
}

function esInventarioFicticio(estacion, producto, fecha) {
  const fechaISO = String(fecha || '').slice(0, 10)
  if (!fechaISO || fechaISO !== state.fechaBase) return false
  if (inventarioRealDia(estacion, producto, fechaISO)) return false
  if (inventarioInicialRealBase(estacion, producto) > 0) return false
  return ultimoInventarioRealAntes(estacion, producto, fechaISO) !== null
}

function saldoProyectado(estacion, producto, fecha) {
  const fechas = rangoFechas(state.fechaBase, fecha)
  const promedio = promedioVenta(estacion, producto)

  if (!fechas.length) return 0

  let saldo = 0

  fechas.forEach((fechaActual, index) => {
    const inventarioDia = inventarioRealDia(estacion, producto, fechaActual)
    const compraAplicada = compraDiaAplicada(estacion, producto, fechaActual, inventarioDia)

    if (index === 0) {
      const base = inventarioDia
        ? valorInventarioReal(inventarioDia)
        : inventarioInicial(estacion, producto)

      saldo = base + compraAplicada
      return
    }

    if (inventarioDia) {
      saldo = valorInventarioReal(inventarioDia)
      return
    }

    saldo = saldo - promedio + compraAplicada
  })

  return saldo
}

function crearMenuLateral() {
  if ($('#menuLateralInventarios')) return

  const css = document.createElement('style')
  css.textContent = `
    :root {
      --ary-menu-w-cerrado: 78px;
      --ary-menu-w-abierto: 310px;
      --ary-menu-borde: #dbe5f0;
      --ary-menu-texto: #0f172a;
      --ary-menu-muted: #64748b;
      --ary-menu-azul: #2563eb;
      --ary-menu-cielo: #0ea5e9;
    }

    body {
      padding-left: var(--ary-menu-w-cerrado);
      transition: padding-left .25s ease;
      overflow-x: hidden;
    }

    body.ary-menu-fijo {
      padding-left: var(--ary-menu-w-abierto);
    }

    .ary-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      width: var(--ary-menu-w-cerrado);
      min-width: var(--ary-menu-w-cerrado);
      height: 100vh;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 52%, #eef6ff 100%);
      color: var(--ary-menu-texto);
      box-shadow: 18px 0 45px rgba(15, 23, 42, .18);
      overflow-x: hidden;
      overflow-y: auto;
      transition: width .25s ease, box-shadow .25s ease;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--ary-menu-borde);
    }

    .ary-sidebar:hover,
    body.ary-menu-fijo .ary-sidebar {
      width: var(--ary-menu-w-abierto);
      min-width: var(--ary-menu-w-abierto);
      box-shadow: 22px 0 55px rgba(15, 23, 42, .20);
    }

    .ary-sidebar-header {
      min-height: 86px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 12px;
      border-bottom: 1px solid var(--ary-menu-borde);
      background: rgba(255, 255, 255, .92);
    }

    .ary-sidebar-logo {
      width: 46px;
      height: 46px;
      border-radius: 16px;
      background: linear-gradient(135deg, #fff7ed, #eff6ff);
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px #dbe5f0, 0 10px 22px rgba(15, 23, 42, .10);
    }

    .ary-sidebar-logo img {
      width: 38px;
      height: 38px;
      object-fit: contain;
    }

    .ary-sidebar-brand {
      width: 150px;
      min-width: 0;
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity .2s ease, transform .2s ease;
      white-space: nowrap;
    }

    .ary-sidebar:hover .ary-sidebar-brand,
    body.ary-menu-fijo .ary-sidebar-brand {
      opacity: 1;
      transform: translateX(0);
    }

    .ary-sidebar-brand strong {
      display: block;
      font-size: 15px;
      letter-spacing: .12em;
      color: #0f172a;
    }

    .ary-sidebar-brand span {
      display: block;
      margin-top: 3px;
      font-size: 12px;
      color: var(--ary-menu-muted);
    }

    .ary-sidebar-pin {
      width: 38px;
      height: 38px;
      border: 1px solid #dbe5f0;
      border-radius: 14px;
      background: #ffffff;
      color: #1e3a8a;
      cursor: pointer;
      margin-left: 0;
      display: grid;
      place-items: center;
      opacity: 0;
      transform: scale(.9);
      transition: opacity .2s ease, transform .2s ease, background .2s ease, color .2s ease;
      flex: 0 0 auto;
      box-shadow: 0 8px 18px rgba(15, 23, 42, .08);
    }

    .ary-sidebar:hover .ary-sidebar-pin,
    body.ary-menu-fijo .ary-sidebar-pin {
      opacity: 1;
      transform: scale(1);
    }

    body.ary-menu-fijo .ary-sidebar-pin {
      background: linear-gradient(135deg, var(--ary-menu-azul), var(--ary-menu-cielo));
      color: #ffffff;
      border-color: transparent;
    }

    .ary-sidebar-nav {
      padding: 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .ary-sidebar-link {
      min-height: 54px;
      border-radius: 18px;
      color: #334155;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 14px;
      position: relative;
      transition: background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease;
      outline: none;
      border: 1px solid transparent;
    }

    .ary-sidebar-link:hover {
      background: #f1f7ff;
      color: #0f172a;
      transform: translateX(2px);
      border-color: #dbeafe;
      box-shadow: 0 10px 22px rgba(15, 23, 42, .07);
    }

    .ary-sidebar-link.active {
      background: linear-gradient(135deg, var(--ary-menu-azul), var(--ary-menu-cielo));
      color: #ffffff;
      box-shadow: 0 14px 30px rgba(37, 99, 235, .30);
      border-color: transparent;
    }

    .ary-sidebar-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      font-size: 20px;
      flex: 0 0 32px;
      border-radius: 12px;
      background: #eef6ff;
      box-shadow: inset 0 0 0 1px #dbeafe;
    }

    .ary-sidebar-text {
      width: 150px;
      min-width: 0;
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity .2s ease, transform .2s ease;
      white-space: nowrap;
      font-weight: 700;
      font-size: 14px;
    }

    .ary-sidebar:hover .ary-sidebar-text,
    body.ary-menu-fijo .ary-sidebar-text {
      opacity: 1;
      transform: translateX(0);
    }

    .ary-sidebar-badge {
      margin-left: auto;
      width: 74px;
      min-width: 74px;
      text-align: center;
      font-size: 10px;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 5px 6px;
      border-radius: 999px;
      opacity: 0;
      transition: opacity .2s ease;
      white-space: nowrap;
    }

    .ary-sidebar:hover .ary-sidebar-badge,
    body.ary-menu-fijo .ary-sidebar-badge {
      opacity: 1;
    }

    .ary-sidebar-footer {
      padding: 14px;
      border-top: 1px solid var(--ary-menu-borde);
      color: var(--ary-menu-muted);
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity .2s ease, transform .2s ease;
      background: rgba(255, 255, 255, .86);
    }

    .ary-sidebar:hover .ary-sidebar-footer,
    body.ary-menu-fijo .ary-sidebar-footer {
      opacity: 1;
      transform: translateX(0);
    }

    .ary-mobile-menu-btn {
      position: fixed;
      left: 14px;
      bottom: 14px;
      z-index: 10000;
      width: 52px;
      height: 52px;
      border: 0;
      border-radius: 18px;
      color: #ffffff;
      background: linear-gradient(135deg, var(--ary-menu-azul), var(--ary-menu-cielo));
      box-shadow: 0 14px 34px rgba(37, 99, 235, .32);
      cursor: pointer;
      display: none;
      place-items: center;
      font-size: 25px;
    }

    @media (max-width: 760px) {
      body,
      body.ary-menu-fijo {
        padding-left: 0;
      }

      .ary-sidebar {
        width: 72px;
        transform: translateX(-100%);
      }

      body.ary-menu-mobile .ary-sidebar {
        transform: translateX(0);
        width: var(--ary-menu-w-abierto);
      }

      .ary-mobile-menu-btn {
        display: grid !important;
      }
    }
  `

  document.head.appendChild(css)

  const menu = document.createElement('aside')
  menu.id = 'menuLateralInventarios'
  menu.className = 'ary-sidebar'
  menu.innerHTML = `
    <div class="ary-sidebar-header">
      <div class="ary-sidebar-logo">
        <img src="${LOGO_SRC}" alt="ARY">
      </div>
      <div class="ary-sidebar-brand">
        <strong>ARY</strong>
        <span>Panel de control</span>
      </div>
      <button class="ary-sidebar-pin" type="button" data-menu-pin aria-label="Fijar menú">📌</button>
    </div>
    <nav class="ary-sidebar-nav" aria-label="Menú principal">
      <a class="ary-sidebar-link" href="/index.html" data-menu-link="index.html">
        <span class="ary-sidebar-icon">⛽</span>
        <span class="ary-sidebar-text">Inventarios</span>
      </a>
      <a class="ary-sidebar-link" href="/pipas.html" data-menu-link="pipas.html">
        <span class="ary-sidebar-icon">🚛</span>
        <span class="ary-sidebar-text">Programación de Pipas</span>
      </a>
      <a class="ary-sidebar-link" href="/Costos.html" data-menu-link="Costos.html">
        <span class="ary-sidebar-icon">💲</span>
        <span class="ary-sidebar-text">Costos Promedio</span>
      </a>
      <a class="ary-sidebar-link" href="/ayuda.html" data-proximo="1">
        <span class="ary-sidebar-icon">❔</span>
        <span class="ary-sidebar-text">Ayuda</span>
      </a>
    </nav>
    <div class="ary-sidebar-footer">Inventarios de Combustible</div>
  `

  const mobile = document.createElement('button')
  mobile.className = 'ary-mobile-menu-btn'
  mobile.type = 'button'
  mobile.textContent = '☰'

  document.body.prepend(menu)
  document.body.appendChild(mobile)

  if (localStorage.getItem('aryMenuFijo') === '1') {
    document.body.classList.add('ary-menu-fijo')
  }

  const ruta = location.pathname.split('/').pop() || 'index.html'

  $$('.ary-sidebar-link', menu).forEach(link => {
    const href = link.getAttribute('href') || ''
    const archivo = href.split('/').pop() || 'index.html'

    if (archivo === ruta || (ruta === '' && archivo === 'index.html')) {
      link.classList.add('active')
    }

    link.addEventListener('click', event => {
      if (!link.dataset.proximo) return
      event.preventDefault()
      notify('Módulo próximamente disponible')
    })
  })

  $('[data-menu-pin]', menu).addEventListener('click', () => {
    document.body.classList.toggle('ary-menu-fijo')
    localStorage.setItem('aryMenuFijo', document.body.classList.contains('ary-menu-fijo') ? '1' : '0')
  })

  mobile.addEventListener('click', () => {
    document.body.classList.toggle('ary-menu-mobile')
  })

  document.addEventListener('click', event => {
    if (!document.body.classList.contains('ary-menu-mobile')) return
    if (event.target.closest('.ary-sidebar') || event.target.closest('.ary-mobile-menu-btn')) return
    document.body.classList.remove('ary-menu-mobile')
  })
}

function inyectarEstilos() {
  if ($('#estilosPipas')) return

  const css = document.createElement('style')
  css.id = 'estilosPipas'
  css.textContent = `
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, Arial, sans-serif;
      background: linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #e8f7ef 100%);
      color: #172033;
      font-weight: 400;
    }

    .pipas-app {
      width: min(1680px, calc(100% - 28px));
      margin: 0 auto;
      padding: 20px 0 34px;
    }

    .pipas-hero {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: center;
      background: rgba(255, 255, 255, .88);
      border: 1px solid rgba(148, 163, 184, .35);
      box-shadow: 0 18px 50px rgba(15, 23, 42, .11);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 18px;
      backdrop-filter: blur(12px);
    }

    .pipas-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .pipas-logo {
      width: 95px;
      height: 70px;
      object-fit: contain;
      display: block;
    }

    .pipas-eyebrow {
      margin: 0 0 8px;
      font-weight: 600;
      letter-spacing: .12em;
      color: #0f766e;
      font-size: 12px;
    }

    .pipas-hero h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1;
      color: #0f172a;
      font-weight: 700;
    }

    .pipas-subtitle {
      margin: 10px 0 0;
      color: #64748b;
      font-weight: 500;
    }

    .pipas-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(120px, 1fr));
      gap: 10px;
      align-items: end;
      min-width: min(680px, 100%);
    }

    .pipas-actions label {
      display: grid;
      gap: 5px;
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: .04em;
    }

    .pipas-actions input,
    .promedio-input,
    .compra-input,
    .pipas-btn {
      font: inherit;
    }

    .pipas-actions input,
    .promedio-input,
    .compra-input {
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 12px;
      padding: 10px 12px;
      outline: none;
      color: #0f172a;
      width: 100%;
      font-weight: 700;
    }

    .pipas-actions input:focus,
    .promedio-input:focus,
    .compra-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
    }

    .pipas-btn {
      border: none;
      border-radius: 12px;
      padding: 11px 15px;
      cursor: pointer;
      background: #0f172a;
      color: #fff;
      box-shadow: 0 12px 22px rgba(15, 23, 42, .18);
      font-weight: 800;
      transition: transform .18s ease, box-shadow .18s ease;
      white-space: nowrap;
    }

    .pipas-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 28px rgba(15, 23, 42, .20);
    }

    .pipas-btn.azul {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
    }

    .pipas-btn.verde {
      background: linear-gradient(135deg, #16a34a, #22c55e);
    }

    .pipas-btn.gris {
      background: linear-gradient(135deg, #64748b, #334155);
    }

    .pipas-resumen {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .pipas-stat {
      background: rgba(255, 255, 255, .92);
      border: 1px solid rgba(148, 163, 184, .35);
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, .08);
    }

    .pipas-stat span {
      display: block;
      font-size: 12px;
      color: #64748b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .pipas-stat strong {
      display: block;
      margin-top: 6px;
      color: #0f172a;
      font-size: 25px;
      font-weight: 900;
    }

    .station-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .station-card {
      background: rgba(255, 255, 255, .94);
      border: 1px solid rgba(148, 163, 184, .35);
      border-radius: 20px;
      box-shadow: 0 16px 45px rgba(15, 23, 42, .10);
      overflow: hidden;
    }

    .station-title {
      padding: 13px 16px;
      background: linear-gradient(135deg, #0f2a0f, #8a5f1e);
      color: #fff;
      font-size: 17px;
      font-weight: 900;
      letter-spacing: .02em;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .station-title small {
      font-size: 11px;
      opacity: .9;
      font-weight: 800;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .station-title.ary-1 {
      background: linear-gradient(135deg, #159644, #22c55e);
    }

    .station-title.ary-2 {
      background: linear-gradient(135deg, #991b1b, #ef4444);
    }

    .station-title.ary-3 {
      background: linear-gradient(135deg, #7e22ce, #c084fc);
    }

    .station-title.ary-4 {
      background: linear-gradient(135deg, #c2410c, #fb923c);
    }

    .station-title.ary-5 {
      background: linear-gradient(135deg, #1d4ed8, #60a5fa);
    }

    .station-title.ary-6 {
      background: linear-gradient(135deg, #ca8a04, #fde047);
      color: #1f2937;
    }

    .station-title.apache {
      background: linear-gradient(135deg, #701a35, #be123c);
    }

    .station-body {
      padding: 14px;
      display: grid;
      gap: 14px;
    }

    .table-title {
      margin: 0 0 9px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 900;
    }

    .projection-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 9px;
      flex-wrap: wrap;
    }

    .projection-header .table-title {
      margin: 0;
      text-align: center;
      flex: 1;
    }

    .week-nav {
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #0f172a, #334155);
      color: #ffffff;
      font-weight: 900;
      padding: 9px 13px;
      cursor: pointer;
      box-shadow: 0 10px 22px rgba(15, 23, 42, .18);
      transition: transform .18s ease, box-shadow .18s ease;
      white-space: nowrap;
    }

    .week-nav:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(15, 23, 42, .22);
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    .param-table {
      min-width: 1040px;
    }

    .projection-table {
      min-width: 1100px;
    }

    th {
      background: #f8fafc;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .04em;
      padding: 10px 7px;
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
      font-weight: 900;
      white-space: nowrap;
    }

    td {
      padding: 9px 7px;
      border-bottom: 1px solid #edf2f7;
      vertical-align: middle;
      color: #0f172a;
      font-size: 13px;
      text-align: center;
      font-weight: 800;
    }

    .producto-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      color: #ffffff;
      min-width: 84px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 900;
      background: linear-gradient(135deg, #64748b, #334155);
    }

    .producto-chip.MAGNA {
      background: linear-gradient(135deg, #16a34a, #15803d);
    }

    .producto-chip.PREMIUM {
      background: linear-gradient(135deg, #dc2626, #991b1b);
    }

    .producto-chip.DIESEL {
      background: linear-gradient(135deg, #111827, #475569);
    }

    .tanque-live {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 118px;
      border-radius: 999px;
      padding: 7px 10px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .tanque-live::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, .14);
      flex: 0 0 auto;
    }

    .tanque-live.sin-lectura {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
    }

    .tanque-live.sin-lectura::before {
      background: #94a3b8;
      box-shadow: none;
    }

    .polaris-inicial-source {
      margin-top: 4px;
      color: #2563eb;
      font-size: 9px;
      line-height: 1.1;
      font-weight: 900;
      white-space: nowrap;
    }

    .promedio-input {
      width: 120px;
      text-align: center;
      padding: 8px 9px;
      border-radius: 10px;
    }

    .promedio-input:disabled {
      background: #f8fafc;
      color: #475569;
      cursor: not-allowed;
    }

    .source-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 5px;
      border-radius: 999px;
      padding: 4px 7px;
      font-size: 10px;
      font-weight: 900;
      border: 1px solid #cbd5e1;
      color: #475569;
      background: #f8fafc;
    }

    .source-badge.manual {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .source-badge.calculado {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .source-badge.pendiente {
      background: #fff7ed;
      color: #c2410c;
      border-color: #fed7aa;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      min-width: 82px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .status-pill.ok {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .status-pill.reorden {
      background: #fff7ed;
      color: #c2410c;
      border-color: #fed7aa;
    }

    .status-pill.sin-dato {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
    }

    .proj-cell {
      min-width: 142px;
      display: grid;
      gap: 6px;
    }

    .saldo {
      border-radius: 12px;
      padding: 7px 8px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-weight: 900;
    }

    .saldo.reorden {
      background: #fff7ed;
      color: #c2410c;
      border-color: #fed7aa;
    }

    .saldo.sin-dato {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
    }

    .compra-input {
      width: 100%;
      padding: 7px 8px;
      border-radius: 10px;
      text-align: center;
      font-size: 12px;
    }

    .zero-muted {
      background: #e5e7eb !important;
      color: #9ca3af !important;
      border-color: #d1d5db !important;
    }

    #toast {
      position: fixed;
      right: 18px;
      bottom: 18px;
      background: #0f172a;
      color: #fff;
      padding: 14px 16px;
      border-radius: 16px;
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
      transition: .25s ease;
      box-shadow: 0 16px 40px rgba(15, 23, 42, .25);
      font-weight: 800;
      z-index: 20000;
    }

    #toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .export-robot {
      position: fixed;
      right: 18px;
      bottom: 84px;
      z-index: 20001;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      font-family: inherit;
    }

    .export-robot.hidden {
      gap: 0;
    }

    .export-robot-toggle {
      width: 58px;
      height: 58px;
      border: 0;
      border-radius: 20px;
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 31px;
      background: linear-gradient(135deg, #0f172a, #2563eb);
      color: #ffffff;
      box-shadow: 0 18px 42px rgba(15, 23, 42, .28);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .export-robot-toggle:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 22px 50px rgba(15, 23, 42, .34);
    }

    .export-robot-bubble {
      position: relative;
      width: min(310px, calc(100vw - 104px));
      padding: 14px;
      border-radius: 22px;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #dbeafe;
      box-shadow: 0 18px 46px rgba(15, 23, 42, .22);
      display: grid;
      gap: 8px;
      transform-origin: bottom right;
      transition: opacity .18s ease, transform .18s ease, max-width .18s ease, padding .18s ease;
    }


    .export-robot-close {
      position: absolute;
      top: 8px;
      right: 10px;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      font-weight: 900;
    }

    .export-robot-close:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .export-robot-restore {
      display: none;
      align-items: center;
      gap: 7px;
      border: 0;
      border-radius: 999px;
      padding: 10px 13px;
      cursor: pointer;
      background: linear-gradient(135deg, #0f172a, #2563eb);
      color: #ffffff;
      box-shadow: 0 14px 34px rgba(15, 23, 42, .24);
      font-weight: 900;
      font-size: 12px;
      white-space: nowrap;
    }

    .export-robot-bubble strong {
      font-size: 14px;
      line-height: 1.15;
    }

    .export-robot-bubble span {
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
    }

    .export-robot-buttons {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 2px;
    }

    .export-robot-buttons button {
      border: 0;
      border-radius: 14px;
      padding: 10px 12px;
      cursor: pointer;
      color: #ffffff;
      font-weight: 900;
      box-shadow: 0 10px 22px rgba(15, 23, 42, .15);
    }

    .export-robot-buttons button[data-export="excel"] {
      background: linear-gradient(135deg, #16a34a, #22c55e);
    }

    .export-robot-buttons button[data-export="pdf"] {
      background: linear-gradient(135deg, #dc2626, #f97316);
    }

    .export-robot-buttons button[data-export="imagen"] {
      background: linear-gradient(135deg, #7c3aed, #2563eb);
    }

    .compras-imagen-modal {
      position: fixed;
      inset: 0;
      z-index: 21000;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(15, 23, 42, .52);
      backdrop-filter: blur(3px);
    }

    .compras-imagen-modal[hidden] {
      display: none !important;
    }

    .compras-imagen-box {
      position: relative;
      width: min(560px, calc(100vw - 28px));
      border-radius: 26px;
      padding: 22px;
      background: #ffffff;
      box-shadow: 0 28px 70px rgba(15, 23, 42, .34);
      border: 1px solid #dbeafe;
    }

    .compras-imagen-box h2 {
      margin: 0 32px 6px 0;
      font-size: 22px;
      color: #0f172a;
    }

    .compras-imagen-box p {
      margin: 0 0 16px;
      color: #475569;
      font-weight: 700;
      line-height: 1.35;
    }

    .compras-imagen-close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      color: #475569;
      background: #f1f5f9;
      font-size: 20px;
      font-weight: 900;
    }

    .compras-imagen-close:hover {
      color: #0f172a;
      background: #e2e8f0;
    }

    .compras-imagen-fechas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .compras-imagen-fechas label {
      display: grid;
      gap: 6px;
      color: #334155;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .compras-imagen-fechas input {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 13px;
      color: #0f172a;
      background: #f8fafc;
      font: inherit;
      font-weight: 800;
    }

    .compras-imagen-acciones {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .compras-imagen-acciones button {
      border: 0;
      border-radius: 16px;
      padding: 12px 14px;
      cursor: pointer;
      color: #ffffff;
      font-weight: 900;
      box-shadow: 0 12px 24px rgba(15, 23, 42, .16);
    }

    #btnBuscarImagenCompras {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
    }

    #btnCopiarImagenCompras {
      background: linear-gradient(135deg, #7c3aed, #2563eb);
    }

    #btnDescargarImagenCompras {
      background: linear-gradient(135deg, #0f172a, #475569);
    }

    @media (max-width: 620px) {
      .export-robot-buttons,
      .compras-imagen-fechas,
      .compras-imagen-acciones {
        grid-template-columns: 1fr;
      }
    }

    .export-robot.collapsed .export-robot-bubble {
      opacity: 0;
      transform: scale(.82) translateY(8px);
      pointer-events: none;
      max-width: 0;
      padding: 0;
      overflow: hidden;
      border-width: 0;
    }

    .export-robot.hidden .export-robot-bubble,
    .export-robot.hidden .export-robot-toggle {
      display: none;
    }

    .export-robot.hidden .export-robot-restore {
      display: inline-flex;
    }

    @media print {
      body {
        background: #ffffff;
        padding-left: 0 !important;
      }

      .ary-sidebar,
      .ary-mobile-menu-btn,
      .pipas-actions,
      .export-robot {
        display: none !important;
      }

      .pipas-app {
        width: 100%;
        padding: 0;
      }

      .pipas-hero,
      .station-card,
      .pipas-stat {
        box-shadow: none;
      }

      .station-card {
        page-break-inside: avoid;
      }
    }

    @media (max-width: 1100px) {
      .pipas-resumen {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .pipas-actions {
        grid-template-columns: repeat(2, minmax(120px, 1fr));
      }
    }

    @media (max-width: 760px) {
      .pipas-app {
        width: min(100% - 20px, 1500px);
        padding: 14px 0 86px;
      }

      .pipas-hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .pipas-brand {
        align-items: flex-start;
      }

      .pipas-logo {
        width: 80px;
        height: 60px;
      }

      .pipas-resumen,
      .pipas-actions {
        grid-template-columns: 1fr;
      }

      .export-robot {
        right: 12px;
        bottom: 82px;
        gap: 8px;
      }

      .export-robot-toggle {
        width: 54px;
        height: 54px;
        border-radius: 18px;
      }
    }
  `

  document.head.appendChild(css)
}

function crearLayout() {
  document.title = 'Proyección de Pipas'

  document.body.innerHTML = `
    <div class="pipas-app" id="pipasApp">
      <header class="pipas-hero">
        <div class="pipas-brand">
          <img class="pipas-logo" src="${LOGO_SRC}" alt="Logo ARY">
          <div>
            <p class="pipas-eyebrow">GRUPO ARY GASOLINERAS</p>
            <h1>Proyección de Pipas</h1>
            <p class="pipas-subtitle">Promedio e inventario desde Inventarios Combustibles · Tanques en vivo desde Polaris</p>
          </div>
        </div>
        <div class="pipas-actions">
          <label>Fecha reporte
            <input type="date" id="fechaBase">
          </label>
          <button class="pipas-btn gris" id="btnCargar" type="button">Cargar</button>
        </div>
      </header>

      <main class="station-grid" id="contenedorPipas"></main>
    </div>
    <div id="toast"></div>
    <div class="export-robot" id="exportRobot" aria-label="Exportar reporte">
      <div class="export-robot-bubble" id="exportRobotBubble">
        <button class="export-robot-close" type="button" id="exportRobotClose" title="Ocultar robot" aria-label="Ocultar robot">×</button>
        <strong>🤖 ¿Te gustaría exportarlo?</strong>
        <span>Te lo acomodo bonito en Excel, PDF o imagen de compras.</span>
        <div class="export-robot-buttons">
          <button type="button" data-export="excel" id="btnRobotExcel">Excel</button>
          <button type="button" data-export="pdf" id="btnRobotPDF">PDF</button>
          <button type="button" data-export="imagen" id="btnRobotImagen">Imagen</button>
        </div>
      </div>
      <button class="export-robot-toggle" type="button" id="exportRobotToggle" title="Minimizar opciones" aria-label="Minimizar opciones de exportación">🤖</button>
      <button class="export-robot-restore" type="button" id="exportRobotRestore" title="Mostrar robot" aria-label="Mostrar robot exportador">🤖 Exportar</button>
    </div>
    <div class="compras-imagen-modal" id="modalImagenCompras" hidden>
      <div class="compras-imagen-box" role="dialog" aria-modal="true" aria-labelledby="tituloImagenCompras">
        <button class="compras-imagen-close" type="button" id="btnCerrarImagenCompras" aria-label="Cerrar">×</button>
        <h2 id="tituloImagenCompras">Imagen de compras</h2>
        <p>Selecciona el rango de fechas. La imagen saldrá como tabla y solo marcará los días donde exista compra, con su valor.</p>
        <div class="compras-imagen-fechas">
          <label>Desde
            <input type="date" id="fechaImagenInicio">
          </label>
          <label>Hasta
            <input type="date" id="fechaImagenFin">
          </label>
        </div>
        <div class="compras-imagen-acciones">
          <button type="button" id="btnBuscarImagenCompras">Buscar</button>
          <button type="button" id="btnCopiarImagenCompras">Copiar imagen</button>
          <button type="button" id="btnDescargarImagenCompras">Descargar PNG</button>
        </div>
      </div>
    </div>
  `

  $('#fechaBase').value = state.fechaBase
}

function datosPlano() {
  const lista = []

  estaciones.forEach(estacion => {
    estacion.productos.forEach(producto => {
      lista.push({
        estacion,
        producto,
        inventario: inventarioInicial(estacion, producto),
        promedio: promedioVenta(estacion, producto),
        capacidad_tanque: capacidadTanqueValor(producto),
        fondaje: fondajeValor(producto),
        punto_reorden: producto.punto_reorden,
        capacidad_maxima: capacidadMaximaValor(producto)
      })
    })
  })

  return lista
}

function renderResumen() {
  // Resumen superior removido a solicitud del usuario.
}

function renderPromedioInput(estacion, producto) {
  const row = buscarPromedio(estacion, producto)
  const valor = promedioVenta(estacion, producto)
  const fechas = row ? `${row.fecha_inicio_ventas || ''} al ${row.fecha_fin_ventas || ''}` : 'Sin período disponible'
  const detalle = `Ventas de Inventarios Combustibles: ${fechas}. Total: ${litros(row?.total_ventas_7_dias || 0)} L / 7 días. Promedio: ${formatoNumero(valor, 2)} L/día.`
  return `
    <input class="promedio-input ${valorCero(valor) ? 'zero-muted' : ''}" type="text" readonly value="${litros(valor)}" title="${escaparHTML(detalle)}" aria-label="Promedio automático de los últimos 7 días">
    <div class="source-badge ${claseFuente(estacion, producto)}" title="${escaparHTML(detalle)}">${textoFuente(estacion, producto)}</div>
  `
}

function renderParametros(estacion) {
  const rows = estacion.productos.map(producto => {
    const inventario = inventarioInicial(estacion, producto)
    const capacidadTanque = capacidadTanqueValor(producto)
    const fondaje = fondajeValor(producto)
    const capacidadMaxima = capacidadMaximaValor(producto)

    return `
      <tr>
        <td><span class="producto-chip ${producto.nombre}">${escaparHTML(producto.nombre)}</span></td>
        <td>${renderTanquePolaris(estacion, producto)}</td>
        <td class="${valorCero(inventario) ? 'zero-muted' : ''}">
          <div>${litros(inventario)}</div>
          ${fuenteInventarioInicial(estacion, producto)}
        </td>
        <td>${renderPromedioInput(estacion, producto)}</td>
        <td data-tanque-param="capacidad" data-estacion="${estacion.id_estacion}" data-producto="${producto.id_producto}" class="${valorCero(capacidadTanque) ? 'zero-muted' : ''}">${litros(capacidadTanque)}</td>
        <td data-tanque-param="fondaje" data-estacion="${estacion.id_estacion}" data-producto="${producto.id_producto}" class="${valorCero(fondaje) ? 'zero-muted' : ''}">${litros(fondaje)}</td>
        <td class="${valorCero(producto.punto_reorden) ? 'zero-muted' : ''}">${litros(producto.punto_reorden)}</td>
        <td data-tanque-param="maxima" data-estacion="${estacion.id_estacion}" data-producto="${producto.id_producto}" class="${valorCero(capacidadMaxima) ? 'zero-muted' : ''}">${litros(capacidadMaxima)}</td>
      </tr>
    `
  }).join('')

  return `
    <div>
      <h3 class="table-title">Parámetros</h3>
      <div class="table-wrap">
        <table class="param-table">
          <thead>
            <tr>
              <th>PARÁMETROS</th>
              <th>Tanque<br>ahora<br><small>EN VIVO</small></th>
              <th>Inventario<br>Inicial<br><small>${fechaBonita(state.fechaBase)}</small></th>
              <th>Promedio<br>de venta<br><small>7 días</small></th>
              <th>Capacidad<br>de tanque</th>
              <th>Fondaje</th>
              <th>Punto de<br>reorden</th>
              <th>Capacidad<br>máxima</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `
}

function renderCompraInput(estacion, producto, fecha) {
  const ids = obtenerIds(estacion, producto)
  const valor = compraDia(estacion, producto, fecha)

  return `
    <input class="compra-input ${valorCero(valor) ? 'zero-muted' : ''}" type="text" inputmode="decimal" autocomplete="off" placeholder="Compra" value="${valorCero(valor) ? '' : litros(valor)}" data-compra="1" data-fecha-compra="${fecha}" data-id-estacion="${ids.id_estacion}" data-id-producto="${ids.id_producto}">
  `
}

function renderProyeccion(estacion) {
  const fechas = rangoFechas(state.fechaInicio, state.fechaFin)

  const head = fechas.map(fecha => `
    <th>
      <div>${diaCorto(fecha)}</div>
      <div>${fechaBonita(fecha)}</div>
    </th>
  `).join('')

  const rows = estacion.productos.map(producto => {
    const celdas = fechas.map(fecha => {
      const saldo = saldoProyectado(estacion, producto, fecha)
      const clase = claseEstatus(saldo, producto.punto_reorden)
      const compra = compraDia(estacion, producto, fecha)
      const inventarioReal = inventarioRealDia(estacion, producto, fecha)
      const inventarioFicticio = esInventarioFicticio(estacion, producto, fecha)
      const compraAplicada = compraDiaAplicada(estacion, producto, fecha, inventarioReal)
      const fechaAplicacionCompra = fechaMasDiasISO(fecha, 1)
      const inventarioDiaAplicacion = inventarioRealDia(estacion, producto, fechaAplicacionCompra)
      const compraSeSumaDiaSiguiente = compra > 0 && compraCuentaEnSaldo(fecha, fechaAplicacionCompra, inventarioDiaAplicacion)
      const textoCompra = compraSeSumaDiaSiguiente ? 'Compra se suma mañana' : 'Compra no sumada'

      return `
        <td>
          <div class="proj-cell">
            <div class="saldo ${clase} ${valorCero(saldo) ? 'zero-muted' : ''}">${litros(saldo)}</div>
            ${renderCompraInput(estacion, producto, fecha)}
            ${compra > 0 ? `<small>${textoCompra}: ${litros(compra)}</small>` : ''}
          </div>
        </td>
      `
    }).join('')

    return `
      <tr>
        <td><span class="producto-chip ${producto.nombre}">${escaparHTML(producto.nombre)}</span></td>
        ${celdas}
      </tr>
    `
  }).join('')

  return `
    <div>
      <div class="projection-header">
        <button class="week-nav" type="button" data-week-nav="-7">◀ Semana anterior</button>
        <h3 class="table-title">Proyección ${fechaBonita(state.fechaInicio)} - ${fechaBonita(state.fechaFin)}</h3>
        <button class="week-nav" type="button" data-week-nav="7">Semana siguiente ▶</button>
      </div>
      <div class="table-wrap">
        <table class="projection-table">
          <thead>
            <tr>
              <th>Producto</th>
              ${head}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `
}

function renderStation(estacion) {
  return `
    <section class="station-card">
      <div class="station-title ${estacion.clase}">
        <span>${escaparHTML(estacion.nombre)}</span>
        <small>${estacion.productos.length} productos</small>
      </div>
      <div class="station-body">
        ${renderParametros(estacion)}
        ${renderProyeccion(estacion)}
      </div>
    </section>
  `
}

function render() {
  $('#contenedorPipas').innerHTML = estaciones.map(renderStation).join('')
}

async function fetchJson(url, options) {
  const requester = window.ArySqlSource && typeof window.ArySqlSource.nativeFetch === 'function'
    ? window.ArySqlSource.nativeFetch
    : window.fetch.bind(window)

  const response = await requester(url, options)

  if (!response.ok) {
    let mensaje = 'No se pudo cargar la información'

    try {
      const error = await response.json()
      mensaje = error.message || mensaje
    } catch (_) {
      const texto = await response.text()
      mensaje = texto || mensaje
    }

    throw new Error(mensaje)
  }

  return response.json()
}

function normalizarRespuestaLista(respuesta) {
  if (Array.isArray(respuesta)) return respuesta
  if (respuesta && Array.isArray(respuesta.data)) return respuesta.data
  if (respuesta && Array.isArray(respuesta.recordset)) return respuesta.recordset
  if (respuesta && Array.isArray(respuesta.rows)) return respuesta.rows
  return []
}

async function cargarListaSegura(nombre, url, mostrarMensaje = true) {
  try {
    const respuesta = await fetchJson(url)
    return normalizarRespuestaLista(respuesta)
  } catch (error) {
    console.error(`ERROR ${nombre}:`, error)
    if (mostrarMensaje) notify(`No se pudo cargar ${nombre.toLowerCase()}`)
    return []
  }
}

async function cargarInventariosRango(fechas) {
  const resultados = await Promise.all(
    fechas.map(async fecha => {
      const rows = await cargarListaSegura(`INVENTARIOS ${fecha}`, `/api/inventarios?fecha=${encodeURIComponent(fecha)}`, false)
      return rows.map(row => ({
        ...row,
        fecha_reporte: fecha
      }))
    })
  )

  return resultados.flat()
}

async function cargarPolarisSeguro(soloActual = false) {
  const url = `/api/pipas/polaris/estado?fecha=${encodeURIComponent(state.fechaBase)}&solo_actual=${soloActual ? '1' : '0'}`

  try {
    const respuesta = await fetchJson(url)
    return respuesta && typeof respuesta === 'object'
      ? respuesta
      : { stations: [], errors: [] }
  } catch (error) {
    console.error('ERROR POLARIS PIPAS:', error)
    return {
      stations: [],
      errors: [{ server: '', message: error.message || 'No se pudo consultar Polaris' }]
    }
  }
}

function aplicarRespuestaPolaris(respuesta, soloActual = false) {
  const nuevas = Array.isArray(respuesta?.stations) ? respuesta.stations : []
  state.polarisErrores = Array.isArray(respuesta?.errors) ? respuesta.errors : []

  if (!soloActual) {
    state.polarisEstaciones = nuevas
    return
  }

  for (const nueva of nuevas) {
    const indice = state.polarisEstaciones.findIndex(actual => {
      if (nueva.server && actual.server === nueva.server) return true
      if (nueva.no_es && Number(actual.no_es) === Number(nueva.no_es)) return true
      return normalizarTexto(actual.nombre_estacion) === normalizarTexto(nueva.nombre_estacion)
    })

    if (indice < 0) {
      state.polarisEstaciones.push(nueva)
      continue
    }

    const anterior = state.polarisEstaciones[indice]
    const productosAnteriores = Array.isArray(anterior.productos) ? anterior.productos : []
    const productosNuevos = Array.isArray(nueva.productos) ? nueva.productos : []

    const productos = productosNuevos.map(productoNuevo => {
      const clave = productoKey(productoNuevo.nombre_producto || '')
      const productoAnterior = productosAnteriores.find(item => {
        return productoKey(item.nombre_producto || '') === clave
      })

      if (!productoAnterior) return productoNuevo

      return { ...productoAnterior, ...productoNuevo }
    })

    for (const productoAnterior of productosAnteriores) {
      const clave = productoKey(productoAnterior.nombre_producto || '')
      const existe = productos.some(item => productoKey(item.nombre_producto || '') === clave)
      if (!existe) productos.push(productoAnterior)
    }

    state.polarisEstaciones[indice] = {
      ...anterior,
      ...nueva,
      productos
    }
  }
}

function actualizarTanquesPolarisDOM() {
  document.querySelectorAll('[data-polaris-live-estacion]').forEach(elemento => {
    const idEstacion = Number(elemento.dataset.polarisLiveEstacion || 0)
    const claveProducto = productoKey(elemento.dataset.polarisLiveProducto || '')
    const estacion = estaciones.find(item => Number(item.id_estacion) === idEstacion)
    const producto = estacion?.productos.find(item => productoKey(item.nombre) === claveProducto)

    if (!estacion || !producto) return

    const actual = tanqueActualPolaris(estacion, producto)
    elemento.textContent = textoTanquePolaris(estacion, producto)
    elemento.title = tituloTanquePolaris(estacion, producto)
    elemento.classList.toggle('sin-lectura', actual === null)
  })

  document.querySelectorAll('[data-tanque-param]').forEach(elemento => {
    const estacion = estaciones.find(item => Number(item.id_estacion) === Number(elemento.dataset.estacion))
    const producto = estacion?.productos.find(item => Number(item.id_producto) === Number(elemento.dataset.producto))
    if (!producto) return
    const valores = {
      capacidad: capacidadTanqueValor(producto),
      fondaje: fondajeValor(producto),
      maxima: capacidadMaximaValor(producto)
    }
    const valor = valores[elemento.dataset.tanqueParam]
    if (valor === undefined) return
    elemento.textContent = litros(valor)
    elemento.classList.toggle('zero-muted', valorCero(valor))
  })
}

async function refrescarPolarisEnVivo() {
  if (document.hidden || state.polarisActualizando) return

  state.polarisActualizando = true

  try {
    const respuesta = await cargarPolarisSeguro(true)
    aplicarRespuestaPolaris(respuesta, true)
    actualizarTanquesPolarisDOM()
  } catch (error) {
    console.error('ERROR REFRESCO POLARIS:', error)
  } finally {
    state.polarisActualizando = false
  }
}

function iniciarRefrescoPolaris() {
  if (polarisLiveTimer) clearInterval(polarisLiveTimer)

  polarisLiveTimer = setInterval(() => {
    refrescarPolarisEnVivo()
  }, POLARIS_LIVE_REFRESH_MS)

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refrescarPolarisEnVivo()
  })
}

async function cargarDatos() {
  state.cargando = true

  try {
    aplicarSiguienteSemana()
    render()

    const fechas = rangoFechas(state.fechaInicio, state.fechaFin)
    const fechaInicioInventarios = fechaMasDiasISO(state.fechaBase, -DIAS_BUSQUEDA_INVENTARIO_FICTICIO)
    const fechasInventario = rangoFechas(fechaInicioInventarios, state.fechaFin)
    const urlInventarios = `/api/inventarios?fecha=${encodeURIComponent(state.fechaBase)}`
    const urlPromedios = `/api/pipas/promedios?fecha=${encodeURIComponent(state.fechaBase)}`
    const fechaInicioCompras = fechaInicioInventarios
    const urlCompras = `/api/pipas/compras?fecha_inicio=${encodeURIComponent(fechaInicioCompras)}&fecha_fin=${encodeURIComponent(state.fechaFin)}`

    const [inventarios, inventariosRango, promedios, compras, polaris] = await Promise.all([
      cargarListaSegura('INVENTARIOS', urlInventarios),
      cargarInventariosRango(fechasInventario),
      cargarListaSegura('PROMEDIOS', urlPromedios),
      cargarListaSegura('COMPRAS', urlCompras),
      cargarPolarisSeguro(false)
    ])

    state.inventarios = inventarios
    state.inventariosRango = inventariosRango
    state.promedios = promedios
    state.compras = compras
    aplicarRespuestaPolaris(polaris, false)

    render()

    const hayInicial = estaciones.some(estacion => estacion.productos.some(producto => {
      return inventarioInicial(estacion, producto) !== 0
    }))
    if (!hayInicial) {
      notify(`No hay inventario en Inventarios Combustibles para ${fechaBonita(state.fechaBase)}`)
      return
    }

    notify('Proyección cargada')
  } catch (error) {
    console.error('ERROR GENERAL PIPAS:', error)
    render()
    notify(error.message || 'No se pudo cargar')
  } finally {
    state.cargando = false
  }
}

function compraInputALitros(valor) {
  const compra = numberValue(valor)

  if (compra > 0 && compra < 1000) {
    return compra * 1000
  }

  return compra
}

async function guardarCompra(input) {
  const litrosCompra = compraInputALitros(input.value)
  const idEstacion = Number(input.dataset.idEstacion)
  const idProducto = Number(input.dataset.idProducto)
  const fechaCompra = input.dataset.fechaCompra

  if (!idEstacion || !idProducto || !fechaCompra) {
    notify('No se encontró estación o producto')
    return
  }

  await fetchJson('/api/pipas/compras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fecha_compra: fechaCompra,
      id_estacion: idEstacion,
      id_producto: idProducto,
      litros_compra: litrosCompra
    })
  })

  await cargarDatos()
  notify(litrosCompra > 0 ? 'Compra guardada' : 'Compra eliminada')
}

function prepararInputNumero(input) {
  const valor = numberValue(input.value)
  input.value = valorCero(valor) ? '' : String(valor)
  input.select()
}

function formatearInputNumero(input) {
  const valor = input.dataset.compra === '1' ? compraInputALitros(input.value) : numberValue(input.value)
  input.value = valorCero(valor) ? '' : litros(valor)
}

function nombreArchivoReporte(extension) {
  const inicio = state.fechaInicio || state.fechaBase || fechaHoyISO()
  const fin = state.fechaFin || proximoLunes(inicio)
  return `proyeccion_pipas_${inicio}_a_${fin}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

function colorProductoExportacion(nombre) {
  const key = productoKey(nombre)

  // Exportación de programación: sin colores por producto.
  // MAGNA, PREMIUM y DIÉSEL se muestran en lila/blanco con texto negro,
  // para que Excel, PDF e imagen mantengan el mismo formato limpio.
  if (key === 'DIESEL') return { fondo: COLOR_EXPORT_BLANCO, texto: '#000000', claro: COLOR_EXPORT_LILA, borde: '#000000' }
  return { fondo: COLOR_EXPORT_LILA, texto: '#000000', claro: COLOR_EXPORT_LILA, borde: '#000000' }
}

function colorEstacionExportacion(estacion) {
  const colores = {
    'ary-1': '#16a34a',
    'ary-2': '#dc2626',
    'ary-3': '#9333ea',
    'ary-4': '#f97316',
    'ary-5': '#2563eb',
    'ary-6': '#eab308',
    apache: '#be123c'
  }

  return colores[estacion.clase] || '#172554'
}

function estiloProductoExportacion(nombre) {
  const color = colorProductoExportacion(nombre)
  return `background:${color.fondo};color:${color.texto};border-color:${color.fondo};font-weight:900;text-align:center;`
}

function estiloEstacionExportacion(estacion) {
  const fondo = colorEstacionExportacion(estacion)
  const texto = estacion.clase === 'ary-6' ? '#1f2937' : '#ffffff'
  return `background:${fondo};color:${texto};font-weight:900;`
}

function tituloEstacionExportacion(estacion) {
  // Excel abre mejor los encabezados cuando vienen dentro de una tabla.
  // Por eso el nombre de la estación se pinta como una fila combinada,
  // no solo como un <h2> fuera de la tabla.
  return `
    <table class="station-title-table">
      <tr>
        <td class="station-title-cell" colspan="9" style="${estiloEstacionExportacion(estacion)}">${escaparHTML(estacion.nombre)}</td>
      </tr>
    </table>
  `
}

function celdaNumeroReporte(valor, claseExtra = '') {
  const numero = numberValue(valor)
  return `<td class="num ${claseExtra} ${valorCero(numero) ? 'muted' : ''}">${litros(numero)}</td>`
}

function estilosReporteExportacion(tipo = 'pdf') {
  const esExcel = tipo === 'excel'

  return `
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: ${esExcel ? '12px' : '0'};
        color: #0f172a;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
      }
      .report-title {
        border-radius: 16px;
        padding: 16px 18px;
        margin-bottom: 12px;
        color: #ffffff;
        background: #9f1239;
      }
      .report-title h1 {
        margin: 0 0 6px;
        font-size: 24px;
        letter-spacing: .02em;
      }
      .report-title p {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
      }
      .report-meta-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 6px;
        margin: 0 0 12px;
      }
      .report-meta-table td {
        border: 1px solid #dbe5f0;
        border-radius: 10px;
        background: #f8fafc;
        padding: 9px 10px;
        text-align: left;
      }
      .report-meta-table strong {
        display: block;
        color: #334155;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      .report-meta-table span {
        display: block;
        margin-top: 4px;
        font-size: 14px;
        font-weight: 900;
      }
      .station-report {
        margin: 0 0 18px;
        page-break-inside: avoid;
      }
      .station-name {
        margin: 0;
        padding: 10px 12px;
        color: #ffffff;
        background: #172554;
        border-radius: 12px 12px 0 0;
        font-size: 15px;
        letter-spacing: .02em;
      }
      .station-title-table {
        width: 100%;
        border-collapse: collapse;
        margin: 4px 0 0;
        table-layout: fixed;
      }
      .station-title-cell {
        padding: 12px 14px;
        border: 1px solid #ffffff;
        border-radius: 12px 12px 0 0;
        font-size: 16px;
        letter-spacing: .03em;
        text-align: left;
        text-transform: uppercase;
      }
      .section-title {
        margin: 9px 0 6px;
        font-size: 13px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 10px;
        table-layout: fixed;
      }
      th {
        color: #1e293b;
        background: #eef2f7;
        border: 1px solid #cbd5e1;
        padding: 7px 6px;
        text-align: center;
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 900;
      }
      td {
        border: 1px solid #dbe5f0;
        padding: 7px 6px;
        text-align: center;
        vertical-align: middle;
        background: #ffffff;
        font-weight: 700;
      }
      td.producto {
        color: #000000;
        background: #e8e2ee;
        font-weight: 900;
        text-align: center;
      }
      .producto.MAGNA,
      .producto.PREMIUM,
      .producto.DIESEL { background: #e8e2ee; color: #000000; }
      .num {
        text-align: right;
        mso-number-format: "#,##0";
      }
      .saldo-ok {
        color: #047857;
        background: #ecfdf5;
      }
      .saldo-reorden {
        color: #c2410c;
        background: #fff7ed;
      }
      .muted {
        color: #94a3b8;
        background: #f1f5f9;
      }
      .cell-compra {
        display: block;
        margin-top: 3px;
        color: #1d4ed8;
        font-size: 9px;
        font-weight: 900;
      }
      .print-hint {
        margin: 10px 0 0;
        color: #64748b;
        font-size: 10px;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    </style>
  `
}

function tablaParametrosExportacion(estacion) {
  const filas = estacion.productos.map(producto => {
    const inventario = inventarioInicial(estacion, producto)
    const promedio = promedioVenta(estacion, producto)
    const capacidadTanque = capacidadTanqueValor(producto)
    const fondaje = fondajeValor(producto)
    const capacidadMaxima = capacidadMaximaValor(producto)
    const key = productoKey(producto.nombre)

    return `
      <tr>
        <td class="producto ${key}" style="${estiloProductoExportacion(producto.nombre)}">${escaparHTML(producto.nombre)}</td>
        ${celdaNumeroReporte(inventario)}
        ${celdaNumeroReporte(promedio)}
        ${celdaNumeroReporte(capacidadTanque)}
        ${celdaNumeroReporte(fondaje)}
        ${celdaNumeroReporte(producto.punto_reorden)}
        ${celdaNumeroReporte(capacidadMaxima)}
      </tr>
    `
  }).join('')

  return `
    <h3 class="section-title">Parámetros</h3>
    <table>
      <thead>
        <tr>
          <th style="width:90px;">Producto</th>
          <th>Inventario inicial<br>${fechaBonita(state.fechaBase)}</th>
          <th>Promedio venta</th>
          <th>Capacidad tanque</th>
          <th>Fondaje</th>
          <th>Punto reorden</th>
          <th>Capacidad máxima</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `
}

function tablaProyeccionExportacion(estacion) {
  const fechas = rangoFechas(state.fechaInicio, state.fechaFin)

  const encabezado = fechas.map(fecha => `
    <th>${diaCorto(fecha)}<br>${fechaBonita(fecha)}</th>
  `).join('')

  const filas = estacion.productos.map(producto => {
    const key = productoKey(producto.nombre)
    const celdas = fechas.map(fecha => {
      const saldo = saldoProyectado(estacion, producto, fecha)
      const compra = compraDia(estacion, producto, fecha)
      const clase = claseEstatus(saldo, producto.punto_reorden)
      const claseSaldo = clase === 'reorden' ? 'saldo-reorden' : clase === 'sin-dato' ? 'muted' : 'saldo-ok'

      return `
        <td class="${claseSaldo}">
          <strong>${litros(saldo)}</strong>
          ${compra > 0 ? `<span class="cell-compra">Compra: ${litros(compra)}</span>` : ''}
        </td>
      `
    }).join('')

    return `
      <tr>
        <td class="producto ${key}" style="${estiloProductoExportacion(producto.nombre)}">${escaparHTML(producto.nombre)}</td>
        ${celdas}
      </tr>
    `
  }).join('')

  return `
    <h3 class="section-title">Proyección</h3>
    <table>
      <thead>
        <tr>
          <th style="width:90px;">Producto</th>
          ${encabezado}
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `
}

function cuerpoReporteExportacion(tipo = 'pdf') {
  const estacionesHtml = estaciones.map(estacion => `
    <section class="station-report">
      ${tituloEstacionExportacion(estacion)}
      ${tablaParametrosExportacion(estacion)}
      ${tablaProyeccionExportacion(estacion)}
    </section>
  `).join('')

  return `
    <div class="report-title">
      <h1>Proyección de Pipas</h1>
      <p>Grupo ARY Gasolineras</p>
    </div>
    <table class="report-meta-table">
      <tr>
        <td><strong>Fecha inventario</strong><span>${fechaBonita(state.fechaBase)}</span></td>
        <td><strong>Periodo</strong><span>${fechaBonita(state.fechaInicio)} - ${fechaBonita(state.fechaFin)}</span></td>
        <td><strong>Generado</strong><span>${new Date().toLocaleString('es-MX')}</span></td>
      </tr>
    </table>
    ${estacionesHtml}
    ${tipo === 'pdf' ? '<p class="print-hint no-print">En la ventana de impresión selecciona “Guardar como PDF”.</p>' : ''}
  `
}

function htmlReporteExportacion(tipo = 'pdf') {
  const titulo = `Proyección de Pipas ${fechaBonita(state.fechaInicio)} - ${fechaBonita(state.fechaFin)}`

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escaparHTML(titulo)}</title>
  ${estilosReporteExportacion(tipo)}
</head>
<body>
  ${cuerpoReporteExportacion(tipo)}
</body>
</html>`
}

function descargarArchivo(nombre, contenido, tipoMime) {
  const blob = new Blob([contenido], { type: tipoMime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}


function metaCompraEstacion(estacion) {
  const porClase = {
    apache: {
      orden: 88,
      destino: '88',
      nombreFiscal: 'SERVICIO APACHE, S.A. DE C.V.',
      codigo: 'E06086',
      permiso: 'PL/1391/EXP/ES/2015'
    },
    'ary-1': {
      orden: 89,
      destino: '89',
      nombreFiscal: 'ARY SUPER SERVICIOS I, S.A. DE C.V.',
      codigo: 'E06953',
      permiso: 'PL/856/EXP/ES/2015'
    },
    'ary-2': {
      orden: 90,
      destino: '90',
      nombreFiscal: 'ARY SUPER SERVICIOS II, S.A. DE C.V.',
      codigo: 'E04376',
      permiso: 'PL/886/EXP/ES/2015'
    },
    'ary-3': {
      orden: 91,
      destino: '91',
      nombreFiscal: 'ARY SUPER SERVICIOS III, S.A. DE C.V.',
      codigo: 'E04837',
      permiso: 'PL/831/EXP/ES/2015'
    },
    'ary-4': {
      orden: 92,
      destino: '92',
      nombreFiscal: 'ARY SUPER SERVICIOS IV, S.A. DE C.V.',
      codigo: 'E05522',
      permiso: 'PL/871/EXP/ES/2015'
    },
    'ary-5': {
      orden: 93,
      destino: '93',
      nombreFiscal: 'ARY SUPER SERVICIOS V, S.A. DE C.V.',
      codigo: 'E09427',
      permiso: 'PL/921/EXP/ES/2015'
    },
    'ary-6': {
      orden: 94,
      destino: '94',
      nombreFiscal: 'ARY SUPER SERVICIOS VI, S.A. DE C.V.',
      codigo: 'E11507',
      permiso: 'PL/852/EXP/ES/2015'
    }
  }

  return porClase[estacion.clase] || {
    orden: Number(estacion.id_estacion || 999),
    destino: String(estacion.id_estacion || ''),
    nombreFiscal: estacion.nombre,
    codigo: '',
    permiso: ''
  }
}

function estacionesImagenCompras() {
  return [...estaciones].sort((a, b) => metaCompraEstacion(a).orden - metaCompraEstacion(b).orden)
}

function compraDiaEnLista(lista, estacion, producto, fecha) {
  const ids = obtenerIds(estacion, producto)
  const fechaBuscada = String(fecha || '').slice(0, 10)
  const prod = productoKey(producto.nombre)

  return lista
    .filter(item => String(item.fecha_compra || item.fecha || '').slice(0, 10) === fechaBuscada)
    .filter(item => {
      const idEstacion = Number(item.id_estacion)
      const idProducto = Number(item.id_producto)
      if (idEstacion && idProducto) {
        return idEstacion === ids.id_estacion && idProducto === ids.id_producto
      }

      const rowProducto = productoKey(item.nombre_producto || item.producto || item.producto_nombre || '')
      return estacionCoincide(item, estacion) && rowProducto === prod
    })
    .reduce((total, item) => total + numberValue(item.litros_compra ?? item.compra ?? item.litros), 0)
}

function valorCompraImagen(valor) {
  const compra = numberValue(valor)
  if (!compra) return ''

  if (Math.abs(compra) >= 1000 && compra % 1000 === 0) {
    return formatoNumero(compra / 1000, 0)
  }

  return litros(compra)
}

function nombreArchivoImagenCompras(inicio, fin) {
  return `compras_pipas_${inicio}_a_${fin}.png`.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

function abrirModalImagenCompras() {
  const modal = $('#modalImagenCompras')
  const inicio = $('#fechaImagenInicio')
  const fin = $('#fechaImagenFin')

  if (inicio) inicio.value = state.fechaInicio || state.fechaBase || fechaHoyISO()
  if (fin) fin.value = state.fechaFin || proximoLunes(inicio && inicio.value ? inicio.value : fechaHoyISO())
  if (modal) modal.hidden = false
}

function cerrarModalImagenCompras() {
  const modal = $('#modalImagenCompras')
  if (modal) modal.hidden = true
}

function obtenerRangoImagenCompras() {
  const inicio = String($('#fechaImagenInicio')?.value || '').slice(0, 10)
  const fin = String($('#fechaImagenFin')?.value || '').slice(0, 10)

  if (!inicio || !fin) {
    notify('Selecciona fecha inicial y final')
    return null
  }

  if (fin < inicio) {
    notify('La fecha final no puede ser menor')
    return null
  }

  const totalDias = diffDias(inicio, fin)
  if (totalDias > 45) {
    notify('Selecciona máximo 45 días')
    return null
  }

  return { inicio, fin, fechas: rangoFechas(inicio, fin) }
}

async function cargarComprasParaImagen(inicio, fin) {
  const url = `/api/pipas/compras?fecha_inicio=${encodeURIComponent(inicio)}&fecha_fin=${encodeURIComponent(fin)}`
  return cargarListaSegura('COMPRAS IMAGEN', url)
}

function dividirLineaCanvas(ctx, linea, anchoMaximo) {
  const texto = String(linea ?? '')
  if (!texto.trim()) return ['']
  if (ctx.measureText(texto).width <= anchoMaximo) return [texto]

  const palabras = texto.split(/\s+/)
  const lineas = []
  let actual = ''

  palabras.forEach(palabra => {
    const prueba = actual ? `${actual} ${palabra}` : palabra

    if (ctx.measureText(prueba).width <= anchoMaximo) {
      actual = prueba
      return
    }

    if (actual) lineas.push(actual)
    actual = palabra
  })

  if (actual) lineas.push(actual)
  return lineas.length ? lineas : [texto]
}

function dibujarTextoCanvas(ctx, texto, x, y, ancho, alto, opciones = {}) {
  const align = opciones.align || opciones.textAlign || 'center'
  const valign = opciones.valign || 'middle'
  const color = opciones.color || '#000000'
  const font = opciones.font || '14px Arial'
  const padding = opciones.padding ?? 4
  const paddingY = opciones.paddingY ?? padding
  const lineHeight = opciones.lineHeight || 16
  const wrap = opciones.wrap === true

  ctx.save()
  ctx.beginPath()
  ctx.rect(x + 1, y + 1, Math.max(1, ancho - 2), Math.max(1, alto - 2))
  ctx.clip()
  ctx.fillStyle = color
  ctx.font = font
  ctx.textAlign = align
  ctx.textBaseline = 'middle'

  const anchoTexto = Math.max(10, ancho - padding * 2)
  const baseLineas = Array.isArray(texto) ? texto : String(texto ?? '').split('\n')
  const lineas = wrap ? baseLineas.flatMap(linea => dividirLineaCanvas(ctx, linea, anchoTexto)) : baseLineas
  const totalAlto = lineas.length * lineHeight
  let inicioY = y + alto / 2 - totalAlto / 2 + lineHeight / 2

  if (valign === 'top') inicioY = y + paddingY + lineHeight / 2
  if (valign === 'bottom') inicioY = y + alto - paddingY - totalAlto + lineHeight / 2

  const textX = align === 'left' ? x + padding : align === 'right' ? x + ancho - padding : x + ancho / 2

  lineas.forEach((linea, index) => {
    ctx.fillText(String(linea), textX, inicioY + index * lineHeight, anchoTexto)
  })

  ctx.restore()
}

function dibujarCeldaCanvas(ctx, x, y, ancho, alto, opciones = {}) {
  ctx.save()
  ctx.fillStyle = opciones.fondo || '#ffffff'
  ctx.fillRect(x, y, ancho, alto)
  ctx.strokeStyle = opciones.borde || '#000000'
  ctx.lineWidth = opciones.lineWidth || 1
  ctx.strokeRect(x, y, ancho, alto)

  if (opciones.texto !== undefined && opciones.texto !== null && opciones.texto !== '') {
    dibujarTextoCanvas(ctx, opciones.texto, x, y, ancho, alto, {
      align: opciones.align || opciones.textAlign || 'center',
      valign: opciones.valign || 'middle',
      color: opciones.color || '#000000',
      font: opciones.font || '14px Arial',
      padding: opciones.padding ?? 4,
      paddingY: opciones.paddingY ?? opciones.padding ?? 4,
      lineHeight: opciones.lineHeight || 16,
      wrap: opciones.wrap === true
    })
  }

  ctx.restore()
}

function crearCanvasImagenCompras(inicio, fin, compras) {
  const fechas = rangoFechas(inicio, fin)
  const productoOrden = { MAGNA: 1, PREMIUM: 2, DIESEL: 3 }
  const estacionesBase = estacionesImagenCompras()
    .map(estacion => {
      const productosConCompra = [...estacion.productos]
        .sort((a, b) => {
          return (productoOrden[productoKey(a.nombre)] || 99) - (productoOrden[productoKey(b.nombre)] || 99)
        })
        .filter(producto => fechas.some(fecha => compraDiaEnLista(compras, estacion, producto, fecha) > 0))

      return { estacion, productos: productosConCompra }
    })
    .filter(item => item.productos.length > 0)

  if (!estacionesBase.length) {
    return null
  }

  const totalProductos = estacionesBase.reduce((total, item) => total + item.productos.length, 0)
  const productosUnicos = new Set(estacionesBase.flatMap(item => item.productos.map(producto => productoKey(producto.nombre))))
  const soloUnProducto = totalProductos === 1
  const unSoloTipoProducto = productosUnicos.size === 1
  const unSoloDia = fechas.length === 1
  const modoCompacto = unSoloDia || unSoloTipoProducto
  const pocosDias = fechas.length <= 7

  const colDestino = soloUnProducto ? 110 : modoCompacto ? 104 : 78
  const colEstacion = soloUnProducto ? 430 : modoCompacto ? 390 : 250
  const colProducto = soloUnProducto ? 150 : modoCompacto ? 130 : 95
  const colFecha = unSoloDia ? 110 : pocosDias ? 96 : 78
  const altoTitulo = soloUnProducto ? 48 : modoCompacto ? 42 : 32
  const altoMes = soloUnProducto ? 42 : modoCompacto ? 36 : 32
  const altoDia = soloUnProducto ? 42 : modoCompacto ? 36 : 32
  const altoHeader = soloUnProducto ? 42 : modoCompacto ? 36 : 28
  const altoFilaBase = soloUnProducto ? 58 : modoCompacto ? 36 : 30
  const lineHeightEstacion = soloUnProducto ? 19 : modoCompacto ? 17 : 15
  const paddingYEstacion = soloUnProducto ? 18 : modoCompacto ? 16 : 12
  const margen = soloUnProducto ? 28 : modoCompacto ? 24 : 18
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

  const estacionesOrdenadas = estacionesBase.map(item => {
    const meta = metaCompraEstacion(item.estacion)
    const lineasEstacion = [meta.nombreFiscal, meta.codigo, meta.permiso].filter(Boolean)
    const altoTextoEstacion = lineasEstacion.length * lineHeightEstacion + paddingYEstacion * 2
    const rowHeight = Math.max(altoFilaBase, Math.ceil(altoTextoEstacion / item.productos.length))
    const blockHeight = rowHeight * item.productos.length

    return {
      ...item,
      meta,
      lineasEstacion,
      rowHeight,
      blockHeight
    }
  })

  const anchoTabla = colDestino + colEstacion + colProducto + fechas.length * colFecha
  const altoDatos = estacionesOrdenadas.reduce((total, item) => total + item.blockHeight, 0)
  const altoTabla = altoTitulo + altoMes + altoDia + altoHeader + altoDatos
  const anchoMinimo = soloUnProducto ? 980 : modoCompacto ? 980 : 0
  const altoMinimo = soloUnProducto ? 360 : modoCompacto ? 520 : 0
  const ancho = Math.max(anchoTabla + margen * 2, anchoMinimo)
  const alto = Math.max(altoTabla + margen * 2, altoMinimo)
  const escala = Math.max(2, Math.ceil(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')

  canvas.width = ancho * escala
  canvas.height = alto * escala
  canvas.style.width = `${ancho}px`
  canvas.style.height = `${alto}px`

  const ctx = canvas.getContext('2d')
  ctx.scale(escala, escala)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.textRendering = 'geometricPrecision'

  const x0 = Math.round((ancho - anchoTabla) / 2)
  let y = Math.round((alto - altoTabla) / 2)
  const xFechas = x0 + colDestino + colEstacion + colProducto

  dibujarCeldaCanvas(ctx, x0, y, colDestino + colEstacion + colProducto, altoTitulo + altoMes + altoDia, {
    fondo: '#ffffff',
    borde: '#000000',
    texto: ['PROGRAMACIÓN DE PIPAS', 'GRUPO ARY GASOLINERAS'],
    font: soloUnProducto ? 'bold 21px Arial' : modoCompacto ? 'bold 19px Arial' : 'bold 16px Arial',
    color: '#000000',
    lineHeight: soloUnProducto ? 24 : modoCompacto ? 22 : 19
  })

  fechas.forEach((fecha, index) => {
    const x = xFechas + index * colFecha

    dibujarCeldaCanvas(ctx, x, y, colFecha, altoTitulo, {
      fondo: '#f8f7fb',
      borde: '#000000',
      texto: diaSemana(fecha).toUpperCase(),
      font: soloUnProducto ? 'bold 16px Arial' : modoCompacto ? 'bold 15px Arial' : '13px Arial',
      color: '#000000'
    })

    dibujarCeldaCanvas(ctx, x, y + altoTitulo, colFecha, altoMes, {
      fondo: '#ffffff',
      borde: '#000000',
      texto: meses[fechaLocal(fecha).getMonth()],
      font: soloUnProducto ? 'bold 16px Arial' : modoCompacto ? 'bold 15px Arial' : '13px Arial',
      color: '#000000'
    })

    dibujarCeldaCanvas(ctx, x, y + altoTitulo + altoMes, colFecha, altoDia, {
      fondo: '#ffffff',
      borde: '#000000',
      texto: String(fechaLocal(fecha).getDate()),
      font: soloUnProducto ? 'bold 24px Arial' : modoCompacto ? 'bold 21px Arial' : '18px Arial',
      color: '#000000'
    })
  })

  y += altoTitulo + altoMes + altoDia

  dibujarCeldaCanvas(ctx, x0, y, colDestino, altoHeader, {
    fondo: '#d9d9d9',
    borde: '#000000',
    texto: 'DESTINO',
    font: soloUnProducto ? 'bold 16px Arial' : modoCompacto ? 'bold 15px Arial' : '14px Arial',
    color: '#000000'
  })

  dibujarCeldaCanvas(ctx, x0 + colDestino, y, colEstacion, altoHeader, {
    fondo: '#d9d9d9',
    borde: '#000000',
    texto: 'ESTACION',
    font: soloUnProducto ? 'bold 16px Arial' : modoCompacto ? 'bold 15px Arial' : '14px Arial',
    color: '#000000'
  })

  dibujarCeldaCanvas(ctx, x0 + colDestino + colEstacion, y, colProducto, altoHeader, {
    fondo: '#d9d9d9',
    borde: '#000000',
    texto: 'PRODUCTO',
    font: soloUnProducto ? 'bold 16px Arial' : modoCompacto ? 'bold 15px Arial' : '14px Arial',
    color: '#000000'
  })

  fechas.forEach((_, index) => {
    dibujarCeldaCanvas(ctx, xFechas + index * colFecha, y, colFecha, altoHeader, {
      fondo: '#d9d9d9',
      borde: '#000000'
    })
  })

  y += altoHeader

  estacionesOrdenadas.forEach(item => {
    const meta = item.meta
    const productosOrdenados = item.productos
    const altoBloque = item.blockHeight
    const altoFila = item.rowHeight

    dibujarCeldaCanvas(ctx, x0, y, colDestino, altoBloque, {
      fondo: COLOR_EXPORT_BLANCO,
      borde: '#000000',
      texto: meta.destino,
      font: soloUnProducto ? 'bold 24px Arial' : modoCompacto ? 'bold 21px Arial' : 'bold 18px Arial',
      color: '#000000'
    })

    dibujarCeldaCanvas(ctx, x0 + colDestino, y, colEstacion, altoBloque, {
      fondo: COLOR_EXPORT_BLANCO,
      borde: '#000000',
      texto: item.lineasEstacion,
      font: soloUnProducto ? '14px Arial' : modoCompacto ? '13px Arial' : '12px Arial',
      color: '#000000',
      lineHeight: lineHeightEstacion,
      paddingY: paddingYEstacion,
      padding: 8,
      wrap: true
    })

    productosOrdenados.forEach((producto, i) => {
      const yFila = y + i * altoFila
      const key = productoKey(producto.nombre)

      dibujarCeldaCanvas(ctx, x0 + colDestino + colEstacion, yFila, colProducto, altoFila, {
        fondo: i % 2 === 0 ? COLOR_EXPORT_LILA : COLOR_EXPORT_BLANCO,
        borde: '#000000',
        texto: key === 'DIESEL' ? 'DIÉSEL' : key,
        font: soloUnProducto ? 'bold 18px Arial' : modoCompacto ? 'bold 16px Arial' : 'bold 13px Arial',
        color: '#000000'
      })

      fechas.forEach((fecha, index) => {
        const compra = compraDiaEnLista(compras, item.estacion, producto, fecha)
        const valor = compra > 0 ? valorCompraImagen(compra) : ''

        dibujarCeldaCanvas(ctx, xFechas + index * colFecha, yFila, colFecha, altoFila, {
          fondo: index % 2 === 0 ? COLOR_EXPORT_LILA : COLOR_EXPORT_BLANCO,
          borde: '#000000',
          texto: valor,
          font: valor ? (soloUnProducto ? 'bold 24px Arial' : modoCompacto ? 'bold 19px Arial' : '13px Arial') : '13px Arial',
          color: '#000000'
        })
      })
    })

    y += altoBloque
  })

  return canvas
}


function canvasABlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1))
}

async function buscarImagenCompras() {
  const rango = obtenerRangoImagenCompras()
  if (!rango) return null

  const boton = $('#btnBuscarImagenCompras')
  const textoOriginal = boton ? boton.textContent : 'Buscar'

  try {
    if (boton) {
      boton.disabled = true
      boton.textContent = 'Buscando...'
    }

    notify(`Buscando compras: ${fechaBonita(rango.inicio)} a ${fechaBonita(rango.fin)}`)
    const compras = await cargarComprasParaImagen(rango.inicio, rango.fin)
    const comprasFiltradas = compras.filter(item => {
      const fecha = String(item.fecha_compra || item.fecha || '').slice(0, 10)
      return fecha >= rango.inicio && fecha <= rango.fin
    })

    const hayCompras = comprasFiltradas.some(item => numberValue(item.litros_compra ?? item.compra ?? item.litros) > 0)

    state.imagenCompras = {
      inicio: rango.inicio,
      fin: rango.fin,
      compras: hayCompras ? comprasFiltradas : [],
      buscado: true
    }

    actualizarResumenRangoImagenCompras()

    if (!hayCompras) {
      notify('No hay compras en ese rango')
      return state.imagenCompras
    }

    notify(`Búsqueda lista: ${fechaBonita(rango.inicio)} a ${fechaBonita(rango.fin)}`)
    return state.imagenCompras
  } catch (error) {
    console.error('ERROR BUSCAR IMAGEN COMPRAS:', error)
    notify(error.message || 'No se pudo buscar compras')
    return null
  } finally {
    if (boton) {
      boton.disabled = false
      boton.textContent = textoOriginal
    }
  }
}

async function generarImagenCompras(accion = 'copiar') {
  const rango = obtenerRangoImagenCompras()
  if (!rango) return

  notify('Preparando imagen de compras...')
  const compras = await cargarComprasParaImagen(rango.inicio, rango.fin)
  const hayCompras = compras.some(item => numberValue(item.litros_compra ?? item.compra ?? item.litros) > 0)

  if (!hayCompras) {
    notify('No hay compras en ese rango')
    return
  }

  const canvas = crearCanvasImagenCompras(rango.inicio, rango.fin, compras)

  if (!canvas) {
    notify('No hay compras para las estaciones de este reporte en ese rango')
    return
  }

  const blob = await canvasABlob(canvas)

  if (!blob) {
    notify('No se pudo crear la imagen')
    return
  }

  if (accion === 'copiar' && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      notify('Imagen copiada. Ya puedes pegarla en tu PDF')
      return
    } catch (error) {
      console.warn('No se pudo copiar imagen, se descargará PNG:', error)
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivoImagenCompras(rango.inicio, rango.fin)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify(accion === 'copiar' ? 'Tu navegador no permitió copiar; descargué el PNG' : 'Imagen descargada')
}

function nombreArchivoProgramacionPipas(extension, inicio, fin) {
  return `programacion_pipas_${inicio}_a_${fin}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

function mesMayuscula(fechaISO) {
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
  return meses[fechaLocal(fechaISO).getMonth()] || ''
}

function textoProductoProgramacion(producto) {
  const key = productoKey(producto.nombre)
  return key === 'DIESEL' ? 'DIÉSEL' : key
}

function productosOrdenadosProgramacion(productos) {
  const productoOrden = { MAGNA: 1, PREMIUM: 2, DIESEL: 3 }
  return [...productos].sort((a, b) => {
    return (productoOrden[productoKey(a.nombre)] || 99) - (productoOrden[productoKey(b.nombre)] || 99)
  })
}

function estacionesProgramacionPipas(compras, inicio, fin) {
  const fechas = rangoFechas(inicio, fin)

  return estacionesImagenCompras()
    .map(estacion => {
      const productos = productosOrdenadosProgramacion(estacion.productos)
        .filter(producto => fechas.some(fecha => compraDiaEnLista(compras, estacion, producto, fecha) > 0))

      return { estacion, meta: metaCompraEstacion(estacion), productos }
    })
    .filter(item => item.productos.length > 0)
}

async function obtenerDatosProgramacionPipasExportacion() {
  const inicio = state.fechaInicio || state.fechaBase || fechaHoyISO()
  const fin = state.fechaFin || proximoLunes(inicio)
  const fechas = rangoFechas(inicio, fin)
  const compras = await cargarComprasParaImagen(inicio, fin)
  const comprasFiltradas = compras.filter(item => {
    const fecha = String(item.fecha_compra || item.fecha || '').slice(0, 10)
    return fecha >= inicio && fecha <= fin
  })
  const estacionesExportacion = estacionesProgramacionPipas(comprasFiltradas, inicio, fin)

  if (!estacionesExportacion.length) {
    notify(`No hay compras para exportar de ${fechaBonita(inicio)} a ${fechaBonita(fin)}`)
    return null
  }

  return {
    inicio,
    fin,
    fechas,
    compras: comprasFiltradas,
    estaciones: estacionesExportacion
  }
}

function estilosProgramacionPipasExportacion(tipo = 'pdf') {
  const esExcel = tipo === 'excel'

  return `
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: ${esExcel ? '10px' : '0'};
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
      }
      .programacion-wrap {
        width: 100%;
        margin: 0 auto;
      }
      .programacion-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 2px solid #000000;
      }
      .programacion-table th,
      .programacion-table td {
        border: 1px solid #000000;
        padding: 8px 7px;
        text-align: center;
        vertical-align: middle;
        color: #000000;
        font-weight: 700;
        mso-number-format: "\\@";
      }
      .programacion-titulo {
        height: 108px;
        background: #ffffff;
        color: #000000;
        font-weight: 900;
        letter-spacing: .02em;
      }
      .programacion-titulo-contenido {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        line-height: 1.15;
      }
      .programacion-logo {
        width: 74px;
        height: 58px;
        object-fit: contain;
      }
      .programacion-titulo-principal {
        display: block;
        font-size: 24px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .programacion-titulo-secundario {
        display: block;
        margin-top: 4px;
        font-size: 15px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .fecha-dia-semana {
        background: #f8f7fb;
        font-size: 14px;
        text-transform: uppercase;
      }
      .fecha-mes {
        background: #ffffff;
        font-size: 14px;
        text-transform: uppercase;
      }
      .fecha-dia-numero {
        background: #ffffff;
        font-size: 23px;
      }
      .header-cell {
        background: #d9d9d9;
        font-size: 14px;
        text-transform: uppercase;
        font-weight: 900;
      }
      .destino-cell,
      .estacion-cell {
        background: #ffffff;
        color: #000000;
      }
      .destino-cell {
        font-size: 24px;
        font-weight: 900;
      }
      .estacion-cell {
        font-size: 13px;
        line-height: 1.35;
      }
      .producto-cell {
        color: #000000;
        font-size: 16px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .col-lila { background: #e8e2ee; }
      .col-blanca { background: #ffffff; }
      .cantidad-cell {
        font-size: 22px;
        font-weight: 900;
      }
      .print-hint {
        margin: 10px 0 0;
        color: #64748b;
        font-size: 10px;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    </style>
  `
}

function encabezadoProgramacionPipasHtml(colspanBase) {
  return `
    <div class="programacion-titulo-contenido">
      <img class="programacion-logo" src="${LOGO_SRC}" alt="ARY">
      <div>
        <span class="programacion-titulo-principal">PROGRAMACIÓN DE PIPAS</span>
        <span class="programacion-titulo-secundario">GRUPO ARY GASOLINERAS</span>
      </div>
    </div>
  `
}

function tablaProgramacionPipasHtml(datos) {
  const fechas = datos.fechas
  const colFechas = fechas.map(() => '<col style="width:95px;">').join('')
  const encabezadoFechasDia = fechas.map(fecha => `
    <td class="fecha-dia-semana">${escaparHTML(diaSemana(fecha).toUpperCase())}</td>
  `).join('')
  const encabezadoFechasMes = fechas.map(fecha => `
    <td class="fecha-mes">${escaparHTML(mesMayuscula(fecha))}</td>
  `).join('')
  const encabezadoFechasNumero = fechas.map(fecha => `
    <td class="fecha-dia-numero">${fechaLocal(fecha).getDate()}</td>
  `).join('')
  const encabezadoFechasVacio = fechas.map(() => '<td class="header-cell"></td>').join('')

  const filas = datos.estaciones.map(item => {
    const lineasEstacion = [item.meta.nombreFiscal, item.meta.codigo, item.meta.permiso]
      .filter(Boolean)
      .map(linea => `<div>${escaparHTML(linea)}</div>`)
      .join('')

    return item.productos.map((producto, index) => {
      const celdasFijas = index === 0 ? `
        <td class="destino-cell" rowspan="${item.productos.length}">${escaparHTML(item.meta.destino)}</td>
        <td class="estacion-cell" rowspan="${item.productos.length}">${lineasEstacion}</td>
      ` : ''

      const productoClase = index % 2 === 0 ? 'col-lila' : 'col-blanca'
      const celdasFechas = fechas.map((fecha, fechaIndex) => {
        const compra = compraDiaEnLista(datos.compras, item.estacion, producto, fecha)
        const valor = compra > 0 ? valorCompraImagen(compra) : ''
        const clase = fechaIndex % 2 === 0 ? 'col-lila' : 'col-blanca'

        return `<td class="cantidad-cell ${clase}">${escaparHTML(valor)}</td>`
      }).join('')

      return `
        <tr>
          ${celdasFijas}
          <td class="producto-cell ${productoClase}">${escaparHTML(textoProductoProgramacion(producto))}</td>
          ${celdasFechas}
        </tr>
      `
    }).join('')
  }).join('')

  return `
    <div class="programacion-wrap">
      <table class="programacion-table">
        <colgroup>
          <col style="width:92px;">
          <col style="width:360px;">
          <col style="width:115px;">
          ${colFechas}
        </colgroup>
        <tbody>
          <tr>
            <td class="programacion-titulo" colspan="3" rowspan="3">${encabezadoProgramacionPipasHtml(3)}</td>
            ${encabezadoFechasDia}
          </tr>
          <tr>${encabezadoFechasMes}</tr>
          <tr>${encabezadoFechasNumero}</tr>
          <tr>
            <td class="header-cell">DESTINO</td>
            <td class="header-cell">ESTACIÓN</td>
            <td class="header-cell">PRODUCTO</td>
            ${encabezadoFechasVacio}
          </tr>
          ${filas}
        </tbody>
      </table>
    </div>
  `
}

function htmlProgramacionPipasExportacion(tipo = 'pdf', datos) {
  const titulo = `Programación de Pipas ${fechaBonita(datos.inicio)} - ${fechaBonita(datos.fin)}`

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escaparHTML(titulo)}</title>
  ${estilosProgramacionPipasExportacion(tipo)}
</head>
<body>
  ${tablaProgramacionPipasHtml(datos)}
  ${tipo === 'pdf' ? '<p class="print-hint no-print">En la ventana de impresión selecciona “Guardar como PDF”.</p>' : ''}
</body>
</html>`
}

async function exportarExcel() {
  try {
    notify('Preparando Excel de programación...')
    const datos = await obtenerDatosProgramacionPipasExportacion()
    if (!datos) return

    const html = `\ufeff${htmlProgramacionPipasExportacion('excel', datos)}`
    descargarArchivo(
      nombreArchivoProgramacionPipas('xls', datos.inicio, datos.fin),
      html,
      'application/vnd.ms-excel;charset=utf-8'
    )
    notify('Excel generado')
  } catch (error) {
    console.error('ERROR EXPORTAR EXCEL PROGRAMACION:', error)
    notify(error.message || 'No se pudo generar el Excel')
  }
}

async function exportarPDF() {
  const ventana = window.open('', '_blank')

  if (!ventana) {
    notify('Permite ventanas emergentes para exportar PDF')
    return
  }

  ventana.document.open()
  ventana.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Generando PDF</title></head><body style="font-family:Arial;padding:24px;">Generando programación de pipas...</body></html>')
  ventana.document.close()

  try {
    notify('Preparando PDF de programación...')
    const datos = await obtenerDatosProgramacionPipasExportacion()

    if (!datos) {
      ventana.close()
      return
    }

    ventana.document.open()
    ventana.document.write(htmlProgramacionPipasExportacion('pdf', datos))
    ventana.document.close()
    ventana.focus()

    setTimeout(() => {
      ventana.print()
    }, 500)

    notify('PDF listo para guardar')
  } catch (error) {
    console.error('ERROR EXPORTAR PDF PROGRAMACION:', error)
    ventana.close()
    notify(error.message || 'No se pudo generar el PDF')
  }
}

function enlazarEventos() {
  $('#btnCargar').addEventListener('click', async () => {
    state.fechaBase = $('#fechaBase').value || fechaHoyISO()
    state.historialSemanas = []
    aplicarSiguienteSemana()
    await cargarDatos()
  })

  const exportRobot = $('#exportRobot')
  const exportRobotToggle = $('#exportRobotToggle')
  const exportRobotClose = $('#exportRobotClose')
  const exportRobotRestore = $('#exportRobotRestore')
  const btnRobotExcel = $('#btnRobotExcel')
  const btnRobotPDF = $('#btnRobotPDF')
  const btnRobotImagen = $('#btnRobotImagen')
  const modalImagenCompras = $('#modalImagenCompras')
  const btnCerrarImagenCompras = $('#btnCerrarImagenCompras')
  const btnBuscarImagenCompras = $('#btnBuscarImagenCompras')
  const btnCopiarImagenCompras = $('#btnCopiarImagenCompras')
  const btnDescargarImagenCompras = $('#btnDescargarImagenCompras')

  if (exportRobot && localStorage.getItem(ROBOT_EXPORT_STORAGE_KEY) === '1') {
    exportRobot.classList.add('hidden')
  }

  if (exportRobotToggle && exportRobot) {
    exportRobotToggle.addEventListener('click', () => {
      exportRobot.classList.toggle('collapsed')
    })
  }

  if (exportRobotClose && exportRobot) {
    exportRobotClose.addEventListener('click', () => {
      exportRobot.classList.add('hidden')
      exportRobot.classList.remove('collapsed')
      localStorage.setItem(ROBOT_EXPORT_STORAGE_KEY, '1')
    })
  }

  if (exportRobotRestore && exportRobot) {
    exportRobotRestore.addEventListener('click', () => {
      exportRobot.classList.remove('hidden')
      exportRobot.classList.remove('collapsed')
      localStorage.removeItem(ROBOT_EXPORT_STORAGE_KEY)
    })
  }

  if (btnRobotExcel) {
    btnRobotExcel.addEventListener('click', exportarExcel)
  }

  if (btnRobotPDF) {
    btnRobotPDF.addEventListener('click', exportarPDF)
  }

  if (btnRobotImagen) {
    btnRobotImagen.addEventListener('click', abrirModalImagenCompras)
  }

  if (btnCerrarImagenCompras) {
    btnCerrarImagenCompras.addEventListener('click', cerrarModalImagenCompras)
  }

  if (modalImagenCompras) {
    modalImagenCompras.addEventListener('click', event => {
      if (event.target === modalImagenCompras) cerrarModalImagenCompras()
    })
  }

  if (btnBuscarImagenCompras) {
    btnBuscarImagenCompras.addEventListener('click', buscarImagenCompras)
  }

  if (btnCopiarImagenCompras) {
    btnCopiarImagenCompras.addEventListener('click', () => generarImagenCompras('copiar'))
  }

  if (btnDescargarImagenCompras) {
    btnDescargarImagenCompras.addEventListener('click', () => generarImagenCompras('descargar'))
  }

  $('#contenedorPipas').addEventListener('click', async event => {
    const botonSemana = event.target.closest('[data-week-nav]')
    if (!botonSemana) return

    moverSemana(Number(botonSemana.dataset.weekNav || 0))
    await cargarDatos()
  })

  $('#contenedorPipas').addEventListener('focusin', event => {
    const input = event.target.closest('.compra-input')
    if (!input || input.disabled) return
    prepararInputNumero(input)
  })

  $('#contenedorPipas').addEventListener('focusout', async event => {
    const input = event.target.closest('.compra-input')
    if (!input || input.disabled) return
    formatearInputNumero(input)

    if (input.dataset.compra === '1') {
      try {
        await guardarCompra(input)
      } catch (error) {
        notify(error.message || 'No se pudo guardar la compra')
      }
    }
  })
}

async function iniciarPipas() {
  state.fechaBase = fechaHoyISO()
  aplicarSiguienteSemana()
  inyectarEstilos()
  crearLayout()
  crearMenuLateral()
  enlazarEventos()
  render()
  await cargarDatos()
  iniciarRefrescoPolaris()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPipas)
} else {
  iniciarPipas()
}
