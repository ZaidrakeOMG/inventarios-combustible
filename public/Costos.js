function agrandarFechaCostos() {
  if (document.querySelector('#costosFechaGrandeStyle')) return

  const css = document.createElement('style')
  css.id = 'costosFechaGrandeStyle'
  css.textContent = `
    .station-header small,
    .station-title small,
    .card-title small,
    .station-card small {
      opacity: .95 !important;
      font-size: 18px !important;
      font-weight: 900 !important;
      letter-spacing: .02em !important;
    }
  `

  document.head.appendChild(css)
}

agrandarFechaCostos()

console.log('costos.js v11 encabezado GRUPO ARY GASOLINERAS, reporte grande y PDF vertical')

const LOGO_SRC = '/imagenes/logo-ary.jpeg'

const PRODUCTOS = ['MAGNA', 'PREMIUM', 'DIESEL']
const PRODUCTO_LABEL = {
  MAGNA: 'MAGNA',
  PREMIUM: 'PREMIUM',
  DIESEL: 'DIESEL'
}
const ORDEN_ESTACIONES = ['ARY III', 'ARY IV', 'ARY VI', '__SEPARADOR_1__', 'ARY I', 'APACHE', '__SEPARADOR_2__', 'ARY II', 'ARY V']
const VARIACION_MINIMA_CU = 0.005
const VARIACION_MINIMA_INV = 1
const VARIACION_CU_GRANDE = 0.01
const VARIACION_CU_MAXIMA_NORMAL = 1
const VARIACION_INV_GRANDE_LITROS = 5000
const VARIACION_INV_GRANDE_PORCENTAJE = 20
const DIAS_BUSQUEDA_CU = 120

const state = {
  fecha: '',
  registros: [],
  registrosAnterior: [],
  registrosDosDiasAntes: [],
  cargando: false,
  mostrarDetalle: false
}

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
  const [a, m, d] = String(fechaISO || '').slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  }
  return new Date(a, m - 1, d)
}

