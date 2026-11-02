-- Base de datos: Sistema de trazabilidad de materiales y órdenes de producción
-- M & V Technology Textil S.A.C. · MySQL 8
DROP DATABASE IF EXISTS mv_trazabilidad;
CREATE DATABASE mv_trazabilidad CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE mv_trazabilidad;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('ADMINISTRADOR','CONTROL_MATERIALES','ALMACEN','VENTAS','CONSULTA') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE proveedores (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(150) NOT NULL,
  ruc CHAR(11) UNIQUE,
  telefono VARCHAR(20),
  rubro VARCHAR(80)
);

CREATE TABLE costureros (
  id_costurero INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  zona VARCHAR(60),
  telefono VARCHAR(20)
);

CREATE TABLE materiales (
  id_material INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  tipo ENUM('TELA','INSUMO','CONSUMIBLE','EMPAQUE') NOT NULL,
  unidad VARCHAR(20) NOT NULL,
  stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo_promedio DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  talla_tamano VARCHAR(40),
  consumo_tela_m DECIMAL(6,2) NOT NULL DEFAULT 0
);

CREATE TABLE compras (
  id_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha DATE NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE detalle_compra (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_compra INT NOT NULL,
  id_material INT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  cantidad_rechazada DECIMAL(10,2) NOT NULL DEFAULT 0,  -- llegó con falla, no entra al stock
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_compra) REFERENCES compras(id_compra),
  FOREIGN KEY (id_material) REFERENCES materiales(id_material)
);

CREATE TABLE pedidos (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(120) NOT NULL,
  telefono_cliente VARCHAR(20),
  id_producto INT NOT NULL,
  especificaciones TEXT,
  cantidad INT NOT NULL,
  fecha_entrega DATE NOT NULL,
  estado ENUM('REGISTRADO','EN_PRODUCCION','ENTREGADO','ANULADO') NOT NULL DEFAULT 'REGISTRADO',
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

CREATE TABLE ordenes (
  id_orden INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_limite DATE NOT NULL,
  estado ENUM('PENDIENTE','EN_CORTE','EN_CONFECCION','EN_ESTAMPADO','TERMINADO','ENTREGADO','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  costo_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);

CREATE TABLE materiales_orden (
  id_material_orden INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  id_material INT NOT NULL,
  cantidad_requerida DECIMAL(10,2) NOT NULL,
  cantidad_entregada DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden),
  FOREIGN KEY (id_material) REFERENCES materiales(id_material)
);

CREATE TABLE asignaciones (
  id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  id_costurero INT NOT NULL,
  maquina VARCHAR(60),
  cantidad_piezas INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden),
  FOREIGN KEY (id_costurero) REFERENCES costureros(id_costurero)
);

CREATE TABLE movimientos (
  id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
  id_material INT NOT NULL,
  id_orden INT NULL,
  id_usuario INT NOT NULL,
  tipo ENUM('ENTRADA','SALIDA_ORDEN','DEVOLUCION','MERMA','AJUSTE','ANULACION') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  efecto DECIMAL(10,2) NOT NULL DEFAULT 0,   -- cuánto cambia el stock (+ entra, - sale, 0 merma en taller)
  saldo DECIMAL(10,2) NOT NULL,
  motivo VARCHAR(150) NULL,                  -- motivo de merma, ajuste o anulación
  anulado TINYINT(1) NOT NULL DEFAULT 0,     -- nunca se borra: se marca y se crea el movimiento contrario
  id_movimiento_anulado INT NULL,            -- en una ANULACION, el movimiento que anula
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_material) REFERENCES materiales(id_material),
  FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_movimiento_anulado) REFERENCES movimientos(id_movimiento)
);

