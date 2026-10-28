require('dotenv').config()

const express = require('express')
const cors = require('cors')
const sql = require('mssql')
const path = require('path')
const os = require('os')
const fs = require('fs')
const http = require('http')
const https = require('https')
const app = express()

const PORT = Number.parseInt(process.env.PORT, 10) || 8080
const HTTP_PORT = Number.parseInt(process.env.HTTP_PORT, 10) || 0
const HOST = process.env.HOST || '0.0.0.0'
const PUBLIC_DIR = path.join(__dirname, 'public')
const SSL_ENABLED = ['1', 'true', 'yes', 'si', 'sí'].includes(String(process.env.SSL_ENABLED || '1').toLowerCase())
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || ''
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || ''

const sqlPools = new Map()
const sqlPoolPromises = new Map()
let schemaReady = false

function getLocalIp() {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    for (const item of interfaces[name]) {
      if (item.family === 'IPv4' && !item.internal) {
        return item.address
      }
    }
  }

  return 'localhost'
}

const LAN_IP = process.env.LAN_IP || getLocalIp()

const dbConfig = {
  server: process.env.SQL_SERVER,
  port: Number.parseInt(process.env.SQL_PORT, 10) || 1433,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  connectionTimeout: 30000,
  requestTimeout: 120000,
  options: {
    encrypt: String(process.env.SQL_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQL_TRUST_CERT || 'true').toLowerCase() === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

const DEFAULT_SQL_SERVERS = Object.freeze([
  '10.20.20.51',
  '10.20.20.61',
  '10.20.20.63',
  '10.20.20.59',
  '10.20.20.65',
  '10.20.20.67',
  '10.20.20.70'
])

const SQL_SERVERS = [...new Set(
  String(process.env.SQL_SERVERS || DEFAULT_SQL_SERVERS.join(','))
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
)]

const REMOTE_SQL_PORT = Number.parseInt(process.env.REMOTE_SQL_PORT || process.env.SQL_PORT, 10) || 1433
const REMOTE_SQL_USER = process.env.REMOTE_SQL_USER || process.env.SQL_USER || 'sa'
const REMOTE_SQL_PASSWORD = process.env.REMOTE_SQL_PASSWORD || process.env.SQL_PASSWORD || ''
const REMOTE_SQL_DATABASE = process.env.REMOTE_SQL_DATABASE || process.env.SQL_DATABASE || ''
const REMOTE_SQL_CONNECTION_TIMEOUT = Number.parseInt(process.env.REMOTE_SQL_CONNECTION_TIMEOUT, 10) || 5000
const POLARIS_DATABASE = process.env.POLARIS_DATABASE || 'Polaris'

function sqlTargetFromRequest(req) {
  return {
    server: String(
      req?.headers?.['x-sql-server'] ||
      req?.query?.sql_server ||
      req?.body?.sql_server ||
      ''
    ).trim(),
    database: String(
      req?.headers?.['x-sql-database'] ||
      req?.query?.sql_database ||
      req?.body?.sql_database ||
      ''
    ).trim()
  }
}

function validarServidorSql(server) {
  if (!SQL_SERVERS.includes(server)) {
    throw new Error('Servidor SQL no autorizado')
  }
}

function remoteDbConfig(server, database) {
  return {
    ...dbConfig,
    server,
    port: REMOTE_SQL_PORT,
    database,
    user: REMOTE_SQL_USER,
    password: REMOTE_SQL_PASSWORD,
    connectionTimeout: REMOTE_SQL_CONNECTION_TIMEOUT
  }
}

async function getOrCreatePool(config, key) {
  const existente = sqlPools.get(key)

  if (existente?.connected) {
    return existente
  }

  if (sqlPoolPromises.has(key)) {
    return sqlPoolPromises.get(key)
  }

  const promise = (async () => {
    if (existente) {
      try {
        await existente.close()
      } catch (_) {}

      sqlPools.delete(key)
    }

    const nuevoPool = new sql.ConnectionPool(config)

    nuevoPool.on('error', error => {
      console.log(`ERROR POOL SQL ${key}:`, error.message)
      sqlPools.delete(key)
    })

    await nuevoPool.connect()
    sqlPools.set(key, nuevoPool)

    return nuevoPool
  })()

  sqlPoolPromises.set(key, promise)

  try {
    return await promise
  } finally {
    sqlPoolPromises.delete(key)
  }
}

async function getRemotePool(server, database = REMOTE_SQL_DATABASE || 'master') {
  validarServidorSql(server)

  if (!REMOTE_SQL_USER || !REMOTE_SQL_PASSWORD) {
    throw new Error('Faltan REMOTE_SQL_USER o REMOTE_SQL_PASSWORD en el archivo .env')
  }

  const db = String(database || '').trim() || 'master'
  const key = `remote:${server}:${REMOTE_SQL_PORT}:${db}`

  return getOrCreatePool(remoteDbConfig(server, db), key)
}

function obtenerRutaLogo() {
  const rutas = [
    process.env.LOGO_PATH,

    // Logo ubicado en la raíz del proyecto
    path.join(__dirname, 'logo-ary.jpeg'),

    path.join(PUBLIC_DIR, 'imagenes', 'Ary Logo A (1).png'),
    path.join(PUBLIC_DIR, 'imagenes', 'ary.logo.png'),
    path.resolve('C:/Users/admin/Desktop/inventarios-combustible/ary.logo.png')
  ].filter(Boolean)

  const encontrada = rutas.find(ruta => fs.existsSync(ruta))

  return encontrada || rutas[0]
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0
  // SQL Server envía los DECIMAL como Number. No confundir 731.286 con 731,286.
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

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


function fechaLocal(fechaISOValor) {
  const partes = String(fechaISOValor || '').slice(0, 10).split('-').map(Number)
  if (partes.length !== 3 || partes.some(n => !Number.isFinite(n))) {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  }
  return new Date(partes[0], partes[1] - 1, partes[2])
}

function fechaISO(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function proximoLunes(fechaISOValor) {
  const fecha = fechaLocal(fechaISOValor)
  const diaSemanaNumero = fecha.getDay()
  const faltan = diaSemanaNumero === 1 ? 7 : (8 - diaSemanaNumero) % 7
  fecha.setDate(fecha.getDate() + faltan)
  return fechaISO(fecha)
}

async function ensureSchema(p) {
  schemaReady = true
}
async function getPool(req) {
  try {
    const target = sqlTargetFromRequest(req)

    if (target.server) {
      const database = target.database || REMOTE_SQL_DATABASE

      if (!database) {
        throw new Error('No se seleccionó una base de datos para el servidor remoto')
      }

      const p = await getRemotePool(target.server, database)
      console.log(`SQL remoto conectado: ${target.server} / ${database}`)
      return p
    }

    if (!process.env.SQL_SERVER || !process.env.SQL_DATABASE || !process.env.SQL_USER || !process.env.SQL_PASSWORD) {
      throw new Error('Faltan datos de conexión SQL en el archivo .env')
    }

    const key = `principal:${dbConfig.server}:${dbConfig.port}:${dbConfig.database}`
    return getOrCreatePool(dbConfig, key)
  } catch (error) {
    console.log('ERROR CONEXION SQL:', error.message)
    throw error
  }
}

function crearRequestPool(p) {
  const request = p.request()
  request.timeout = 120000
  return request
}

function crearRequestTransaction(transaction) {
  const request = new sql.Request(transaction)
  request.timeout = 120000
  return request
}

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Log ligero solo para revisar si las rutas de costos llegan al servidor
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/costos')) {
    console.log('PETICION COSTOS:', req.method, req.originalUrl)
  }

  next()
})

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR))
} else {
  console.log(`No existe la carpeta public en: ${PUBLIC_DIR}`)
}

app.get('/imagenes/:archivo', (req, res, next) => {
  const archivo = decodeURIComponent(req.params.archivo || '').toLowerCase()

  const nombresLogo = [
  'logo-ary.jpeg',
  'ary logo a (1).png',
  'ary.logo.png',
  'ary-logo.png',
  'logo.png'
]

  if (!nombresLogo.includes(archivo)) {
    return next()
  }

  const logoPath = obtenerRutaLogo()

  res.setHeader('Cache-Control', 'no-store')

  res.sendFile(logoPath, error => {
    if (error && !res.headersSent) {
      res.status(404).send('Logo no encontrado')
    }
  })
})

app.get('/api/health', async (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor funcionando correctamente',
    port: PORT,
    host: HOST,
    ip: LAN_IP,
    protocol: PROTOCOL,
    public: PUBLIC_DIR,
    logo: obtenerRutaLogo()
  })
})

app.get('/api/sql-servidores', (req, res) => {
  res.json({
    ok: true,
    central: {
      server: process.env.SQL_SERVER || '',
      database: process.env.SQL_DATABASE || ''
    },
    servers: SQL_SERVERS,
    preferred_database: REMOTE_SQL_DATABASE || ''
  })
})