function fechaMasDiasISO(fechaISO, dias) {
  const fecha = fechaLocal(fechaISO)
  fecha.setDate(fecha.getDate() + Number(dias || 0))
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function esJueves(fechaISO) {
  return fechaLocal(fechaISO).getDay() === 4
}

function fechaComparacionCUISO(fechaISO) {
  return esJueves(fechaISO) ? fechaMasDiasISO(fechaISO, -7) : ''
}

function fechasRangoISO(desdeISO, hastaISO) {
  const desde = fechaLocal(desdeISO)
  const hasta = fechaLocal(hastaISO)

  if (desde > hasta) return []

  const fechas = []
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())

  while (cursor <= hasta) {
    const año = cursor.getFullYear()
    const mes = String(cursor.getMonth() + 1).padStart(2, '0')
    const dia = String(cursor.getDate()).padStart(2, '0')
    fechas.push(`${año}-${mes}-${dia}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return fechas
}

function fechaLarga(fechaISO) {
  const fecha = fechaLocal(fechaISO)

  const dias = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ]

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

function fechaBonita(fechaISO) {
  if (!fechaISO) return ''
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  const partes = String(fechaISO).slice(0, 10).split('-')
  if (partes.length !== 3) return fechaISO
  return `${Number(partes[2])}/${meses[Number(partes[1]) - 1]}/${partes[0]}`
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

function nombreEstacionCorto(nombre, idEstacion) {
  const id = Number(idEstacion)
  const texto = normalizarTexto(nombre)

  if (texto.includes('APACHE')) return 'APACHE'
  if (id >= 1 && id <= 6) return `ARY ${romano(id)}`
  if (texto.includes('VI')) return 'ARY VI'
  if (texto.includes('V')) return 'ARY V'
  if (texto.includes('IV')) return 'ARY IV'
  if (texto.includes('III')) return 'ARY III'
  if (texto.includes('II')) return 'ARY II'
  if (texto.includes('I')) return 'ARY I'

  return String(nombre || '').trim() || `ESTACIÓN ${id || ''}`.trim()
}

function romano(numero) {
  const mapa = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI'
  }
  return mapa[Number(numero)] || String(numero || '')
}

function claseEstacion(nombre, idEstacion) {
  const id = Number(idEstacion)
  if (id === 1) return 'ary-1'
  if (id === 2) return 'ary-2'
  if (id === 3) return 'ary-3'
  if (id === 4) return 'ary-4'
  if (id === 5) return 'ary-5'
  if (id === 6) return 'ary-6'

  const texto = normalizarTexto(nombre)
  if (texto.includes('APACHE')) return 'apache'
  return 'default'
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0

  let limpio = String(value)
    .trim()
    .replace(/\s+/g, '')

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
    const puntos = (limpio.match(/\./g) || []).length

    if (puntos > 1) {
      limpio = limpio.replace(/\./g, '')
    }
  }

  if (negativo) limpio = `-${limpio}`

  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}

function redondearDecimal(valor, decimales = 2) {
  const n = numberValue(valor)
  const factor = 10 ** Number(decimales || 0)
  return Math.round((n + Number.EPSILON) * factor) / factor
}

function formatoNumero(n, decimales = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: true
  }).format(numberValue(n))
}

function litros(n) {
  return formatoNumero(numberValue(n), 0)
}

function litros3(n) {
  return formatoNumero(numberValue(n), 3)
}

function dinero(n, decimales = 2) {
  return `$${formatoNumero(numberValue(n), decimales)}`
}

function costo(n, decimales = 2) {
  return `$${formatoNumero(numberValue(n), decimales)}`
}

function costo2(n) {
  return formatoNumero(numberValue(n), 2)
}

function valorCero(valor) {
  return numberValue(valor) === 0
}

function claseCero(valor) {
  return valorCero(valor) ? 'zero-muted' : ''
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
  clearTimeout(window.__toastCostosTimer)
  window.__toastCostosTimer = setTimeout(() => toast.classList.remove('show'), 2600)
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = 120000, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(urlNoCacheCostos(url), {
      ...fetchOptions,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        ...(fetchOptions.headers || {})
      }
    })

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
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Tiempo agotado al cargar la información')
    }

    throw error
  } finally {
    clearTimeout(timer)
  }
}


function urlNoCacheCostos(url) {
  const separador = String(url).includes('?') ? '&' : '?'
  return `${url}${separador}_=${Date.now()}`
}

function normalizarRespuestaLista(respuesta) {
  if (Array.isArray(respuesta)) return respuesta
  if (respuesta && Array.isArray(respuesta.registros)) return respuesta.registros
  if (respuesta && Array.isArray(respuesta.data)) return respuesta.data
  if (respuesta && respuesta.data && Array.isArray(respuesta.data.registros)) return respuesta.data.registros
  if (respuesta && Array.isArray(respuesta.recordset)) return respuesta.recordset
  if (respuesta && Array.isArray(respuesta.rows)) return respuesta.rows
  if (respuesta && Array.isArray(respuesta.resultado)) return respuesta.resultado
  return []
}

function totalDetalleNumero(items, campo) {
  if (!Array.isArray(items)) return 0

  return items.reduce((total, item) => total + numberValue(item?.[campo]), 0)
}

function totalImporteInventario(row) {
  const totalDetalle = totalDetalleNumero(row?.precios, 'importe')

  if (totalDetalle > 0) return totalDetalle

  return numberValue(row?.entrada_compra_real)
}

function totalLitrosCompraInventario(row) {
  const totalDetalle = totalDetalleNumero(row?.compras, 'litros')

  if (totalDetalle > 0) return totalDetalle

  return numberValue(row?.litros_compra)
}

function totalLitrosPrecioInventario(row) {
  const totalSubLitros = totalDetalleNumero(row?.sub_litros_compra, 'litros')

  if (totalSubLitros > 0) return totalSubLitros

  return totalLitrosCompraInventario(row)
}

function precioRealDesdeInventario(row) {
  const importe = totalImporteInventario(row)
  const litrosPrecio = totalLitrosPrecioInventario(row)

  if (importe > 0 && litrosPrecio > 0) return importe / litrosPrecio

  if (numberValue(row?.precio_por_litro) > 0) return numberValue(row.precio_por_litro)
  if (numberValue(row?.precio_unitario) > 0) return numberValue(row.precio_unitario)
  if (numberValue(row?.precio_unitario_real) > 0) return numberValue(row.precio_unitario_real)
  if (numberValue(row?.precio_por_litro_real) > 0) return numberValue(row.precio_por_litro_real)

  return 0
}

function normalizarFilaInventario(row) {
  const precioUnitario = precioRealDesdeInventario(row)
  const entradaReal = totalImporteInventario(row)
  const litrosCompra = totalLitrosCompraInventario(row)
  const costoPromedio = numberValue(row.costo_promedio) > 0
    ? numberValue(row.costo_promedio)
    : 0

  return {
    ...row,
    id_estacion: row.id_estacion,
    estacion: row.estacion ?? row.nombre_estacion,
    id_producto: row.id_producto,
    producto: row.producto ?? row.nombre_producto,
    litros_compra: litrosCompra,
    venta: Math.floor(numberValue(row.venta)),
    inventario_final: numberValue(row.inventario_tabla) > 0 ? numberValue(row.inventario_tabla) : numberValue(row.inventario_mostrado) > 0 ? numberValue(row.inventario_mostrado) : numberValue(row.inventario_final),
    inventario_tabla: numberValue(row.inventario_tabla),
    inventario_mostrado: numberValue(row.inventario_mostrado),
    precio_unitario_real: precioUnitario,
    precio_por_litro_real: precioUnitario,
    precio_por_litro: precioUnitario,
    entrada_compra_real: entradaReal,
    precio_unitario: precioUnitario,
    costo_promedio: costoPromedio,
    entrada: numberValue(row.entrada),
    salida: numberValue(row.salida),
    existencia: numberValue(row.existencia)
  }
}

function llaveInventarioPorId(row) {
  const idEstacion = row?.id_estacion
  const idProducto = row?.id_producto

  if (idEstacion === undefined || idEstacion === null || idProducto === undefined || idProducto === null) return ''

  return `${Number(idEstacion)}|${Number(idProducto)}`
}

function llaveInventarioPorNombre(row) {
  const estacion = nombreEstacionCorto(row?.estacion ?? row?.nombre_estacion, row?.id_estacion)
  const producto = productoKey(row?.producto ?? row?.nombre_producto)
  return `${estacion}|${producto}`
}

function crearIndiceInventarios(inventarios) {
  const porId = new Map()
  const porNombre = new Map()

  inventarios.map(normalizarFilaInventario).forEach(row => {
    const llaveId = llaveInventarioPorId(row)
    const llaveNombre = llaveInventarioPorNombre(row)

    if (llaveId) porId.set(llaveId, row)
    if (llaveNombre) porNombre.set(llaveNombre, row)
  })

  return { porId, porNombre }
}

function buscarInventarioParaRow(row, indice) {
  const llaveId = llaveInventarioPorId(row)
  const llaveNombre = llaveInventarioPorNombre(row)

  return indice.porId.get(llaveId) || indice.porNombre.get(llaveNombre) || null
}

function recalcularCostosConFormula(row, inventario, entrada, ltsCompra, venta) {
  const existenciaAnterior = numberValue(row.existencia_anterior)
  const unidadesAnteriores = numberValue(row.existencia_unidades_anterior)

  if (existenciaAnterior <= 0 || unidadesAnteriores <= 0) {
    return {
      entrada,
      salida: numberValue(row.salida),
      existencia: numberValue(row.existencia),
      costoPromedio: numberValue(row.costo_promedio)
    }
  }

  if (ltsCompra > 0 && entrada > 0) {
    const unidadesMovimiento = unidadesAnteriores + ltsCompra
    const existenciaMovimiento = existenciaAnterior + entrada
    const costoPromedio = unidadesMovimiento > 0 ? existenciaMovimiento / unidadesMovimiento : 0
    const salida = venta * costoPromedio
    const existencia = existenciaMovimiento - salida

    return {
      entrada,
      salida,
      existencia,
      costoPromedio
    }
  }

  const costoPromedio = numberValue(row.costo_promedio_anterior) > 0
    ? numberValue(row.costo_promedio_anterior)
    : numberValue(row.costo_promedio) > 0
      ? numberValue(row.costo_promedio)
      : existenciaAnterior / unidadesAnteriores
  const salida = venta * costoPromedio
  const existencia = existenciaAnterior - salida

  return {
    entrada: 0,
    salida,
    existencia,
    costoPromedio
  }
}

function fusionarCostosConInventarios(costos, inventarios) {
  const indice = crearIndiceInventarios(inventarios)
  const salida = []
  const usadosId = new Set()
  const usadosNombre = new Set()

  costos.forEach(row => {
    const inventario = buscarInventarioParaRow(row, indice)
    const llaveId = llaveInventarioPorId(row)
    const llaveNombre = llaveInventarioPorNombre(row)

    if (llaveId) usadosId.add(llaveId)
    if (llaveNombre) usadosNombre.add(llaveNombre)

    const ltsCompra = inventario ? numberValue(inventario.litros_compra) : numberValue(row.litros_compra)
    const ventaBaseCostos = numberValue(row.venta)
    const ventaBaseInventario = inventario ? numberValue(inventario.venta) : 0
    const venta = ventaBaseCostos > 0
      ? Math.floor(ventaBaseCostos)
      : Math.floor(ventaBaseInventario)
    const inventarioTablaCostos = numberValue(row.inventario_tabla) > 0 ? numberValue(row.inventario_tabla) : numberValue(row.inventario_mostrado)
    const inventarioFinal = inventarioTablaCostos > 0 ? inventarioTablaCostos : inventario ? numberValue(inventario.inventario_final) : numberValue(row.inventario_final)
    const entradaRealInventario = inventario ? numberValue(inventario.entrada_compra_real) : 0
    const entradaCostos = numberValue(row.entrada)
    const precioInventario = numberValue(inventario?.precio_por_litro) > 0
      ? numberValue(inventario?.precio_por_litro)
      : numberValue(inventario?.precio_unitario)
    const precioRealCostos = numberValue(row.precio_unitario_real) > 0 ? numberValue(row.precio_unitario_real) : numberValue(row.precio_por_litro_real)
    const precioPorLitro = precioInventario > 0
      ? precioInventario
      : precioRealCostos > 0
        ? precioRealCostos
        : numberValue(row.precio_unitario) > 0
          ? numberValue(row.precio_unitario)
          : numberValue(row.precio_por_litro) > 0
            ? numberValue(row.precio_por_litro)
            : 0
    const entrada = entradaCostos > 0
      ? entradaCostos
      : ltsCompra > 0 && precioPorLitro > 0
        ? ltsCompra * precioPorLitro
        : 0

    const calculado = recalcularCostosConFormula(row, inventario, entrada, ltsCompra, venta)

    // IMPORTANTE:
    // Si el registro ya viene de CostosCompras, se respeta lo guardado en SQL.
    // El front NO recalcula visualmente salida, existencia ni costo promedio.
    const salidaPesos = tieneCampoNumerico(row, 'salida')
      ? numberValue(row.salida)
      : calculado.salida

    const existenciaPesos = tieneCampoNumerico(row, 'existencia')
      ? numberValue(row.existencia)
      : calculado.existencia

    const costoPromedio = tieneCampoNumerico(row, 'costo_promedio') && numberValue(row.costo_promedio) > 0
      ? numberValue(row.costo_promedio)
      : calculado.costoPromedio

    const entradaFinal = tieneCampoNumerico(row, 'entrada')
      ? numberValue(row.entrada)
      : calculado.entrada

    salida.push({
      ...row,
      estacion: row.estacion ?? row.nombre_estacion ?? inventario?.estacion,
      producto: row.producto ?? row.nombre_producto ?? inventario?.producto,
      litros_compra: ltsCompra,
      venta,
      inventario_final: inventarioFinal,
      inventario_tabla: inventarioFinal,
      inventario_mostrado: inventarioFinal,
      entrada: entradaFinal,
      salida: salidaPesos,
      existencia: existenciaPesos,
      entrada_compra_real: entradaRealInventario,
      precio_unitario_real: precioPorLitro,
      precio_por_litro_real: precioPorLitro,
      precio_por_litro: precioPorLitro,
      precio_unitario: precioPorLitro,
      costo_promedio: costoPromedio
    })
  })

  inventarios.map(normalizarFilaInventario).forEach(row => {
    const llaveId = llaveInventarioPorId(row)
    const llaveNombre = llaveInventarioPorNombre(row)

    if ((llaveId && usadosId.has(llaveId)) || (llaveNombre && usadosNombre.has(llaveNombre))) return

    salida.push(row)
  })

  return salida
}

function tieneCampoNumerico(row, campo) {
  return row && row[campo] !== null && row[campo] !== undefined && row[campo] !== ''
}

function valorPrecioUnitario(row) {
  if (!row) return 0
  if (tieneCampoNumerico(row, 'precio_unitario_real') && numberValue(row.precio_unitario_real) > 0) return numberValue(row.precio_unitario_real)
  if (tieneCampoNumerico(row, 'precio_por_litro_real') && numberValue(row.precio_por_litro_real) > 0) return numberValue(row.precio_por_litro_real)
  if (tieneCampoNumerico(row, 'precio_unitario') && numberValue(row.precio_unitario) > 0) return numberValue(row.precio_unitario)
  if (tieneCampoNumerico(row, 'precio_por_litro') && numberValue(row.precio_por_litro) > 0) return numberValue(row.precio_por_litro)
  return 0
}

function valorCU(row) {
  if (!row) return 0

  // En el reporte principal el CU debe salir del costo_promedio guardado/calculado,
  // no del precio unitario de compra. Así el 31/may muestra exactamente el Excel.
  if (tieneCampoNumerico(row, 'costo_promedio') && numberValue(row.costo_promedio) > 0) return numberValue(row.costo_promedio)

  // Solo si no existe costo_promedio, se usa precio unitario como respaldo.
  if (tieneCampoNumerico(row, 'precio_unitario_real') && numberValue(row.precio_unitario_real) > 0) return numberValue(row.precio_unitario_real)
  if (tieneCampoNumerico(row, 'precio_por_litro_real') && numberValue(row.precio_por_litro_real) > 0) return numberValue(row.precio_por_litro_real)
  if (tieneCampoNumerico(row, 'precio_unitario') && numberValue(row.precio_unitario) > 0) return numberValue(row.precio_unitario)
  if (tieneCampoNumerico(row, 'precio_por_litro') && numberValue(row.precio_por_litro) > 0) return numberValue(row.precio_por_litro)
  return 0
}

function compraValidaParaCU(row) {
  return numberValue(row?.litros_compra) > 0 && numberValue(row?.precio_por_litro) > 0
}

function crearMapaCUArrastrado() {
  return {
    porId: new Map(),
    porNombre: new Map()
  }
}

function guardarCUArrastrado(mapa, row) {
  if (!compraValidaParaCU(row)) return

  const normalizado = normalizarFilaInventario(row)
  const cu = numberValue(normalizado.precio_por_litro)
  const llaveId = llaveInventarioPorId(normalizado)
  const llaveNombre = llaveInventarioPorNombre(normalizado)

  if (llaveId && !mapa.porId.has(llaveId)) {
    mapa.porId.set(llaveId, cu)
  }

  if (llaveNombre && !mapa.porNombre.has(llaveNombre)) {
    mapa.porNombre.set(llaveNombre, cu)
  }
}

function obtenerCUArrastrado(mapa, row) {
  if (!row) return 0

  const llaveId = llaveInventarioPorId(row)
  const llaveNombre = llaveInventarioPorNombre(row)

  if (llaveId && mapa.porId.has(llaveId)) return numberValue(mapa.porId.get(llaveId))
  if (llaveNombre && mapa.porNombre.has(llaveNombre)) return numberValue(mapa.porNombre.get(llaveNombre))

  return 0
}

function crearObjetivosCU(registros) {
  const vistos = new Set()
  const objetivos = []

  registros.forEach(row => {
    const llaveId = llaveInventarioPorId(row)
    const llaveNombre = llaveInventarioPorNombre(row)
    const llave = llaveId || llaveNombre

    if (!llave || vistos.has(llave)) return

    vistos.add(llave)
    objetivos.push({ llaveId, llaveNombre })
  })

  return objetivos
}

function objetivosCUCompletos(objetivos, mapa) {
  if (!objetivos.length) return true

  return objetivos.every(objetivo => {
    if (objetivo.llaveId && mapa.porId.has(objetivo.llaveId)) return true
    if (objetivo.llaveNombre && mapa.porNombre.has(objetivo.llaveNombre)) return true
    return false
  })
}

function agregarInventariosAlMapaCU(mapa, inventarios) {
  normalizarRespuestaLista(inventarios).forEach(row => guardarCUArrastrado(mapa, row))
}

async function buscarCUArrastrado(fechaReferencia, registrosReferencia, inventariosFechaReferencia) {
  const mapa = crearMapaCUArrastrado()
  const objetivos = crearObjetivosCU(registrosReferencia)

  agregarInventariosAlMapaCU(mapa, inventariosFechaReferencia)

  let fechaBusqueda = fechaMasDiasISO(fechaReferencia, -1)

  for (let i = 1; i <= DIAS_BUSQUEDA_CU && !objetivosCUCompletos(objetivos, mapa); i++) {
    try {
      const respuesta = await fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fechaBusqueda)}`)
      agregarInventariosAlMapaCU(mapa, respuesta)
    } catch (error) {
      console.warn(`No se pudo revisar CU de ${fechaBusqueda}:`, error)
    }

    fechaBusqueda = fechaMasDiasISO(fechaBusqueda, -1)
  }

  return mapa
}

function aplicarCUArrastrado(registros, mapa) {
  registros.forEach(row => {
    const cu = obtenerCUArrastrado(mapa, row)

    if (cu <= 0) return

    row.precio_por_litro = cu
    row.precio_unitario = cu
    row.costo_promedio = cu
  })
}


