require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sql = require('mssql')
const path = require('path')

const app = express()
const PORT = Number.parseInt(process.env.PORT, 10) || 8080
const logoPath = path.resolve(__dirname, 'ary.logo.png')

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/imagenes/ary.logo.png', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')

  res.sendFile(logoPath, error => {
    if (error && !res.headersSent) {
      res.status(404).send('Logo no encontrado')
    }
  })
})

const dbConfig = {
  server: process.env.SQL_SERVER,
  port: Number.parseInt(process.env.SQL_PORT, 10) || 1433,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
}

let pool

async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(dbConfig)
      console.log('SQL Server conectado correctamente')
    }

    return pool
  } catch (error) {
    console.log('ERROR CONEXION SQL:', error)
    throw error
  }
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0
  const limpio = String(value).replace(',', '.')
  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}

app.get('/api/health', async (req, res) => {
  try {
    await getPool()

    res.json({
      ok: true,
      message: 'Servidor y SQL funcionando correctamente'
    })
  } catch (error) {
    console.log('ERROR HEALTH:', error)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/estaciones', async (req, res) => {
  try {
    const p = await getPool()

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
    console.log('ERROR ESTACIONES:', error)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/productos', async (req, res) => {
  try {
    const p = await getPool()

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
    console.log('ERROR PRODUCTOS:', error)

    res.status(500).json({
      ok: false,
      message: error.message
    })
  }
})

app.get('/api/inventarios', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10)
    const p = await getPool()

    console.log('Consultando inventarios fecha:', fecha)

    const result = await p.request()
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT
          e.id_estacion,
          e.nombre_estacion,
          p.id_producto,
          p.nombre_producto,
          i.id_inventario,
          ISNULL(i.inventario_inicial, ISNULL(ia.inventario_final, 0)) AS inventario_inicial,
          ISNULL(i.litros_compra, 0) AS litros_compra,
          ISNULL(i.precio_por_litro, 0) AS precio_por_litro,
          ISNULL(i.inventario_final, 0) AS inventario_final,
          ISNULL(i.venta, 0) AS venta,
          ISNULL(i.litros_liquidacion, 0) AS litros_liquidacion,
          ISNULL(i.diferencias, 0) AS diferencias
        FROM Estaciones e
        CROSS JOIN Productos p
        LEFT JOIN Inventarios i
          ON i.id_estacion = e.id_estacion
          AND i.id_producto = p.id_producto
          AND i.fecha = @fecha
        LEFT JOIN Inventarios ia
          ON ia.id_estacion = e.id_estacion
          AND ia.id_producto = p.id_producto
          AND ia.fecha = DATEADD(DAY, -1, @fecha)
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
      .map(x => x.id_inventario)
      .filter(Boolean)

    let compras = []
    let precios = []

    if (ids.length > 0) {
      const idsText = ids.join(',')

      const comprasResult = await p.request().query(`
        SELECT
          id_inventario,
          id_detalle_compra,
          etiqueta,
          litros
        FROM DetalleCompraInventario
        WHERE id_inventario IN (${idsText})
        ORDER BY id_detalle_compra
      `)

      const preciosResult = await p.request().query(`
        SELECT
          id_inventario,
          id_detalle_precio,
          etiqueta,
          importe
        FROM DetallePrecioInventario
        WHERE id_inventario IN (${idsText})
        ORDER BY id_detalle_precio
      `)

      compras = comprasResult.recordset
      precios = preciosResult.recordset
    }

    const data = result.recordset.map(row => ({
      ...row,
      compras: compras.filter(x => x.id_inventario === row.id_inventario),
      precios: precios.filter(x => x.id_inventario === row.id_inventario)
    }))

    console.log('Inventarios cargados:', data.length)

    res.json(data)
  } catch (error) {
    console.log('ERROR INVENTARIOS:', error)

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
    const p = await getPool()
    transaction = new sql.Transaction(p)

    await transaction.begin()

    for (const item of registros) {
      const idEstacion = Number(item.id_estacion)
      const idProducto = Number(item.id_producto)
      const compras = Array.isArray(item.compras) ? item.compras : []
      const precios = Array.isArray(item.precios) ? item.precios : []

      const litrosCompra = compras.reduce((total, x) => total + numberValue(x.litros), 0)
      const totalPrecio = precios.reduce((total, x) => total + numberValue(x.importe), 0)
      const precioPorLitro = litrosCompra > 0 ? totalPrecio / litrosCompra : 0

      const inventarioInicial = numberValue(item.inventario_inicial)
      const inventarioFinal = numberValue(item.inventario_final)
      const venta = inventarioInicial + litrosCompra - inventarioFinal
      const litrosLiquidacion = numberValue(item.litros_liquidacion)
      const diferencias = litrosLiquidacion - venta

      const existing = await new sql.Request(transaction)
        .input('id_estacion', sql.Int, idEstacion)
        .input('id_producto', sql.Int, idProducto)
        .input('fecha', sql.Date, fecha)
        .query(`
          SELECT id_inventario
          FROM Inventarios
          WHERE id_estacion = @id_estacion
            AND id_producto = @id_producto
            AND fecha = @fecha
        `)

      let idInventario

      if (existing.recordset.length > 0) {
        idInventario = existing.recordset[0].id_inventario

        await new sql.Request(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('inventario_inicial', sql.Decimal(18, 3), inventarioInicial)
          .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
          .input('precio_por_litro', sql.Decimal(18, 4), precioPorLitro)
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
              inventario_final = @inventario_final,
              venta = @venta,
              litros_liquidacion = @litros_liquidacion,
              diferencias = @diferencias
            WHERE id_inventario = @id_inventario
          `)
      } else {
        const insert = await new sql.Request(transaction)
          .input('id_estacion', sql.Int, idEstacion)
          .input('id_producto', sql.Int, idProducto)
          .input('fecha', sql.Date, fecha)
          .input('inventario_inicial', sql.Decimal(18, 3), inventarioInicial)
          .input('litros_compra', sql.Decimal(18, 3), litrosCompra)
          .input('precio_por_litro', sql.Decimal(18, 4), precioPorLitro)
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
              inventario_final,
              venta,
              litros_liquidacion,
              diferencias
            )
            OUTPUT INSERTED.id_inventario
            VALUES (
              @id_estacion,
              @id_producto,
              @fecha,
              @inventario_inicial,
              @litros_compra,
              @precio_por_litro,
              @inventario_final,
              @venta,
              @litros_liquidacion,
              @diferencias
            )
          `)

        idInventario = insert.recordset[0].id_inventario
      }

      await new sql.Request(transaction)
        .input('id_inventario', sql.Int, idInventario)
        .query(`
          DELETE FROM DetalleCompraInventario
          WHERE id_inventario = @id_inventario;

          DELETE FROM DetallePrecioInventario
          WHERE id_inventario = @id_inventario;
        `)

      for (let i = 0; i < compras.length; i++) {
        await new sql.Request(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('etiqueta', sql.NVarChar(20), `F${i + 1}`)
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

      for (let i = 0; i < precios.length; i++) {
        await new sql.Request(transaction)
          .input('id_inventario', sql.Int, idInventario)
          .input('etiqueta', sql.NVarChar(20), `F${i + 1}`)
          .input('importe', sql.Decimal(18, 4), numberValue(precios[i].importe))
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
    }

    await transaction.commit()

    res.json({
      ok: true,
      message: 'Inventarios guardados correctamente'
    })
  } catch (error) {
    console.log('ERROR GUARDAR:', error)

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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log(`Logo disponible en http://localhost:${PORT}/imagenes/ary.logo.png`)
})