const state = {
  registros: [],
  subboxAbierto: ''
}

const $ = selector => document.querySelector(selector)
const contenedor = $('#contenedor')
const fechaInput = $('#fecha')
const fechaTexto = $('#fechaTexto')
const toast = $('#toast')
const LOGO_SRC = '/imagenes/ary.logo.png'

function crearMenuLateral() {
  if (document.querySelector('#menuLateralInventarios')) return

  const css = document.createElement('style')
  css.textContent = `
    :root {
      --ary-menu-w-cerrado: 78px;
      --ary-menu-w-abierto: 335px;
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

    .ary-sidebar-pin:hover {
      background: #eff6ff;
      color: #1d4ed8;
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

    .ary-sidebar-link.active .ary-sidebar-icon {
      background: rgba(255, 255, 255, .20);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25);
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

    .ary-sidebar-link.active .ary-sidebar-badge {
      color: #ffffff;
      background: rgba(255, 255, 255, .18);
      border-color: rgba(255, 255, 255, .28);
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

  const fijado = localStorage.getItem('aryMenuFijo') === '1'

  if (fijado) {
    document.body.classList.add('ary-menu-fijo')
  }

  const ruta = location.pathname.split('/').pop() || 'index.html'

  menu.querySelectorAll('.ary-sidebar-link').forEach(link => {
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

  menu.querySelector('[data-menu-pin]').addEventListener('click', () => {
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

crearMenuLateral()


function crearEstilosPrecioLtsAlLado() {
  if (document.querySelector('#estilosPrecioLtsAlLado')) return

  const css = document.createElement('style')
  css.id = 'estilosPrecioLtsAlLado'
  css.textContent = `
    .subbox[data-tipo="precios"] .subitem-precio-lts {
      display: grid !important;
      grid-template-columns: 34px 82px 145px 30px !important;
      align-items: center;
      gap: 6px;
      width: max-content;
      min-width: 315px;
      position: relative;
    }

    .subbox[data-tipo="precios"] .subitem-precio-lts span {
      white-space: nowrap;
    }

    .subbox[data-tipo="precios"] .subitem-precio-lts input {
      width: 100%;
      min-width: 0;
    }

    .subbox[data-tipo="precios"] .subitem-precio-lts input[data-sub-input="importe"] {
      grid-column: 2;
    }

    .subbox[data-tipo="precios"] .subitem-precio-lts input[data-sub-input="sub_litros"] {
      grid-column: 3;
      min-width: 145px;
      text-align: center;
    }

    .subbox[data-tipo="precios"] .subitem-precio-lts button[data-remove] {
      grid-column: 4;
      justify-self: end;
      align-self: center;
      position: static !important;
      top: auto !important;
      right: auto !important;
      left: auto !important;
      transform: none !important;
      margin: 0 !important;
      width: 28px;
      min-width: 28px;
      height: 28px;
      z-index: 1;
    }

    @media (max-width: 760px) {
      .subbox[data-tipo="precios"] .subitem-precio-lts {
        grid-template-columns: 30px 70px 125px 28px !important;
        gap: 4px;
        min-width: 265px;
      }

      .subbox[data-tipo="precios"] .subitem-precio-lts input[data-sub-input="sub_litros"] {
        min-width: 125px;
      }
    }
  `

  document.head.appendChild(css)
}

crearEstilosPrecioLtsAlLado()

function fechaDeAyerISO() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - 1)
  return fecha.toISOString().slice(0, 10)
}

function fechaBonita(fechaISO) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  const partes = fechaISO.split('-')
  return `${Number(partes[2])}/${meses[Number(partes[1]) - 1]}/${partes[0]}`
}

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function nombreEstacionBonito(nombre) {
  return String(nombre || '')
    .replace(/\bSUPER\s*SERVICIOS\b/gi, 'SUPER SERVICIOS')
    .replace(/\bSUPER\s*EXPRESS\b/gi, 'SUPER EXPRESS')
    .replace(/\s+/g, ' ')
    .trim()
}

function claseEstacion(nombre) {
  const n = normalizarTexto(nombre).replace(/\s+/g, ' ')

  if (n.includes('APACHE')) return 'apache'

  if (/\bSUPER\s*EXPRESS\s+V\b/.test(n)) {
    return 'ary-5'
  }

  const match = n.match(/\bSUPER\s*SERVICIOS\s+(VI|V|IV|III|II|I|6|5|4|3|2|1)\b/)

  if (!match) return ''

  const estacion = match[1]

  if (estacion === 'I' || estacion === '1') return 'ary-1'
  if (estacion === 'II' || estacion === '2') return 'ary-2'
  if (estacion === 'III' || estacion === '3') return 'ary-3'
  if (estacion === 'IV' || estacion === '4') return 'ary-4'
  if (estacion === 'V' || estacion === '5') return 'ary-5'
  if (estacion === 'VI' || estacion === '6') return 'ary-6'

  return ''
}

function claseProducto(nombre) {
  const n = normalizarTexto(nombre)

  if (n.includes('MAGNA')) return 'MAGNA'
  if (n.includes('PREMIUM')) return 'PREMIUM'
  if (n.includes('DIESEL')) return 'DIESEL'

  return ''
}

function esDieselOculto(nombreEstacion, nombreProducto) {
  const estacion = normalizarTexto(nombreEstacion).replace(/\s+/g, ' ')
  const producto = normalizarTexto(nombreProducto)

  if (!producto.includes('DIESEL')) return false

  const esAryIII = /\bSUPER\s*SERVICIOS\s+(III|3)\b/.test(estacion) || /\bARY\s*(III|3)\b/.test(estacion)
  const esAryV = /\bSUPER\s*SERVICIOS\s+(V|5)\b/.test(estacion) || /\bSUPER\s*EXPRESS\s+(V|5)\b/.test(estacion) || /\bARY\s*(V|5)\b/.test(estacion)

  return esAryIII || esAryV
}

fechaInput.value = fechaDeAyerISO()

if (fechaTexto) {
  fechaTexto.textContent = fechaBonita(fechaInput.value)
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
    if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
      limpio = limpio.replace(/\./g, '')
    }
  }

  if (negativo) limpio = `-${limpio}`

  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}

function capturaPartes(value) {
  if (value === null || value === undefined || value === '') return []

  const texto = String(value).trim()

  if (!texto) return []

  return texto
    .split('+')
    .map(x => numberValue(x))
    .filter(x => x > 0)
}

function capturaValue(value) {
  return capturaPartes(value).reduce((a, b) => a + b, 0)
}

function formatoNumero(n, decimales) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: true
  }).format(numberValue(n))
}

function litros(n) {
  return formatoNumero(Math.round(numberValue(n)), 0)
}

function dosDecimales(n) {
  return formatoNumero(n, 2)
}

function sinDecimales(n) {
  return formatoNumero(n, 0)
}

function limpiarParaEditar(value) {
  const n = numberValue(value)
  return n === 0 ? '' : String(n)
}

function formatearPorTipo(value, tipo) {
  if (tipo === 'dos') return dosDecimales(value)
  return litros(value)
}

function boolValue(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value === null || value === undefined || value === '') return false

  const v = String(value).trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes'
}

function obtenerBloqueoInventarioInicial(row) {
  return boolValue(row.inventario_inicial_bloqueado ?? row.bloquear_inventario_inicial ?? row.inv_inicial_bloqueado ?? row.tiene_inventario_anterior)
}

function notify(message) {
  if (!toast) return
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2400)
}

function getRegistro(idEstacion, idProducto) {
  return state.registros.find(x => Number(x.id_estacion) === Number(idEstacion) && Number(x.id_producto) === Number(idProducto))
}

function llaveFila(idEstacion, idProducto) {
  return `${idEstacion}|${idProducto}`
}

function llaveFilaRegistro(registro) {
  return llaveFila(registro.id_estacion, registro.id_producto)
}

function llaveSubbox(idEstacion, idProducto, tipo) {
  return `${idEstacion}|${idProducto}|${tipo}`
}

function llaveSubboxRegistro(registro, tipo) {
  return llaveSubbox(registro.id_estacion, registro.id_producto, tipo)
}

function sumaComprasGuardadas(registro) {
  return registro.compras.reduce((a, b) => a + numberValue(b.litros), 0)
}

function sumaPreciosGuardados(registro) {
  return registro.precios.reduce((a, b) => a + numberValue(b.importe), 0)
}

function sumaSubLitrosCompraGuardados(registro) {
  return (registro.sub_litros_compra || []).reduce((a, b) => a + numberValue(b.litros), 0)
}

function totalCompras(registro) {
  return sumaComprasGuardadas(registro)
}

function totalImportes(registro) {
  return sumaPreciosGuardados(registro)
}

function totalSubLitrosCompra(registro) {
  return sumaSubLitrosCompraGuardados(registro)
}

function totalLitrosParaPrecio(registro) {
  const subLitros = totalSubLitrosCompra(registro)
  return subLitros > 0 ? subLitros : totalCompras(registro)
}

function valorVisibleSubbox(registro, tipo) {
  if (tipo === 'compras') return litros(totalCompras(registro))

  const divisorPrecio = totalLitrosParaPrecio(registro)
  const totalPrecio = totalImportes(registro)
  const precio = divisorPrecio > 0 ? totalPrecio / divisorPrecio : 0

  return dosDecimales(precio)
}

function recalc(registro) {
  registro.litros_compra = totalCompras(registro)

  const totalPrecio = totalImportes(registro)
  const divisorPrecio = totalLitrosParaPrecio(registro)

  registro.precio_por_litro = divisorPrecio > 0 ? totalPrecio / divisorPrecio : 0
  registro.venta = numberValue(registro.inventario_inicial) + numberValue(registro.litros_compra) - numberValue(registro.inventario_final)
  registro.diferencias = numberValue(registro.litros_liquidacion) - numberValue(registro.venta)
}

function arregloDetalle(registro, tipo) {
  if (tipo === 'compras') return registro.compras
  if (tipo === 'precios') return registro.precios
  if (!registro.sub_litros_compra) registro.sub_litros_compra = []
  return registro.sub_litros_compra
}

function baseDetalle(tipo) {
  if (tipo === 'precios') return { importe: 0 }
  return { litros: 0 }
}

function asegurarDetalle(registro, tipo, index) {
  const arr = arregloDetalle(registro, tipo)
  const base = baseDetalle(tipo)

  while (arr.length <= index) {
    arr.push({ ...base })
  }

  return arr[index]
}

function tipoDetallePorInput(tipo, field) {
  return field === 'sub_litros' ? 'sub_litros_compra' : tipo
}

function campoDetallePorInput(field) {
  return field === 'sub_litros' ? 'litros' : field
}

function asegurarParF(registro, index) {
  asegurarDetalle(registro, 'compras', index)
  asegurarDetalle(registro, 'precios', index)
  asegurarDetalle(registro, 'sub_litros_compra', index)
}

function totalFilasDetalle(registro) {
  return Math.max(registro.compras.length, registro.precios.length, (registro.sub_litros_compra || []).length)
}

function indiceNuevoCompra(registro) {
  const total = totalFilasDetalle(registro)

  if (total === 0) return 0

  const ultimo = total - 1
  const litros = numberValue(registro.compras[ultimo]?.litros)
  const importe = numberValue(registro.precios[ultimo]?.importe)
  const subLitros = numberValue(registro.sub_litros_compra[ultimo]?.litros)

  if (litros === 0 && importe === 0 && subLitros === 0) return ultimo

  return total
}

function indicePrecioDisponible(registro) {
  const total = totalFilasDetalle(registro)

  if (total === 0) return 0

  for (let i = 0; i < total; i++) {
    const precio = numberValue(registro.precios[i]?.importe)

    if (precio === 0) return i
  }

  return total
}

function selectorSubInput(idEstacion, idProducto, tipo, index, field) {
  const filtroCampo = field ? `[data-sub-input="${field}"]` : '[data-sub-input]'
  return `.subbox[data-id-estacion="${idEstacion}"][data-id-producto="${idProducto}"][data-tipo="${tipo}"] .subitem[data-index="${index}"] ${filtroCampo}`
}

function selectorCampo(idEstacion, idProducto, field) {
  return `tr[data-id-estacion="${idEstacion}"][data-id-producto="${idProducto}"] [data-field="${field}"]`
}

function enfocarSelector(selector) {
  setTimeout(() => {
    const input = contenedor.querySelector(selector)

    if (!input) return

    input.focus()

    if (typeof input.select === 'function') {
      input.select()
    }
  }, 0)
}

function abrirDetalle(registro, tipo, index, field) {
  asegurarParF(registro, index)
  recalc(registro)
  state.subboxAbierto = llaveSubboxRegistro(registro, tipo)
  render()
  enfocarSelector(selectorSubInput(registro.id_estacion, registro.id_producto, tipo, index, field))
}

function abrirPrecioDesdeCompra(registro, index) {
  asegurarParF(registro, index)
  recalc(registro)
  state.subboxAbierto = llaveSubboxRegistro(registro, 'precios')
  render()
  enfocarSelector(selectorSubInput(registro.id_estacion, registro.id_producto, 'precios', index, 'importe'))
}

function indiceSubboxPorClick(registro, tipo) {
  const abierto = state.subboxAbierto === llaveSubboxRegistro(registro, tipo)
  const total = totalFilasDetalle(registro)

  if (abierto) return total

  return tipo === 'compras' ? indiceNuevoCompra(registro) : indicePrecioDisponible(registro)
}

function abrirDetallePorClick(registro, tipo) {
  const index = indiceSubboxPorClick(registro, tipo)
  const field = tipo === 'precios' ? 'importe' : 'litros'
  abrirDetalle(registro, tipo, index, field)
}

function cerrarSubitemsExcepto(subboxActual) {
  const subboxActualLlave = llaveSubbox(subboxActual.dataset.idEstacion, subboxActual.dataset.idProducto, subboxActual.dataset.tipo)

  contenedor.querySelectorAll('.subbox').forEach(subbox => {
    const subitems = subbox.querySelector('.subitems')
    if (!subitems) return

    const subboxLlave = llaveSubbox(subbox.dataset.idEstacion, subbox.dataset.idProducto, subbox.dataset.tipo)

    if (subboxLlave === subboxActualLlave) {
      subitems.classList.add('open')
    } else {
      subitems.classList.remove('open')
    }
  })

  state.subboxAbierto = subboxActualLlave
}


function cerrarTodosSubitems() {
  contenedor.querySelectorAll('.subitems').forEach(subitems => {
    subitems.classList.remove('open')
  })

  state.subboxAbierto = ''
}

function normalize(rows) {
  state.subboxAbierto = ''

  state.registros = rows
    .filter(row => !esDieselOculto(row.nombre_estacion, row.nombre_producto))
    .map(row => {
    let compras = row.compras && row.compras.length
      ? row.compras.map(x => ({ litros: numberValue(x.litros) })).filter(x => numberValue(x.litros) !== 0)
      : []

    let precios = row.precios && row.precios.length
      ? row.precios.map(x => ({ importe: numberValue(x.importe) })).filter(x => numberValue(x.importe) !== 0)
      : []

    let subLitrosCompra = row.sub_litros_compra && row.sub_litros_compra.length
      ? row.sub_litros_compra.map(x => ({ litros: numberValue(x.litros ?? x.sub_litros ?? x.lts) })).filter(x => numberValue(x.litros) !== 0)
      : []

    const litrosCompra = numberValue(row.litros_compra)
    const precioPorLitro = numberValue(row.precio_por_litro)

    if (!compras.length && litrosCompra > 0) {
      compras = [{ litros: litrosCompra }]
    }

    if (!precios.length && precioPorLitro > 0 && litrosCompra > 0) {
      const divisorPrecio = subLitrosCompra.length ? subLitrosCompra.reduce((a, b) => a + numberValue(b.litros), 0) : litrosCompra
      precios = [{ importe: precioPorLitro * divisorPrecio }]
    }

    return {
      id_estacion: row.id_estacion,
      nombre_estacion: row.nombre_estacion,
      id_producto: row.id_producto,
      nombre_producto: row.nombre_producto,
      id_inventario: row.id_inventario,
      inventario_inicial: numberValue(row.inventario_inicial),
      inventario_inicial_bloqueado: obtenerBloqueoInventarioInicial(row),
      litros_compra: litrosCompra,
      precio_por_litro: precioPorLitro,
      inventario_final: numberValue(row.inventario_final),
      venta: numberValue(row.venta),
      litros_liquidacion: numberValue(row.litros_liquidacion),
      diferencias: numberValue(row.diferencias),
      compras,
      precios,
      sub_litros_compra: subLitrosCompra
    }
  })

  state.registros.forEach(recalc)
}

async function cargar() {
  try {
    if (fechaTexto) {
      fechaTexto.textContent = fechaBonita(fechaInput.value)
    }

    const url = `/api/inventarios?fecha=${fechaInput.value}`
    console.log('Cargando:', url)

    const response = await fetch(url)

    if (!response.ok) {
      let mensaje = 'No se pudo cargar la información'

      try {
        const error = await response.json()
        mensaje = error.message || mensaje
      } catch (_) {
        const texto = await response.text()
        mensaje = texto || mensaje
      }

      console.error('Error API:', mensaje)
      throw new Error(mensaje)
    }

    const data = await response.json()
    console.log('Datos recibidos:', data)

    normalize(data)
    render()
  } catch (error) {
    console.error('ERROR CARGAR:', error)
    notify(error.message)
  }
}

function limpiarRegistroParaGuardar(registro) {
  return {
    ...registro,
    compras: registro.compras.filter(x => numberValue(x.litros) !== 0),
    precios: registro.precios.filter(x => numberValue(x.importe) !== 0),
    sub_litros_compra: (registro.sub_litros_compra || []).filter(x => numberValue(x.litros) !== 0)
  }
}

function registroTieneCaptura(registro) {
  return Boolean(registro.id_inventario) ||
    totalCompras(registro) !== 0 ||
    totalImportes(registro) !== 0 ||
    totalSubLitrosCompra(registro) !== 0 ||
    numberValue(registro.inventario_final) !== 0 ||
    numberValue(registro.litros_liquidacion) !== 0
}

async function guardar() {
  state.registros.forEach(recalc)

  const registros = state.registros
    .map(limpiarRegistroParaGuardar)
    .filter(registroTieneCaptura)

  const response = await fetch('/api/inventarios/guardar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fecha: fechaInput.value,
      registros
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'No se pudo guardar')
  }

  notify('Inventario guardado correctamente')
  await cargar()
}

function renderSubbox(registro, tipo) {
  const arr = tipo === 'compras' ? registro.compras : registro.precios
  const label = tipo === 'compras' ? 'litros' : 'importe'
  const placeholder = tipo === 'compras' ? 'Litros' : 'Importe compra'
  const abierto = state.subboxAbierto === llaveSubboxRegistro(registro, tipo) ? 'open' : ''
  const totalFilas = totalFilasDetalle(registro)

  return `
    <div class="subbox" data-id-estacion="${registro.id_estacion}" data-id-producto="${registro.id_producto}" data-tipo="${tipo}">
      <div class="subtotal">
        <input class="captura-sub calculado"  type="text" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" value="${valorVisibleSubbox(registro, tipo)}" data-sub-capture="${label}" readonly>
        ${tipo === 'compras' ? '<small class="subbox-hint">Aumento bruto / Turno inventario</small>' : ''}
      </div>
      <div class="subitems ${abierto}">
        ${Array.from({ length: totalFilas }).map((_, index) => {
          const item = arr[index] || {}
          const valor = numberValue(item[label]) === 0 ? '' : tipo === 'compras' ? litros(item[label]) : dosDecimales(item[label])

          if (tipo === 'compras') {
            return `
              <div class="subitem" data-index="${index}">
                <span>F${index + 1}</span>
                <input class="format-input"  type="text" inputmode="decimal" autocomplete="off" value="${valor}" data-sub-input="${label}" data-format="litros">
                <button data-remove="1" type="button">×</button>
              </div>
            `
          }

          const subLitros = registro.sub_litros_compra[index] || {}
          const valorSubLitros = numberValue(subLitros.litros) === 0 ? '' : litros(subLitros.litros)

          return `
            <div class="subitem subitem-precio-lts" data-index="${index}">
              <span>F${index + 1}</span>
              <input class="format-input" type="text" inputmode="decimal" autocomplete="off" value="${valor}" data-sub-input="importe" data-format="dos" placeholder="Importe">
              <input class="format-input" type="text" inputmode="decimal" autocomplete="off" value="${valorSubLitros}" data-sub-input="sub_litros" data-format="litros" placeholder="Litros">
              <button data-remove="1" type="button">×</button>
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
}

function render() {
  const estaciones = [...new Map(state.registros.map(x => [x.id_estacion, x.nombre_estacion])).entries()]

  contenedor.innerHTML = estaciones.map(([idEstacion, nombre]) => {
    const rows = state.registros.filter(x => x.id_estacion === idEstacion)
    const nombreBonito = nombreEstacionBonito(nombre)

    return `
      <section class="station-card">
        <div class="station-title ${claseEstacion(nombre)}" >${escaparHTML(nombreBonito)}</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Inv. inicial</th>
                <th >Litros compra</th>
                <th>Precio por litro</th>
                <th>Inv. final</th>
                <th >Venta</th>
                <th>Litros liquidación</th>
                <th >Diferencias</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(registro => `
                <tr data-id-estacion="${registro.id_estacion}" data-id-producto="${registro.id_producto}">
                  <td>
                    <span class="producto ${claseProducto(registro.nombre_producto)}">
                      ${escaparHTML(registro.nombre_producto)}
                    </span>
                  </td>
                  <td>
                    <input class="num ${registro.inventario_inicial_bloqueado ? 'calculado' : 'format-input'}"  type="text" inputmode="decimal" autocomplete="off" data-field="inventario_inicial" data-format="litros" value="${litros(registro.inventario_inicial)}" ${registro.inventario_inicial_bloqueado ? 'readonly title="Tomado del inventario final del día anterior" data-locked="1"' : ''}>
                  </td>
                  <td>${renderSubbox(registro, 'compras')}</td>
                  <td>${renderSubbox(registro, 'precios')}</td>
                  <td><input class="num format-input"  type="text" inputmode="decimal" autocomplete="off" data-field="inventario_final" data-format="litros" value="${litros(registro.inventario_final)}"></td>
                  <td><input class="num calculado"  readonly value="${litros(registro.venta)}" data-calc="venta"></td>
                  <td><input class="num format-input"  type="text" inputmode="decimal" autocomplete="off" data-field="litros_liquidacion" data-format="litros" value="${litros(registro.litros_liquidacion)}"></td>
                  <td><input class="num calculado"  readonly value="${litros(registro.diferencias)}" data-calc="diferencias"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `
  }).join('')
}

function actualizarCalculosFila(row, registro) {
  const venta = row.querySelector('[data-calc="venta"]')
  const diferencias = row.querySelector('[data-calc="diferencias"]')
  const compras = row.querySelector('.subbox[data-tipo="compras"] [data-sub-capture]')
  const precios = row.querySelector('.subbox[data-tipo="precios"] [data-sub-capture]')

  if (venta) venta.value = litros(registro.venta)
  if (diferencias) diferencias.value = litros(registro.diferencias)
  if (compras) compras.value = valorVisibleSubbox(registro, 'compras')
  if (precios) precios.value = valorVisibleSubbox(registro, 'precios')
}

function enfocarCampoSiguiente(row, field) {
  const input = row.querySelector(`[data-field="${field}"]`)

  if (!input) return

  input.focus()

  if (typeof input.select === 'function') {
    input.select()
  }
}

function enfocarSiguienteProducto(row) {
  const rows = Array.from(contenedor.querySelectorAll('tbody tr'))
  const index = rows.indexOf(row)
  const siguiente = rows[index + 1]

  if (!siguiente) return

  const registro = getRegistro(siguiente.dataset.idEstacion, siguiente.dataset.idProducto)

  if (registro && registro.inventario_inicial_bloqueado) {
    abrirDetallePorClick(registro, 'compras')
    return
  }

  const input = siguiente.querySelector('[data-field="inventario_inicial"]')

  if (!input) return

  input.focus()

  if (typeof input.select === 'function') {
    input.select()
  }
}

contenedor.addEventListener('focusin', event => {
  if (!event.target.classList.contains('format-input')) return

  const subbox = event.target.closest('.subbox')

  if (subbox) {
    cerrarSubitemsExcepto(subbox)
  } else {
    cerrarTodosSubitems()
  }

  event.target.value = limpiarParaEditar(event.target.value)
  event.target.select()
})

contenedor.addEventListener('focusout', event => {
  if (!event.target.classList.contains('format-input')) return

  const row = event.target.closest('tr')

  if (row) {
    const registro = getRegistro(row.dataset.idEstacion, row.dataset.idProducto)

    if (registro) {
      if (event.target.dataset.field) {
        registro[event.target.dataset.field] = numberValue(event.target.value)
      }

      if (event.target.dataset.subInput) {
        const subbox = event.target.closest('.subbox')
        const item = event.target.closest('.subitem')

        if (subbox && item) {
          const tipoSubbox = subbox.dataset.tipo
          const index = Number(item.dataset.index)
          const field = event.target.dataset.subInput
          const tipoDetalle = tipoDetallePorInput(tipoSubbox, field)
          const campoDetalle = campoDetallePorInput(field)
          const detalle = asegurarDetalle(registro, tipoDetalle, index)

          detalle[campoDetalle] = capturaValue(event.target.value)
        }
      }

      recalc(registro)
      actualizarCalculosFila(row, registro)
    }
  }

  const tipo = event.target.dataset.format || 'litros'
  event.target.value = formatearPorTipo(event.target.value, tipo)
})

contenedor.addEventListener('input', event => {
  const row = event.target.closest('tr')
  if (!row) return

  const registro = getRegistro(row.dataset.idEstacion, row.dataset.idProducto)
  if (!registro) return

  let cambio = false

  if (event.target.dataset.field) {
    registro[event.target.dataset.field] = numberValue(event.target.value)
    cambio = true
  }

  if (event.target.dataset.subInput) {
    const subbox = event.target.closest('.subbox')
    const item = event.target.closest('.subitem')

    if (!subbox || !item) return

    const tipo = subbox.dataset.tipo
    const index = Number(item.dataset.index)
    const field = event.target.dataset.subInput
    const tipoDetalle = tipoDetallePorInput(tipo, field)
    const campoDetalle = campoDetallePorInput(field)
    const detalle = asegurarDetalle(registro, tipoDetalle, index)

    detalle[campoDetalle] = capturaValue(event.target.value)
    cambio = true
  }

  if (!cambio) return

  recalc(registro)
  actualizarCalculosFila(row, registro)
})

contenedor.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return

  const row = event.target.closest('tr')
  if (!row) return

  const registro = getRegistro(row.dataset.idEstacion, row.dataset.idProducto)
  if (!registro) return

  if (event.target.dataset.field) {
    event.preventDefault()

    const field = event.target.dataset.field

    if (field === 'inventario_inicial' && registro.inventario_inicial_bloqueado) {
      abrirDetallePorClick(registro, 'compras')
      return
    }

    registro[field] = numberValue(event.target.value)
    recalc(registro)
    actualizarCalculosFila(row, registro)

    if (field === 'inventario_inicial') {
      abrirDetallePorClick(registro, 'compras')
      return
    }

    if (field === 'inventario_final') {
      enfocarCampoSiguiente(row, 'litros_liquidacion')
      return
    }

    if (field === 'litros_liquidacion') {
      enfocarSiguienteProducto(row)
      return
    }

    return
  }

  if (event.target.dataset.subCapture) {
    event.preventDefault()

    const subbox = event.target.closest('.subbox')
    if (!subbox) return

    const tipo = subbox.dataset.tipo

    if (tipo === 'compras') {
      const index = Math.max(totalFilasDetalle(registro) - 1, 0)
      abrirPrecioDesdeCompra(registro, index)
      return
    }

    if (tipo === 'precios') {
      enfocarSelector(selectorCampo(registro.id_estacion, registro.id_producto, 'inventario_final'))
      return
    }
  }

  if (event.target.dataset.subInput) {
    event.preventDefault()

    const subbox = event.target.closest('.subbox')
    const item = event.target.closest('.subitem')

    if (!subbox || !item) return

    const tipo = subbox.dataset.tipo
    const index = Number(item.dataset.index)
    const field = event.target.dataset.subInput
    const tipoDetalle = tipoDetallePorInput(tipo, field)
    const campoDetalle = campoDetallePorInput(field)
    const detalle = asegurarDetalle(registro, tipoDetalle, index)

    detalle[campoDetalle] = capturaValue(event.target.value)
    recalc(registro)
    state.subboxAbierto = llaveSubboxRegistro(registro, tipo)

    if (tipo === 'compras') {
      abrirPrecioDesdeCompra(registro, index)
      return
    }

    if (tipo === 'precios' && field === 'importe') {
      asegurarParF(registro, index)
      state.subboxAbierto = llaveSubboxRegistro(registro, 'precios')
      render()
      enfocarSelector(selectorSubInput(registro.id_estacion, registro.id_producto, 'precios', index, 'sub_litros'))
      return
    }

    if (tipo === 'precios' && field === 'sub_litros') {
      state.subboxAbierto = ''
      render()
      enfocarSelector(selectorCampo(registro.id_estacion, registro.id_producto, 'inventario_final'))
      return
    }
  }
})