function aplicarInventarioInicialDiaSiguiente(registros, inventariosSiguiente) {
  const indice = crearIndiceInventarios(normalizarRespuestaLista(inventariosSiguiente))

  registros.forEach(row => {
    const siguiente = buscarInventarioParaRow(row, indice)
    const inventarioInicialSiguiente = numberValue(siguiente?.inventario_inicial)

    if (inventarioInicialSiguiente > 0) {
      row.inventario_final = inventarioInicialSiguiente
      row.inventario_mostrado = inventarioInicialSiguiente
      row.inventario_fuente = 'INICIAL_DIA_SIGUIENTE'
    }
  })
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
      <a class="ary-sidebar-link" href="/costos.html" data-menu-link="costos.html">
        <span class="ary-sidebar-icon">💲</span>
        <span class="ary-sidebar-text">Costos Promedio</span>
      </a>
      <a class="ary-sidebar-link" href="/reportes.html" data-proximo="1">
        <span class="ary-sidebar-icon">📊</span>
        <span class="ary-sidebar-text">Reportes</span>
        <span class="ary-sidebar-badge">Próximo</span>
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

  const ruta = (location.pathname.split('/').pop() || 'index.html').toLowerCase()

  $$('.ary-sidebar-link', menu).forEach(link => {
    const href = link.getAttribute('href') || ''
    const archivo = (href.split('/').pop() || 'index.html').toLowerCase()

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
  if ($('#estilosCostosCompras')) return

  const css = document.createElement('style')
  css.id = 'estilosCostosCompras'
  css.textContent = `
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      background: linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #e8f7ef 100%);
      color: #111827;
      font-weight: 400;
    }

    .costos-app {
      width: min(1460px, calc(100% - 28px));
      margin: 0 auto;
      padding: 18px 0 34px;
    }

    .costos-hero {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      background: rgba(255, 255, 255, .9);
      border: 1px solid rgba(148, 163, 184, .35);
      box-shadow: 0 18px 50px rgba(15, 23, 42, .11);
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 14px;
      backdrop-filter: blur(12px);
    }

    .costos-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .costos-logo-mini {
      width: 78px;
      height: 58px;
      object-fit: contain;
      display: block;
    }

    .costos-eyebrow {
      margin: 0 0 6px;
      font-weight: 800;
      letter-spacing: .12em;
      color: #0f766e;
      font-size: 11px;
      text-transform: uppercase;
    }

    .costos-hero h1 {
      margin: 0;
      font-size: clamp(25px, 3vw, 38px);
      line-height: 1;
      color: #0f172a;
      font-weight: 900;
    }

    .costos-subtitle {
      margin: 8px 0 0;
      color: #64748b;
      font-weight: 600;
      font-size: 13px;
    }

    .costos-actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
      align-items: end;
      min-width: min(780px, 100%);
    }

    .costos-actions label {
      display: grid;
      gap: 5px;
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 900;
      letter-spacing: .04em;
    }

    .costos-actions input,
    .costos-actions select,
    .costos-btn {
      font: inherit;
    }

    .costos-actions input,
    .costos-actions select {
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 12px;
      padding: 10px 12px;
      outline: none;
      color: #0f172a;
      width: 100%;
      font-weight: 800;
    }

    .costos-actions input:focus,
    .costos-actions select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
    }

    .costos-btn {
      border: none;
      border-radius: 12px;
      padding: 11px 15px;
      cursor: pointer;
      background: #0f172a;
      color: #fff;
      box-shadow: 0 12px 22px rgba(15, 23, 42, .18);
      font-weight: 900;
      transition: transform .18s ease, box-shadow .18s ease;
      white-space: nowrap;
    }

    .costos-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 28px rgba(15, 23, 42, .20);
    }

    .costos-btn.azul {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
    }

    .costos-btn.verde {
      background: linear-gradient(135deg, #16a34a, #22c55e);
    }

    .costos-btn.gris {
      background: linear-gradient(135deg, #64748b, #334155);
    }

    .costos-btn.morado {
      background: linear-gradient(135deg, #7e22ce, #a855f7);
    }

    .reporte-card {
      background: #ffffff;
      border: 1px solid #d7dde7;
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, .10);
      padding: 16px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .reporte-scroll {
      width: 100%;
      overflow-x: auto;
    }

    .reporte-costo {
      width: 100%;
      min-width: 1040px;
      max-width: 1180px;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .reporte-header {
      display: grid;
      grid-template-columns: 300px 1fr;
      align-items: center;
      border: 2px solid #000000;
      border-bottom: 0;
      min-height: 108px;
    }

    .reporte-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 108px;
      padding: 10px 20px;
    }

    .reporte-logo img {
      width: 270px;
      max-width: 100%;
      height: 88px;
      object-fit: contain;
    }

    .reporte-titulo {
      text-align: center;
      font-family: Georgia, 'Times New Roman', serif;
      color: #000000;
      line-height: 1.15;
      padding: 10px 14px;
    }

    .reporte-titulo h2 {
      margin: 0 0 5px;
      font-size: 29px;
      font-weight: 900;
      letter-spacing: .035em;
      text-transform: uppercase;
    }

    .reporte-titulo .reporte-concepto {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .reporte-titulo .reporte-fecha {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .tabla-imagen {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 2px solid #000000;
      font-size: 16px;
      background: #ffffff;
    }

    .tabla-imagen th,
    .tabla-imagen td {
      border: 2px solid #000000;
      padding: 5px 8px;
      height: 42px;
      line-height: 1.12;
      color: #000000;
      text-align: center;
      vertical-align: middle;
      font-weight: 400;
      white-space: nowrap;
    }

    .tabla-imagen thead th {
      font-weight: 700;
      text-transform: uppercase;
    }

    .tabla-imagen .th-estacion {
      width: 112px;
      background: #ffffff;
    }

    .tabla-imagen .th-producto {
      color: #000000;
      font-weight: 800;
    }

    .tabla-imagen .th-magna {
      background: #00e676;
    }

    .tabla-imagen .th-premium {
      background: #ff7f83;
    }

    .tabla-imagen .th-diesel {
      background: #9a9a9a;
      color: #ffffff;
    }

    .tabla-imagen .th-sub {
      background: #ffffff;
      font-size: 15px;
      font-weight: 800;
    }

    .tabla-imagen .td-estacion {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      width: 112px;
    }

    .tabla-imagen .td-money {
      text-align: right;
      padding-right: 9px;
      font-variant-numeric: tabular-nums;
    }

    .tabla-imagen .td-litros {
      text-align: right;
      padding-right: 10px;
      font-variant-numeric: tabular-nums;
    }

    .tabla-imagen .td-con-mini {
      padding-top: 3px;
      padding-bottom: 3px;
      vertical-align: middle;
    }

    .tabla-imagen .valor-principal {
      display: block;
      font-size: 16px;
      line-height: 1.05;
      font-weight: 600;
    }

    .tabla-imagen .mini-variacion {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      line-height: 1.05;
      font-weight: 700;
      color: #3f3f46;
      letter-spacing: -.02em;
      white-space: nowrap;
    }

    .tabla-imagen .mini-variacion.subio {
      color: #14532d;
    }

    .tabla-imagen .mini-variacion.bajo {
      color: #7f1d1d;
    }

    .tabla-imagen .td-empty {
      background: #ffffff;
      color: transparent;
    }

    .tabla-imagen .fila-separador td {
      height: 22px;
      background: #ffffff;
    }

    .tabla-imagen .cambio-grande {
      background: #fff4b8 !important;
    }

    .tabla-imagen .seccion-gris {
      background: #c9c7c7 !important;
    }

    .tabla-imagen .variacion-label {
      text-align: left;
      padding-left: 12px;
      font-size: 15px;
      font-weight: 700;
    }

    .tabla-imagen .variacion-valor {
      text-align: right;
      padding-right: 10px;
      font-size: 15px;
      font-variant-numeric: tabular-nums;
    }

    .tabla-imagen .sin-borde-top td,
    .tabla-imagen .sin-borde-top th {
      border-top-width: 0;
    }

    .mensaje-reporte {
      padding: 14px;
      text-align: center;
      color: #64748b;
      font-weight: 800;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      margin-top: 12px;
    }

    .detalle-panel {
      display: none;
      margin-top: 18px;
    }

    .detalle-panel.visible {
      display: block;
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

    .station-title .fecha-larga-tabla {
      font-size: 13px !important;
      line-height: 1.15;
      text-align: right;
      white-space: normal !important;
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

    .costos-table {
      min-width: 980px;
    }

    .costos-table th {
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

    .costos-table td {
      padding: 9px 7px;
      border-bottom: 1px solid #edf2f7;
      vertical-align: middle;
      color: #0f172a;
      font-size: 13px;
      text-align: center;
      font-weight: 800;
      white-space: nowrap;
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

    .valor-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 104px;
      border-radius: 12px;
      padding: 7px 8px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-weight: 900;
    }

    .valor-pill.azul {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .valor-pill.naranja {
      background: #fff7ed;
      color: #c2410c;
      border-color: #fed7aa;
    }

    .valor-pill.rojo {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }

    .valor-pill.gris {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }

    .zero-muted {
      background: #e5e7eb !important;
      color: #9ca3af !important;
      border-color: #d1d5db !important;
    }

    .empty-state {
      padding: 24px;
      color: #64748b;
      font-weight: 800;
      text-align: center;
      background: rgba(255, 255, 255, .9);
      border: 1px solid rgba(148, 163, 184, .35);
      border-radius: 20px;
      box-shadow: 0 16px 45px rgba(15, 23, 42, .10);
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

    @page {
      size: letter portrait;
      margin: .18in;
    }

    @media print {
      html,
      body,
      .reporte-costo,
      .tabla-imagen,
      .tabla-imagen * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      html,
      body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      body {
        padding-left: 0 !important;
      }

      .ary-sidebar,
      .ary-mobile-menu-btn,
      .costos-hero,
      .detalle-panel,
      #toast {
        display: none !important;
      }

      .costos-app {
        width: 100% !important;
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .reporte-card {
        box-shadow: none !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
      }

      .reporte-scroll {
        overflow: visible !important;
      }

      .reporte-costo {
        width: 100% !important;
        max-width: 8.14in !important;
        min-width: 0 !important;
        margin: 0 auto !important;
      }

      .reporte-header {
        grid-template-columns: 1.62in 1fr !important;
        min-height: .88in !important;
      }

      .reporte-logo {
        height: .88in !important;
        padding: .05in .08in !important;
      }

      .reporte-logo img {
        width: 1.46in !important;
        height: .72in !important;
        object-fit: contain !important;
      }

      .reporte-titulo {
        padding: 5px 8px !important;
      }

      .reporte-titulo h2 {
        margin-bottom: 3px !important;
        font-size: 22px !important;
        font-weight: 900 !important;
      }

      .reporte-titulo .reporte-concepto {
        margin: 0 0 2px !important;
        font-size: 17px !important;
        font-weight: 800 !important;
      }

      .reporte-titulo .reporte-fecha {
        margin: 0 !important;
        font-size: 14px !important;
        font-weight: 600 !important;
      }

      .tabla-imagen {
        width: 100% !important;
        font-size: 13px !important;
      }

      .tabla-imagen th,
      .tabla-imagen td {
        height: 35px !important;
        padding: 3px 3px !important;
      }

      .tabla-imagen .th-estacion,
      .tabla-imagen .td-estacion {
        width: .82in !important;
      }

      .tabla-imagen .th-sub,
      .tabla-imagen .td-estacion,
      .tabla-imagen .valor-principal {
        font-size: 13px !important;
      }

      .tabla-imagen .mini-variacion {
        margin-top: 2px !important;
        font-size: 8.5px !important;
      }

      .tabla-imagen .fila-separador td {
        height: 17px !important;
      }

      .tabla-imagen .th-magna {
        background: #00e676 !important;
        box-shadow: inset 0 0 0 1000px #00e676 !important;
        color: #000000 !important;
      }

      .tabla-imagen .th-premium {
        background: #ff7f83 !important;
        box-shadow: inset 0 0 0 1000px #ff7f83 !important;
        color: #000000 !important;
      }

      .tabla-imagen .th-diesel {
        background: #9a9a9a !important;
        box-shadow: inset 0 0 0 1000px #9a9a9a !important;
        color: #ffffff !important;
      }

      .tabla-imagen .cambio-grande {
        background: #fff4b8 !important;
        box-shadow: inset 0 0 0 1000px #fff4b8 !important;
      }

      .tabla-imagen .seccion-gris {
        background: #c9c7c7 !important;
        box-shadow: inset 0 0 0 1000px #c9c7c7 !important;
      }
    }

    @media (max-width: 1100px) {
      .costos-resumen {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .costos-actions {
        grid-template-columns: repeat(2, minmax(120px, 1fr));
      }
    }

    @media (max-width: 760px) {
      .costos-app {
        width: min(100% - 20px, 1500px);
        padding: 14px 0 86px;
      }

      .costos-hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .costos-brand {
        align-items: flex-start;
      }

      .costos-logo-mini {
        width: 72px;
        height: 54px;
      }

      .costos-resumen,
      .costos-actions {
        grid-template-columns: 1fr;
      }

      .reporte-card {
        padding: 10px;
      }
    }
  `

  document.head.appendChild(css)
}

function crearLayout() {
  document.title = 'GRUPO ARY GASOLINERAS - Costos Promedio'

  document.body.innerHTML = `
    <div class="costos-app" id="costosApp">
      <header class="costos-hero">
        <div class="costos-brand">
          <img class="costos-logo-mini" src="${LOGO_SRC}" alt="Logo ARY">
          <div>
            <p class="costos-eyebrow">GRUPO ARY GASOLINERAS</p>
            <h1>Costos Promedio</h1>
            <p class="costos-subtitle">Vista principal con precio unitario real e inventario inicial del día siguiente</p>
          </div>
        </div>
        <div class="costos-actions">
          <label>Fecha
            <input type="date" id="fechaCosto">
          </label>
          <button class="costos-btn azul" id="btnCargarCostos" type="button">Cargar fecha</button>
          <button class="costos-btn morado" id="btnToggleDetalle" type="button">Mostrar tablas</button>
          <button class="costos-btn gris" id="btnPDFCostos" type="button">PDF</button>
          <label>Desde Excel
            <input type="date" id="fechaDesdeExcel">
          </label>
          <label>Hasta Excel
            <input type="date" id="fechaHastaExcel">
          </label>
          <label>Estación Excel
            <select id="estacionExcel">
              <option value="TODAS">Todas</option>
              <option value="ARY I">ARY I</option>
              <option value="ARY II">ARY II</option>
              <option value="ARY III">ARY III</option>
              <option value="ARY IV">ARY IV</option>
              <option value="ARY V">ARY V</option>
              <option value="ARY VI">ARY VI</option>
              <option value="APACHE">APACHE</option>
            </select>
          </label>
          <button class="costos-btn verde" id="btnExportarExcel" type="button">Exportar Excel</button>
        </div>
      </header>

      <section class="reporte-card">
        <div id="reportePrincipal"></div>
      </section>

      <section class="detalle-panel" id="detallePanel">
        <main class="station-grid" id="contenedorCostos"></main>
      </section>
    </div>
    <div id="toast"></div>
  `

  $('#fechaCosto').value = state.fecha
  $('#fechaDesdeExcel').value = state.fecha
  $('#fechaHastaExcel').value = state.fecha
}

function agruparPorEstacion(registros) {
  const mapa = new Map()

  registros.forEach(row => {
    const key = `${row.id_estacion}|${row.estacion}`

    if (!mapa.has(key)) {
      mapa.set(key, {
        id_estacion: row.id_estacion,
        estacion: row.estacion,
        clase: claseEstacion(row.estacion, row.id_estacion),
        productos: []
      })
    }

    mapa.get(key).productos.push(row)
  })

  return Array.from(mapa.values()).sort((a, b) => Number(a.id_estacion) - Number(b.id_estacion))
}

function crearIndice(registros) {
  const mapa = new Map()

  registros.forEach(row => {
    const estacion = nombreEstacionCorto(row.estacion, row.id_estacion)
    const producto = productoKey(row.producto)
    const key = `${estacion}|${producto}`
    mapa.set(key, row)
  })

  return mapa
}

function obtenerFila(indice, estacion, producto) {
  return indice.get(`${estacion}|${producto}`) || null
}

function estacionesVisibles() {
  const nombres = new Set()

  state.registros.forEach(row => nombres.add(nombreEstacionCorto(row.estacion, row.id_estacion)))
  state.registrosAnterior.forEach(row => nombres.add(nombreEstacionCorto(row.estacion, row.id_estacion)))
  const fijas = ORDEN_ESTACIONES.filter(nombre => nombre.startsWith('ARY') || nombre === 'APACHE')
  const extras = Array.from(nombres).filter(nombre => !fijas.includes(nombre)).sort((a, b) => a.localeCompare(b, 'es'))

  return ORDEN_ESTACIONES.concat(extras)
}

function diferenciaCu(rowActual, rowAnterior) {
  if (!rowActual || !rowAnterior) return 0

  // La diferencia se calcula con los mismos CU de 2 decimales que ve el usuario.
  // Esto evita casos como 25.70 - 25.85 mostrando -0.16 por decimales ocultos.
  const cuActual = redondearDecimal(valorCU(rowActual), 2)
  const cuAnterior = redondearDecimal(valorCU(rowAnterior), 2)

  return redondearDecimal(cuActual - cuAnterior, 2)
}

function diferenciaInventario(rowAnterior, rowDosDiasAntes) {
  if (!rowAnterior || !rowDosDiasAntes) return 0
  return numberValue(rowAnterior.inventario_final) - numberValue(rowDosDiasAntes.inventario_final)
}

function variacionCuNormal(delta) {
  const valor = Math.abs(redondearDecimal(delta, 2))
  return valor >= VARIACION_MINIMA_CU && valor <= VARIACION_CU_MAXIMA_NORMAL
}

function cambioCuGrande(delta) {
  const valor = Math.abs(redondearDecimal(delta, 2))
  return valor >= VARIACION_CU_GRANDE && valor <= VARIACION_CU_MAXIMA_NORMAL
}

function cambioInvGrande(delta, base) {
  const diferencia = Math.abs(numberValue(delta))
  const baseAbs = Math.abs(numberValue(base))
  const porcentaje = baseAbs > 0 ? (diferencia / baseAbs) * 100 : 0
  return diferencia >= VARIACION_INV_GRANDE_LITROS || porcentaje >= VARIACION_INV_GRANDE_PORCENTAJE
}

function miniVariacion(tipo, delta, importante) {
  if (tipo !== 'CU') return ''

  const valor = redondearDecimal(delta, 2)

  if (Math.abs(valor) < VARIACION_MINIMA_CU) return ''
  if (Math.abs(valor) > VARIACION_CU_MAXIMA_NORMAL) return ''

  const accion = valor > 0 ? 'aumentó' : 'disminuyó'
  const direccion = valor > 0 ? 'subio' : 'bajo'
  const marca = importante ? ' cambio-mini-grande' : ''

  return `<span class="mini-variacion ${direccion}${marca}">${accion} ${valor < 0 ? '-$ ' : '$ '}${formatoNumero(Math.abs(valor), 2)}</span>`
}

function celdaReporteCU(rowActual, rowAnterior) {
  const cuActual = valorCU(rowActual)

  if (!rowActual || valorCero(cuActual)) {
    return '<td class="td-empty">&nbsp;</td>'
  }

  const delta = diferenciaCu(rowActual, rowAnterior)
  const grande = cambioCuGrande(delta)
  const clase = grande ? ' cambio-grande' : ''
  const variacion = rowAnterior ? miniVariacion('CU', delta, grande) : ''

  return `<td class="td-money td-con-mini${clase}"><span class="valor-principal">${costo(cuActual, 2).replace('$', '$ ')}</span>${variacion}</td>`
}

function celdaReporteInventario(row) {
  const inventario = numberValue(row?.inventario_tabla) > 0 ? numberValue(row.inventario_tabla) : numberValue(row?.inventario_mostrado) > 0 ? numberValue(row.inventario_mostrado) : numberValue(row?.inventario_final)

  if (!row || valorCero(inventario)) {
    return '<td class="td-empty">&nbsp;</td>'
  }

  return `<td class="td-litros"><span class="valor-principal">${litros(inventario)}</span></td>`
}

function hayCambioProducto(estacion, producto, actual, anterior, dosAntes) {
  const rowActual = obtenerFila(actual, estacion, producto)
  const rowAnterior = obtenerFila(anterior, estacion, producto)
  const deltaCu = diferenciaCu(rowActual, rowAnterior)

  return variacionCuNormal(deltaCu)
}

function textoCambio(tipo, delta, importante) {
  const valor = redondearDecimal(delta, 2)
  const accion = valor > 0 ? 'aumentó' : 'disminuyó'
  const clase = importante ? ' cambio-grande' : ''

  if (tipo === 'CU') {
    return {
      label: `CU ${accion}`,
      value: `${valor < 0 ? '-' : ''}$ ${formatoNumero(Math.abs(valor), 2)}`,
      clase
    }
  }

  return {
    label: `INV ${accion}`,
    value: `${valor < 0 ? '-' : ''}${litros(Math.abs(valor))}`,
    clase
  }
}

function celdaVariacion(estacion, producto, actual, anterior, dosAntes) {
  const rowActual = obtenerFila(actual, estacion, producto)
  const rowAnterior = obtenerFila(anterior, estacion, producto)
  const deltaCu = diferenciaCu(rowActual, rowAnterior)

  if (!variacionCuNormal(deltaCu)) {
    return '<td class="seccion-gris">&nbsp;</td><td class="seccion-gris">&nbsp;</td>'
  }

  const cambio = textoCambio('CU', deltaCu, cambioCuGrande(deltaCu))
  const clase = cambio.clase || ''

  return `<td class="variacion-label${clase}">${cambio.label}</td><td class="variacion-valor${clase}">${cambio.value}</td>`
}

function renderReportePrincipal() {
  const actual = crearIndice(state.registros)
  const anterior = crearIndice(state.registrosAnterior)
  const estaciones = estacionesVisibles()
  const tieneDatos = state.registros.length || state.registrosAnterior.length

  if (!tieneDatos) {
    $('#reportePrincipal').innerHTML = `
      <div class="mensaje-reporte">
        No hay datos para ${fechaBonita(state.fecha)} ni para el día anterior. Revisa que exista inventario guardado.
      </div>
    `
    return
  }

  const filas = estaciones.map(estacion => {
    if (estacion.startsWith('__SEPARADOR')) {
      return '<tr class="fila-separador"><td colspan="7">&nbsp;</td></tr>'
    }

    const celdas = PRODUCTOS.map(producto => {
      const rowActual = obtenerFila(actual, estacion, producto)
      const rowAnterior = obtenerFila(anterior, estacion, producto)
      return `${celdaReporteCU(rowActual, rowAnterior)}${celdaReporteInventario(rowActual)}`
    }).join('')

    return `<tr><td class="td-estacion">${escaparHTML(estacion)}</td>${celdas}</tr>`
  }).join('')

  $('#reportePrincipal').innerHTML = `
    <div class="reporte-scroll">
      <div class="reporte-costo">
        <div class="reporte-header">
          <div class="reporte-logo"><img src="${LOGO_SRC}" alt="ARY Gasolineras"></div>
          <div class="reporte-titulo">
            <h2>GRUPO ARY GASOLINERAS</h2>
            <p class="reporte-concepto">Costo Promedio</p>
            <p class="reporte-fecha">${escaparHTML(fechaLarga(state.fecha))}</p>
          </div>
        </div>
        <table class="tabla-imagen">
          <thead>
            <tr>
              <th class="th-estacion" rowspan="2">Estación</th>
              <th class="th-producto th-magna" colspan="2">Magna</th>
              <th class="th-producto th-premium" colspan="2">Premium</th>
              <th class="th-producto th-diesel" colspan="2">Diesel</th>
            </tr>
            <tr>
              <th class="th-sub">CU</th>
              <th class="th-sub">Inventario</th>
              <th class="th-sub">CU</th>
              <th class="th-sub">Inventario</th>
              <th class="th-sub">CU</th>
              <th class="th-sub">Inventario</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `
}

function renderResumen() {
  return
}

function celda(valor, tipo = 'numero', clase = '') {
  let texto = valor

  if (tipo === 'litros') texto = litros(valor)
  if (tipo === 'litros3') texto = litros3(valor)
  if (tipo === 'dinero') texto = dinero(valor, 2)
  if (tipo === 'costo') texto = costo2(valor)

  return `<span class="valor-pill ${clase} ${claseCero(valor)}">${texto}</span>`
}

function renderStation(grupo) {
  const rows = grupo.productos.map(row => {
    const key = productoKey(row.producto)
    const tieneCompra = numberValue(row.litros_compra) > 0
    const precioUnitario = tieneCompra
      ? celda(valorPrecioUnitario(row), 'costo', 'azul')
      : '<span class="valor-pill gris">&nbsp;</span>'

    return `
      <tr>
        <td><span class="producto-chip ${key}">${escaparHTML(row.producto)}</span></td>
        <td>${celda(row.litros_compra, 'litros', 'azul')}</td>
        <td>${celda(row.venta, 'litros', 'naranja')}</td>
        <td>${celda(numberValue(row.inventario_tabla) > 0 ? row.inventario_tabla : numberValue(row.inventario_mostrado) > 0 ? row.inventario_mostrado : row.inventario_final, 'litros', 'gris')}</td>
        <td>${celda(row.entrada, 'dinero', 'azul')}</td>
        <td>${celda(row.salida, 'dinero', 'rojo')}</td>
        <td>${celda(row.existencia, 'dinero', 'naranja')}</td>
        <td>${precioUnitario}</td>
        <td>${celda(row.costo_promedio, 'costo', '')}</td>
      </tr>
    `
  }).join('')

  return `
    <section class="station-card">
      <div class="station-title ${grupo.clase}">
        <span>${escaparHTML(grupo.estacion)}</span>
        <small class="fecha-larga-tabla">${escaparHTML(fechaLarga(state.fecha))}</small>
      </div>
      <div class="station-body">
        <div>
          <div class="table-wrap">
            <table class="costos-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Lts compra</th>
                  <th>Ventas</th>
                  <th>Inv final</th>
                  <th>Entrada $</th>
                  <th>Salida $</th>
                  <th>Existencia $</th>
                  <th>Precio<br>unitario</th>
                  <th>Costo<br>promedio</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderDetalle() {
  const contenedor = $('#contenedorCostos')
  if (!contenedor) return

  if (!state.registros.length) {
    contenedor.innerHTML = `
      <div class="empty-state">
        No hay datos de costos para ${fechaBonita(state.fecha)}. Primero revisa que exista inventario guardado para esa fecha.
      </div>
    `
    return
  }

  contenedor.innerHTML = agruparPorEstacion(state.registros).map(renderStation).join('')
}

function render() {
  renderReportePrincipal()
  renderDetalle()

  const detalle = $('#detallePanel')
  const boton = $('#btnToggleDetalle')

  if (detalle) {
    detalle.classList.toggle('visible', state.mostrarDetalle)
  }

  if (boton) {
    boton.textContent = state.mostrarDetalle ? 'Ocultar tablas' : 'Mostrar tablas'
  }
}

//Recalcular los costos 
function fechaBaseCostosMes(fechaISO) {
  const fecha = String(fechaISO || '').slice(0, 10)

  // Regla especial: 31/may/2026 queda como base fija manual.
  // NO se recalcula, NO se pisa. Junio empieza desde 01/jun/2026.
  if (fecha >= '2026-06-01') {
    return '2026-05-31'
  }

  const partes = fecha.split('-')
  if (partes.length !== 3) return fechaISO

  // Para otros meses se conserva la regla original: día 05 como base.
  return `${partes[0]}-${partes[1]}-05`
}

async function recalcularCadenaCostosHasta(fechaObjetivo) {
  const fechaObjetivoISO = String(fechaObjetivo || '').slice(0, 10)

  // 31/may/2026 es base fija manual.
  // Junio recalcula desde 01/jun, pero APACHE PREMIUM del 01 al 06 se protege.
  if (!fechaObjetivoISO || fechaObjetivoISO <= '2026-05-31') return

  let fechaRecalculo = '2026-06-01'

  if (fechaLocal(fechaObjetivoISO) < fechaLocal(fechaRecalculo)) return

  notify(`Recalculando costos del ${fechaBonita(fechaRecalculo)} al ${fechaBonita(fechaObjetivoISO)}...`)

  while (fechaLocal(fechaRecalculo) <= fechaLocal(fechaObjetivoISO)) {
    
    const url = `/api/costos/recalcular?fecha=${encodeURIComponent(fechaRecalculo)}`

    await fetchJson(url, {
      method: 'POST',
      timeoutMs: 300000
    })

    fechaRecalculo = fechaMasDiasISO(fechaRecalculo, 1)
  }
}

async function cargarCostos() {
  const fecha = $('#fechaCosto').value || fechaHoyISO()
  console.log('FECHA INPUT:', $('#fechaCosto').value)
  console.log('FECHA USADA PARA COSTOS:', fecha)
  const fechaComparacionCU = fechaComparacionCUISO(fecha)
  state.fecha = fecha
  state.cargando = true
  $('#reportePrincipal').innerHTML = '<div class="mensaje-reporte">Cargando costos...</div>'

  if ($('#contenedorCostos')) {
    $('#contenedorCostos').innerHTML = '<div class="empty-state">Cargando costos...</div>'
  }

  try {
    const fechaSiguiente = fechaMasDiasISO(fecha, 1)

    // Recalcula automático solo cuando corresponde.
    // IMPORTANTE: 31/may/2026 es base fija manual y NO se recalcula.
    // Si falla el recálculo, no se deja la pantalla vacía: se cargan datos existentes.
    try {
      await recalcularCadenaCostosHasta(fecha)
    } catch (errorRecalculo) {
      console.warn('No se pudo recalcular automáticamente, se cargan datos existentes:', errorRecalculo)
    }

    // La comparativa de CU se hace únicamente los jueves:
    // jueves seleccionado contra el jueves anterior (7 días antes).
    const respuestaComparacionCostos = fechaComparacionCU
      ? await fetchJson(`/api/costos/compras?fecha=${encodeURIComponent(fechaComparacionCU)}`, { timeoutMs: 180000 }).catch(error => {
          console.warn(`No se pudo cargar comparación CU ${fechaComparacionCU}:`, error)
          return []
        })
      : []

    const respuestaActualCostos = await fetchJson(`/api/costos/compras?fecha=${encodeURIComponent(fecha)}`, { timeoutMs: 180000 })

    console.log('URL COSTOS ACTUAL:', `/api/costos/compras?fecha=${encodeURIComponent(fecha)}`)

    console.log(
      'APACHE PREMIUM API ACTUAL:',
      normalizarRespuestaLista(respuestaActualCostos).find(x =>
        Number(x.id_estacion) === 7 &&
        Number(x.id_producto) === 2
      )
    )

    const [respuestaInventarioActual, respuestaInventarioComparacion, respuestaInventarioSiguiente] = await Promise.all([
      fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fecha)}`, { timeoutMs: 120000 }).catch(error => {
        console.warn(`No se pudo cargar inventario actual ${fecha}:`, error)
        return []
      }),
      fechaComparacionCU
        ? fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fechaComparacionCU)}`, { timeoutMs: 120000 }).catch(error => {
            console.warn(`No se pudo cargar inventario de comparación CU ${fechaComparacionCU}:`, error)
            return []
          })
        : Promise.resolve([]),
      fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fechaSiguiente)}`, { timeoutMs: 120000 }).catch(error => {
        console.warn(`No se pudo cargar inventario inicial del día siguiente ${fechaSiguiente}:`, error)
        return []
      })
    ])

    const costosActuales = normalizarRespuestaLista(respuestaActualCostos)
    const costosComparacion = normalizarRespuestaLista(respuestaComparacionCostos)
    const inventariosActuales = normalizarRespuestaLista(respuestaInventarioActual)
    const inventariosComparacion = normalizarRespuestaLista(respuestaInventarioComparacion)
    const inventariosSiguiente = normalizarRespuestaLista(respuestaInventarioSiguiente)

    const esBaseFija31May = String(fecha).slice(0, 10) === '2026-05-31'

    // 31/may es base fija: se pinta DIRECTO de CostosCompras, sin mezclar Inventarios
    // y sin cambiar inventario final con el día siguiente.
    state.registros = esBaseFija31May
      ? fusionarCostosConInventarios(costosActuales, [])
      : fusionarCostosConInventarios(costosActuales, inventariosActuales)

    console.log(
      'APACHE PREMIUM FINAL FRONT:',
      state.registros.find(x =>
        Number(x.id_estacion) === 7 &&
        Number(x.id_producto) === 2
      )
    )

    if (String(fecha).slice(0, 10) > '2026-05-31') {
      aplicarInventarioInicialDiaSiguiente(state.registros, inventariosSiguiente)
    }

    state.registrosAnterior = fechaComparacionCU
      ? fusionarCostosConInventarios(costosComparacion, inventariosComparacion)
      : []
    state.registrosDosDiasAntes = []

    render()
    notify((state.registros.length || state.registrosAnterior.length) ? 'Costos cargados' : 'No hay datos para esa fecha')
  } catch (error) {
    console.error('ERROR COSTOS:', error)
    state.registros = []
    state.registrosAnterior = []
    state.registrosDosDiasAntes = []
    render()
    notify(error.message || 'No se pudieron cargar los costos')
  } finally {
    state.cargando = false
  }
}

