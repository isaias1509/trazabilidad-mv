/* ==========================================================
   datos.js — Datos de ejemplo del prototipo (segundo incremento)
   Estados de la orden, roles con sus permisos y datos iniciales.
   Las fechas se calculan desde el día de hoy para que la demo
   siempre muestre órdenes por vencer y atrasadas.
   En la versión final estos datos vienen de la BD MySQL
   (ver bd/mv_trazabilidad.sql).
   ========================================================== */
const ESTADOS=['PENDIENTE','EN CORTE','EN CONFECCIÓN','EN ESTAMPADO','TERMINADO','ENTREGADO','CANCELADA'];
const CANCELADA=6;

/* Qué puede hacer cada rol */
const PERMISOS={
  'Administrador':        ['pedido','compra','entregar','devolver','merma','estado','reasignar','cancelar','ajustar','anular','material'],
  'Control de materiales':['compra','entregar','devolver','merma','estado','reasignar','material'],
  'Almacén':              ['compra','entregar','devolver','merma'],
  'Ventas':               ['pedido']
};
const USERS=[
  {n:'Lorenzo Medina',rol:'Administrador'},
  {n:'Alejandro Medina',rol:'Control de materiales'},
  {n:'Almacén',rol:'Almacén'},
  {n:'Ventas',rol:'Ventas'}];

const MOTIVOS_MERMA=['Retazos de corte que no se pueden usar','Falla en la tela','Error de corte o confección','Manchas o daño en el taller','Otro'];
const MOTIVOS_AJUSTE=['Conteo físico no cuadra','Merma o daño en almacén','Pérdida','Error de registro anterior','Otro'];