contenedor.addEventListener('click', event => {
  const captura = event.target.closest('[data-sub-capture]')

  if (captura) {
    const subbox = captura.closest('.subbox')

    if (!subbox) return

    const registro = getRegistro(subbox.dataset.idEstacion, subbox.dataset.idProducto)

    if (!registro) return

    abrirDetallePorClick(registro, subbox.dataset.tipo)
    return
  }

  const subboxClick = event.target.closest('.subbox')

  if (subboxClick && !event.target.closest('[data-remove]')) {
    cerrarSubitemsExcepto(subboxClick)
  }

  const remove = event.target.closest('[data-remove]')

  if (!remove) return

  const subbox = remove.closest('.subbox')
  const item = remove.closest('.subitem')

  if (!subbox || !item) return

  const registro = getRegistro(subbox.dataset.idEstacion, subbox.dataset.idProducto)

  if (!registro) return

  const index = Number(item.dataset.index)

  if (registro.compras[index]) {
    registro.compras.splice(index, 1)
  }

  if (registro.precios[index]) {
    registro.precios.splice(index, 1)
  }

  if (registro.sub_litros_compra[index]) {
    registro.sub_litros_compra.splice(index, 1)
  }

  recalc(registro)
  state.subboxAbierto = llaveSubboxRegistro(registro, subbox.dataset.tipo)
  render()
})