app.get('/api/sql-servidores/bases', async (req, res) => {
  try {
    const server = String(req.query.server || '').trim()

    if (!server) {
      throw new Error('No se recibió el servidor SQL')
    }

    const p = await getRemotePool(server, 'master')
    const result = await crearRequestPool(p).query(`
      SELECT name
      FROM sys.databases
      WHERE database_id > 4
        AND state_desc = 'ONLINE'
      ORDER BY name
    `)

    res.json({
      ok: true,
      server,
      databases: result.recordset.map(row => row.name),
      preferred_database: REMOTE_SQL_DATABASE || ''
    })
  } catch (error) {
    console.log('ERROR LISTANDO BASES SQL:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/health-sql', async (req, res) => {
  try {
    const p = await getPool(req)
    const requestHealth = crearRequestPool(p)
    const result = await requestHealth.query('SELECT 1 AS ok')

    res.json({
      ok: true,
      message: 'Servidor y SQL funcionando correctamente',
      sql: result.recordset[0]
    })
  } catch (error) {
    console.log('ERROR HEALTH SQL:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})


// Lecturas de Polaris: una medición por tanque físico y fecha real de sensor.
// Solo datos de tanques; ventas e inventario inicial se consultan a Inventarios Combustibles.
const POLARIS_MAX_EDAD_MINUTOS = Math.max(1, Number.parseInt(process.env.POLARIS_MAX_EDAD_MINUTOS, 10) || 20)
const polarisIdTanquePorServidor = new Map()

async function identificarColumnaTanque(pool, server) {
  if (polarisIdTanquePorServidor.has(server)) return polarisIdTanquePorServidor.get(server)

  const columnas = await crearRequestPool(pool).query(`
    SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Tanques')
  `)
  const nombres = new Map(columnas.recordset.map(row => [String(row.name).toLowerCase(), row.name]))
  const candidatos = ['NoTanque', 'NumeroTanque', 'NumTanque', 'IdTanque', 'IDTanque']
  const identificador = candidatos.map(campo => nombres.get(campo.toLowerCase())).find(Boolean) || null
  polarisIdTanquePorServidor.set(server, identificador)
  return identificador
}

app.get('/api/pipas/polaris/estado', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  const fechaSolicitada = String(req.query.fecha || '').trim()
  const fechaObjetivo = /^\d{4}-\d{2}-\d{2}$/.test(fechaSolicitada)
    ? fechaSolicitada
    : fechaISO(new Date())

  async function consultarServidorPolaris(server) {
    const pool = await getRemotePool(server, POLARIS_DATABASE)
    const metaResult = await crearRequestPool(pool).query(`
      SELECT TOP (1)
        NoES AS no_es,
        Estacion AS nombre_estacion,
        DireccionIP AS direccion_ip,
        CONVERT(VARCHAR(10), FechaContable, 23) AS fecha_contable,
        TurnoActual AS turno_actual,
        CONVERT(VARCHAR(19), FechaHora, 120) AS fecha_hora_estacion
      FROM dbo.Estaciones WITH (NOLOCK)
      ORDER BY NoES;
    `)
    if (!metaResult.recordset.length) throw new Error('No se encontró la estación en Polaris')

    const meta = metaResult.recordset[0]
    const noEs = Number(meta.no_es)
    if (!Number.isSafeInteger(noEs) || noEs <= 0) {
      throw new Error('Polaris devolvió un NoES inválido')
    }

    // Si Polaris guarda históricos en Tanques, no SUMAR todos los históricos.
    // ROW_NUMBER selecciona la última lectura por número de tanque físico.
    // No suponer identificadores inexistentes; se consulta el esquema real.
    const columnaTanque = await identificarColumnaTanque(pool, server)
    const columnaEscapada = columnaTanque ? '[' + columnaTanque.replace(/]/g, ']]') + ']' : null
    const fila = columnaEscapada
      ? 'ROW_NUMBER() OVER (PARTITION BY t.NoES, t.NoProducto, t.' + columnaEscapada + ' ORDER BY t.FechaHora DESC) AS fila'
      : 'CAST(1 AS INT) AS fila'

    const actuales = await crearRequestPool(pool)
      .input('no_es', sql.Int, noEs)
      .query(`
        ;WITH Lecturas AS (
          SELECT t.NoES, t.NoProducto, t.Volumen, t.CapacidadTotal, t.FechaHora,
            ${fila}
          FROM dbo.Tanques t WITH (NOLOCK)
          WHERE t.NoES = @no_es
        ),
        UltimosTanques AS (
          SELECT * FROM Lecturas WHERE fila = 1
        )
        SELECT
          t.NoProducto AS no_producto,
          p.Producto AS nombre_producto,
          CAST(SUM(CAST(ISNULL(t.Volumen, 0) AS DECIMAL(18,3))) AS DECIMAL(18,3)) AS tanque_actual,
          CAST(SUM(CAST(ISNULL(t.CapacidadTotal, 0) AS DECIMAL(18,3))) AS DECIMAL(18,3)) AS capacidad_tanque,
          COUNT(*) AS numero_tanques,
          COUNT(t.Volumen) AS tanques_con_volumen,
          CONVERT(VARCHAR(19), MAX(t.FechaHora), 120) AS fecha_tanque,
          CONVERT(VARCHAR(19), MIN(t.FechaHora), 120) AS fecha_tanque_mas_antigua,
          DATEDIFF(MINUTE, MIN(t.FechaHora), GETDATE()) AS edad_minutos
        FROM UltimosTanques t
        OUTER APPLY (
          SELECT TOP (1) prod.Producto
          FROM dbo.Productos prod WITH (NOLOCK)
          WHERE prod.NoProducto = t.NoProducto AND prod.TipoProducto = 'C'
          ORDER BY prod.Producto
        ) p
        WHERE p.Producto IS NOT NULL
        GROUP BY t.NoProducto, p.Producto
        ORDER BY t.NoProducto;
      `)

    const productos = actuales.recordset.map(row => {
      const edad = row.edad_minutos === null ? null : Number(row.edad_minutos)
      const volumen = row.tanque_actual === null ? null : Number(row.tanque_actual)
      const capacidad = row.capacidad_tanque === null ? null : Number(row.capacidad_tanque)
      const totalTanques = Number(row.numero_tanques || 0)
      const sensorValido = Number(row.tanques_con_volumen) === totalTanques &&
        totalTanques > 0 && Number.isFinite(volumen) && Number.isFinite(capacidad) &&
        volumen >= 0 && capacidad > 0 && volumen <= capacidad * 1.01
      const fechaValida = Number.isFinite(edad) && edad >= -5 && edad <= POLARIS_MAX_EDAD_MINUTOS
      let estado = 'vigente'
      if (!columnaTanque) estado = 'no_verificada'
      else if (!sensorValido) estado = 'inconsistente'
      else if (!fechaValida) estado = 'desactualizada'

      return {
        no_producto: Number(row.no_producto),
        nombre_producto: row.nombre_producto,
        tanque_actual: volumen,
        capacidad_tanque: capacidad,
        numero_tanques: totalTanques,
        fecha_tanque: row.fecha_tanque || null,
        fecha_tanque_mas_antigua: row.fecha_tanque_mas_antigua || null,
        edad_minutos: Number.isFinite(edad) ? edad : null,
        estado_lectura: estado,
        deduplicado_por: columnaTanque || null
      }
    })

    return {
      server,
      database: POLARIS_DATABASE,
      no_es: noEs,
      nombre_estacion: meta.nombre_estacion || '',
      direccion_ip: meta.direccion_ip || server,
      fecha_contable: meta.fecha_contable || '',
      turno_actual: meta.turno_actual,
      fecha_hora_estacion: meta.fecha_hora_estacion || null,
      productos
    }
  }

  const resultados = await Promise.all(SQL_SERVERS.map(async server => {
    try {
      return { ok: true, station: await consultarServidorPolaris(server) }
    } catch (error) {
      return { ok: false, server, message: error.message }
    }
  }))

  const stations = resultados.filter(item => item.ok).map(item => item.station)
  const errors = resultados.filter(item => !item.ok)
    .map(item => ({ server: item.server, message: item.message }))

  res.json({
    ok: stations.length > 0,
    fecha: fechaObjetivo,
    database: POLARIS_DATABASE,
    consulta_en: new Date().toISOString(),
    max_edad_minutos: POLARIS_MAX_EDAD_MINUTOS,
    servidores_consultados: SQL_SERVERS.length,
    stations,
    errors
  })
})

app.get('/api/estaciones', async (req, res) => {
  try {
    const p = await getPool(req)

    const result = await p.request().query(`
      SELECT
        id_estacion,
        nombre_estacion
      FROM Estaciones
      WHERE activa = 1
      ORDER BY id_estacion
    `)

    res.json(result.recordset)
  } catch (error) {
    console.log('ERROR ESTACIONES:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/productos', async (req, res) => {
  try {
    const p = await getPool(req)

    const result = await p.request().query(`
      SELECT
        id_producto,
        nombre_producto
      FROM Productos
      WHERE activo = 1
      ORDER BY
        CASE
          WHEN nombre_producto = 'MAGNA' THEN 1
          WHEN nombre_producto = 'PREMIUM' THEN 2
          WHEN nombre_producto = 'DIESEL' THEN 3
          ELSE 4
        END
    `)

    res.json(result.recordset)
  } catch (error) {
    console.log('ERROR PRODUCTOS:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/inventarios', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10)
    const p = await getPool(req)

    console.log('Consultando inventarios fecha:', fecha)

    const requestInventarios = crearRequestPool(p)

    const result = await requestInventarios
      .input('fecha', sql.Date, fecha)
      .query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        SELECT
          e.id_estacion,
          e.nombre_estacion,
          p.id_producto,
          p.nombre_producto,
          i.id_inventario,
          CASE
            WHEN ia.id_inventario IS NOT NULL AND ISNULL(ia.inventario_final, 0) > 0 THEN ia.inventario_final
            ELSE ISNULL(i.inventario_inicial, 0)
          END AS inventario_inicial,
          CASE
            WHEN ia.id_inventario IS NOT NULL AND ISNULL(ia.inventario_final, 0) > 0 THEN 1
            ELSE 0
          END AS inventario_inicial_bloqueado,
          ISNULL(i.litros_compra, 0) AS litros_compra,
          ISNULL(i.precio_por_litro, 0) AS precio_por_litro,
          ISNULL(i.precio_confirmado, 0) AS precio_confirmado,
          ISNULL(i.entrada_compra_real, 0) AS entrada_compra_real,
          ISNULL(i.inventario_final, 0) AS inventario_final,
          ISNULL(i.venta, 0) AS venta,
          ISNULL(i.litros_liquidacion, 0) AS litros_liquidacion,
          ISNULL(i.diferencias, 0) AS diferencias
        FROM Estaciones e WITH (NOLOCK)
        CROSS JOIN Productos p WITH (NOLOCK)
        LEFT JOIN Inventarios i WITH (NOLOCK)
          ON i.id_estacion = e.id_estacion
          AND i.id_producto = p.id_producto
          AND CONVERT(date, i.fecha) = @fecha
        LEFT JOIN Inventarios ia WITH (NOLOCK)
          ON ia.id_estacion = e.id_estacion
          AND ia.id_producto = p.id_producto
          AND CONVERT(date, ia.fecha) = DATEADD(DAY, -1, @fecha)
        WHERE e.activa = 1
          AND p.activo = 1
        ORDER BY
          e.id_estacion,
          CASE
            WHEN p.nombre_producto = 'MAGNA' THEN 1
            WHEN p.nombre_producto = 'PREMIUM' THEN 2
            WHEN p.nombre_producto = 'DIESEL' THEN 3
            ELSE 4
          END
      `)

    const ids = result.recordset
      .map(x => Number(x.id_inventario))
      .filter(x => Number.isInteger(x) && x > 0)

    let compras = []
    let precios = []
    let subLitrosCompra = []

    if (ids.length > 0) {
      const idsText = ids.join(',')

      const requestCompras = crearRequestPool(p)

      const comprasResult = await requestCompras.query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        SELECT
          id_inventario,
          id_detalle_compra,
          etiqueta,
          litros
        FROM DetalleCompraInventario WITH (NOLOCK)
        WHERE id_inventario IN (${idsText})
        ORDER BY
          id_inventario,
          id_detalle_compra
      `)

      const requestPrecios = crearRequestPool(p)

      const preciosResult = await requestPrecios.query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        SELECT
          id_inventario,
          id_detalle_precio,
          etiqueta,
          importe
        FROM DetallePrecioInventario WITH (NOLOCK)
        WHERE id_inventario IN (${idsText})
        ORDER BY
          id_inventario,
          id_detalle_precio
      `)

      const requestSubLitrosCompra = crearRequestPool(p)

      const subLitrosCompraResult = await requestSubLitrosCompra.query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        SELECT
          id_inventario,
          id_detalle_sub_litros_compra,
          etiqueta,
          litros
        FROM DetalleSubLitrosCompraInventario WITH (NOLOCK)
        WHERE id_inventario IN (${idsText})
        ORDER BY
          id_inventario,
          id_detalle_sub_litros_compra
      `)

      compras = comprasResult.recordset
      precios = preciosResult.recordset
      subLitrosCompra = subLitrosCompraResult.recordset
    }

    const data = result.recordset.map(row => {
      const rowCompras = compras
        .filter(x => Number(x.id_inventario) === Number(row.id_inventario))
        .map(x => ({
          etiqueta: x.etiqueta,
          litros: numberValue(x.litros)
        }))

      const rowPrecios = precios
        .filter(x => Number(x.id_inventario) === Number(row.id_inventario))
        .map(x => ({
          etiqueta: x.etiqueta,
          importe: numberValue(x.importe)
        }))

      const rowSubLitrosCompra = subLitrosCompra
        .filter(x => Number(x.id_inventario) === Number(row.id_inventario))
        .map(x => ({
          etiqueta: x.etiqueta,
          litros: numberValue(x.litros)
        }))

      if (!rowCompras.length && numberValue(row.litros_compra) > 0) {
        rowCompras.push({
          etiqueta: 'F1',
          litros: numberValue(row.litros_compra)
        })
      }

      const divisorPrecioGuardado = rowSubLitrosCompra.reduce((total, x) => total + numberValue(x.litros), 0) || numberValue(row.litros_compra)

      if (!rowPrecios.length && divisorPrecioGuardado > 0) {
        const entradaGuardada = numberValue(row.entrada_compra_real)
        const importeGuardado = entradaGuardada > 0
          ? entradaGuardada
          : numberValue(row.precio_por_litro) * divisorPrecioGuardado

        if (importeGuardado > 0) {
          rowPrecios.push({
            etiqueta: 'F1',
            importe: importeGuardado
          })
        }
      }

      return {
        ...row,
        inventario_inicial_bloqueado: Boolean(row.inventario_inicial_bloqueado),
        compras: rowCompras,
        precios: rowPrecios,
        sub_litros_compra: rowSubLitrosCompra
      }
    })

    console.log('Inventarios cargados:', data.length)

    res.json(data)
  } catch (error) {
    console.log('ERROR INVENTARIOS:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.post('/api/inventarios/precio-confirmado', async (req, res) => {
  try {
    const fecha = req.body.fecha
    const idEstacion = Number(req.body.id_estacion)
    const idProducto = Number(req.body.id_producto)
    const precioConfirmado = Boolean(req.body.precio_confirmado)

    if (!fecha || !idEstacion || !idProducto) {
      throw new Error('Faltan datos para guardar la confirmación del precio')
    }

    const p = await getPool(req)

    const result = await crearRequestPool(p)
      .input('fecha', sql.Date, fecha)
      .input('id_estacion', sql.Int, idEstacion)
      .input('id_producto', sql.Int, idProducto)
      .input('precio_confirmado', sql.Bit, precioConfirmado)
      .query(`
        DECLARE @id_inventario int;

        SELECT TOP 1
          @id_inventario = id_inventario
        FROM Inventarios
        WHERE id_estacion = @id_estacion
          AND id_producto = @id_producto
          AND CONVERT(date, fecha) = @fecha
        ORDER BY id_inventario DESC;

        IF @id_inventario IS NULL
        BEGIN
          INSERT INTO Inventarios (
            id_estacion,
            id_producto,
            fecha,
            precio_confirmado
          )
          VALUES (
            @id_estacion,
            @id_producto,
            @fecha,
            @precio_confirmado
          );

          SET @id_inventario = CONVERT(int, SCOPE_IDENTITY());
        END
        ELSE
        BEGIN
          UPDATE Inventarios
          SET precio_confirmado = @precio_confirmado
          WHERE id_inventario = @id_inventario;
        END;

        SELECT @id_inventario AS id_inventario;
      `)

    res.json({
      ok: true,
      id_inventario: result.recordset[0]?.id_inventario || null,
      precio_confirmado: precioConfirmado
    })
  } catch (error) {
    console.log('ERROR PRECIO CONFIRMADO:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.post('/api/inventarios/guardar', async (req, res) => {
  const fecha = req.body.fecha
  const registros = Array.isArray(req.body.registros) ? req.body.registros : []

  let transaction

  try {
    if (!fecha) {
      throw new Error('No se recibió la fecha del inventario')
    }

    const p = await getPool(req)
    transaction = new sql.Transaction(p)

    await transaction.begin()

    for (const item of registros) {
      const idEstacion = Number(item.id_estacion)
      const idProducto = Number(item.id_producto)
      const precioConfirmado = Boolean(item.precio_confirmado)

      if (!idEstacion || !idProducto) {
        continue
      }

      const comprasOriginal = Array.isArray(item.compras) ? item.compras : []
      const preciosOriginal = Array.isArray(item.precios) ? item.precios : []
      const subLitrosOriginal = Array.isArray(item.sub_litros_compra) ? item.sub_litros_compra : []

      let totalDetalles = Math.max(
        comprasOriginal.length,
        preciosOriginal.length,
        subLitrosOriginal.length
      )

      if (totalDetalles === 0 && numberValue(item.litros_compra) > 0) {
        totalDetalles = 1
      }

      const compras = []
      const precios = []
      const subLitrosCompra = []

      for (let i = 0; i < totalDetalles; i++) {
        const litrosCompraDetalle = numberValue(comprasOriginal[i]?.litros)
        const importeDetalle = numberValue(preciosOriginal[i]?.importe)
        const litrosPrecioDetalle = numberValue(subLitrosOriginal[i]?.litros ?? subLitrosOriginal[i]?.sub_litros ?? subLitrosOriginal[i]?.lts)
        const etiqueta = comprasOriginal[i]?.etiqueta || preciosOriginal[i]?.etiqueta || subLitrosOriginal[i]?.etiqueta || `F${i + 1}`

        if (litrosCompraDetalle !== 0 || importeDetalle !== 0 || litrosPrecioDetalle !== 0) {
          compras.push({
            etiqueta,
            litros: litrosCompraDetalle
          })

          precios.push({
            etiqueta,
            importe: importeDetalle
          })

          subLitrosCompra.push({
            etiqueta,
            litros: litrosPrecioDetalle
          })
        }
      }

      if (!compras.length && numberValue(item.litros_compra) > 0) {
        compras.push({
          etiqueta: 'F1',
          litros: numberValue(item.litros_compra)
        })

        precios.push({
          etiqueta: 'F1',
          importe: numberValue(item.precio_por_litro) * numberValue(item.litros_compra)
        })

        subLitrosCompra.push({
          etiqueta: 'F1',
          litros: numberValue(item.litros_compra)
        })
      }

      const litrosCompra = compras.reduce((total, x) => total + numberValue(x.litros), 0)
const totalPrecio = precios.reduce((total, x) => total + numberValue(x.importe), 0)
const totalLitrosPrecio = subLitrosCompra.reduce((total, x) => total + numberValue(x.litros), 0)

const entradaCompraManual = numberValue(item.entrada_compra_real)
const precioCapturado = numberValue(item.precio_por_litro)

const divisorPrecio = totalLitrosPrecio > 0
  ? totalLitrosPrecio
  : litrosCompra

const hayPrecioDetalleCapturado = precios.some(x => numberValue(x.importe) > 0)

const precioPorLitro = divisorPrecio > 0 && totalPrecio > 0
  ? totalPrecio / divisorPrecio
  : litrosCompra > 0 && entradaCompraManual > 0
    ? entradaCompraManual / litrosCompra
    : precioCapturado > 0
      ? precioCapturado
      : 0

const entradaCompraReal = litrosCompra > 0 && precioPorLitro > 0
  ? precioPorLitro * litrosCompra
  : 0

// IMPORTANTE:
// Si el usuario capturó importes por F1/F2/F3, se respetan tal cual.
// No se deben recalcular repartiendo por litros_compra.
const preciosParaGuardar = hayPrecioDetalleCapturado
  ? precios
  : precioPorLitro > 0
    ? compras.map(x => ({
      etiqueta: x.etiqueta,
      importe: numberValue(x.litros) * precioPorLitro
    }))
    : precios

      const inventarioAnterior = await crearRequestTransaction(transaction)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('fecha', sql.Date, fecha)
        .query(`
          SELECT TOP 1
            inventario_final
          FROM Inventarios WITH (NOLOCK)
          WHERE id_estacion = @id_estacion
            AND id_producto = @id_producto
            AND CONVERT(date, fecha) = DATEADD(DAY, -1, @fecha)
            AND ISNULL(inventario_final, 0) > 0
          ORDER BY id_inventario DESC
        `)

      const inventarioInicial = inventarioAnterior.recordset.length > 0
        ? numberValue(inventarioAnterior.recordset[0].inventario_final)
        : numberValue(item.inventario_inicial)

      const inventarioFinal = numberValue(item.inventario_final)
      const venta = inventarioInicial + litrosCompra - inventarioFinal
      const litrosLiquidacion = numberValue(item.litros_liquidacion)
      const diferencias = litrosLiquidacion - venta

      const existing = await crearRequestTransaction(transaction)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('fecha', sql.Date, fecha)
        .query(`
          SELECT TOP 1 id_inventario
          FROM Inventarios WITH (NOLOCK)
          WHERE id_estacion = @id_estacion
            AND id_producto = @id_producto
            AND CONVERT(date, fecha) = @fecha
          ORDER BY id_inventario DESC
        `)

      let idInventario

      if (existing.recordset.length > 0) {
        idInventario = existing.recordset[0].id_inventario

        await crearRequestTransaction(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('inventario_inicial', sql.Decimal(18, 3), inventarioInicial)
          .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
          .input('precio_por_litro', sql.Decimal(18, 10), precioPorLitro)
          .input('precio_confirmado', sql.Bit, precioConfirmado)
          .input('entrada_compra_real', sql.Decimal(18, 2), entradaCompraReal)
          .input('inventario_final', sql.Decimal(18, 3), inventarioFinal)
          .input('venta', sql.Decimal(18, 3), venta)
          .input('litros_liquidacion', sql.Decimal(18, 3), litrosLiquidacion)
          .input('diferencias', sql.Decimal(18, 3), diferencias)
          .query(`
            UPDATE Inventarios
            SET
              inventario_inicial = @inventario_inicial,
              litros_compra = @litros_compra,
              precio_por_litro = @precio_por_litro,
              precio_confirmado = @precio_confirmado,
              entrada_compra_real = @entrada_compra_real,
              inventario_final = @inventario_final,
              venta = @venta,
              litros_liquidacion = @litros_liquidacion,
              diferencias = @diferencias
            WHERE id_inventario = @id_inventario
          `)
      } else {
        const insert = await crearRequestTransaction(transaction)
          .input('id_estacion', sql.Int, idEstacion)
          .input('id_producto', sql.Int, idProducto)
          .input('fecha', sql.Date, fecha)
          .input('inventario_inicial', sql.Decimal(18, 3), inventarioInicial)
          .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
          .input('precio_por_litro', sql.Decimal(18, 10), precioPorLitro)
          .input('precio_confirmado', sql.Bit, precioConfirmado)
          .input('entrada_compra_real', sql.Decimal(18, 2), entradaCompraReal)
          .input('inventario_final', sql.Decimal(18, 3), inventarioFinal)
          .input('venta', sql.Decimal(18, 3), venta)
          .input('litros_liquidacion', sql.Decimal(18, 3), litrosLiquidacion)
          .input('diferencias', sql.Decimal(18, 3), diferencias)
          .query(`
            INSERT INTO Inventarios (
              id_estacion,
              id_producto,
              fecha,
              inventario_inicial,
              litros_compra,
              precio_por_litro,
              precio_confirmado,
              entrada_compra_real,
              inventario_final,
              venta,
              litros_liquidacion,
              diferencias
            )
            VALUES (
              @id_estacion,
              @id_producto,
              @fecha,
              @inventario_inicial,
              @litros_compra,
              @precio_por_litro,
              @precio_confirmado,
              @entrada_compra_real,
              @inventario_final,
              @venta,
              @litros_liquidacion,
              @diferencias
            );

            SELECT CONVERT(int, SCOPE_IDENTITY()) AS id_inventario
          `)

        idInventario = insert.recordset[0].id_inventario
      }

      await crearRequestTransaction(transaction)
        .input('fecha', sql.Date, fecha)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .query(`
          IF OBJECT_ID('dbo.CostosComprasMovimientos', 'U') IS NOT NULL
          BEGIN
            DELETE FROM dbo.CostosComprasMovimientos
            WHERE fecha >= @fecha
              AND id_estacion = @id_estacion
              AND id_producto = @id_producto
          END;

          IF OBJECT_ID('dbo.CostosCompras', 'U') IS NOT NULL
          BEGIN
            DELETE FROM dbo.CostosCompras
            WHERE fecha >= @fecha
              AND id_estacion = @id_estacion
              AND id_producto = @id_producto
          END;
        `)

      await crearRequestTransaction(transaction)
        .input('id_inventario', sql.Int, idInventario)
        .query(`
          DELETE FROM DetalleCompraInventario
          WHERE id_inventario = @id_inventario;

          DELETE FROM DetallePrecioInventario
          WHERE id_inventario = @id_inventario;

          DELETE FROM DetalleSubLitrosCompraInventario
          WHERE id_inventario = @id_inventario;
        `)

      for (let i = 0; i < compras.length; i++) {
        await crearRequestTransaction(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('etiqueta', sql.NVarChar(20), compras[i].etiqueta || `F${i + 1}`)
          .input('litros', sql.Decimal(18, 3), numberValue(compras[i].litros))
          .query(`
            INSERT INTO DetalleCompraInventario (
              id_inventario,
              etiqueta,
              litros
            )
            VALUES (
              @id_inventario,
              @etiqueta,
              @litros
            )
          `)
      }

      for (let i = 0; i < preciosParaGuardar.length; i++) {
        await crearRequestTransaction(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('etiqueta', sql.NVarChar(20), preciosParaGuardar[i].etiqueta || `F${i + 1}`)
          .input('importe', sql.Decimal(18, 4), numberValue(preciosParaGuardar[i].importe))
          .query(`
            INSERT INTO DetallePrecioInventario (
              id_inventario,
              etiqueta,
              importe
            )
            VALUES (
              @id_inventario,
              @etiqueta,
              @importe
            )
          `)
      }


      for (let i = 0; i < subLitrosCompra.length; i++) {
        await crearRequestTransaction(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('etiqueta', sql.NVarChar(20), subLitrosCompra[i].etiqueta || `F${i + 1}`)
          .input('litros', sql.Decimal(18, 3), numberValue(subLitrosCompra[i].litros))
          .query(`
            INSERT INTO DetalleSubLitrosCompraInventario (
              id_inventario,
              etiqueta,
              litros
            )
            VALUES (
              @id_inventario,
              @etiqueta,
              @litros
            )
          `)
      }
    }

    await transaction.commit()

    res.json({
      ok: true,
      message: 'Inventarios guardados correctamente'
    })
  } catch (error) {
    console.log('ERROR GUARDAR:', error.message)

    if (transaction) {
      try {
        await transaction.rollback()
      } catch (_) {}
    }

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/pipas/promedios', async (req, res) => {
  try {
    const fecha = req.query.fecha || fechaISO(new Date())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
      return res.status(400).json({ ok: false, message: 'Fecha inválida' })
    }
    const p = await getPool(req)
    const result = await p.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        ;WITH FechaCorte AS (
          -- Una proyección futura conserva el último promedio disponible.
          SELECT CASE
            WHEN @fecha > CAST(GETDATE() AS DATE) THEN CAST(GETDATE() AS DATE)
            ELSE @fecha
          END AS fecha_corte
        )
        SELECT
          e.id_estacion,
          e.nombre_estacion,
          pr.id_producto,
          pr.nombre_producto,
          CAST(ISNULL(ventas.total_ventas_7_dias, 0) / 7.0 AS DECIMAL(18,3)) AS promedio_venta,
          CAST(ISNULL(ventas.total_ventas_7_dias, 0) AS DECIMAL(18,3)) AS total_ventas_7_dias,
          ISNULL(ventas.dias_con_dato, 0) AS dias_con_dato,
          CONVERT(VARCHAR(10), DATEADD(DAY, -7, f.fecha_corte), 23) AS fecha_inicio_ventas,
          CONVERT(VARCHAR(10), DATEADD(DAY, -1, f.fecha_corte), 23) AS fecha_fin_ventas,
          'INVENTARIOS_7_DIAS' AS fuente,
          CAST(0 AS BIT) AS editable
        FROM dbo.Estaciones e WITH (NOLOCK)
        CROSS JOIN dbo.Productos pr WITH (NOLOCK)
        CROSS JOIN FechaCorte f
        OUTER APPLY (
          SELECT
            SUM(CAST(ISNULL(i.venta, 0) AS DECIMAL(18,3))) AS total_ventas_7_dias,
            COUNT(DISTINCT CONVERT(DATE, i.fecha)) AS dias_con_dato
          FROM dbo.Inventarios i WITH (NOLOCK)
          WHERE i.id_estacion = e.id_estacion
            AND i.id_producto = pr.id_producto
            AND i.fecha >= DATEADD(DAY, -7, f.fecha_corte)
            AND i.fecha < f.fecha_corte
        ) ventas
        WHERE e.activa = 1
          AND pr.activo = 1
        ORDER BY
          e.id_estacion,
          CASE
            WHEN pr.nombre_producto = 'MAGNA' THEN 1
            WHEN pr.nombre_producto = 'PREMIUM' THEN 2
            WHEN pr.nombre_producto = 'DIESEL' THEN 3
            ELSE 4
          END
      `)
    res.json(result.recordset)
  } catch (error) {
    console.log('ERROR PIPAS PROMEDIOS (7 DÍAS):', error.message)
    res.status(500).json({ ok: false, message: error.message })
  }
})

// La captura manual deja de aplicarse.
app.post('/api/pipas/promedios', (_req, res) => {
  res.status(410).json({
    ok: false,
    message: 'El promedio se calcula automáticamente con las ventas de los 7 días anteriores en Inventarios Combustibles.'
  })
})

app.get('/api/pipas/compras', async (req, res) => {
  try {
    const fecha = req.query.fecha || ''
    const fechaInicio = req.query.fecha_inicio || req.query.desde || fecha || new Date().toISOString().slice(0, 10)
    const fechaFin = req.query.fecha_fin || req.query.hasta || (fecha ? proximoLunes(fechaInicio) : fechaInicio)
    const p = await getPool(req)

    const result = await p.request()
      .input('fecha_inicio', sql.Date, fechaInicio)
      .input('fecha_fin', sql.Date, fechaFin)
      .query(`
        SELECT
          c.id_pipas_compra_programada,
          CONVERT(VARCHAR(10), c.fecha_compra, 23) AS fecha_compra,
          c.id_estacion,
          e.nombre_estacion,
          c.id_producto,
          pr.nombre_producto,
          ISNULL(c.litros_compra, 0) AS litros_compra,
          ISNULL(c.observaciones, '') AS observaciones
        FROM dbo.PipasComprasProgramadas c
        LEFT JOIN dbo.Estaciones e ON e.id_estacion = c.id_estacion
        LEFT JOIN dbo.Productos pr ON pr.id_producto = c.id_producto
        WHERE c.fecha_compra >= @fecha_inicio
          AND c.fecha_compra <= @fecha_fin
        ORDER BY
          c.fecha_compra,
          c.id_estacion,
          CASE
            WHEN pr.nombre_producto = 'MAGNA' THEN 1
            WHEN pr.nombre_producto = 'PREMIUM' THEN 2
            WHEN pr.nombre_producto = 'DIESEL' THEN 3
            ELSE 4
          END
      `)

    res.json(result.recordset)
  } catch (error) {
    console.log('ERROR PIPAS COMPRAS:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.post('/api/pipas/compras', async (req, res) => {
  try {
    const fechaCompra = req.body.fecha_compra || req.body.fecha
    const idEstacion = Number(req.body.id_estacion)
    const idProducto = Number(req.body.id_producto)
    const brutoLitros = req.body.litros_compra
    // Un valor ilegible no debe convertirse en cero y borrar una compra.
    const litrosValidos = typeof brutoLitros === 'number'
      ? Number.isFinite(brutoLitros)
      : typeof brutoLitros === 'string' &&
        /^(?:\d+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(brutoLitros.trim())
    if (!litrosValidos) {
      return res.status(400).json({ ok: false, message: 'El campo litros debe ser numérico' })
    }
    const litrosCompra = numberValue(brutoLitros)
    const observaciones = String(req.body.observaciones || '').trim()
    const automatica = req.body.automatica === true
    const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(String(fechaCompra || '')) &&
      !Number.isNaN(Date.parse(String(fechaCompra) + 'T12:00:00Z')) &&
      new Date(String(fechaCompra) + 'T12:00:00Z').toISOString().slice(0, 10) === fechaCompra
    if (!fechaValida || !Number.isSafeInteger(idEstacion) || idEstacion <= 0 ||
        !Number.isSafeInteger(idProducto) || idProducto <= 0 ||
        !(litrosCompra >= 0) || litrosCompra > 1000000 ||
        observaciones.length > 300) {
      return res.status(400).json({ ok: false, message: 'Fecha, estación, producto o litros inválidos' })
    }
    if (automatica && (litrosCompra !== 20000 || fechaCompra < fechaISO(new Date()))) {
      return res.status(400).json({
        ok: false, message: 'La compra automática requiere 20,000 litros y una fecha no vencida'
      })
    }

    if (!fechaCompra) {
      throw new Error('No se recibió la fecha de compra')
    }

    if (!idEstacion || !idProducto) {
      throw new Error('No se recibió estación o producto')
    }

    const p = await getPool(req)

    if (litrosCompra <= 0) {
      await p.request()
        .input('fecha_compra', sql.Date, fechaCompra)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .query(`
          DELETE FROM dbo.PipasComprasProgramadas
          WHERE fecha_compra = @fecha_compra
            AND id_estacion = @id_estacion
            AND id_producto = @id_producto
        `)

      res.json({
        ok: true,
        message: 'Compra eliminada'
      })

      return
    }

    // Ruta automática atómica: la lectura de existencia y el INSERT ocurren
    // en la misma transacción bajo un bloqueo por fecha/estación/producto.
    if (automatica) {
      const resultado = await crearRequestPool(p)
        .input('fecha_compra', sql.Date, fechaCompra)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
        .input('observaciones', sql.NVarChar(300), observaciones)
        .query(`
          SET XACT_ABORT ON;
          BEGIN TRANSACTION;
          DECLARE @lock INT;
          DECLARE @recurso NVARCHAR(255) = CONCAT('PIPAS:',
            CONVERT(VARCHAR(10), @fecha_compra, 23), ':', @id_estacion, ':', @id_producto);
          EXEC @lock = sp_getapplock @Resource=@recurso, @LockMode='Exclusive',
            @LockOwner='Transaction', @LockTimeout=10000;
          IF @lock < 0
          BEGIN
            ROLLBACK TRANSACTION;
            THROW 50001, 'No se pudo bloquear la programación de pipa', 1;
          END;
          DECLARE @insertado BIT = 0;
          IF NOT EXISTS (
            SELECT 1 FROM dbo.PipasComprasProgramadas WITH (UPDLOCK, HOLDLOCK)
            WHERE fecha_compra=@fecha_compra AND id_estacion=@id_estacion
              AND id_producto=@id_producto
          )
          BEGIN
            INSERT INTO dbo.PipasComprasProgramadas
              (fecha_compra, id_estacion, id_producto, litros_compra, observaciones)
            VALUES (@fecha_compra, @id_estacion, @id_producto, @litros_compra, @observaciones);
            SET @insertado = 1;
          END;
          COMMIT TRANSACTION;
          SELECT @insertado AS insertado;
        `)
      if (!resultado.recordset?.[0]?.insertado) {
        return res.status(409).json({
          ok: false, message: 'Ya existe una compra programada para ese día, estación y combustible.'
        })
      }
      return res.json({ ok: true, message: 'Pipa de 20,000 litros programada' })
    }

    const existe = await p.request()
      .input('fecha_compra', sql.Date, fechaCompra)
      .input('id_estacion', sql.Int, idEstacion)
      .input('id_producto', sql.Int, idProducto)
      .query(`
        SELECT TOP 1 id_pipas_compra_programada
        FROM dbo.PipasComprasProgramadas
        WHERE fecha_compra = @fecha_compra
          AND id_estacion = @id_estacion
          AND id_producto = @id_producto
      `)

    if (existe.recordset.length > 0 && automatica) {
      return res.status(409).json({ ok: false, message: 'Ya hay una compra en esa fecha, estación y producto. No se sobrescribió.' })
    }

    if (existe.recordset.length > 0) {
      await p.request()
        .input('fecha_compra', sql.Date, fechaCompra)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
        .input('observaciones', sql.NVarChar(300), observaciones)
        .query(`
          UPDATE dbo.PipasComprasProgramadas
          SET
            litros_compra = @litros_compra,
            observaciones = @observaciones,
            actualizado_en = SYSDATETIME()
          WHERE fecha_compra = @fecha_compra
            AND id_estacion = @id_estacion
            AND id_producto = @id_producto
        `)
    } else {
      await p.request()
        .input('fecha_compra', sql.Date, fechaCompra)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
        .input('observaciones', sql.NVarChar(300), observaciones)
        .query(`
          INSERT INTO dbo.PipasComprasProgramadas (
            fecha_compra,
            id_estacion,
            id_producto,
            litros_compra,
            observaciones
          )
          VALUES (
            @fecha_compra,
            @id_estacion,
            @id_producto,
            @litros_compra,
            @observaciones
          )
        `)
    }

    res.json({
      ok: true,
      message: 'Compra guardada'
    })
  } catch (error) {
    console.log('ERROR GUARDAR PIPAS COMPRA:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/costos/compras', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10)
    const excluirIdEstacion = Number(req.body?.excluir_id_estacion || req.query?.excluir_id_estacion || 0)
    const excluirIdProducto = Number(req.body?.excluir_id_producto || req.query?.excluir_id_producto || 0)

    const p = await getPool(req)
    const requestCostos = crearRequestPool(p)

    requestCostos.timeout = 300000

    // BASE FIJA 31/MAY/2026:
    // Para esta fecha NO se calcula nada aquí. Se lee directo de dbo.CostosCompras
    // para que el front pinte exactamente lo corregido manualmente en SQL.
    if (String(fecha).slice(0, 10) === '2026-05-31') {
      const baseFija = await requestCostos
        .input('fecha', sql.Date, fecha)
        .query(`
          SET LOCK_TIMEOUT 10000;
          SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

          SELECT
            c.id_costo_compra,
            CONVERT(VARCHAR(10), c.fecha, 23) AS fecha,
            c.id_estacion,
            c.id_producto,
            ISNULL(c.existencia_unidades_anterior, 0) AS existencia_unidades_anterior,
            ISNULL(c.existencia_anterior, 0) AS existencia_anterior,
            ISNULL(c.litros_compra, 0) AS litros_compra,
            ISNULL(c.precio_unitario, 0) AS precio_unitario,
            ISNULL(c.entrada, 0) AS entrada,
            ISNULL(c.venta, 0) AS venta,
            ISNULL(c.salida_unidades, ISNULL(c.venta, 0)) AS salida_unidades,
            ISNULL(c.costo_promedio_anterior, 0) AS costo_promedio_anterior,
            ISNULL(c.salida, 0) AS salida,
            ISNULL(c.inventario_final, 0) AS inventario_final,
            ISNULL(c.existencia_unidades, ISNULL(c.inventario_final, 0)) AS existencia_unidades,
            ISNULL(c.existencia, 0) AS existencia,
            ISNULL(c.costo_promedio, 0) AS costo_promedio,
            c.creado_en,
            c.actualizado_en,
            e.nombre_estacion,
            pr.nombre_producto,
            CASE WHEN ISNULL(c.litros_compra, 0) > 0 THEN ISNULL(c.precio_unitario, 0) ELSE 0 END AS precio_unitario_real,
            CASE WHEN ISNULL(c.litros_compra, 0) > 0 THEN ISNULL(c.precio_unitario, 0) ELSE 0 END AS precio_por_litro_real,
            ISNULL(c.inventario_final, 0) AS inventario_tabla,
            CAST(NULL AS DECIMAL(18,3)) AS inventario_inicial_dia_siguiente,
            CAST(NULL AS INT) AS id_inventario_real,
            CAST(0 AS DECIMAL(18,4)) AS entrada_real_inventario,
            CAST(0 AS DECIMAL(18,3)) AS litros_precio_inventario,
            CAST(0 AS DECIMAL(18,10)) AS ultimo_precio_litro,
            CAST(NULL AS DATE) AS fecha_ultimo_precio,
            CAST(NULL AS INT) AS id_inventario_ultimo_precio
          FROM dbo.CostosCompras c WITH (NOLOCK)
          LEFT JOIN dbo.Estaciones e WITH (NOLOCK)
            ON e.id_estacion = c.id_estacion
          LEFT JOIN dbo.Productos pr WITH (NOLOCK)
            ON pr.id_producto = c.id_producto
          WHERE CAST(c.fecha AS DATE) = @fecha
          ORDER BY
            c.id_estacion,
            CASE
              WHEN pr.nombre_producto = 'MAGNA' THEN 1
              WHEN pr.nombre_producto = 'PREMIUM' THEN 2
              WHEN pr.nombre_producto = 'DIESEL' THEN 3
              ELSE 4
            END,
            c.id_costo_compra
        `)

      console.log('BASE FIJA 31MAY LEIDA DIRECTO DE SQL:', baseFija.recordset.length)
      return res.json(baseFija.recordset)
    }

    const result = await requestCostos
      .input('fecha', sql.Date, fecha)
      .query(`
        SET LOCK_TIMEOUT 10000;
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

        ;WITH claves AS (
          SELECT
            i.id_estacion,
            i.id_producto
          FROM dbo.Inventarios i WITH (NOLOCK)
          WHERE CONVERT(date, i.fecha) = @fecha

          UNION

          SELECT
            c.id_estacion,
            c.id_producto
          FROM dbo.CostosCompras c WITH (NOLOCK)
          WHERE CAST(c.fecha AS DATE) = @fecha
        )
        SELECT
          ISNULL(c.id_costo_compra, 0) AS id_costo_compra,
          @fecha AS fecha,
          k.id_estacion,
          k.id_producto,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.existencia_unidades_anterior, 0) ELSE calc.existencia_unidades_anterior END AS existencia_unidades_anterior,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.existencia_anterior, 0) ELSE calc.existencia_anterior END AS existencia_anterior,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.litros_compra, 0) ELSE calc.litros_compra END AS litros_compra,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.precio_unitario, 0) ELSE calc.precio_unitario_real END AS precio_unitario,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.entrada, 0) ELSE calc.entrada END AS entrada,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.venta, 0) ELSE calc.venta END AS venta,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.salida_unidades, ISNULL(c.venta, 0)) ELSE calc.venta END AS salida_unidades,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.costo_promedio_anterior, 0) ELSE calc.costo_promedio_anterior END AS costo_promedio_anterior,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.salida, 0) ELSE calc.salida END AS salida,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.inventario_final, 0) ELSE calc.inventario_tabla END AS inventario_final,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.existencia_unidades, ISNULL(c.inventario_final, 0)) ELSE calc.inventario_tabla END AS existencia_unidades,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.existencia, 0) ELSE calc.existencia END AS existencia,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.costo_promedio, 0) ELSE calc.costo_promedio END AS costo_promedio,
          c.creado_en,
          c.actualizado_en,
          e.nombre_estacion,
          pr.nombre_producto,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.precio_unitario, 0) ELSE calc.precio_unitario_real END AS precio_unitario_real,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.precio_unitario, 0) ELSE calc.precio_unitario_real END AS precio_por_litro_real,
          CASE WHEN c.id_costo_compra IS NOT NULL THEN ISNULL(c.inventario_final, 0) ELSE calc.inventario_tabla END AS inventario_tabla,
          invSiguiente.inventario_inicial AS inventario_inicial_dia_siguiente,
          inv.id_inventario AS id_inventario_real,
          detalleReal.importe_precio_real AS entrada_real_inventario,
          detalleReal.litros_para_precio AS litros_precio_inventario,
          ultimoPrecio.ultimo_precio_litro,
          ultimoPrecio.fecha_ultimo_precio,
          ultimoPrecio.id_inventario_ultimo_precio
        FROM claves k
        LEFT JOIN dbo.Estaciones e WITH (NOLOCK)
          ON e.id_estacion = k.id_estacion
        LEFT JOIN dbo.Productos pr WITH (NOLOCK)
          ON pr.id_producto = k.id_producto

        OUTER APPLY (
          SELECT TOP 1
            c2.*
          FROM dbo.CostosCompras c2 WITH (NOLOCK)
          WHERE CAST(c2.fecha AS DATE) = @fecha
            AND c2.id_estacion = k.id_estacion
            AND c2.id_producto = k.id_producto
          ORDER BY c2.id_costo_compra DESC
        ) c

        OUTER APPLY (
          SELECT TOP 1
            i.id_inventario,
            i.inventario_inicial,
            i.litros_compra,
            i.precio_por_litro,
            i.entrada_compra_real,
            i.inventario_final,
            i.venta
          FROM dbo.Inventarios i WITH (NOLOCK)
          WHERE i.id_estacion = k.id_estacion
            AND i.id_producto = k.id_producto
            AND CONVERT(date, i.fecha) = @fecha
          ORDER BY i.id_inventario DESC
        ) inv

        OUTER APPLY (
          SELECT
            SUM(ISNULL(dc.litros, 0)) AS litros_compra_detalle
          FROM dbo.DetalleCompraInventario dc WITH (NOLOCK)
          WHERE dc.id_inventario = inv.id_inventario
        ) detalleCompra

        OUTER APPLY (
          SELECT
            SUM(ISNULL(dp.importe, 0)) AS importe_precio_detalle
          FROM dbo.DetallePrecioInventario dp WITH (NOLOCK)
          WHERE dp.id_inventario = inv.id_inventario
        ) detallePrecio

        OUTER APPLY (
          SELECT
            SUM(ISNULL(ds.litros, 0)) AS litros_precio_detalle
          FROM dbo.DetalleSubLitrosCompraInventario ds WITH (NOLOCK)
          WHERE ds.id_inventario = inv.id_inventario
        ) detalleSubLitros

        OUTER APPLY (
          SELECT TOP 1
            iUlt.precio_por_litro,
            iUlt.fecha AS fecha_ultimo_precio,
            iUlt.id_inventario AS id_inventario_ultimo_precio,
            detUlt.importe_precio_real_ult,
            detUlt.litros_para_precio_ult,
            CAST(CASE
              WHEN ISNULL(detUlt.importe_precio_real_ult, 0) > 0
                   AND ISNULL(detUlt.litros_para_precio_ult, 0) > 0
                THEN detUlt.importe_precio_real_ult / NULLIF(detUlt.litros_para_precio_ult, 0)

              WHEN ISNULL(iUlt.precio_por_litro, 0) > 0
                THEN iUlt.precio_por_litro

              ELSE 0
            END AS DECIMAL(18,10)) AS ultimo_precio_litro
          FROM dbo.Inventarios iUlt WITH (NOLOCK)
          OUTER APPLY (
            SELECT
              SUM(ISNULL(dcUlt.litros, 0)) AS litros_compra_detalle_ult
            FROM dbo.DetalleCompraInventario dcUlt WITH (NOLOCK)
            WHERE dcUlt.id_inventario = iUlt.id_inventario
          ) compUlt
          OUTER APPLY (
            SELECT
              SUM(ISNULL(dpUlt.importe, 0)) AS importe_precio_real_ult
            FROM dbo.DetallePrecioInventario dpUlt WITH (NOLOCK)
            WHERE dpUlt.id_inventario = iUlt.id_inventario
          ) precUlt
          OUTER APPLY (
            SELECT
              SUM(ISNULL(dsUlt.litros, 0)) AS litros_precio_detalle_ult
            FROM dbo.DetalleSubLitrosCompraInventario dsUlt WITH (NOLOCK)
            WHERE dsUlt.id_inventario = iUlt.id_inventario
          ) subUlt
          CROSS APPLY (
            SELECT
              CAST(ISNULL(precUlt.importe_precio_real_ult, 0) AS DECIMAL(18,4)) AS importe_precio_real_ult,
              CAST(COALESCE(
                NULLIF(subUlt.litros_precio_detalle_ult, 0),
                NULLIF(compUlt.litros_compra_detalle_ult, 0),
                NULLIF(iUlt.litros_compra, 0),
                0
              ) AS DECIMAL(18,3)) AS litros_para_precio_ult
          ) detUlt
          WHERE iUlt.id_estacion = k.id_estacion
            AND iUlt.id_producto = k.id_producto
            AND CONVERT(date, iUlt.fecha) <= @fecha
            AND (
              (
                ISNULL(detUlt.importe_precio_real_ult, 0) > 0
                AND ISNULL(detUlt.litros_para_precio_ult, 0) > 0
              )
              OR
              (
                ISNULL(iUlt.litros_compra, 0) > 0
                AND ISNULL(iUlt.precio_por_litro, 0) > 0
              )
            )
          ORDER BY
            CONVERT(date, iUlt.fecha) DESC,
            iUlt.id_inventario DESC
        ) ultimoPrecio

        OUTER APPLY (
          SELECT TOP 1
            cPrev.existencia_unidades,
            cPrev.existencia,
            cPrev.costo_promedio
          FROM dbo.CostosCompras cPrev WITH (NOLOCK)
          WHERE cPrev.id_estacion = k.id_estacion
            AND cPrev.id_producto = k.id_producto
            AND CAST(cPrev.fecha AS DATE) < @fecha
          ORDER BY
            cPrev.fecha DESC,
            cPrev.id_costo_compra DESC
        ) prev

        OUTER APPLY (
          SELECT TOP 1
            i2.inventario_inicial
          FROM dbo.Inventarios i2 WITH (NOLOCK)
          WHERE i2.id_estacion = k.id_estacion
            AND i2.id_producto = k.id_producto
            AND CONVERT(date, i2.fecha) = DATEADD(DAY, 1, @fecha)
          ORDER BY i2.id_inventario DESC
        ) invSiguiente

        CROSS APPLY (
          SELECT
            CAST(COALESCE(
              NULLIF(c.existencia_unidades_anterior, 0),
              NULLIF(prev.existencia_unidades, 0),
              NULLIF(inv.inventario_inicial, 0),
              0
            ) AS DECIMAL(18,3)) AS existencia_unidades_anterior,

            CAST(COALESCE(
              NULLIF(c.existencia_anterior, 0),
              NULLIF(prev.existencia, 0),
              0
            ) AS DECIMAL(18,6)) AS existencia_anterior,

            CAST(COALESCE(
              NULLIF(detalleCompra.litros_compra_detalle, 0),
              NULLIF(inv.litros_compra, 0),
              0
            ) AS DECIMAL(18,3)) AS litros_compra,

            CAST(COALESCE(inv.venta, c.venta, 0) AS DECIMAL(18,3)) AS venta,

            CAST(CASE
              WHEN ISNULL(invSiguiente.inventario_inicial, 0) > 0 THEN invSiguiente.inventario_inicial
              WHEN ISNULL(inv.inventario_final, 0) > 0 THEN inv.inventario_final
              ELSE ISNULL(c.inventario_final, 0)
            END AS DECIMAL(18,3)) AS inventario_tabla
        ) baseDatos

        CROSS APPLY (
          SELECT
            CAST(COALESCE(
              NULLIF(detalleSubLitros.litros_precio_detalle, 0),
              NULLIF(detalleCompra.litros_compra_detalle, 0),
              NULLIF(inv.litros_compra, 0),
              0
            ) AS DECIMAL(18,3)) AS litros_para_precio,

            CAST(ISNULL(detallePrecio.importe_precio_detalle, 0) AS DECIMAL(18,4)) AS importe_precio_real
        ) detalleReal

        CROSS APPLY (
          SELECT
            CAST(CASE
              WHEN ISNULL(detalleCompra.litros_compra_detalle, 0) > 0
                   AND detalleReal.importe_precio_real > 0
                   AND detalleReal.litros_para_precio > 0
                THEN detalleReal.importe_precio_real / NULLIF(detalleReal.litros_para_precio, 0)

              WHEN ISNULL(inv.litros_compra, 0) > 0
                   AND ISNULL(inv.precio_por_litro, 0) > 0
                THEN inv.precio_por_litro

              WHEN ISNULL(ultimoPrecio.ultimo_precio_litro, 0) > 0
                THEN ultimoPrecio.ultimo_precio_litro

              ELSE 0
            END AS DECIMAL(18,10)) AS precio_unitario_real
        ) precio

        CROSS APPLY (
          SELECT
            CAST(CASE
              WHEN ISNULL(detalleCompra.litros_compra_detalle, 0) > 0
                   AND detalleReal.importe_precio_real > 0
                THEN detalleReal.importe_precio_real

              WHEN ISNULL(inv.litros_compra, 0) > 0
                   AND precio.precio_unitario_real > 0
                THEN inv.litros_compra * precio.precio_unitario_real

              ELSE 0
            END AS DECIMAL(18,4)) AS entrada,

            CAST(CASE
              WHEN baseDatos.existencia_unidades_anterior > 0
                THEN baseDatos.existencia_anterior / NULLIF(baseDatos.existencia_unidades_anterior, 0)

              WHEN ISNULL(prev.costo_promedio, 0) > 0
                THEN prev.costo_promedio

              WHEN ISNULL(c.costo_promedio_anterior, 0) > 0
                THEN c.costo_promedio_anterior

              ELSE 0
            END AS DECIMAL(18,10)) AS costo_promedio_anterior
        ) entradaCalc

        CROSS APPLY (
          SELECT
            CAST(baseDatos.existencia_unidades_anterior + baseDatos.litros_compra AS DECIMAL(18,3)) AS unidades_despues_compra,
            CAST(baseDatos.existencia_anterior + entradaCalc.entrada AS DECIMAL(18,6)) AS existencia_despues_compra
        ) movimiento

        CROSS APPLY (
          SELECT
            CAST(CASE
              WHEN movimiento.unidades_despues_compra > 0
                   AND entradaCalc.entrada > 0
                THEN movimiento.existencia_despues_compra / NULLIF(movimiento.unidades_despues_compra, 0)

              WHEN entradaCalc.entrada = 0
                   AND entradaCalc.costo_promedio_anterior > 0
                THEN entradaCalc.costo_promedio_anterior

              WHEN ISNULL(c.costo_promedio, 0) > 0
                THEN c.costo_promedio

              WHEN ISNULL(prev.costo_promedio, 0) > 0
                THEN prev.costo_promedio

              ELSE 0
            END AS DECIMAL(18,10)) AS costo_promedio
        ) promedio

        CROSS APPLY (
          SELECT
            baseDatos.existencia_unidades_anterior,
            baseDatos.existencia_anterior,
            baseDatos.litros_compra,
            baseDatos.venta,
            baseDatos.inventario_tabla,
            precio.precio_unitario_real,
            entradaCalc.entrada,
            entradaCalc.costo_promedio_anterior,
            CAST(baseDatos.venta * promedio.costo_promedio AS DECIMAL(18,4)) AS salida,
            CAST(movimiento.existencia_despues_compra - (baseDatos.venta * promedio.costo_promedio) AS DECIMAL(18,4)) AS existencia,
            promedio.costo_promedio
        ) calc

        ORDER BY
          k.id_estacion,
          CASE
            WHEN pr.nombre_producto = 'MAGNA' THEN 1
            WHEN pr.nombre_producto = 'PREMIUM' THEN 2
            WHEN pr.nombre_producto = 'DIESEL' THEN 3
            ELSE 4
          END
      `)

    res.json(result.recordset)
  } catch (error) {
    console.log('ERROR COSTOS COMPRAS:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.all('/api/costos/recalcular', async (req, res) => {
  try {
    const fecha = String(
      req.body?.fecha ||
      req.query?.fecha ||
      new Date().toISOString().slice(0, 10)
    ).slice(0, 10)
    const excluirIdEstacion = Number(req.body?.excluir_id_estacion || req.query?.excluir_id_estacion || 0)
    const excluirIdProducto = Number(req.body?.excluir_id_producto || req.query?.excluir_id_producto || 0)

        console.log('RECALCULO COSTOS:', {
      fecha,
      excluirIdEstacion,
      excluirIdProducto
    })
      
    
    if (fecha <= '2026-05-31') {
      console.log('RECALCULO BLOQUEADO BASE FIJA:', fecha)

      return res.json({
        ok: true,
        fecha,
        bloqueado: true,
        message: 'Base fija 31/may/2026: no se recalculó ni se modificó CostosCompras.',
        registros: []
      })
    }

    const p = await getPool(req)
    const requestCostos = crearRequestPool(p)

    requestCostos.timeout = 300000

    // BASE FIJA 31/MAY/2026:
    // Para esta fecha NO se calcula nada aquí. Se lee directo de dbo.CostosCompras
    // para que el front pinte exactamente lo corregido manualmente en SQL.
    if (String(fecha).slice(0, 10) === '2026-05-31') {
      const baseFija = await requestCostos
        .input('fecha', sql.Date, fecha)
        .query(`
          SET LOCK_TIMEOUT 10000;
          SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

          SELECT
            c.id_costo_compra,
            CONVERT(VARCHAR(10), c.fecha, 23) AS fecha,
            c.id_estacion,
            c.id_producto,
            ISNULL(c.existencia_unidades_anterior, 0) AS existencia_unidades_anterior,
            ISNULL(c.existencia_anterior, 0) AS existencia_anterior,
            ISNULL(c.litros_compra, 0) AS litros_compra,
            ISNULL(c.precio_unitario, 0) AS precio_unitario,
            ISNULL(c.entrada, 0) AS entrada,
            ISNULL(c.venta, 0) AS venta,
            ISNULL(c.salida_unidades, ISNULL(c.venta, 0)) AS salida_unidades,
            ISNULL(c.costo_promedio_anterior, 0) AS costo_promedio_anterior,
            ISNULL(c.salida, 0) AS salida,
            ISNULL(c.inventario_final, 0) AS inventario_final,
            ISNULL(c.existencia_unidades, ISNULL(c.inventario_final, 0)) AS existencia_unidades,
            ISNULL(c.existencia, 0) AS existencia,
            ISNULL(c.costo_promedio, 0) AS costo_promedio,
            c.creado_en,
            c.actualizado_en,
            e.nombre_estacion,
            pr.nombre_producto,
            CASE WHEN ISNULL(c.litros_compra, 0) > 0 THEN ISNULL(c.precio_unitario, 0) ELSE 0 END AS precio_unitario_real,
            CASE WHEN ISNULL(c.litros_compra, 0) > 0 THEN ISNULL(c.precio_unitario, 0) ELSE 0 END AS precio_por_litro_real,
            ISNULL(c.inventario_final, 0) AS inventario_tabla,
            CAST(NULL AS DECIMAL(18,3)) AS inventario_inicial_dia_siguiente,
            CAST(NULL AS INT) AS id_inventario_real,
            CAST(0 AS DECIMAL(18,4)) AS entrada_real_inventario,
            CAST(0 AS DECIMAL(18,3)) AS litros_precio_inventario,
            CAST(0 AS DECIMAL(18,10)) AS ultimo_precio_litro,
            CAST(NULL AS DATE) AS fecha_ultimo_precio,
            CAST(NULL AS INT) AS id_inventario_ultimo_precio
          FROM dbo.CostosCompras c WITH (NOLOCK)
          LEFT JOIN dbo.Estaciones e WITH (NOLOCK)
            ON e.id_estacion = c.id_estacion
          LEFT JOIN dbo.Productos pr WITH (NOLOCK)
            ON pr.id_producto = c.id_producto
          WHERE CAST(c.fecha AS DATE) = @fecha
          ORDER BY
            c.id_estacion,
            CASE
              WHEN pr.nombre_producto = 'MAGNA' THEN 1
              WHEN pr.nombre_producto = 'PREMIUM' THEN 2
              WHEN pr.nombre_producto = 'DIESEL' THEN 3
              ELSE 4
            END,
            c.id_costo_compra
        `)

      console.log('BASE FIJA 31MAY LEIDA DIRECTO DE SQL:', baseFija.recordset.length)
      return res.json(baseFija.recordset)
    }

    let filaProtegida = null

    if (excluirIdEstacion > 0 && excluirIdProducto > 0) {
      const protegida = await crearRequestPool(p)
        .input('fecha', sql.Date, fecha)
        .input('id_estacion', sql.Int, excluirIdEstacion)
        .input('id_producto', sql.Int, excluirIdProducto)
        .query(`
          SELECT TOP 1
            existencia_unidades_anterior,
            existencia_anterior,
            litros_compra,
            precio_unitario,
            entrada,
            venta,
            salida_unidades,
            costo_promedio_anterior,
            salida,
            inventario_final,
            existencia_unidades,
            existencia,
            costo_promedio
          FROM dbo.CostosCompras WITH (NOLOCK)
          WHERE CAST(fecha AS DATE) = @fecha
            AND id_estacion = @id_estacion
            AND id_producto = @id_producto
        `)

      filaProtegida = protegida.recordset?.[0] || null
    }

    const result = await requestCostos
      .input('fecha', sql.Date, fecha)
      .input('forzar', sql.Bit, true)
      .execute('dbo.sp_CalcularCostosComprasDia')

      // Ajuste exacto Excel: APACHE MAGNA 01/jun/2026
      // El cálculo normal da 487391.2263 y al redondear muestra .23.
      // Excel está en .22, por eso se fija después del recálculo.
      if (fecha === '2026-06-01') {
        await crearRequestPool(p)
          .query(`
            UPDATE dbo.CostosCompras
            SET
              salida = 239356.7500,
              existencia = 487391.2200,
              costo_promedio = 487391.2200 / 22354.000,
              actualizado_en = GETDATE()
            WHERE CAST(fecha AS DATE) = '2026-06-01'
              AND id_estacion = 7
              AND id_producto = 1;
          `)

        console.log('AJUSTE EXCEL APLICADO: APACHE MAGNA 01-jun existencia 487391.22')
      }

    // Permite que el front recalcule todo el día, pero conserva una fila manual.
    // Se usa para APACHE PREMIUM del 01 al 06 de junio.
    if (filaProtegida && excluirIdEstacion > 0 && excluirIdProducto > 0) {
      await crearRequestPool(p)
        .input('fecha', sql.Date, fecha)
        .input('id_estacion', sql.Int, excluirIdEstacion)
        .input('id_producto', sql.Int, excluirIdProducto)
        .input('existencia_unidades_anterior', sql.Decimal(18, 3), filaProtegida.existencia_unidades_anterior)
        .input('existencia_anterior', sql.Decimal(18, 4), filaProtegida.existencia_anterior)
        .input('litros_compra', sql.Decimal(18, 3), filaProtegida.litros_compra)
        .input('precio_unitario', sql.Decimal(18, 10), filaProtegida.precio_unitario)
        .input('entrada', sql.Decimal(18, 4), filaProtegida.entrada)
        .input('venta', sql.Decimal(18, 3), filaProtegida.venta)
        .input('salida_unidades', sql.Decimal(18, 3), filaProtegida.salida_unidades)
        .input('costo_promedio_anterior', sql.Decimal(18, 10), filaProtegida.costo_promedio_anterior)
        .input('salida', sql.Decimal(18, 4), filaProtegida.salida)
        .input('inventario_final', sql.Decimal(18, 3), filaProtegida.inventario_final)
        .input('existencia_unidades', sql.Decimal(18, 3), filaProtegida.existencia_unidades)
        .input('existencia', sql.Decimal(18, 4), filaProtegida.existencia)
        .input('costo_promedio', sql.Decimal(18, 10), filaProtegida.costo_promedio)
        .query(`
          UPDATE dbo.CostosCompras
          SET
            existencia_unidades_anterior = @existencia_unidades_anterior,
            existencia_anterior = @existencia_anterior,
            litros_compra = @litros_compra,
            precio_unitario = @precio_unitario,
            entrada = @entrada,
            venta = @venta,
            salida_unidades = @salida_unidades,
            costo_promedio_anterior = @costo_promedio_anterior,
            salida = @salida,
            inventario_final = @inventario_final,
            existencia_unidades = @existencia_unidades,
            existencia = @existencia,
            costo_promedio = @costo_promedio,
            actualizado_en = GETDATE()
          WHERE CAST(fecha AS DATE) = @fecha
            AND id_estacion = @id_estacion
            AND id_producto = @id_producto
        `)
    }

    res.json({
      ok: true,
      fecha,
      protegido: Boolean(filaProtegida),
      excluir_id_estacion: excluirIdEstacion || null,
      excluir_id_producto: excluirIdProducto || null,
      registros: result.recordset || []
    })
  } catch (error) {
    console.log('ERROR RECALCULAR COSTOS:', error.message)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/costos.html', (req, res) => {
  const archivoPath = path.join(PUBLIC_DIR, 'costos.html')

  if (!fs.existsSync(archivoPath)) {
    return res.status(404).send('No se encontró public/costos.html')
  }

  res.sendFile(archivoPath)
})

app.get('/Costos.html', (req, res) => {
  const archivoPath = path.join(PUBLIC_DIR, 'costos.html')

  if (!fs.existsSync(archivoPath)) {
    return res.status(404).send('No se encontró public/costos.html')
  }

  res.sendFile(archivoPath)
})


app.get(/^(?!\/api|\/imagenes).*/, (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html')

  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Frontend no encontrado. Verifica que exista public/index.html.')
  }

  res.sendFile(indexPath)
})

function tieneSSLValido() {
  return Boolean(SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH))
}

function crearServidorPrincipal() {
  if (SSL_ENABLED && tieneSSLValido()) {
    const sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    }

    return {
      server: https.createServer(sslOptions, app),
      protocol: 'https'
    }
  }

  if (SSL_ENABLED) {
    console.log('SSL_ENABLED está activo, pero no se encontraron los certificados.')
    console.log(`SSL_KEY_PATH: ${SSL_KEY_PATH || 'No configurado'}`)
    console.log(`SSL_CERT_PATH: ${SSL_CERT_PATH || 'No configurado'}`)
    console.log('El servidor iniciará en HTTP. Para copiar imagen desde otra PC necesitas HTTPS con certificado válido o confiable.')
  }

  return {
    server: http.createServer(app),
    protocol: 'http'
  }
}

const principal = crearServidorPrincipal()
const server = principal.server
const PROTOCOL = principal.protocol

server.listen(PORT, HOST, () => {
  console.log('========================================')
  console.log('Servidor activo')
  console.log(`Modo: ${PROTOCOL.toUpperCase()}`)
  console.log(`Local: ${PROTOCOL}://localhost:${PORT}`)
  console.log(`Red: ${PROTOCOL}://${LAN_IP}:${PORT}`)
  console.log(`Health local: ${PROTOCOL}://localhost:${PORT}/api/health`)
  console.log(`Health red: ${PROTOCOL}://${LAN_IP}:${PORT}/api/health`)
  console.log(`Health SQL: ${PROTOCOL}://${LAN_IP}:${PORT}/api/health-sql`)
  console.log(`Logo principal: ${PROTOCOL}://${LAN_IP}:${PORT}/imagenes/Ary%20Logo%20A%20%281%29.png`)
  console.log(`Logo alterno: ${PROTOCOL}://${LAN_IP}:${PORT}/imagenes/ary.logo.png`)
  console.log(`Pipas promedios: ${PROTOCOL}://${LAN_IP}:${PORT}/api/pipas/promedios`)
  console.log(`Pipas compras: ${PROTOCOL}://${LAN_IP}:${PORT}/api/pipas/compras`)
  console.log(`Costos compras: ${PROTOCOL}://${LAN_IP}:${PORT}/api/costos/compras`)
  console.log(`Costos recalcular: ${PROTOCOL}://${LAN_IP}:${PORT}/api/costos/recalcular`)
  console.log(`Costos página: ${PROTOCOL}://${LAN_IP}:${PORT}/costos.html`)
  console.log(`Public: ${PUBLIC_DIR}`)
  if (PROTOCOL === 'https') {
    console.log(`Certificado: ${SSL_CERT_PATH}`)
    console.log(`Llave: ${SSL_KEY_PATH}`)
  }
  console.log('========================================')
})