/* Fecha relativa a hoy: dia(-3) = hace 3 días */
function dia(n,h){const d=new Date();d.setDate(d.getDate()+n);const p=x=>String(x).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`+(h?` ${h}`:'')}

function seed(){
  const movs=[];let mid=0;
  const mv=(f,mat,tipo,cant,efecto,orden,nota,u)=>movs.push({id:++mid,f,mat,tipo,cant,efecto,orden,nota,u,anulado:false});
  // Compras iniciales
  mv(dia(-30,'09:00'),1,'ENTRADA',120,120,null,'Compra a Textiles Gamarra S.A.C. · S/ 7.50 c/u','Alejandro Medina');
  mv(dia(-30,'09:05'),2,'ENTRADA',95,95,null,'Compra a Textiles Gamarra S.A.C. · S/ 7.50 c/u','Alejandro Medina');
  mv(dia(-30,'09:10'),3,'ENTRADA',80,80,null,'Compra a Textiles Gamarra S.A.C. · S/ 9.00 c/u · 4 m rechazados por falla','Alejandro Medina');
  mv(dia(-30,'09:15'),4,'ENTRADA',30,30,null,'Compra a Avíos y Etiquetas E.I.R.L.','Alejandro Medina');
  mv(dia(-30,'09:20'),5,'ENTRADA',8,8,null,'Compra a Avíos y Etiquetas E.I.R.L.','Alejandro Medina');
  mv(dia(-30,'09:25'),6,'ENTRADA',6,6,null,'Compra a Avíos y Etiquetas E.I.R.L.','Alejandro Medina');
  mv(dia(-30,'09:30'),7,'ENTRADA',12,12,null,'Compra en Gamarra','Alejandro Medina');
  // OP-001 faldas
  mv(dia(-20,'08:30'),3,'SALIDA',34,-34,1,'Entrega a la orden','Almacén');
  mv(dia(-20,'08:35'),4,'SALIDA',4,-4,1,'Entrega a la orden','Almacén');
  mv(dia(-18,'16:00'),3,'MERMA',2.5,0,1,'Retazos de corte que no se pueden usar','Alejandro Medina');
  mv(dia(-17,'10:00'),3,'DEVOLUCION',1.5,1.5,1,'Sobrante devuelto por el taller','Almacén');
  // OP-003 disfraces (terminada)
  mv(dia(-25,'09:00'),1,'SALIDA',38,-38,3,'Entrega a la orden','Almacén');
  mv(dia(-14,'11:00'),1,'MERMA',1,0,3,'Falla en la tela','Alejandro Medina');
  mv(dia(-10,'17:00'),5,'SALIDA',3,-3,3,'Etiquetas para empaque','Almacén');
  mv(dia(-10,'17:05'),6,'SALIDA',3,-3,3,'Bolsas para empaque','Almacén');
  // OP-004 banderas (atrasada)
  mv(dia(-9,'09:00'),1,'SALIDA',31,-31,4,'Entrega a la orden','Almacén');
  mv(dia(-9,'09:05'),2,'SALIDA',16,-16,4,'Entrega a la orden','Almacén');
  // Ajuste por conteo físico
  mv(dia(-5,'18:00'),7,'AJUSTE',2,-2,null,'Conteo físico no cuadra · se contaron 4, el sistema decía 6','Lorenzo Medina');
  // Consumos varios
  mv(dia(-3,'12:00'),4,'SALIDA',8,-8,4,'Hilo para confección','Almacén');
  mv(dia(-2,'12:00'),5,'SALIDA',1,-1,1,'Etiquetas de talla','Almacén');
  mv(dia(-2,'12:05'),6,'SALIDA',1,-1,1,'Bolsas de empaque','Almacén');
  mv(dia(-1,'09:00'),7,'SALIDA',2,-2,1,'Tizas para tizado','Almacén');
  mv(dia(-1,'10:00'),2,'ENTRADA',30,30,null,'Compra a Textiles Gamarra S.A.C. · S/ 7.50 c/u','Alejandro Medina');

  const materiales=[
    {id:1,nombre:'Tela raso rojo',tipo:'Tela',unidad:'m',min:30,precio:7.5},
    {id:2,nombre:'Tela raso blanco',tipo:'Tela',unidad:'m',min:30,precio:7.5},
    {id:3,nombre:'Tela gabardina plomo',tipo:'Tela',unidad:'m',min:20,precio:9},
    {id:4,nombre:'Hilo poliéster',tipo:'Insumo',unidad:'cono',min:10,precio:6},
    {id:5,nombre:'Etiquetas de talla',tipo:'Empaque',unidad:'ciento',min:5,precio:12},
    {id:6,nombre:'Bolsas de empaque',tipo:'Empaque',unidad:'ciento',min:5,precio:10},
    {id:7,nombre:'Tiza de sastre',tipo:'Consumible',unidad:'unidades',min:10,precio:1.5}];
  materiales.forEach(m=>m.stock=+movs.filter(x=>x.mat===m.id).reduce((a,x)=>a+x.efecto,0).toFixed(2));

  return{v:2,
    materiales,
    proveedores:['Textiles Gamarra S.A.C.','Avíos y Etiquetas E.I.R.L.'],
    costureros:['Costurera 1 · Huaycán','Costurera 2 · Santa Clara','Costurera 3 · Collique'],
    productos:[
      {n:'Bandera del Perú 90×150',receta:[{m:1,c:1.2},{m:2,c:0.6}]},
      {n:'Falda escolar plomo',receta:[{m:3,c:0.8}]},
      {n:'Disfraz de Halloween',receta:[{m:1,c:1.2}]}],
    ordenes:[
      {id:1,cliente:'I.E. San Martín',producto:1,cantidad:40,entrega:dia(3),estado:2,costurero:'Costurera 1 · Huaycán',
       hist:[{f:dia(-21,'09:00'),e:0,nota:'Orden creada desde el pedido',u:'Ventas'},{f:dia(-20,'09:00'),e:1,nota:'Tendido y tizado',u:'Alejandro Medina'},{f:dia(-17,'10:00'),e:2,nota:'Asignada a Costurera 1 · Huaycán',u:'Alejandro Medina'}]},
      {id:2,cliente:'Municipalidad de Ate',producto:0,cantidad:25,entrega:dia(10),estado:0,costurero:'',
       hist:[{f:dia(-1,'11:00'),e:0,nota:'Orden creada desde el pedido',u:'Ventas'}]},
      {id:3,cliente:'Tienda Gamarra · campaña Halloween',producto:2,cantidad:30,entrega:dia(-6),estado:5,costurero:'Costurera 2 · Santa Clara',
       hist:[{f:dia(-26,'09:00'),e:0,nota:'Orden creada desde el pedido',u:'Ventas'},{f:dia(-25,'09:00'),e:1,nota:'Tendido y tizado',u:'Alejandro Medina'},{f:dia(-22,'09:00'),e:2,nota:'Asignada a Costurera 2 · Santa Clara',u:'Alejandro Medina'},{f:dia(-11,'09:00'),e:4,nota:'Prendas revisadas',u:'Alejandro Medina'},{f:dia(-7,'15:00'),e:5,nota:'Entregado al cliente',u:'Ventas'}]},
      {id:4,cliente:'I.E. José Olaya',producto:0,cantidad:25,entrega:dia(-2),estado:3,costurero:'Costurera 3 · Collique',
       hist:[{f:dia(-10,'09:00'),e:0,nota:'Orden creada desde el pedido',u:'Ventas'},{f:dia(-9,'09:00'),e:1,nota:'Tendido y tizado',u:'Alejandro Medina'},{f:dia(-7,'09:00'),e:2,nota:'Asignada a Costurera 3 · Collique',u:'Alejandro Medina'},{f:dia(-3,'09:00'),e:3,nota:'Estampado del escudo',u:'Alejandro Medina'}]}],
    movs,nextMov:mid+1,
    user:null};
}
