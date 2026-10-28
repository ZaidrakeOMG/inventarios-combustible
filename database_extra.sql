USE InventariosCombustible;
GO

IF OBJECT_ID('DetalleCompraInventario', 'U') IS NULL
BEGIN
    CREATE TABLE DetalleCompraInventario (
        id_detalle_compra INT IDENTITY(1,1) PRIMARY KEY,
        id_inventario INT NOT NULL,
        etiqueta NVARCHAR(20) NOT NULL,
        litros DECIMAL(18,3) NOT NULL DEFAULT 0,
        fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DetalleCompraInventario_Inventarios
            FOREIGN KEY (id_inventario) REFERENCES Inventarios(id_inventario) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('DetallePrecioInventario', 'U') IS NULL
BEGIN
    CREATE TABLE DetallePrecioInventario (
        id_detalle_precio INT IDENTITY(1,1) PRIMARY KEY,
        id_inventario INT NOT NULL,
        etiqueta NVARCHAR(20) NOT NULL,
        importe DECIMAL(18,4) NOT NULL DEFAULT 0,
        fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DetallePrecioInventario_Inventarios
            FOREIGN KEY (id_inventario) REFERENCES Inventarios(id_inventario) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'UX_Inventarios_Estacion_Producto_Fecha'
)
BEGIN
    CREATE UNIQUE INDEX UX_Inventarios_Estacion_Producto_Fecha
    ON Inventarios(id_estacion, id_producto, fecha);
END
GO


-- Integridad opcional de compras programadas. No borra registros históricos.
-- Ejecutar manualmente tras respaldo y revisión con el administrador SQL.
IF OBJECT_ID(N'dbo.PipasComprasProgramadas', N'U') IS NOT NULL
   AND NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.PipasComprasProgramadas')
        AND name = N'UX_PipasCompras_FechaEstacionProducto'
   )
BEGIN
    IF EXISTS (
        SELECT 1 FROM dbo.PipasComprasProgramadas
        GROUP BY fecha_compra, id_estacion, id_producto
        HAVING COUNT(*) > 1
    )
    BEGIN
        PRINT 'ATENCION: existen compras duplicadas. Revisarlas antes de crear el indice; no se modificaron datos.';
        SELECT fecha_compra, id_estacion, id_producto, COUNT(*) AS registros
        FROM dbo.PipasComprasProgramadas
        GROUP BY fecha_compra, id_estacion, id_producto
        HAVING COUNT(*) > 1;
    END
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_PipasCompras_FechaEstacionProducto
        ON dbo.PipasComprasProgramadas (fecha_compra, id_estacion, id_producto);
        PRINT 'Indice unico de compras programadas creado.';
    END
END
GO
