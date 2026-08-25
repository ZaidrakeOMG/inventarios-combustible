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