async function recalcularCostos() {
  const fecha = $('#fechaCosto').value || fechaHoyISO()
  const boton = $('#btnRecalcularCostos')

  try {
    if (boton) {
      boton.disabled = true
      boton.textContent = 'Recalculando...'
    }

    notify('Recalculando costos...')
    await fetchJson(`/api/costos/recalcular?fecha=${encodeURIComponent(fecha)}`, { timeoutMs: 120000 })
    await cargarCostos()
    notify('Costos recalculados')
  } catch (error) {
    console.error('ERROR RECALCULAR COSTOS:', error)
    notify(error.message || 'No se pudieron recalcular los costos')
  } finally {
    if (boton) {
      boton.disabled = false
      boton.textContent = 'Recalcular'
    }
  }
}

function rutasAbsolutasExcel(html) {
  const origen = window.location.origin

  return String(html || '')
    .replaceAll('src="/', `src="${origen}/`)
    .replaceAll("src='/", `src='${origen}/`)
}

function estilosExcel() {
  return `
    body {
      margin: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .excel-contenedor {
      width: 1360px;
      margin: 0 auto;
      background: #ffffff;
    }

    .excel-bloque {
      margin-bottom: 28px;
      page-break-after: always;
    }

    .excel-bloque:last-child {
      page-break-after: auto;
    }

    .excel-titulo-detalle {
      margin: 18px 0 12px;
      padding: 10px 12px;
      background: #0f172a;
      color: #ffffff;
      font-size: 18px;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
    }

    .reporte-scroll,
    .table-wrap {
      width: 100%;
      overflow: visible;
    }

    .reporte-costo {
      width: 1180px;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .reporte-header {
      display: grid;
      grid-template-columns: 300px 1fr;
      align-items: center;
      border: 2px solid #000000;
      border-bottom: 0;
      min-height: 108px;
    }

    .reporte-logo {
      text-align: center;
      height: 108px;
      padding: 10px 20px;
    }

    .reporte-logo img {
      width: 270px;
      max-width: 100%;
      height: 88px;
      object-fit: contain;
    }

    .reporte-titulo {
      text-align: center;
      font-family: Georgia, 'Times New Roman', serif;
      color: #000000;
      line-height: 1.15;
      padding: 10px 14px;
    }

    .reporte-titulo h2 {
      margin: 0 0 5px;
      font-size: 29px;
      font-weight: 900;
      letter-spacing: .035em;
      text-transform: uppercase;
    }

    .reporte-titulo .reporte-concepto {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .reporte-titulo .reporte-fecha {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    .tabla-imagen {
      width: 100%;
      table-layout: fixed;
      border: 2px solid #000000;
      font-size: 16px;
      background: #ffffff;
    }

    .tabla-imagen th,
    .tabla-imagen td {
      border: 2px solid #000000;
      padding: 5px 8px;
      height: 42px;
      line-height: 1.12;
      color: #000000;
      text-align: center;
      vertical-align: middle;
      font-weight: 400;
      white-space: nowrap;
    }

    .tabla-imagen thead th {
      font-weight: 700;
      text-transform: uppercase;
    }

    .tabla-imagen .th-estacion {
      width: 112px;
      background: #ffffff;
    }

    .tabla-imagen .th-producto {
      color: #000000;
      font-weight: 800;
    }

    .tabla-imagen .th-magna {
      background: #00e676;
    }

    .tabla-imagen .th-premium {
      background: #ff7f83;
    }

    .tabla-imagen .th-diesel {
      background: #9a9a9a;
      color: #ffffff;
    }

    .tabla-imagen .th-sub {
      background: #ffffff;
      font-size: 15px;
      font-weight: 800;
    }

    .tabla-imagen .td-estacion {
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      width: 112px;
    }

    .tabla-imagen .td-money,
    .tabla-imagen .td-litros,
    .tabla-imagen .variacion-valor {
      text-align: right;
      padding-right: 9px;
      font-variant-numeric: tabular-nums;
    }

    .tabla-imagen .td-con-mini {
      padding-top: 3px;
      padding-bottom: 3px;
      vertical-align: middle;
    }

    .tabla-imagen .valor-principal {
      display: block;
      font-size: 16px;
      line-height: 1.05;
      font-weight: 600;
    }

    .tabla-imagen .mini-variacion {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      line-height: 1.05;
      font-weight: 700;
      color: #3f3f46;
      letter-spacing: -.02em;
      white-space: nowrap;
    }

    .tabla-imagen .mini-variacion.subio {
      color: #14532d;
    }

    .tabla-imagen .mini-variacion.bajo {
      color: #7f1d1d;
    }

    .tabla-imagen .td-empty {
      background: #ffffff;
      color: transparent;
    }

    .tabla-imagen .fila-separador td {
      height: 22px;
      background: #ffffff;
    }

    .tabla-imagen .cambio-grande {
      background: #fff4b8;
    }

    .tabla-imagen .seccion-gris {
      background: #c9c7c7;
    }

    .tabla-imagen .variacion-label {
      text-align: left;
      padding-left: 12px;
      font-size: 15px;
      font-weight: 700;
    }

    .station-grid {
      display: block;
      width: 100%;
    }

    .station-card {
      width: 100%;
      margin: 0 0 18px;
      background: #ffffff;
      border: 1px solid #94a3b8;
      page-break-inside: avoid;
    }

    .station-title {
      padding: 13px 16px;
      background: #334155;
      color: #ffffff;
      font-size: 17px;
      font-weight: 900;
      letter-spacing: .02em;
    }

    .station-title small {
      float: right;
      font-size: 11px;
      opacity: .9;
      font-weight: 800;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .station-title.ary-1 {
      background: #22c55e;
      color: #ffffff;
    }

    .station-title.ary-2 {
      background: #ef4444;
      color: #ffffff;
    }

    .station-title.ary-3 {
      background: #a855f7;
      color: #ffffff;
    }

    .station-title.ary-4 {
      background: #fb923c;
      color: #ffffff;
    }

    .station-title.ary-5 {
      background: #60a5fa;
      color: #ffffff;
    }

    .station-title.ary-6 {
      background: #fde047;
      color: #1f2937;
    }

    .station-title.apache {
      background: #be123c;
      color: #ffffff;
    }

    .station-body {
      padding: 14px;
      background: #ffffff;
    }

    .table-title {
      margin: 0 0 9px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 900;
    }

    .costos-table {
      width: 100%;
      min-width: 980px;
      border: 1px solid #e2e8f0;
    }

    .costos-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .04em;
      padding: 10px 7px;
      border: 1px solid #e2e8f0;
      text-align: center;
      font-weight: 900;
      white-space: nowrap;
    }

    .costos-table td {
      padding: 9px 7px;
      border: 1px solid #edf2f7;
      vertical-align: middle;
      color: #0f172a;
      font-size: 13px;
      text-align: center;
      font-weight: 800;
      white-space: nowrap;
    }

    .producto-chip {
      display: inline-block;
      min-width: 84px;
      padding: 7px 10px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      background: #334155;
      text-align: center;
    }

    .producto-chip.MAGNA {
      background: #16a34a;
    }

    .producto-chip.PREMIUM {
      background: #dc2626;
    }

    .producto-chip.DIESEL {
      background: #111827;
    }

    .valor-pill {
      display: inline-block;
      min-width: 104px;
      padding: 7px 8px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-weight: 900;
      text-align: center;
    }

    .valor-pill.azul {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .valor-pill.naranja {
      background: #fff7ed;
      color: #c2410c;
      border-color: #fed7aa;
    }

    .valor-pill.rojo {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }

    .valor-pill.gris {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }

    .zero-muted {
      background: #e5e7eb;
      color: #9ca3af;
      border-color: #d1d5db;
    }

    .empty-state,
    .mensaje-reporte {
      padding: 16px;
      color: #64748b;
      font-weight: 800;
      text-align: center;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
    }
  `
}

