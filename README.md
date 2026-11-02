# Sistema de trazabilidad de materiales y órdenes de producción
M & V Technology Textil S.A.C. · Prototipo funcional (segundo incremento)

## Cómo abrirlo
1. Abrir esta carpeta en Visual Studio Code.
2. Clic derecho en `index.html` → **Open with Live Server** (o abrir el link de GitHub Pages).
3. Elegir un usuario · contraseña: `demo123`. Cada rol ve solo sus acciones.

## Qué cubre
| Situación real | Dónde se registra | Qué pasa con el stock |
|---|---|---|
| Compra recibida | Compras | Sube |
| Llega material fallado | Compras → "rechazada por falla" | Lo rechazado no entra |
| Entrega de material a una orden | Orden → Entregar material | Baja; si supera lo estimado queda como "entrega adicional" |
| Sobra material en el taller | Orden → Devolver sobrante | Sube |
| Merma en el taller (retazos, falla, error) | Orden → Reportar merma | No cambia (ya había salido); va al reporte de merma |
| El conteo físico no cuadra / daño en almacén | Materiales → Ajustar (solo administrador) | Se corrige con motivo |
| Se registró algo mal | Kardex → Anular (solo administrador) | Nada se borra: se crea el movimiento contrario |
| Prendas falladas, hay que rehacer | Orden → Cambiar estado → Regresar (con nota) | — |
| Cambio de costurera | Orden → Costurera | — |
| El cliente cancela | Orden → Cancelar (luego devolver material) | Sube al devolver |
| Orden atrasada / por vencer | Pantalla "Hoy" | — |
| Insumos por agotarse | "Hoy" y lista de compras sugerida | — |

## Permisos
- **Administrador:** todo.
- **Control de materiales:** compras, entregas, devoluciones, merma, estados, costurera, materiales.
- **Almacén:** compras, entregas, devoluciones, merma.
- **Ventas:** registrar pedidos y consultar.

## Estructura
```
index.html          → pantallas
css/estilos.css     → diseño (claro/oscuro, celular)
js/datos.js         → datos de ejemplo, estados, roles y permisos
js/app.js           → reglas: stock, kardex, merma, devoluciones, ajustes, anulaciones
bd/                 → script MySQL y modelos
```
Los datos se guardan en el navegador (localStorage). En el siguiente sprint se conecta a MySQL con Laravel.
