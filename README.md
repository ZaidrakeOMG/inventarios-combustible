# Inventarios Combustibles — Grupo ARY

Sistema interno para inventarios, costos y programación preventiva de pipas, con SQL Server y lecturas de tanque Polaris.

## Módulos y fuentes

| Módulo | Ruta | Fuente |
| --- | --- | --- |
| Inventarios | / | InventariosCombustible: inventario inicial/final, ventas, compras y precios capturados |
| Proyección de pipas | /pipas.html | Ventas e inventario contable desde Inventarios Combustibles; lectura, fecha y capacidad de tanque desde Polaris |
| Costos | /Costos.html | Inventarios Combustibles y fórmulas de costo existentes |

**No confundir:** el inventario inicial es un corte contable de una fecha; el tanque Polaris es una medición física de una hora. No tienen que coincidir exactamente.

## Reglas de programación de pipas

1. El promedio mostrado es la suma de ventas capturadas de los **7 días anteriores al reporte / 7**. Las ventas no se consultan a Polaris.
2. Para programar automáticamente exige al menos 3 días capturados; si faltan días, calcula una demanda operativa prudente sin cambiar el promedio mostrado.
3. La proyección desde hoy inicia en la medición válida de Polaris y sólo descuenta ventas posteriores a la hora de esa lectura. Con sensor antiguo o inválido puede mostrar un respaldo contable, pero no programar automáticamente el producto.
4. Las compras guardadas son **programaciones**, no entregas confirmadas. La tabla supone que una compra de fecha D se recibe al inicio de **D+1**, únicamente para proyectar. Verificar este plazo con el proveedor.
5. El punto de reorden es la referencia. Se anticipa si la demanda prevista durante el tiempo de entrega más el fondaje requiere un margen mayor. La fecha de solicitud se decide por la existencia estimada **al llegar la pipa**, no cuando el tanque ya está por debajo del reorden.
6. Se sugiere sólo **una próxima pipa de 20,000 L por estación/combustible** por operación, no un calendario entero sin confirmar recepciones. Las compras pendientes se consideran; no se duplica el mismo día y se respeta el 95% de capacidad operativa.
7. El botón Programar guarda registros en la base central; **no envía pedidos al proveedor**. La inserción automática utiliza transacción y bloqueo SQL para evitar compras simultáneas duplicadas.
8. **Las compras de versiones anteriores se conservan.** Revisar y, cuando proceda, corregir manualmente las programaciones antiguas; no se cancelan solas.

**Limitaciones:** las ventas se distribuyen uniformemente en el día para estimar cierres. Puede haber picos por hora y festivos. D+1 no es un compromiso del proveedor. Punto de reorden, fondaje, capacidad, despacho y logística deben corroborarse con cada estación.

## Instalación

Node.js 20+ y conexión de red a SQL Server central y a las bases Polaris autorizadas.

~~~bash
npm ci
cp .env.example .env
# Completar .env con credenciales privadas y nombres de bases
npm test
npm start
~~~

En Windows, copia .env.example como .env y edítalo. Si ya está en ejecución como servicio, reinicia **ese proceso**, no abras una segunda instancia del puerto.

Variables destacadas:
- **SQL_SERVER, SQL_DATABASE:** base central Inventarios Combustibles.
- **SQL_SERVERS:** lista autorizada de servidores de estaciones.
- **POLARIS_DATABASE=Polaris:** base de lecturas físicas, **no** usar REMOTE_SQL_DATABASE si corresponde a inventarios.
- **POLARIS_MAX_EDAD_MINUTOS=20:** antigüedad máxima del sensor, ajustar sólo tras comprobar cómo transmite Polaris.
- **SSL_ENABLED, SSL_KEY_PATH, SSL_CERT_PATH:** HTTPS.

El archivo .env lleva las contraseñas y no debe subirse a GitHub. **El servidor no incorpora autenticación de operadores.** Mantener en VPN/red privada o detrás de un proxy con autenticación y HTTPS. No publicar estas APIs directamente a Internet.

### Actualizar una instalación existente

~~~bash
git pull --ff-only origin main
npm ci
npm test
~~~

Después reiniciar Node.js usando el procedimiento ya utilizado en el servidor y recargar con Ctrl+F5.

## Prueba de aceptación operativa

- Confirmar asociación de todas las estaciones por nombre/NoES y producto; no relacionarlas por orden de servidores.
- Verificar fecha del sensor, litros, capacidad y errores de cada conexión Polaris. Sin sensor confiable debe bloquear Programar.
- Comprobar el promedio de 7 días contra las ventas guardadas en Inventarios Combustibles.
- Contrastar la proyección con el tanque **a la hora de la medición**, sin volver a restar ventas ya reflejadas.
- Validar que la fecha sugerida permita recibir la pipa antes del reorden con el **plazo real** de entrega.
- Verificar que un pedido vigente no se duplique y que un pedido tardío permita anticipar sin eliminar el anterior.
- Revisar que ninguna propuesta exceda la capacidad segura y que el botón no suponga una orden entregada.
- **Revisar las programaciones antiguas** de versiones previas antes de usar nuevas propuestas.

## Pruebas automatizadas

**npm test** ejecuta pruebas aisladas sobre el motor JavaScript real de public/pipas.js, con fecha fija y datos simulados. Verifica decimales, nombres, proyección por hora, compras pasadas, punto de reorden, compras tardías, duplicados, ventas altas, sensores antiguos y falta de ventas. No toca SQL Server.

La prueba de integración contra bases y tanques reales sigue siendo indispensable. Hacer respaldo de InventariosCombustible antes de desplegar cambios que escriban compras.