function construirHTMLExcel() {
  const principal = rutasAbsolutasExcel($('#reportePrincipal') ? $('#reportePrincipal').innerHTML : '')
  const detalle = rutasAbsolutasExcel($('#contenedorCostos') ? $('#contenedorCostos').innerHTML : '')

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${estilosExcel()}</style>
      </head>
      <body>
        <div class="excel-contenedor">
          <div class="excel-bloque">
            ${principal}
          </div>
          <div class="excel-bloque">
            <div class="excel-titulo-detalle">Tablas detalladas</div>
            <div class="station-grid">${detalle}</div>
          </div>
        </div>
      </body>
    </html>
  `
}

function descargarExcel(html) {
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `costo_promedio_${state.fecha}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportarExcel() {
  if (!state.registros.length && !state.registrosAnterior.length) {
    notify('No hay datos para exportar')
    return
  }

  descargarExcel(construirHTMLExcel())
  notify('Excel generado con tabla principal y tablas ocultas')
}

function estilosPDFPrincipal() {
  return `
    ${estilosExcel()}

    @page {
      size: letter portrait;
      margin: .18in;
    }

    html,
    body,
    .reporte-costo,
    .tabla-imagen,
    .tabla-imagen * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html,
    body {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      overflow: visible;
    }

    .excel-contenedor {
      width: 100%;
      margin: 0;
    }

    .excel-bloque {
      margin: 0;
      page-break-after: auto;
    }

    .reporte-costo {
      width: 100%;
      max-width: 8.14in;
      min-width: 0;
      margin: 0 auto;
    }

    .reporte-header {
      grid-template-columns: 1.62in 1fr;
      min-height: .88in;
    }

    .reporte-logo {
      height: .88in;
      padding: .05in .08in;
    }

    .reporte-logo img {
      width: 1.46in;
      height: .72in;
      object-fit: contain;
    }

    .reporte-titulo {
      padding: 5px 8px;
    }

    .reporte-titulo h2 {
      margin-bottom: 3px;
      font-size: 22px;
      font-weight: 900;
    }

    .reporte-titulo .reporte-concepto {
      margin: 0 0 2px;
      font-size: 17px;
      font-weight: 800;
    }

    .reporte-titulo .reporte-fecha {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .tabla-imagen {
      width: 100%;
      font-size: 13px;
    }

    .tabla-imagen th,
    .tabla-imagen td {
      height: 35px;
      padding: 3px 3px;
    }

    .tabla-imagen .th-estacion,
    .tabla-imagen .td-estacion {
      width: .82in;
    }

    .tabla-imagen .th-sub,
    .tabla-imagen .td-estacion,
    .tabla-imagen .valor-principal {
      font-size: 13px;
    }

    .tabla-imagen .mini-variacion {
      margin-top: 2px;
      font-size: 8.5px;
    }

    .tabla-imagen .fila-separador td {
      height: 17px;
    }

    .tabla-imagen .th-magna {
      background: #00e676 !important;
      box-shadow: inset 0 0 0 1000px #00e676 !important;
      color: #000000 !important;
    }

    .tabla-imagen .th-premium {
      background: #ff7f83 !important;
      box-shadow: inset 0 0 0 1000px #ff7f83 !important;
      color: #000000 !important;
    }

    .tabla-imagen .th-diesel {
      background: #9a9a9a !important;
      box-shadow: inset 0 0 0 1000px #9a9a9a !important;
      color: #ffffff !important;
    }

    .tabla-imagen .cambio-grande {
      background: #fff4b8 !important;
      box-shadow: inset 0 0 0 1000px #fff4b8 !important;
    }

    .tabla-imagen .seccion-gris {
      background: #c9c7c7 !important;
      box-shadow: inset 0 0 0 1000px #c9c7c7 !important;
    }
  `
}

function generarPDFPrincipal() {
  const principal = $('#reportePrincipal')

  if (!principal || (!state.registros.length && !state.registrosAnterior.length)) {
    notify('No hay tabla principal para imprimir')
    return
  }

  const ventana = window.open('', '_blank')

  if (!ventana) {
    notify('Permite ventanas emergentes para generar el PDF')
    return
  }

  const contenido = rutasAbsolutasExcel(principal.innerHTML)

  ventana.document.open()
  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>GRUPO ARY GASOLINERAS - Costo Promedio ${escaparHTML(state.fecha)}</title>
      <style>${estilosPDFPrincipal()}</style>
    </head>
    <body>
      <div class="excel-contenedor">
        <div class="excel-bloque">
          ${contenido}
        </div>
      </div>
    </body>
    </html>
  `)
  ventana.document.close()

  let impreso = false

  const imprimir = () => {
    if (impreso) return
    impreso = true
    ventana.focus()
    ventana.print()
  }

  setTimeout(imprimir, 700)
}

async function cargarRegistrosExcelFecha(fecha) {
  const fechaSiguiente = fechaMasDiasISO(fecha, 1)

  const [respuestaCostos, respuestaInventario, respuestaInventarioSiguiente] = await Promise.all([
    fetchJson(`/api/costos/compras?fecha=${encodeURIComponent(fecha)}`, { timeoutMs: 180000 }).catch(error => {
      console.warn(`No se pudieron cargar costos para Excel ${fecha}:`, error)
      return []
    }),
    fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fecha)}`, { timeoutMs: 120000 }).catch(error => {
      console.warn(`No se pudo cargar inventario para Excel ${fecha}:`, error)
      return []
    }),
    fetchJson(`/api/inventarios?fecha=${encodeURIComponent(fechaSiguiente)}`, { timeoutMs: 120000 }).catch(error => {
      console.warn(`No se pudo cargar inventario siguiente para Excel ${fechaSiguiente}:`, error)
      return []
    })
  ])

  const costos = normalizarRespuestaLista(respuestaCostos)
  const inventarios = normalizarRespuestaLista(respuestaInventario)
  const inventariosSiguiente = normalizarRespuestaLista(respuestaInventarioSiguiente)
  const esBaseFija31May = String(fecha).slice(0, 10) === '2026-05-31'

  const registros = esBaseFija31May
    ? fusionarCostosConInventarios(costos, [])
    : fusionarCostosConInventarios(costos, inventarios)

  if (String(fecha).slice(0, 10) > '2026-05-31') {
    aplicarInventarioInicialDiaSiguiente(registros, inventariosSiguiente)
  }

  return registros
}