fechaInput.addEventListener('change', async () => {
  try {
    if (fechaTexto) {
      fechaTexto.textContent = fechaBonita(fechaInput.value)
    }

    await cargar()
  } catch (error) {
    notify(error.message)
  }
})

$('#btnCargar').addEventListener('click', async () => {
  try {
    await cargar()
    notify('Información cargada')
  } catch (error) {
    notify(error.message)
  }
})

$('#btnGuardar').addEventListener('click', async () => {
  try {
    await guardar()
  } catch (error) {
    notify(error.message)
  }
})

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function esCero(valor) {
  return Math.abs(numberValue(valor)) < 0.0000001
}

function claseCeroPDF(valor) {
  return esCero(valor) ? ' class="pdf-cero"' : ''
}

function celdaPDF(valor, tipo = 'entero') {
  const texto = tipo === 'dos' ? dosDecimales(valor) : sinDecimales(valor)
  return `<td${claseCeroPDF(valor)}>${texto}</td>`
}

function generarPDF() {
  state.registros.forEach(recalc)

  const registrosPDF = state.registros.filter(registro => !esDieselOculto(registro.nombre_estacion, registro.nombre_producto))
  const estaciones = [...new Map(registrosPDF.map(x => [x.id_estacion, x.nombre_estacion])).entries()]

  const contenido = estaciones.map(([idEstacion, nombre]) => {
    const rows = registrosPDF.filter(x => x.id_estacion === idEstacion && !esDieselOculto(x.nombre_estacion, x.nombre_producto))
    const nombreBonito = nombreEstacionBonito(nombre)

    return `
      <section class="pdf-station-card">
        <div class="pdf-station-title ${claseEstacion(nombre)}">
          ${escaparHTML(nombreBonito)}
        </div>

        <div class="pdf-table-wrap">
          <table>
            <colgroup>
              <col style="width:12%">
              <col style="width:17%">
              <col style="width:17%">
              <col style="width:20%">
              <col style="width:17%">
              <col style="width:17%">
            </colgroup>

            <thead>
              <tr>
                <th>Producto</th>
                <th>Inv. inicial</th>
                <th>Litros compra</th>
                <th>Precio por litro</th>
                <th>Inv. final</th>
                <th>Venta</th>
              </tr>
            </thead>

            <tbody>
              ${rows.map(registro => `
                <tr>
                  <td>
                    <span class="pdf-producto ${claseProducto(registro.nombre_producto)}">
                      ${escaparHTML(registro.nombre_producto)}
                    </span>
                  </td>
                  ${celdaPDF(registro.inventario_inicial)}
                  ${celdaPDF(registro.litros_compra)}
                  ${celdaPDF(registro.precio_por_litro, 'dos')}
                  ${celdaPDF(registro.inventario_final)}
                  ${celdaPDF(registro.venta)}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `
  }).join('')

  const ventana = window.open('', '_blank')

  if (!ventana) {
    notify('Permite ventanas emergentes para generar el PDF')
    return
  }

  const logoSrc = LOGO_SRC + '?v=' + Date.now()

  ventana.document.open()

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Inventario ${fechaInput.value}</title>

      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @page {
          size: letter portrait;
          margin: 0.14in 0.16in 0.16in 0.16in;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          font-family: Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-weight: 400;
        }

        body {
          overflow: visible;
        }

        .pdf-sheet {
          width: 100%;
          height: 10.65in;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          position: relative;
        }

        .pdf-logo {
          position: absolute;
          left: 14px;
          top: 14px;
          width: 86px;
          height: 52px;
          object-fit: contain;
        }

        .pdf-content-center {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding-top: 0;
          padding-bottom: 4px;
        }

        .pdf-header {
          width: 84%;
          flex: 0 0 auto;
          margin: 0 auto 7px auto;
          padding: 0 0 5px 0;
          border-bottom: 1px solid #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-header-texto {
          text-align: center;
          width: 100%;
        }

        .pdf-header-texto h1 {
          margin: 0;
          padding: 0;
          font-size: 16pt;
          line-height: 1;
          font-weight: 400;
          text-align: center;
        }

        .pdf-fecha {
          margin-top: 1px;
          font-size: 11.5pt;
          line-height: 1;
          font-weight: 400;
          color: #1e3a8a;
          text-align: center;
        }

        .pdf-stations-list {
          flex: 0 0 auto;
          width: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .pdf-station-card {
          flex: 0 0 auto;
          width: 84%;
          margin: 0 auto;
          min-height: 0;
          border: 1px solid #cbd5e1;
          border-radius: 2px;
          overflow: hidden;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
        }

        .pdf-station-title {
          flex: 0 0 auto;
          padding: 4px 8px;
          color: #ffffff;
          font-size: 8.8pt;
          line-height: 1;
          font-weight: 400;
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          white-space: nowrap;
          overflow: visible;
        }

        .pdf-station-title.ary-1 {
          background: linear-gradient(135deg, #15803d, #22c55e);
        }

        .pdf-station-title.ary-2 {
          background: linear-gradient(135deg, #991b1b, #ef4444);
        }

        .pdf-station-title.ary-3 {
          background: linear-gradient(135deg, #7e22ce, #c084fc);
        }

        .pdf-station-title.ary-4 {
          background: linear-gradient(135deg, #c2410c, #fb923c);
        }

        .pdf-station-title.ary-5 {
          background: linear-gradient(135deg, #1d4ed8, #60a5fa);
        }

        .pdf-station-title.ary-6 {
          background: linear-gradient(135deg, #ca8a04, #fde047);
          color: #1f2937;
        }

        .pdf-station-title.apache {
          background: linear-gradient(135deg, #701a35, #be123c);
        }

        .pdf-table-wrap {
          flex: 0 0 auto;
          width: 100%;
          min-height: 0;
          display: flex;
          justify-content: center;
        }

        table {
          width: 100%;
          height: auto;
          border-collapse: collapse;
          table-layout: fixed;
        }

        thead,
        tbody,
        tr {
          height: auto;
        }

        th {
          background: #f1f5f9;
          color: #334155;
          font-size: 6.4pt;
          line-height: 1;
          text-transform: uppercase;
          padding: 3px 1.5px;
          border: .75px solid #cbd5e1;
          text-align: center;
          vertical-align: middle;
          font-weight: 400;
        }

        td {
          padding: 5px 1.5px;
          border: .75px solid #cbd5e1;
          font-size: 9.1pt;
          line-height: 1.05;
          font-weight: 400;
          text-align: center;
          vertical-align: middle;
          word-break: break-word;
        }

        td.pdf-cero {
          background: #f1f5f9;
          color: #94a3b8;
        }

        .pdf-producto {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 5px;
          color: #ffffff;
          font-weight: 400;
          min-width: 48px;
          text-align: center;
          background: #334155;
          font-size: 6.4pt;
          line-height: 1;
        }

        .pdf-producto.MAGNA {
          background: #16a34a;
        }

        .pdf-producto.PREMIUM {
          background: #dc2626;
        }

        .pdf-producto.DIESEL {
          background: #111827;
        }

        .pdf-footer {
          flex: 0 0 auto;
          width: 84%;
          margin: 12px auto 0 auto;
          padding-top: 3px;
          border-top: 1px solid #94a3b8;
          background: #ffffff;
          font-size: 8.2pt;
          line-height: 1.15;
          color: #0f172a;
          font-weight: 400;
          text-align: center;
        }

        .pdf-footer div {
          margin: 0;
          padding: 0;
          font-weight: 400;
          white-space: nowrap;
          text-align: center;
        }

        .pdf-footer span {
          font-weight: 400;
        }

        @media print {
          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
          }

          .pdf-sheet {
            width: 100%;
            height: 10.65in;
          }
        }
      </style>
    </head>

    <body>
      <div class="pdf-sheet">
        <img class="pdf-logo" src="${logoSrc}">
        <div class="pdf-content-center">
          <div class="pdf-header">
            <div class="pdf-header-texto">
              <h1>Inventarios de Combustible</h1>
              <div class="pdf-fecha">Fecha: ${escaparHTML(fechaBonita(fechaInput.value))}</div>
            </div>
          </div>

          <div class="pdf-stations-list">
            ${contenido}
          </div>

          <div class="pdf-footer">
            <div><span>PROVEEDOR COMPRAS:</span> DISTRIBUIDORA VICTORIA DE LOS LLANOS &nbsp;&nbsp; <span>PERMISO:</span> PL/18826/DIS/OM/2016</div>
            <div><span>TRANSPORTISTA:</span> PETROLEOS MEXICANOS &nbsp;&nbsp; <span>PERMISO:</span> PL/10537/TRA/OM/2015</div>
          </div>
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


function colorEstacionCanvas(nombre) {
  const clase = claseEstacion(nombre)

  if (clase === 'ary-1') return '#16a34a'
  if (clase === 'ary-2') return '#dc2626'
  if (clase === 'ary-3') return '#a855f7'
  if (clase === 'ary-4') return '#f97316'
  if (clase === 'ary-5') return '#3b82f6'
  if (clase === 'ary-6') return '#facc15'
  if (clase === 'apache') return '#9f1239'

  return '#1e3a8a'
}

function colorTextoEstacionCanvas(nombre) {
  return claseEstacion(nombre) === 'ary-6' ? '#1f2937' : '#ffffff'
}

function colorProductoCanvas(nombre) {
  const clase = claseProducto(nombre)

  if (clase === 'MAGNA') return '#16a34a'
  if (clase === 'PREMIUM') return '#dc2626'
  if (clase === 'DIESEL') return '#111827'

  return '#334155'
}

function redondearCanvas(ctx, x, y, w, h, r) {
  const radio = Math.min(r, w / 2, h / 2)

  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.lineTo(x + w - radio, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radio)
  ctx.lineTo(x + w, y + h - radio)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radio, y + h)
  ctx.lineTo(x + radio, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radio)
  ctx.lineTo(x, y + radio)
  ctx.quadraticCurveTo(x, y, x + radio, y)
  ctx.closePath()
}

function cargarImagenCompartir(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function obtenerRegistrosCompartir() {
  return state.registros.filter(registro => !esDieselOculto(registro.nombre_estacion, registro.nombre_producto))
}

async function crearImagenInventarioPCCanvas() {
  state.registros.forEach(recalc)

  const registros = obtenerRegistrosCompartir()
  const estaciones = [...new Map(registros.map(x => [x.id_estacion, x.nombre_estacion])).entries()]

  const ancho = 1920
  const alto = 1080
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto

  const ctx = canvas.getContext('2d')

  const fondo = ctx.createLinearGradient(0, 0, ancho, alto)
  fondo.addColorStop(0, '#eef4ff')
  fondo.addColorStop(0.55, '#f8fafc')
  fondo.addColorStop(1, '#e8f7ef')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, ancho, alto)

  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  redondearCanvas(ctx, 28, 24, ancho - 56, alto - 48, 34)
  ctx.fill()

  ctx.strokeStyle = 'rgba(226,232,240,0.9)'
  ctx.lineWidth = 2
  redondearCanvas(ctx, 28, 24, ancho - 56, alto - 48, 34)
  ctx.stroke()

  const logo = await cargarImagenCompartir(LOGO_SRC + '?v=' + Date.now())

  if (logo) {
    ctx.drawImage(logo, 72, 48, 108, 78)
  }

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 42px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Inventarios de Combustible', ancho / 2, 68)

  ctx.fillStyle = '#1d4ed8'
  ctx.font = '500 23px Arial'
  ctx.fillText(`Fecha: ${fechaBonita(fechaInput.value)}`, ancho / 2, 106)

  const margenX = 48
  const topGrid = 146
  const gapX = 22
  const gapY = 14
  const cardW = Math.floor((ancho - margenX * 2 - gapX) / 2)
  const titleH = 34
  const headH = 26
  const rowH = 35
  const bottomPad = 8
  const tablePadX = 12
  const footerY = alto - 37

  const grupos = []

  for (let i = 0; i < estaciones.length; i += 2) {
    grupos.push(estaciones.slice(i, i + 2))
  }

  function altoCard(idEstacion) {
    const filas = registros.filter(x => x.id_estacion === idEstacion).length
    return titleH + headH + filas * rowH + bottomPad
  }

  function textoCortado(texto, maxW) {
    let valor = String(texto ?? '')

    if (ctx.measureText(valor).width <= maxW) return valor

    while (valor.length > 1 && ctx.measureText(`${valor}...`).width > maxW) {
      valor = valor.slice(0, -1)
    }

    return `${valor}...`
  }

  function textoCentrado(texto, x, y, w) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(textoCortado(texto, w - 8), x + w / 2, y)
  }

  function textoIzquierda(texto, x, y, w) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(textoCortado(texto, w - 8), x + 4, y)
  }

  function dibujarCard(idEstacion, nombre, x, y, w) {
    const rowsProductos = registros.filter(x => x.id_estacion === idEstacion)
    const nombreBonito = nombreEstacionBonito(nombre)
    const h = altoCard(idEstacion)

    ctx.shadowColor = 'rgba(15, 23, 42, 0.10)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 6
    ctx.fillStyle = '#ffffff'
    redondearCanvas(ctx, x, y, w, h, 18)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.strokeStyle = '#dbe3ef'
    ctx.lineWidth = 1.5
    redondearCanvas(ctx, x, y, w, h, 18)
    ctx.stroke()

    ctx.fillStyle = colorEstacionCanvas(nombre)
    redondearCanvas(ctx, x, y, w, titleH, 18)
    ctx.fill()

    ctx.fillStyle = colorTextoEstacionCanvas(nombre)
    ctx.font = '700 21px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(textoCortado(nombreBonito, w - 28), x + 16, y + titleH / 2)

    const tableX = x + tablePadX
    const tableW = w - tablePadX * 2
    const tableY = y + titleH

    const colWidths = [0.14, 0.18, 0.16, 0.18, 0.17, 0.17].map(p => Math.floor(tableW * p))
    colWidths[colWidths.length - 1] = tableW - colWidths.slice(0, -1).reduce((a, b) => a + b, 0)

    const headers = ['Producto', 'Inv. inicial', 'Compra', 'Precio/L', 'Inv. final', 'Venta']

    let cx = tableX

    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(tableX, tableY, tableW, headH)

    ctx.strokeStyle = '#dbe3ef'
    ctx.lineWidth = 1
    ctx.strokeRect(tableX, tableY, tableW, headH)

    headers.forEach((titulo, index) => {
      const cw = colWidths[index]
      ctx.fillStyle = '#334155'
      ctx.font = '700 12px Arial'
      textoCentrado(titulo.toUpperCase(), cx, tableY + headH / 2, cw)
      ctx.strokeStyle = '#dbe3ef'
      ctx.strokeRect(cx, tableY, cw, headH)
      cx += cw
    })

    rowsProductos.forEach((registro, rowIndex) => {
      const ry = tableY + headH + rowIndex * rowH
      let rx = tableX

      ctx.fillStyle = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
      ctx.fillRect(tableX, ry, tableW, rowH)

      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1
      ctx.strokeRect(tableX, ry, tableW, rowH)

      const valores = [
        { texto: String(registro.nombre_producto).toUpperCase(), cero: false },
        { texto: sinDecimales(registro.inventario_inicial), cero: esCero(registro.inventario_inicial) },
        { texto: sinDecimales(registro.litros_compra), cero: esCero(registro.litros_compra) },
        { texto: dosDecimales(registro.precio_por_litro), cero: esCero(registro.precio_por_litro) },
        { texto: sinDecimales(registro.inventario_final), cero: esCero(registro.inventario_final) },
        { texto: sinDecimales(registro.venta), cero: esCero(registro.venta) }
      ]

      valores.forEach((celda, index) => {
        const cw = colWidths[index]
        const valor = celda.texto

        if (index !== 0 && celda.cero) {
          ctx.fillStyle = '#f1f5f9'
          ctx.fillRect(rx + 1, ry + 1, cw - 2, rowH - 2)
        }

        ctx.strokeStyle = '#e2e8f0'
        ctx.strokeRect(rx, ry, cw, rowH)

        if (index === 0) {
          const chipW = Math.min(cw - 12, 112)
          const chipH = 22
          const chipX = rx + (cw - chipW) / 2
          const chipY = ry + (rowH - chipH) / 2

          ctx.fillStyle = colorProductoCanvas(registro.nombre_producto)
          redondearCanvas(ctx, chipX, chipY, chipW, chipH, 11)
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.font = '700 14px Arial'
          textoCentrado(valor, rx, ry + rowH / 2, cw)
        } else {
          ctx.fillStyle = celda.cero ? '#94a3b8' : '#0f172a'
          ctx.font = '700 17px Arial'
          textoCentrado(valor, rx, ry + rowH / 2, cw)
        }

        rx += cw
      })
    })
  }

  let y = topGrid

  grupos.forEach(grupo => {
    const alturas = grupo.map(([idEstacion]) => altoCard(idEstacion))
    const rowHeight = Math.max(...alturas)

    grupo.forEach(([idEstacion, nombre], index) => {
      const x = grupo.length === 1
        ? Math.round((ancho - cardW) / 2)
        : margenX + index * (cardW + gapX)

      dibujarCard(idEstacion, nombre, x, y, cardW)
    })

    y += rowHeight + gapY
  })

  ctx.fillStyle = '#475569'
  ctx.font = '500 17px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Reporte generado por Inventarios de Combustible ARY', ancho / 2, footerY)

  return canvas
}
function canvasAPngBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png', 0.95)
  })
}

async function copiarImagenAlPortapapeles(blob) {
  if (!navigator.clipboard || !window.ClipboardItem) {
    return false
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])

    return true
  } catch (_) {
    return false
  }
}

async function compartirWhatsApp() {
  try {
    if (!state.registros.length) {
      await cargar()
    }

    const canvas = await crearImagenInventarioPCCanvas()
    const blob = await canvasAPngBlob(canvas)

    if (!blob) {
      throw new Error('No se pudo generar la imagen')
    }

    const copiada = await copiarImagenAlPortapapeles(blob)

    if (!copiada) {
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')

      enlace.href = url
      enlace.download = `inventario-pc-${fechaInput.value}.png`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()

      setTimeout(() => URL.revokeObjectURL(url), 30000)

      notify('No se pudo copiar. Se descargó la imagen para PC')
      return
    }

    notify('Imagen para PC copiada. Pégala donde la necesites')
  } catch (error) {
    notify(error.message || 'No se pudo generar la imagen')
  }
}

function asegurarBotonWhatsApp() {
  let btn = document.querySelector('#btnWhatsApp')

  if (!btn) {
    btn = document.createElement('button')
    btn.id = 'btnWhatsApp'
    btn.type = 'button'
    btn.textContent = 'Copiar imagen'

    const acciones = document.querySelector('.actions')
    const btnPDF = document.querySelector('#btnPDF')

    if (acciones) {
      acciones.appendChild(btn)
    } else if (btnPDF && btnPDF.parentNode) {
      btnPDF.parentNode.insertBefore(btn, btnPDF.nextSibling)
    } else {
      document.body.appendChild(btn)
    }
  }

  btn.removeEventListener('click', compartirWhatsApp)
  btn.addEventListener('click', compartirWhatsApp)
}

$('#btnPDF').addEventListener('click', generarPDF)

asegurarBotonWhatsApp()

cargar().catch(error => notify(error.message))
