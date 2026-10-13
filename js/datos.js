/* ==========================================================
   datos.js — Datos de ejemplo del prototipo (primer incremento)
   Estados de la orden, usuarios por rol y datos iniciales.
   En la versión final estos datos vienen de la BD MySQL
   (ver bd/mv_trazabilidad.sql).
   ========================================================== */
const ESTADOS=['PENDIENTE','EN CORTE','EN CONFECCIÓN','EN ESTAMPADO','TERMINADO','ENTREGADO'];
const USERS=[{n:'Lorenzo Medina',rol:'Administrador'},{n:'Alejandro Medina',rol:'Control de materiales'},{n:'Almacén',rol:'Almacén'},{n:'Ventas',rol:'Ventas'}];
function seed(){return{
  materiales:[
    {id:1,nombre:'Tela raso rojo',tipo:'Tela',unidad:'m',stock:120,min:30},
    {id:2,nombre:'Tela raso blanco',tipo:'Tela',unidad:'m',stock:95,min:30},
    {id:3,nombre:'Tela gabardina plomo',tipo:'Tela',unidad:'m',stock:28,min:20},
    {id:4,nombre:'Hilo poliéster',tipo:'Insumo',unidad:'cono',stock:18,min:10},
    {id:5,nombre:'Etiquetas',tipo:'Empaque',unidad:'ciento',stock:4,min:5},
    {id:6,nombre:'Bolsas de empaque',tipo:'Empaque',unidad:'ciento',stock:3,min:5},
    {id:7,nombre:'Tiza de sastre',tipo:'Consumible',unidad:'unid.',stock:6,min:10}],
  proveedores:['Textiles Gamarra S.A.C.','Avíos y Etiquetas E.I.R.L.'],
  costureros:['Costurera 1 · Huaycán','Costurera 2 · Santa Clara','Costurera 3 · Collique'],
  productos:[{n:'Bandera del Perú 90×150',consumo:1.5,tela:1},{n:'Falda escolar plomo',consumo:0.8,tela:3},{n:'Disfraz de Halloween',consumo:1.2,tela:1}],
  ordenes:[
    {id:1,cliente:'I.E. San Martín',producto:1,cantidad:40,entrega:'2026-10-30',estado:2,costurero:'Costurera 1 · Huaycán',materiales:[{m:3,c:32},{m:4,c:4}],hist:[['2026-10-05 09:00','PENDIENTE','Orden creada'],['2026-10-06 09:00','EN CORTE','Tendido y tizado'],['2026-10-07 10:00','EN CONFECCIÓN','Asignada a costurera']]},
    {id:2,cliente:'Municipalidad de Ate',producto:0,cantidad:25,entrega:'2026-10-23',estado:0,costurero:'',materiales:[],hist:[['2026-10-12 11:00','PENDIENTE','Orden creada']]}],
  movs:[
    ['2026-10-01 10:00',1,'ENTRADA',50,null,'Compra a Textiles Gamarra S.A.C.'],['2026-10-01 10:00',2,'ENTRADA',50,null,'Compra a Textiles Gamarra S.A.C.'],
    ['2026-10-05 09:30',3,'SALIDA',32,1,'Entrega a orden OP-001'],['2026-10-05 09:35',4,'SALIDA',4,1,'Entrega a orden OP-001']],
  user:null};}