function ordenarGruposExcelRango(grupos) {
  const ordenEstaciones = ORDEN_ESTACIONES.filter(nombre => !nombre.startsWith('__SEPARADOR'))
  const indiceEstacion = nombre => {
    const index = ordenEstaciones.indexOf(nombre)
    return index >= 0 ? index : ordenEstaciones.length + 1
  }

  return grupos.sort((a, b) => {
    const porEstacion = indiceEstacion(a.estacion) - indiceEstacion(b.estacion)
    if (porEstacion !== 0) return porEstacion

    const porProducto = PRODUCTOS.indexOf(a.producto) - PRODUCTOS.indexOf(b.producto)
    if (porProducto !== 0) return porProducto

    return a.estacion.localeCompare(b.estacion, 'es')
  })
}

function agruparRegistrosExcelRango(dias) {
  const mapa = new Map()

  dias.forEach(dia => {
    dia.registros.forEach(row => {
      const estacion = nombreEstacionCorto(row.estacion, row.id_estacion)
      const producto = productoKey(row.producto)
      const llave = `${estacion}|${producto}`

      if (!mapa.has(llave)) {
        mapa.set(llave, {
          estacion,
          nombreEstacion: row.estacion || estacion,
          producto,
          filas: []
        })
      }

      mapa.get(llave).filas.push({
        fecha: dia.fecha,
        row
      })
    })
  })

  return ordenarGruposExcelRango(Array.from(mapa.values()))
}