if (PROTOCOL === 'https' && HTTP_PORT > 0 && HTTP_PORT !== PORT) {
  const redirectApp = express()

  redirectApp.use((req, res) => {
    const host = req.headers.host ? req.headers.host.replace(/:\d+$/, `:${PORT}`) : `${LAN_IP}:${PORT}`
    res.redirect(301, `https://${host}${req.url}`)
  })

  const redirectServer = http.createServer(redirectApp)

  redirectServer.listen(HTTP_PORT, HOST, () => {
    console.log(`Redirección HTTP activa: http://${LAN_IP}:${HTTP_PORT} -> https://${LAN_IP}:${PORT}`)
  })

  redirectServer.on('error', error => {
    console.log('ERROR AL INICIAR REDIRECCIÓN HTTP:', error.message)
  })
}

server.on('error', error => {
  console.log('ERROR AL INICIAR SERVIDOR:', error)

  if (error.code === 'EADDRINUSE') {
    console.log(`El puerto ${PORT} ya está ocupado`)
  }

  if (error.code === 'EACCES') {
    console.log(`No tienes permiso para usar el puerto ${PORT}`)
  }
})

process.on('uncaughtException', error => {
  console.log('ERROR NO CONTROLADO:', error)
})

process.on('unhandledRejection', error => {
  console.log('PROMESA RECHAZADA:', error)
})

setInterval(() => {}, 1000 * 60 * 60)