CREATE TABLE estados_orden (
  id_estado INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  id_usuario INT NOT NULL,
  estado VARCHAR(20) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion VARCHAR(200),
  FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ===== Datos de prueba =====
INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES
('Lorenzo Medina','lorenzo@mvtextil.pe','demo123','ADMINISTRADOR'),
('Alejandro Medina','alejandro@mvtextil.pe','demo123','CONTROL_MATERIALES'),
('Almacén 1','almacen@mvtextil.pe','demo123','ALMACEN'),
('Ventas','ventas@mvtextil.pe','demo123','VENTAS');

INSERT INTO proveedores (razon_social, ruc, telefono, rubro) VALUES
('Textiles Gamarra S.A.C.','20111111111','999111222','Telas'),
('Avíos y Etiquetas E.I.R.L.','20222222222','999333444','Insumos');

INSERT INTO costureros (nombre, zona, telefono) VALUES
('Costurera 1','Huaycán','988000111'),('Costurera 2','Santa Clara','988000222'),('Costurera 3','Collique','988000333');

INSERT INTO materiales (nombre, tipo, unidad, stock_actual, stock_minimo, costo_promedio) VALUES
('Tela raso rojo','TELA','metro',120,30,6.50),
('Tela raso blanco','TELA','metro',95,30,6.50),
('Tela gabardina plomo','TELA','metro',60,20,9.00),
('Hilo poliéster','INSUMO','cono',18,10,4.00),
('Etiquetas','EMPAQUE','ciento',4,5,12.00),
('Bolsas de empaque','EMPAQUE','ciento',3,5,8.00),
('Tiza de sastre','CONSUMIBLE','unidad',6,10,1.50);

INSERT INTO productos (nombre, talla_tamano, consumo_tela_m) VALUES
('Bandera del Perú','90 x 150 cm',1.50),('Falda escolar','Talla 10',0.80),('Disfraz de Halloween','Talla M',1.20);

INSERT INTO compras (id_proveedor, id_usuario, fecha, total) VALUES (1,2,'2026-10-01',650.00);
INSERT INTO detalle_compra (id_compra, id_material, cantidad, precio_unitario) VALUES (1,1,50,6.50),(1,2,50,6.50);

INSERT INTO pedidos (cliente, telefono_cliente, id_producto, especificaciones, cantidad, fecha_entrega, estado) VALUES
('I.E. San Martín','987654321',2,'Faldas plomas, tallas 8 a 12',40,'2026-10-30','EN_PRODUCCION'),
('Municipalidad de Ate','912345678',1,'Banderas con asta',25,'2026-10-25','REGISTRADO');

INSERT INTO ordenes (id_pedido, fecha_inicio, fecha_limite, estado, costo_total) VALUES
(1,'2026-10-05','2026-10-28','EN_CONFECCION',288.00),(2,'2026-10-12','2026-10-23','PENDIENTE',0);

INSERT INTO materiales_orden (id_orden, id_material, cantidad_requerida, cantidad_entregada) VALUES
(1,3,32,32),(1,4,4,4),(2,1,20,0),(2,2,18,0);

INSERT INTO asignaciones (id_orden, id_costurero, maquina, cantidad_piezas, fecha) VALUES
(1,1,'Recta 1',20,'2026-10-07'),(1,2,'Recta 2',20,'2026-10-07');

INSERT INTO movimientos (id_material, id_orden, id_usuario, tipo, cantidad, efecto, saldo, motivo, fecha) VALUES
(1,NULL,2,'ENTRADA',50,50,120,NULL,'2026-10-01 10:00'),(2,NULL,2,'ENTRADA',50,50,95,NULL,'2026-10-01 10:00'),
(3,1,2,'SALIDA_ORDEN',32,-32,60,NULL,'2026-10-05 09:30'),(4,1,2,'SALIDA_ORDEN',4,-4,18,NULL,'2026-10-05 09:35'),
(3,1,2,'MERMA',2.5,0,60,'Retazos de corte que no se pueden usar','2026-10-07 16:00'),
(3,1,2,'DEVOLUCION',1.5,1.5,61.5,NULL,'2026-10-08 10:00');

INSERT INTO estados_orden (id_orden, id_usuario, estado, fecha, observacion) VALUES
(1,1,'PENDIENTE','2026-10-05 09:00','Orden creada'),(1,1,'EN_CORTE','2026-10-06 09:00','Tendido y tizado'),
(1,1,'EN_CONFECCION','2026-10-07 10:00','Asignada a 2 costureras'),(2,1,'PENDIENTE','2026-10-12 11:00','Orden creada');

-- ===== Consultas de trazabilidad =====
-- Materiales por debajo del stock mínimo (alerta)
-- SELECT nombre, stock_actual, stock_minimo FROM materiales WHERE stock_actual <= stock_minimo;
-- Historial de una orden: materiales entregados y estados
-- SELECT o.id_orden, m.nombre, mo.cantidad_entregada FROM ordenes o JOIN materiales_orden mo ON mo.id_orden=o.id_orden JOIN materiales m ON m.id_material=mo.id_material WHERE o.id_orden=1;
-- Kardex de un material
-- SELECT fecha, tipo, cantidad, saldo, id_orden FROM movimientos WHERE id_material=3 ORDER BY fecha;