function estilosExcelRango() {
  return `
    body {
      margin: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .excel-rango-contenedor {
      width: 1180px;
      margin: 0 auto;
      background: #ffffff;
    }

    .excel-tabla-bloque {
      margin: 0 0 28px;
      page-break-after: always;
    }

    .excel-tabla-bloque:last-child {
      page-break-after: auto;
    }

    .excel-tabla-titulo {
      border: 2px solid #000000;
      border-bottom: 0;
      text-align: center;
      background: #ffffff;
      padding: 8px;
      line-height: 1.25;
    }

    .excel-tabla-titulo h2,
    .excel-tabla-titulo h3,
    .excel-tabla-titulo p {
      margin: 0;
    }

    .excel-tabla-titulo h2 {
      font-size: 18px;
      font-weight: 800;
    }

    .excel-tabla-titulo h3 {
      margin-top: 3px;
      font-size: 16px;
      font-weight: 800;
    }

    .excel-tabla-titulo p {
      margin-top: 4px;
      font-size: 13px;
      font-weight: 700;
    }

    .excel-rango-tabla {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
      table-layout: fixed;
      font-size: 12px;
    }

    .excel-rango-tabla th,
    .excel-rango-tabla td {
      border: 1px solid #000000;
      padding: 5px 6px;
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
    }

    .excel-rango-tabla th {
      background: #000000;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
    }

    .excel-rango-tabla td.numero {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .excel-rango-tabla td.fecha {
      text-align: left;
      font-weight: 700;
    }
  `
}

function construirHTMLExcelRango(dias, desde, hasta) {
  const grupos = agruparRegistrosExcelRango(dias)
  const periodo = desde === hasta
    ? fechaLarga(desde)
    : `Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`

  const tablas = grupos.map(grupo => {
    const filas = grupo.filas
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(item => {
        const row = item.row
        const inventario = numberValue(row.inventario_tabla) > 0
          ? numberValue(row.inventario_tabla)
          : numberValue(row.inventario_mostrado) > 0
            ? numberValue(row.inventario_mostrado)
            : numberValue(row.inventario_final)

        const tieneCompra = numberValue(row.litros_compra) > 0
        const tieneVenta = numberValue(row.venta) > 0
        const concepto = tieneCompra && tieneVenta
          ? 'COMPRA / VENTA'
          : tieneCompra
            ? 'COMPRA'
            : 'VENTA'

        return `
          <tr>
            <td class="fecha">${escaparHTML(fechaLarga(item.fecha))}</td>
            <td>${concepto}</td>
            <td class="numero">${tieneCompra ? litros(row.litros_compra) : ''}</td>
            <td class="numero">${litros(row.venta)}</td>
            <td class="numero">${litros(inventario)}</td>
            <td class="numero">${tieneCompra ? dinero(row.entrada, 2) : ''}</td>
            <td class="numero">${dinero(row.salida, 2)}</td>
            <td class="numero">${dinero(row.existencia, 2)}</td>
            <td class="numero">${tieneCompra ? costo2(valorPrecioUnitario(row)) : ''}</td>
            <td class="numero">${costo2(row.costo_promedio)}</td>
          </tr>
        `
      })
      .join('')

    return `
      <section class="excel-tabla-bloque">
        <div class="excel-tabla-titulo">
          <h2>${escaparHTML(grupo.nombreEstacion)}</h2>
          <h3>${escaparHTML(PRODUCTO_LABEL[grupo.producto] || grupo.producto)}</h3>
          <p>${escaparHTML(periodo)}</p>
        </div>

        <table class="excel-rango-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Entrada unidades</th>
              <th>Salida unidades</th>
              <th>Existencia unidades</th>
              <th>Entrada $</th>
              <th>Salida $</th>
              <th>Existencia $</th>
              <th>CU</th>
              <th>Costo promedio</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </section>
    `
  }).join('')

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${estilosExcelRango()}</style>
      </head>
      <body>
        <div class="excel-rango-contenedor">
          ${tablas}
        </div>
      </body>
    </html>
  `
}

function descargarExcelRango(html, desde, hasta) {
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `costos_detalle_${desde}_a_${hasta}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}


