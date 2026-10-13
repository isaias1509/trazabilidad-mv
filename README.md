# Sistema de trazabilidad de materiales y órdenes de producción
M & V Technology Textil S.A.C. · Prototipo funcional (primer incremento)

## Cómo abrirlo
1. Abrir esta carpeta en Visual Studio Code.
2. Instalar la extensión **Live Server**.
3. Clic derecho en `index.html` → **Open with Live Server**.
4. Se abre en `http://127.0.0.1:5500` · usuario: cualquiera · contraseña: `demo123`.

## Estructura del proyecto
```
trazabilidad-mv/
├── index.html          → estructura de las pantallas (login, menú, vistas)
├── css/estilos.css     → estilos y tema claro/oscuro
├── js/datos.js         → datos de ejemplo (estados, usuarios, materiales, órdenes)
├── js/app.js           → lógica: stock mínimo, kardex, estados de la orden, trazabilidad
└── bd/
    ├── mv_trazabilidad.sql  → base de datos MySQL (13 tablas + datos de prueba)
    ├── modelo_logico.png
    └── modelo_fisico.png
```
En este primer incremento los datos se guardan en el navegador (localStorage).
La base de datos MySQL ya está diseñada y se conecta en el siguiente sprint.

## Siguiente sprint
Implementar el backend en Laravel y conectar el sistema a la base de datos MySQL.