function escaparXMLExcel(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function nombreHojaExcelMultiHoja(estacion, producto) {
  const nombres = {
    'ARY I': {
      MAGNA: 'I MAGNA',
      PREMIUM: 'I PREMIUM',
      DIESEL: 'I DIESEL'
    },
    'ARY II': {
      MAGNA: 'II MAGNA',
      PREMIUM: 'II PREMIUM',
      DIESEL: 'II DIESEL'
    },
    'ARY III': {
      MAGNA: 'MAGNA III',
      PREMIUM: 'PREMIUM III',
      DIESEL: 'DIESEL III'
    },
    'ARY IV': {
      MAGNA: 'IV MAGNA',
      PREMIUM: 'IV PREMIUM',
      DIESEL: 'DIESEL IV'
    },
    'ARY V': {
      MAGNA: 'V MAGNA',
      PREMIUM: 'V PREMIUM',
      DIESEL: 'V DIESEL'
    },
    'ARY VI': {
      MAGNA: 'VI MAGNA',
      PREMIUM: 'VI PREMIUM',
      DIESEL: 'VI DIESEL'
    },
    APACHE: {
      MAGNA: 'APACHE MAGNA',
      PREMIUM: 'APACHE PREMIUM',
      DIESEL: 'APACHE DIESEL'
    }
  }

  const sugerido = nombres[estacion]?.[producto] || `${estacion} ${producto}`
  return String(sugerido)
    .replace(/[\\\/\?\*\[\]\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Hoja'
}

function ordenarGruposExcelMultiHoja(grupos) {
  const ordenEstacion = {
    'ARY I': 1,
    'ARY II': 2,
    'ARY III': 3,
    'ARY IV': 4,
    'ARY V': 5,
    'ARY VI': 6,
    APACHE: 7
  }

  const ordenProducto = {
    MAGNA: 1,
    PREMIUM: 2,
    DIESEL: 3
  }

  return [...grupos].sort((a, b) => {
    const ea = ordenEstacion[a.estacion] ?? 999
    const eb = ordenEstacion[b.estacion] ?? 999

    if (ea !== eb) return ea - eb

    const pa = ordenProducto[a.producto] ?? 999
    const pb = ordenProducto[b.producto] ?? 999

    if (pa !== pb) return pa - pb

    return nombreHojaExcelMultiHoja(a.estacion, a.producto)
      .localeCompare(nombreHojaExcelMultiHoja(b.estacion, b.producto), 'es')
  })
}

function estiloTituloExcelMultiHoja(producto) {
  if (producto === 'MAGNA') return 'TituloMagna'
  if (producto === 'PREMIUM') return 'TituloPremium'
  if (producto === 'DIESEL') return 'TituloDiesel'
  return 'TituloDefault'
}

function celdaXMLExcel(valor, tipo = 'String', estilo = '') {
  const atributoEstilo = estilo ? ` ss:StyleID="${estilo}"` : ''

  if (valor === null || valor === undefined || valor === '') {
    return `<Cell${atributoEstilo}/>`
  }

  if (tipo === 'Number') {
    return `<Cell${atributoEstilo}><Data ss:Type="Number">${Number(valor)}</Data></Cell>`
  }

  if (tipo === 'DateTime') {
    return `<Cell${atributoEstilo}><Data ss:Type="DateTime">${escaparXMLExcel(valor)}</Data></Cell>`
  }

  return `<Cell${atributoEstilo}><Data ss:Type="String">${escaparXMLExcel(valor)}</Data></Cell>`
}

function movimientosExcelMultiHoja(grupo) {
  const movimientos = []

  const filasOrdenadas = [...grupo.filas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  filasOrdenadas.forEach(item => {
    const row = item.row
    const inventarioFinal = numberValue(row.inventario_tabla) > 0
      ? numberValue(row.inventario_tabla)
      : numberValue(row.inventario_mostrado) > 0
        ? numberValue(row.inventario_mostrado)
        : numberValue(row.inventario_final)

    const compra = numberValue(row.litros_compra)
    const venta = numberValue(row.venta)
    const entradaPesos = numberValue(row.entrada)
    const salidaPesos = numberValue(row.salida)
    const existenciaPesos = numberValue(row.existencia)
    const cu = valorPrecioUnitario(row)
    const costoPromedio = numberValue(row.costo_promedio)

    // Igual que el Excel de referencia:
    // si el mismo día hubo venta y compra, se muestran dos renglones.
    // VENTA aparece primero y COMPRA debajo.
    if (venta > 0 || compra <= 0) {
      movimientos.push({
        fecha: item.fecha,
        concepto: 'VENTA',
        entradaUnidades: '',
        salidaUnidades: venta > 0 ? venta : '',
        existenciaUnidades: inventarioFinal,
        entradaPesos: '',
        salidaPesos: salidaPesos > 0 ? salidaPesos : '',
        existenciaPesos,
        cu: '',
        costoPromedio
      })
    }

    if (compra > 0) {
      movimientos.push({
        fecha: item.fecha,
        concepto: 'COMPRA',
        entradaUnidades: compra,
        salidaUnidades: '',
        // Existencia intermedia después de compra y antes de la venta.
        existenciaUnidades: inventarioFinal + venta,
        entradaPesos: entradaPesos > 0 ? entradaPesos : '',
        salidaPesos: '',
        // Existencia intermedia en pesos antes de descontar la salida.
        existenciaPesos: existenciaPesos + salidaPesos,
        cu: cu > 0 ? cu : '',
        costoPromedio
      })
    }
  })

  return movimientos
}

function construirXMLExcelMultiHoja(dias, desde, hasta) {
  const grupos = ordenarGruposExcelMultiHoja(agruparRegistrosExcelRango(dias))
  const usados = new Set()

  const hojas = grupos.map(grupo => {
    let nombreHoja = nombreHojaExcelMultiHoja(grupo.estacion, grupo.producto)
    let baseNombre = nombreHoja
    let consecutivo = 2

    while (usados.has(nombreHoja.toUpperCase())) {
      const sufijo = ` ${consecutivo}`
      nombreHoja = `${baseNombre.slice(0, 31 - sufijo.length)}${sufijo}`
      consecutivo++
    }

    usados.add(nombreHoja.toUpperCase())

    const movimientos = movimientosExcelMultiHoja(grupo)
    const estiloTitulo = estiloTituloExcelMultiHoja(grupo.producto)
    const anios = [...new Set(grupo.filas.map(item => String(item.fecha).slice(0, 4)).filter(Boolean))]
    const textoAnio = anios.length === 1 ? anios[0] : `${String(desde).slice(0, 4)}-${String(hasta).slice(0, 4)}`

    const filasXML = movimientos.map(mov => {
      const fechaDateTime = `${mov.fecha}T00:00:00.000`

      return `
        <Row>
          ${celdaXMLExcel(fechaDateTime, 'DateTime', 'Fecha')}
          ${celdaXMLExcel(mov.concepto, 'String', 'TextoCentro')}
          ${celdaXMLExcel(mov.entradaUnidades, mov.entradaUnidades === '' ? 'String' : 'Number', 'Entero')}
          ${celdaXMLExcel(mov.salidaUnidades, mov.salidaUnidades === '' ? 'String' : 'Number', 'Entero')}
          ${celdaXMLExcel(mov.existenciaUnidades, 'Number', 'Entero')}
          ${celdaXMLExcel(mov.entradaPesos, mov.entradaPesos === '' ? 'String' : 'Number', 'Moneda')}
          ${celdaXMLExcel(mov.salidaPesos, mov.salidaPesos === '' ? 'String' : 'Number', 'Moneda')}
          ${celdaXMLExcel(mov.existenciaPesos, 'Number', 'Moneda')}
          ${celdaXMLExcel(mov.cu, mov.cu === '' ? 'String' : 'Number', 'Decimal2')}
          ${celdaXMLExcel(mov.costoPromedio, 'Number', 'Decimal2')}
        </Row>
      `
    }).join('')

    return `
      <Worksheet ss:Name="${escaparXMLExcel(nombreHoja)}">
        <Table>
          <Column ss:Width="78"/>
          <Column ss:Width="84"/>
          <Column ss:Width="92"/>
          <Column ss:Width="92"/>
          <Column ss:Width="104"/>
          <Column ss:Width="92"/>
          <Column ss:Width="92"/>
          <Column ss:Width="104"/>
          <Column ss:Width="62"/>
          <Column ss:Width="92"/>

          <Row ss:Height="25">
            <Cell ss:MergeAcross="9" ss:StyleID="${estiloTitulo}">
              <Data ss:Type="String">${escaparXMLExcel(grupo.nombreEstacion || grupo.estacion)}</Data>
            </Cell>
          </Row>

          <Row ss:Height="22">
            <Cell ss:MergeAcross="9" ss:StyleID="${estiloTitulo}">
              <Data ss:Type="String">INVENTARIOS DE GASOLINA</Data>
            </Cell>
          </Row>

          <Row ss:Height="22">
            <Cell ss:MergeAcross="9" ss:StyleID="${estiloTitulo}">
              <Data ss:Type="String">${escaparXMLExcel(PRODUCTO_LABEL[grupo.producto] || grupo.producto)} ${escaparXMLExcel(textoAnio)}</Data>
            </Cell>
          </Row>

          <Row ss:Height="8">
            <Cell ss:MergeAcross="9"/>
          </Row>

          <Row ss:Height="34">
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">FECHA</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">CONCEPTO</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">ENTRADA UNIDADES</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">SALIDA UNIDADES</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">EXISTENCIA UNIDADES</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">ENTRADA $</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">SALIDA $</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">EXISTENCIA $</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">CU</Data></Cell>
            <Cell ss:StyleID="Encabezado"><Data ss:Type="String">COSTO PROMEDIO</Data></Cell>
          </Row>

          ${filasXML}
        </Table>

        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <FreezePanes/>
          <FrozenNoSplit/>
          <SplitHorizontal>5</SplitHorizontal>
          <TopRowBottomPane>5</TopRowBottomPane>
          <ActivePane>2</ActivePane>
          <ProtectObjects>False</ProtectObjects>
          <ProtectScenarios>False</ProtectScenarios>
        </WorksheetOptions>
      </Worksheet>
    `
  }).join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">

  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Grupo ARY Gasolineras</Author>
    <Title>Costos detallados por estación y producto</Title>
  </DocumentProperties>

  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Arial" x:Family="Swiss" ss:Size="10"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>

    <Style ss:ID="TituloDefault">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#334155" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloMagna">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#00B050" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloPremium">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#C00000" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloDiesel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#000000" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry1">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#16A34A" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry2">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#EF4444" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry3">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#A855F7" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry4">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#F97316" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry5">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#3B82F6" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloAry6">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#1F2937"/>
      <Interior ss:Color="#FDE047" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TituloApache">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#BE123C" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Encabezado">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#000000" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="TextoCentro">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
    </Style>

    <Style ss:ID="Fecha">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
      <NumberFormat ss:Format="dd-mmm-yy"/>
    </Style>

    <Style ss:ID="Entero">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
      <NumberFormat ss:Format="#,##0"/>
    </Style>

    <Style ss:ID="Moneda">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
      <NumberFormat ss:Format="$#,##0.00"/>
    </Style>

    <Style ss:ID="Decimal2">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
      </Borders>
      <NumberFormat ss:Format="0.00"/>
    </Style>
  </Styles>

  ${hojas}
</Workbook>`
}

function descargarExcelMultiHoja(xml, desde, hasta) {
  const blob = new Blob(['\ufeff', xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `costos_por_producto_${desde}_a_${hasta}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}


async function exportarExcelRango() {
  const desde = $('#fechaDesdeExcel')?.value || state.fecha
  const hasta = $('#fechaHastaExcel')?.value || state.fecha
  const estacionSeleccionada = $('#estacionExcel')?.value || 'TODAS'
  const fechas = fechasRangoISO(desde, hasta)
  const boton = $('#btnExportarExcel')

  if (!fechas.length) {
    notify('El rango de fechas no es válido')
    return
  }

  try {
    if (boton) {
      boton.disabled = true
      boton.textContent = 'Generando Excel...'
    }

    const dias = []

    for (let i = 0; i < fechas.length; i++) {
      const fecha = fechas[i]
      notify(`Preparando Excel ${i + 1} de ${fechas.length}`)
      const registros = await cargarRegistrosExcelFecha(fecha)
      const registrosEstacion = estacionSeleccionada === 'TODAS'
        ? registros
        : registros.filter(row => nombreEstacionCorto(row.estacion, row.id_estacion) === estacionSeleccionada)

      dias.push({ fecha, registros: registrosEstacion })
    }

    const totalRegistros = dias.reduce((total, dia) => total + dia.registros.length, 0)

    if (!totalRegistros) {
      notify(estacionSeleccionada === 'TODAS'
        ? 'No hay datos en el rango seleccionado'
        : `No hay datos para ${estacionSeleccionada} en el rango seleccionado`)
      return
    }

    descargarExcelMultiHoja(construirXMLExcelMultiHoja(dias, desde, hasta), desde, hasta)
    notify('Excel multihoja por estación y producto generado')
  } catch (error) {
    console.error('ERROR EXPORTAR EXCEL RANGO:', error)
    notify(error.message || 'No se pudo generar el Excel')
  } finally {
    if (boton) {
      boton.disabled = false
      boton.textContent = 'Exportar Excel'
    }
  }
}

function enlazarEventos() {
  $('#btnCargarCostos').addEventListener('click', cargarCostos)
  $('#btnPDFCostos').addEventListener('click', generarPDFPrincipal)
  $('#btnExportarExcel').addEventListener('click', exportarExcelRango)
  $('#btnToggleDetalle').addEventListener('click', () => {
    state.mostrarDetalle = !state.mostrarDetalle
    render()
  })

  $('#fechaCosto').addEventListener('keydown', event => {
    if (event.key === 'Enter') cargarCostos()
  })
}

async function iniciarCostos() {
  state.fecha = fechaMasDiasISO(fechaHoyISO(), -1)
  inyectarEstilos()
  crearLayout()
  crearMenuLateral()
  enlazarEventos()
  render()
  const reporte = $('#reportePrincipal')
  if (reporte) {
    reporte.innerHTML = `
      <div class="mensaje-reporte">
        Selecciona una fecha y presiona Cargar fecha. El 31/may/2026 no se recalcula, solo se consulta.
      </div>
    `
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarCostos)
} else {
  iniciarCostos()
}
