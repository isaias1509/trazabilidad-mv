/* ==========================================================
   app.js — Lógica del prototipo (segundo incremento)
   - Persistencia temporal en localStorage (clave 'mv-proto-v2')
   - Vistas: hoy, órdenes, detalle de orden, materiales,
     compras, kardex y reportes
   - Reglas: stock mínimo, kardex con saldo, validación de stock,
     merma, devoluciones, ajustes, anulaciones (nunca se borra),
     cancelación y reproceso de órdenes, permisos por rol
   ========================================================== */
const KEY='mv-proto-v2';
let D;try{D=JSON.parse(localStorage.getItem(KEY));if(!D||D.v!==2)D=seed()}catch(e){D=seed()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}};

/* ---------- utilidades ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const now=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const hoy=()=>now().slice(0,10);
const n2=x=>+(+x).toFixed(2);
const fmt=x=>new Intl.NumberFormat('es-PE',{maximumFractionDigits:2}).format(x);
const sol=x=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(x);
const fecha=s=>{const [y,m,d]=s.slice(0,10).split('-');return `${d}/${m}/${y}`+(s.length>10?' '+s.slice(11):'')};
const mat=id=>D.materiales.find(m=>m.id===+id);
const ord=id=>D.ordenes.find(o=>o.id===+id);
const op=id=>'OP-'+pad(id).padStart(3,'0');
const low=m=>m.stock<=m.min;
const user=()=>USERS[D.user];
const can=a=>PERMISOS[user().rol].includes(a);
const dias=f=>Math.round((new Date(f+'T00:00')-new Date(hoy()+'T00:00'))/864e5);
function toast(t,kind){const el=$('#toast');el.textContent=t;el.dataset.kind=kind||'';el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,3200)}

/* ---------- reglas de negocio ---------- */
function addMov(matId,tipo,cant,efecto,orden,nota){
  const m=mat(matId);m.stock=n2(m.stock+efecto);
  const x={id:D.nextMov++,f:now(),mat:+matId,tipo,cant:n2(cant),efecto:n2(efecto),orden:orden||null,nota,u:user().n,anulado:false};
  D.movs.push(x);return x}
const vivos=()=>D.movs.filter(x=>!x.anulado&&x.tipo!=='ANULACIÓN');
/* Resumen de materiales de una orden: entregado, devuelto, merma, neto, estimado */
function resumen(o){
  const p=D.productos[o.producto],r={};
  p.receta.forEach(x=>r[x.m]={m:x.m,est:n2(x.c*o.cantidad),ent:0,dev:0,mer:0});
  vivos().filter(x=>x.orden===o.id).forEach(x=>{r[x.mat]=r[x.mat]||{m:x.mat,est:0,ent:0,dev:0,mer:0};
    if(x.tipo==='SALIDA')r[x.mat].ent+=x.cant;if(x.tipo==='DEVOLUCION')r[x.mat].dev+=x.cant;if(x.tipo==='MERMA')r[x.mat].mer+=x.cant});
  return Object.values(r).map(x=>({...x,ent:n2(x.ent),dev:n2(x.dev),mer:n2(x.mer),neto:n2(x.ent-x.dev)}))}
function costoOrden(o){return n2(resumen(o).reduce((a,x)=>a+x.neto*(mat(x.m).precio||0),0))}
function situacion(o){
  if(o.estado===CANCELADA)return{k:'cancel',t:'Cancelada'};
  if(o.estado>=4)return{k:'ok',t:o.estado===5?'Entregada':'Terminada'};
  const d=dias(o.entrega);
  if(d<0)return{k:'bad',t:`Atrasada ${-d} día${d===-1?'':'s'}`};
  if(d<=3)return{k:'warn',t:d===0?'Vence hoy':`Vence en ${d} día${d===1?'':'s'}`};
  return{k:'neutral',t:`Entrega en ${d} días`}}
/* Necesidad pendiente de material de las órdenes que no han terminado */
function pendiente(matId){return n2(D.ordenes.filter(o=>o.estado<4).reduce((a,o)=>{const x=resumen(o).find(y=>y.m===+matId);return a+(x?Math.max(0,x.est-x.neto):0)},0))}
function sugerido(m){const nec=pendiente(m.id);const objetivo=m.min*2+nec;return n2(Math.max(0,objetivo-m.stock))}

/* ---------- componentes ---------- */
const chip=(t,k)=>`<span class="chip c-${k}">${esc(t)}</span>`;
function chipEstado(e){return chip(ESTADOS[e],e===CANCELADA?'cancel':e>=4?'ok':e===0?'warn':'brand')}
const TIPO={ENTRADA:['Entrada','ok'],SALIDA:['Salida a orden','brand'],DEVOLUCION:['Devolución','ok'],MERMA:['Merma en taller','warn'],AJUSTE:['Ajuste','neutral'],'ANULACIÓN':['Anulación','cancel']};
function stockCell(m){const pct=Math.min(100,Math.round(m.stock/Math.max(m.min*3,1)*100));
  return `<div class="stock"><span class="num">${fmt(m.stock)} ${esc(m.unidad)}</span><div class="bar" aria-hidden="true"><i class="${low(m)?'low':''}" style="width:${pct}%"></i></div></div>`}
const field=(id,label,input,help)=>`<div class="field"><label for="${id}">${label}</label>${input}${help?`<small class="help" id="${id}-h">${help}</small>`:''}</div>`;
const opts=(arr,sel)=>arr.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(t)}</option>`).join('');
const noPerm=a=>`<p class="locked">Tu rol (${esc(user().rol)}) no puede ${a}. Pídeselo al administrador.</p>`;
const empty=(t,sub)=>`<div class="empty"><p><b>${t}</b></p>${sub?`<p>${sub}</p>`:''}</div>`;

/* ---------- navegación ---------- */
let tab='hoy',ui={ordenId:null,accion:null,filtro:'curso',kardex:1,confirm:null,ajuste:null,nuevo:false};
const TABS=[['hoy','Hoy'],['ordenes','Órdenes'],['materiales','Materiales'],['compras','Compras'],['kardex','Kardex'],['reportes','Reportes']];
function go(t,extra){tab=t;Object.assign(ui,{accion:null,confirm:null,ajuste:null},extra||{});render();window.scrollTo({top:0})}
function renderNav(){const nBajo=D.materiales.filter(low).length,nAtr=D.ordenes.filter(o=>situacion(o).k==='bad').length;
  const cur=tab==='orden'?'ordenes':tab;
  $('#nav').innerHTML=TABS.map(([k,l])=>{const b=k==='materiales'?nBajo:k==='ordenes'?nAtr:0;
    return `<button type="button" data-tab="${k}" ${k===cur?'aria-current="page"':''}>${l}${b?`<span class="badge" aria-label="${b} alertas">${b}</span>`:''}</button>`}).join('');
  $('#who').innerHTML=`<b>${esc(user().n)}</b><span>${esc(user().rol)}</span>`}

/* ---------- vistas ---------- */
const views={
hoy(){
  const bajos=D.materiales.filter(low),atr=D.ordenes.filter(o=>situacion(o).k==='bad'),pv=D.ordenes.filter(o=>situacion(o).k==='warn');
  const items=[
    ...atr.map(o=>({k:'bad',t:`${op(o.id)} · ${o.cliente} está atrasada`,s:`Debía entregarse el ${fecha(o.entrega)} y sigue en ${ESTADOS[o.estado]}.`,a:`data-orden="${o.id}"`,b:'Ver orden'})),
    ...bajos.map(m=>({k:'bad',t:`${m.nombre}: quedan ${fmt(m.stock)} ${m.unidad}`,s:`El mínimo es ${fmt(m.min)} ${m.unidad}. Sugerido comprar ${fmt(sugerido(m))} ${m.unidad}.`,a:`data-tab="compras"`,b:'Ir a compras'})),
    ...pv.map(o=>({k:'warn',t:`${op(o.id)} · ${o.cliente}: ${situacion(o).t.toLowerCase()}`,s:`Está en ${ESTADOS[o.estado]}.`,a:`data-orden="${o.id}"`,b:'Ver orden'}))];
  const curso=D.ordenes.filter(o=>o.estado<4);
  return `<header class="head"><div><h1>Hoy</h1><p>${fecha(hoy())} · Lo que necesita atención primero</p></div></header>
  <section class="panel"><h2>Para atender <span class="count">${items.length}</span></h2>
   ${items.length?`<ul class="alerts">${items.map(i=>`<li class="alert a-${i.k}"><div><b>${esc(i.t)}</b><p>${esc(i.s)}</p></div><button class="btn ghost sm" type="button" ${i.a}>${i.b}</button></li>`).join('')}</ul>`:empty('Todo en orden','No hay órdenes atrasadas ni materiales bajo el mínimo.')}
  </section>
  <section class="panel"><h2>Órdenes en curso <span class="count">${curso.length}</span></h2>
   ${curso.length?listaOrdenes(curso):empty('No hay órdenes en curso','Registra un pedido desde Órdenes.')}</section>`},

ordenes(){
  const F={curso:['En curso',o=>o.estado<4],atrasadas:['Atrasadas',o=>situacion(o).k==='bad'],terminadas:['Terminadas',o=>o.estado===4||o.estado===5],canceladas:['Canceladas',o=>o.estado===CANCELADA],todas:['Todas',()=>true]};
  const lista=D.ordenes.filter(F[ui.filtro][1]).slice().reverse();
  return `<header class="head"><div><h1>Órdenes de producción</h1><p>Del pedido del cliente a la entrega</p></div>
   ${can('pedido')?`<button class="btn" type="button" data-act="nuevo">${ui.nuevo?'Cerrar':'Nuevo pedido'}</button>`:''}</header>
  ${ui.nuevo&&can('pedido')?`<form class="panel" id="fPed"><h2>Nuevo pedido</h2><div class="form">
    ${field('pCli','Cliente','<input id="pCli" required maxlength="80" placeholder="Ej. I.E. Santa Rosa" autocomplete="off">')}
    ${field('pProd','Producto',`<select id="pProd">${opts(D.productos.map((p,i)=>[i,p.n]))}</select>`)}
    ${field('pCant','Cantidad','<input id="pCant" type="number" inputmode="numeric" min="1" max="10000" step="1" value="20" required>')}
    ${field('pFec','Fecha de entrega',`<input id="pFec" type="date" min="${hoy()}" value="${(()=>{const d=new Date();d.setDate(d.getDate()+10);return d.toISOString().slice(0,10)})()}" required>`)}
    <div class="actions"><button class="btn" type="submit">Crear orden</button></div></div>
    <p class="help" id="pEst"></p></form>`:''}
  <div class="seg" role="tablist" aria-label="Filtrar órdenes">${Object.entries(F).map(([k,[t,f]])=>`<button type="button" role="tab" aria-selected="${k===ui.filtro}" data-filtro="${k}">${t} <span>${D.ordenes.filter(f).length}</span></button>`).join('')}</div>
  <section class="panel">${lista.length?listaOrdenes(lista):empty('No hay órdenes en este filtro')}</section>`},

orden(){
  const o=ord(ui.ordenId);if(!o)return views.ordenes();
  const p=D.productos[o.producto],s=situacion(o),R=resumen(o),cerrada=o.estado>=5;
  const A=[['entregar','Entregar material','entregar'],['devolver','Devolver sobrante','devolver'],['merma','Reportar merma','merma'],['estado','Cambiar estado','estado'],['reasignar','Costurera','reasignar'],['cancelar','Cancelar orden','cancelar']];
  return `<nav class="crumb"><button type="button" class="link" data-tab="ordenes">← Órdenes</button></nav>
  <header class="head"><div><h1><span class="code">${op(o.id)}</span> ${esc(o.cliente)}</h1>
   <p>${fmt(o.cantidad)} × ${esc(p.n)} · entrega ${fecha(o.entrega)} · ${o.costurero?esc(o.costurero):'sin costurera asignada'}</p></div>
   <div class="row">${chipEstado(o.estado)}${chip(s.t,s.k)}</div></header>
  ${o.estado===CANCELADA?'':`<ol class="steps">${ESTADOS.slice(0,6).map((e,i)=>`<li class="${i<o.estado?'done':i===o.estado?'now':''}">${e}</li>`).join('')}</ol>`}
  <section class="panel"><h2>Materiales de la orden</h2>
   <div class="tablewrap"><table><thead><tr><th>Material</th><th class="r">Estimado</th><th class="r">Entregado</th><th class="r">Devuelto</th><th class="r">Merma</th><th class="r">Usado neto</th><th class="r">Diferencia</th></tr></thead><tbody>
   ${R.map(x=>{const m=mat(x.m),dif=n2(x.neto-x.est);return `<tr><td>${esc(m.nombre)}</td><td class="r num">${x.est?fmt(x.est):'—'}</td><td class="r num">${fmt(x.ent)}</td><td class="r num">${fmt(x.dev)}</td><td class="r num">${x.mer?`<b class="t-warn">${fmt(x.mer)}</b>`:'0'}</td><td class="r num">${fmt(x.neto)} ${esc(m.unidad)}</td><td class="r num">${x.est?(dif>0?`<b class="t-bad">+${fmt(dif)}</b>`:dif<0?`<span class="t-muted">${fmt(dif)} por entregar</span>`:'0'):'—'}</td></tr>`}).join('')}
   </tbody></table></div>
   <p class="help">Estimado = cantidad × consumo por unidad. Una diferencia positiva significa que se usó más material del previsto. Costo de materiales: <b class="num">${sol(costoOrden(o))}</b>.</p></section>
  ${cerrada?`<section class="panel"><p class="help">Esta orden está ${o.estado===CANCELADA?'cancelada':'entregada'}. Solo se puede ${o.estado===CANCELADA?'devolver el material que quedó en el taller':'consultar'}.</p>${o.estado===CANCELADA&&can('devolver')?`<div class="row"><button class="btn ghost" type="button" data-accion="devolver">Devolver sobrante</button></div>`:''}${ui.accion==='devolver'&&o.estado===CANCELADA?formAccion(o,'devolver'):''}</section>`:
  `<section class="panel"><h2>Registrar en esta orden</h2>
   <div class="seg acts" role="group" aria-label="Acciones de la orden">${A.map(([k,t,perm])=>`<button type="button" data-accion="${k}" aria-pressed="${ui.accion===k}" ${can(perm)?'':'disabled title="Tu rol no tiene permiso"'} class="${k==='cancelar'?'danger':''}">${t}</button>`).join('')}</div>
   ${A.some(a=>!can(a[2]))?`<p class="help">Las acciones en gris no corresponden a tu rol (${esc(user().rol)}).</p>`:''}
   ${ui.accion?formAccion(o,ui.accion):`<p class="help">Elige qué pasó con la orden. Cada registro queda en el historial con fecha y usuario.</p>`}</section>`}
  <section class="panel"><h2>Historial</h2><ol class="timeline">${[...o.hist.map(h=>({f:h.f,html:`${chipEstado(h.e)} ${esc(h.nota)}`,u:h.u})),...D.movs.filter(x=>x.orden===o.id).map(x=>({f:x.f,html:`${chip(TIPO[x.tipo][0],TIPO[x.tipo][1])} ${fmt(x.cant)} ${esc(mat(x.mat).unidad)} de ${esc(mat(x.mat).nombre)}${x.nota?' · '+esc(x.nota):''}${x.anulado?' <span class="t-muted">(anulado)</span>':''}`,u:x.u,anul:x.anulado}))].sort((a,b)=>a.f<b.f?1:-1).map(h=>`<li class="${h.anul?'anul':''}"><time>${fecha(h.f)}</time><div>${h.html}<small>${esc(h.u)}</small></div></li>`).join('')}</ol></section>`},

materiales(){
  return `<header class="head"><div><h1>Materiales</h1><p>Telas, insumos, empaques y consumibles con su stock mínimo</p></div></header>
  <section class="panel"><div class="tablewrap"><table><thead><tr><th>Material</th><th>Tipo</th><th>Stock</th><th class="r">Mínimo</th><th>Estado</th><th></th></tr></thead><tbody>
  ${D.materiales.map(m=>`<tr><td><b>${esc(m.nombre)}</b><br><span class="code">MAT-${pad(m.id).padStart(3,'0')}</span></td><td>${esc(m.tipo)}</td><td>${stockCell(m)}</td><td class="r num">${fmt(m.min)}</td><td>${low(m)?chip('Reponer','bad'):chip('Disponible','ok')}</td>
   <td class="r nowrap"><button class="btn ghost sm" type="button" data-kardex="${m.id}">Kardex</button> ${can('ajustar')?`<button class="btn ghost sm" type="button" data-ajuste="${m.id}">Ajustar</button>`:''}</td></tr>
   ${ui.ajuste===m.id?`<tr class="inline"><td colspan="6">${formAjuste(m)}</td></tr>`:''}`).join('')}
  </tbody></table></div>
  ${can('ajustar')?'':'<p class="help">Los ajustes de inventario solo los hace el administrador.</p>'}</section>
  ${can('material')?`<form class="panel" id="fMat"><h2>Registrar material nuevo</h2><div class="form">
   ${field('mNom','Nombre','<input id="mNom" required maxlength="60" placeholder="Ej. Cartón 40×30" autocomplete="off">')}
   ${field('mTipo','Tipo',`<select id="mTipo">${opts([['Tela','Tela'],['Insumo','Insumo'],['Empaque','Empaque'],['Consumible','Consumible']])}</select>`)}
   ${field('mUni','Unidad','<input id="mUni" required maxlength="10" value="unidades">')}
   ${field('mMin','Stock mínimo','<input id="mMin" type="number" inputmode="decimal" min="0" step="0.1" value="5" required>','Cuando el stock llegue aquí, el sistema avisa.')}
   ${field('mPre','Precio de referencia (S/)','<input id="mPre" type="number" inputmode="decimal" min="0" step="0.01" value="0">')}
   <div class="actions"><button class="btn" type="submit">Guardar material</button></div></div>
   <p class="help">El material empieza con stock 0. Para sumarle stock, registra la compra en Compras.</p></form>`:''}`},

compras(){
  const sug=D.materiales.map(m=>({m,nec:pendiente(m.id),s:sugerido(m)})).filter(x=>low(x.m)||x.nec>x.m.stock);
  return `<header class="head"><div><h1>Compras</h1><p>Lo que se recibe suma al stock y queda en el kardex</p></div></header>
  <section class="panel"><h2>Lista de compras sugerida <span class="count">${sug.length}</span></h2>
   ${sug.length?`<div class="tablewrap"><table><thead><tr><th>Material</th><th class="r">Stock</th><th class="r">Mínimo</th><th class="r">Falta para órdenes</th><th class="r">Comprar</th><th></th></tr></thead><tbody>
   ${sug.map(x=>`<tr><td>${esc(x.m.nombre)}</td><td class="r num">${fmt(x.m.stock)}</td><td class="r num">${fmt(x.m.min)}</td><td class="r num">${fmt(x.nec)}</td><td class="r num"><b>${fmt(x.s)} ${esc(x.m.unidad)}</b></td><td class="r">${can('compra')?`<button class="btn ghost sm" type="button" data-precompra="${x.m.id}" data-cant="${x.s}">Registrar</button>`:''}</td></tr>`).join('')}</tbody></table></div>
   <p class="help">Sugerido = dos veces el mínimo + lo que aún necesitan las órdenes en curso − el stock actual.</p>`:empty('No hace falta comprar nada por ahora')}</section>
  ${can('compra')?`<form class="panel" id="fCom"><h2>Registrar compra recibida</h2><div class="form">
   ${field('cProv','Proveedor',`<select id="cProv">${opts(D.proveedores.map(p=>[p,p]))}</select>`)}
   ${field('cMat','Material',`<select id="cMat">${opts(D.materiales.map(m=>[m.id,`${m.nombre} (${m.unidad})`]),ui.precompra)}</select>`)}
   ${field('cCant','Cantidad recibida',`<input id="cCant" type="number" inputmode="decimal" min="0.1" step="0.1" value="${ui.precant||10}" required>`)}
   ${field('cRech','De esa cantidad, rechazada por falla','<input id="cRech" type="number" inputmode="decimal" min="0" step="0.1" value="0">','No entra al stock. Se devuelve al proveedor.')}
   ${field('cPre','Precio unitario (S/)',`<input id="cPre" type="number" inputmode="decimal" min="0" step="0.01" value="${ui.precompra?mat(ui.precompra).precio:7.5}">`)}
   <div class="actions"><button class="btn" type="submit">Registrar entrada</button></div></div></form>`:`<section class="panel">${noPerm('registrar compras')}</section>`}
  <section class="panel"><h2>Últimas entradas</h2>${tablaMovs(D.movs.filter(x=>x.tipo==='ENTRADA').slice(-8).reverse(),{mat:true})}</section>`},

kardex(){
  const m=mat(ui.kardex)||D.materiales[0],k=D.movs.filter(x=>x.mat===m.id);
  let saldo=n2(m.stock-k.reduce((a,x)=>a+x.efecto,0));const ini=saldo;
  const rows=k.map(x=>{saldo=n2(saldo+x.efecto);return{x,saldo}}).reverse();
  return `<header class="head"><div><h1>Kardex</h1><p>Cada entrada y salida del material, con su saldo y la orden a la que fue</p></div></header>
  <section class="panel"><div class="form one">${field('tM','Material',`<select id="tM">${opts(D.materiales.map(x=>[x.id,x.nombre]),m.id)}</select>`)}</div>
   <div class="facts"><div><span>Stock actual</span><b class="num">${fmt(m.stock)} ${esc(m.unidad)}</b></div><div><span>Mínimo</span><b class="num">${fmt(m.min)}</b></div><div><span>Movimientos</span><b class="num">${k.length}</b></div></div>
   <div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th class="r">Cantidad</th><th class="r">Saldo</th><th>Orden</th><th>Detalle</th><th></th></tr></thead><tbody>
   ${rows.map(({x,saldo})=>`<tr class="${x.anulado?'anul':''}"><td class="code nowrap">${fecha(x.f)}</td><td>${chip(TIPO[x.tipo][0],TIPO[x.tipo][1])}</td><td class="r num">${x.efecto>0?'+':x.efecto<0?'−':''}${fmt(Math.abs(x.efecto)||x.cant)}${x.efecto===0?' <small class="t-muted">sin efecto</small>':''}</td><td class="r num">${fmt(saldo)}</td><td class="nowrap">${x.orden?`<button class="link code" type="button" data-orden="${x.orden}">${op(x.orden)}</button>`:''}</td><td>${esc(x.nota)}<br><small class="t-muted">${esc(x.u)}</small></td>
    <td class="r">${!x.anulado&&x.tipo!=='ANULACIÓN'&&can('anular')?(ui.confirm==='anular'+x.id?`<form class="confirm" data-anular="${x.id}"><input name="mot" required maxlength="80" placeholder="Motivo de la anulación" aria-label="Motivo de la anulación"><button class="btn danger sm" type="submit">Anular</button><button class="btn ghost sm" type="button" data-act="nocancel">Volver</button></form>`:`<button class="btn ghost sm" type="button" data-confirm="anular${x.id}">Anular</button>`):''}</td></tr>`).join('')}
   <tr><td class="code">—</td><td colspan="2">Saldo inicial</td><td class="r num">${fmt(ini)}</td><td colspan="3"></td></tr></tbody></table></div>
   <p class="help">Nada se borra: un registro equivocado se anula y el sistema crea el movimiento contrario. La merma en taller no cambia el stock del almacén porque ese material ya había salido a la orden.</p></section>`},

reportes(){
  const os=D.ordenes.filter(o=>o.estado!==CANCELADA&&resumen(o).some(x=>x.ent>0));
  const filas=os.map(o=>{const R=resumen(o).filter(x=>mat(x.m).tipo==='Tela'),neto=n2(R.reduce((a,x)=>a+x.neto,0)),est=n2(R.reduce((a,x)=>a+x.est,0)),mer=n2(R.reduce((a,x)=>a+x.mer,0));
    return{o,neto,est,mer,pct:neto?mer/neto*100:0,dif:n2(neto-est),costo:costoOrden(o)}});
  const porC={};filas.forEach(f=>{const c=f.o.costurero||'Sin asignar';porC[c]=porC[c]||{neto:0,mer:0,n:0};porC[c].neto+=f.neto;porC[c].mer+=f.mer;porC[c].n++});
  return `<header class="head"><div><h1>Reportes</h1><p>Merma, consumo y costo de materiales</p></div></header>
  <section class="panel"><h2>Merma y consumo de tela por orden</h2>
   ${filas.length?`<div class="tablewrap"><table><thead><tr><th>Orden</th><th>Costurera</th><th class="r">Estimado</th><th class="r">Usado neto</th><th class="r">Diferencia</th><th class="r">Merma</th><th class="r">% merma</th><th class="r">Costo materiales</th></tr></thead><tbody>
   ${filas.map(f=>`<tr><td><button class="link" type="button" data-orden="${f.o.id}"><span class="code">${op(f.o.id)}</span> ${esc(f.o.cliente)}</button></td><td>${esc(f.o.costurero||'—')}</td><td class="r num">${fmt(f.est)} m</td><td class="r num">${fmt(f.neto)} m</td><td class="r num">${f.dif>0?`<b class="t-bad">+${fmt(f.dif)}</b>`:fmt(f.dif)}</td><td class="r num">${fmt(f.mer)} m</td><td class="r num">${f.pct>=5?`<b class="t-bad">${fmt(f.pct)} %</b>`:fmt(f.pct)+' %'}</td><td class="r num">${sol(f.costo)}</td></tr>`).join('')}</tbody></table></div>
   <p class="help">Se marca en rojo la merma de 5 % o más y el consumo por encima de lo estimado.</p>`:empty('Todavía no hay órdenes con material entregado')}</section>
  <section class="panel"><h2>Merma por costurera</h2>
   ${Object.keys(porC).length?`<div class="tablewrap"><table><thead><tr><th>Costurera</th><th class="r">Órdenes</th><th class="r">Tela usada</th><th class="r">Merma</th><th class="r">% merma</th></tr></thead><tbody>
   ${Object.entries(porC).map(([c,v])=>`<tr><td>${esc(c)}</td><td class="r num">${v.n}</td><td class="r num">${fmt(v.neto)} m</td><td class="r num">${fmt(v.mer)} m</td><td class="r num">${fmt(v.neto?v.mer/v.neto*100:0)} %</td></tr>`).join('')}</tbody></table></div>`:empty('Sin datos')}</section>`}
};

function listaOrdenes(lista){return `<ul class="olist">${lista.map(o=>{const s=situacion(o),p=D.productos[o.producto];
  return `<li><button type="button" data-orden="${o.id}"><span class="code">${op(o.id)}</span><span class="oc"><b>${esc(o.cliente)}</b><small>${fmt(o.cantidad)} × ${esc(p.n)} · ${fecha(o.entrega)}</small></span><span class="row">${chipEstado(o.estado)}${s.k==='bad'||s.k==='warn'?chip(s.t,s.k):''}</span></button></li>`}).join('')}</ul>`}

function tablaMovs(list){if(!list.length)return empty('Sin movimientos');
  return `<div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Material</th><th class="r">Cantidad</th><th>Detalle</th></tr></thead><tbody>${list.map(x=>`<tr class="${x.anulado?'anul':''}"><td class="code nowrap">${fecha(x.f)}</td><td>${esc(mat(x.mat).nombre)}</td><td class="r num">+${fmt(x.cant)} ${esc(mat(x.mat).unidad)}</td><td>${esc(x.nota)}<br><small class="t-muted">${esc(x.u)}</small></td></tr>`).join('')}</tbody></table></div>`}

function formAjuste(m){return `<form class="subform" data-ajustar="${m.id}"><h3>Ajustar inventario de ${esc(m.nombre)}</h3><div class="form">
  ${field('aCont','Cantidad contada físicamente',`<input id="aCont" name="cont" type="number" inputmode="decimal" min="0" step="0.1" required value="${m.stock}">`,`El sistema dice ${fmt(m.stock)} ${esc(m.unidad)}.`)}
  ${field('aMot','Motivo',`<select id="aMot" name="mot">${opts(MOTIVOS_AJUSTE.map(x=>[x,x]))}</select>`)}
  ${field('aNota','Detalle (opcional)','<input id="aNota" name="nota" maxlength="80" placeholder="Ej. bolsas mojadas por la lluvia">')}
  <div class="actions"><button class="btn" type="submit">Guardar ajuste</button><button class="btn ghost" type="button" data-act="noajuste">Cancelar</button></div></div></form>`}

function formAccion(o,a){
  const R=resumen(o),conNeto=R.filter(x=>x.neto>0);
  const matSel=list=>`<select id="xMat" name="mat">${opts(list.map(m=>[m.id,`${m.nombre} · ${fmt(m.stock)} ${m.unidad} en almacén`]))}</select>`;
  if(a==='entregar'){const sugM=R.find(x=>x.est>x.neto);return `<form class="subform" data-form="entregar"><div class="form">
    ${field('xMat','Material',`<select id="xMat" name="mat">${opts(D.materiales.map(m=>[m.id,`${m.nombre} · ${fmt(m.stock)} ${m.unidad} en almacén`]),sugM?sugM.m:'')}</select>`)}
    ${field('xCant','Cantidad','<input id="xCant" name="cant" type="number" inputmode="decimal" min="0.1" step="0.1" required value="'+(sugM?n2(sugM.est-sugM.neto):1)+'">',sugM?`Faltan ${fmt(n2(sugM.est-sugM.neto))} ${esc(mat(sugM.m).unidad)} de ${esc(mat(sugM.m).nombre)} según lo estimado.`:'')}
    <div class="actions"><button class="btn" type="submit">Entregar</button></div></div></form>`}
  if(a==='devolver'){if(!conNeto.length)return `<p class="help">Esta orden no tiene material entregado para devolver.</p>`;
    return `<form class="subform" data-form="devolver"><div class="form">
    ${field('xMat','Material que regresa al almacén',`<select id="xMat" name="mat">${opts(conNeto.map(x=>[x.m,`${mat(x.m).nombre} · ${fmt(x.neto)} ${mat(x.m).unidad} en la orden`]))}</select>`)}
    ${field('xCant','Cantidad','<input id="xCant" name="cant" type="number" inputmode="decimal" min="0.1" step="0.1" required value="1">','El stock del almacén sube.')}
    <div class="actions"><button class="btn" type="submit">Registrar devolución</button></div></div></form>`}
  if(a==='merma'){if(!conNeto.length)return `<p class="help">Primero entrega material a la orden; la merma se reporta sobre lo entregado.</p>`;
    return `<form class="subform" data-form="merma"><div class="form">
    ${field('xMat','Material',`<select id="xMat" name="mat">${opts(conNeto.map(x=>[x.m,`${mat(x.m).nombre} · ${fmt(x.neto)} ${mat(x.m).unidad} entregados`]))}</select>`)}
    ${field('xCant','Cantidad perdida','<input id="xCant" name="cant" type="number" inputmode="decimal" min="0.1" step="0.1" required value="1">')}
    ${field('xMot','Motivo',`<select id="xMot" name="mot">${opts(MOTIVOS_MERMA.map(x=>[x,x]))}</select>`)}
    ${field('xNota','Detalle (opcional)','<input id="xNota" name="nota" maxlength="80" placeholder="Ej. tela con hilos corridos">')}
    <div class="actions"><button class="btn" type="submit">Reportar merma</button></div></div>
    <p class="help">La merma no cambia el stock del almacén: ese material ya salió a la orden. Queda registrada para el reporte de merma.</p></form>`}
  if(a==='estado'){const sig=o.estado+1,ant=o.estado-1;return `<form class="subform" data-form="estado"><div class="form">
    ${field('xDir','Cambio',`<select id="xDir" name="dir">${sig<=5?`<option value="${sig}">Avanzar a ${ESTADOS[sig]}</option>`:''}${ant>=0?`<option value="${ant}">Regresar a ${ESTADOS[ant]} (reproceso)</option>`:''}</select>`)}
    ${field('xNota','Nota','<input id="xNota" name="nota" maxlength="80" placeholder="Ej. 5 faldas con costura torcida">','Si regresas de etapa, explica por qué.')}
    <div class="actions"><button class="btn" type="submit">Guardar</button></div></div></form>`}
  if(a==='reasignar')return `<form class="subform" data-form="reasignar"><div class="form">
    ${field('xCos','Costurera',`<select id="xCos" name="cos"><option value="">Sin asignar</option>${opts(D.costureros.map(c=>[c,c]),o.costurero)}</select>`)}
    ${field('xNota','Motivo del cambio','<input id="xNota" name="nota" maxlength="80" placeholder="Ej. la costurera está con otro pedido">')}
    <div class="actions"><button class="btn" type="submit">Guardar</button></div></div></form>`;
  if(a==='cancelar')return `<form class="subform danger-zone" data-form="cancelar"><div class="form">
    ${field('xNota','Motivo de la cancelación','<input id="xNota" name="nota" required maxlength="80" placeholder="Ej. el cliente anuló el pedido">')}
    <div class="actions"><button class="btn danger" type="submit">Cancelar la orden</button><button class="btn ghost" type="button" data-accion="">Volver</button></div></div>
    <p class="help">La orden no se borra: queda como cancelada en el historial. ${conNeto.length?'Después registra la devolución del material que quedó en el taller.':''}</p></form>`;
  return ''}

/* ---------- render ---------- */
function render(){renderNav();$('#view').innerHTML=views[tab]();
  const pP=$('#pProd');if(pP){const upd=()=>{const p=D.productos[+pP.value],c=+$('#pCant').value||0;$('#pEst').textContent='Material estimado: '+p.receta.map(x=>`${fmt(n2(x.c*c))} ${mat(x.m).unidad} de ${mat(x.m).nombre}`).join(' + ')};pP.onchange=upd;$('#pCant').oninput=upd;upd()}}
function err(input,msg){const el=typeof input==='string'?$(input):input;if(el){el.setAttribute('aria-invalid','true');el.focus()}toast(msg,'bad')}

/* ---------- eventos ---------- */
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)go(b.dataset.tab)});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();if($('#lgPass').value!=='demo123'){$('#lgErr').hidden=false;$('#lgPass').setAttribute('aria-invalid','true');return}D.user=+$('#lgUser').value;save();tab='hoy';boot()});
$('#logout').onclick=()=>{D.user=null;save();boot()};
$('#reset').onclick=()=>{const u=D.user;D=seed();D.user=u;save();go('hoy');toast('Datos de ejemplo restablecidos')};

$('#view').addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t||t.disabled)return;const d=t.dataset;
  if(d.tab){go(d.tab);return}
  if(d.orden){go('orden',{ordenId:+d.orden});return}
  if(d.filtro){ui.filtro=d.filtro;render();return}
  if(d.accion!==undefined){ui.accion=ui.accion===d.accion||!d.accion?null:d.accion;render();const f=$('.subform input,.subform select');if(f)f.focus();return}
  if(d.kardex){go('kardex',{kardex:+d.kardex});return}
  if(d.ajuste){ui.ajuste=ui.ajuste===+d.ajuste?null:+d.ajuste;render();const f=$('#aCont');if(f)f.focus();return}
  if(d.precompra){ui.precompra=+d.precompra;ui.precant=+d.cant;render();$('#cCant').focus();return}
  if(d.confirm){ui.confirm=d.confirm;render();const f=$('.confirm input');if(f)f.focus();return}
  if(d.act==='nocancel'){ui.confirm=null;render();return}
  if(d.act==='noajuste'){ui.ajuste=null;render();return}
  if(d.act==='nuevo'){ui.nuevo=!ui.nuevo;render();if(ui.nuevo)$('#pCli').focus();return}
});
$('#view').addEventListener('change',e=>{if(e.target.id==='tM'){ui.kardex=+e.target.value;render()}});
$('#view').addEventListener('input',e=>e.target.removeAttribute('aria-invalid'));

$('#view').addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=n=>f.elements[n]?f.elements[n].value:'';
  /* nuevo pedido */
  if(f.id==='fPed'){const cl=$('#pCli').value.trim(),c=+$('#pCant').value,fe=$('#pFec').value;
    if(!cl)return err('#pCli','Escribe el nombre del cliente');
    if(!(c>=1)||!Number.isInteger(c))return err('#pCant','La cantidad debe ser un número entero mayor a 0');
    if(!fe||fe<hoy())return err('#pFec','La fecha de entrega no puede ser anterior a hoy');
    const nid=Math.max(0,...D.ordenes.map(o=>o.id))+1;
    D.ordenes.push({id:nid,cliente:cl,producto:+$('#pProd').value,cantidad:c,entrega:fe,estado:0,costurero:'',hist:[{f:now(),e:0,nota:'Orden creada desde el pedido',u:user().n}]});
    ui.nuevo=false;save();toast(`Orden ${op(nid)} creada`,'ok');go('orden',{ordenId:nid});return}
  /* material */
  if(f.id==='fMat'){const n=$('#mNom').value.trim(),mn=+$('#mMin').value;
    if(!n)return err('#mNom','Escribe el nombre del material');
    if(D.materiales.some(m=>m.nombre.toLowerCase()===n.toLowerCase()))return err('#mNom','Ya existe un material con ese nombre');
    if(!(mn>=0))return err('#mMin','El stock mínimo no puede ser negativo');
    D.materiales.push({id:Math.max(...D.materiales.map(m=>m.id))+1,nombre:n,tipo:$('#mTipo').value,unidad:$('#mUni').value.trim()||'unidades',min:mn,precio:+$('#mPre').value||0,stock:0});
    save();render();toast(`${n} registrado. Regístrale una compra para sumar stock.`,'ok');return}
  /* compra */
  if(f.id==='fCom'){const m=mat($('#cMat').value),c=+$('#cCant').value,r=+$('#cRech').value||0,pr=+$('#cPre').value||0;
    if(!(c>0))return err('#cCant','La cantidad recibida debe ser mayor a 0');
    if(r<0||r>c)return err('#cRech','Lo rechazado no puede ser mayor a lo recibido');
    const ac=n2(c-r);if(pr>0)m.precio=pr;
    if(ac>0)addMov(m.id,'ENTRADA',ac,ac,null,`Compra a ${$('#cProv').value}${pr?' · '+sol(pr)+' c/u':''}${r?` · ${fmt(r)} ${m.unidad} rechazados por falla`:''}`);
    ui.precompra=null;ui.precant=null;save();render();
    toast(ac>0?`Entrada registrada: +${fmt(ac)} ${m.unidad} de ${m.nombre}${r?` (${fmt(r)} rechazados)`:''}`:'Todo lo recibido fue rechazado; no se sumó stock','ok');return}
  /* ajuste */
  if(f.dataset.ajustar){const m=mat(f.dataset.ajustar),cont=+v('cont');
    if(!(cont>=0))return err(f.elements.cont,'La cantidad contada no puede ser negativa');
    const dif=n2(cont-m.stock);if(dif===0){toast('El conteo coincide con el sistema; no hay nada que ajustar');ui.ajuste=null;render();return}
    addMov(m.id,'AJUSTE',Math.abs(dif),dif,null,`${v('mot')} · contado ${fmt(cont)}, el sistema decía ${fmt(m.stock)}${v('nota').trim()?' · '+v('nota').trim():''}`);
    ui.ajuste=null;save();render();toast(`Ajuste guardado: ${dif>0?'+':''}${fmt(dif)} ${m.unidad} de ${m.nombre}`,'ok');return}
  /* anulación */
  if(f.dataset.anular){const x=D.movs.find(y=>y.id===+f.dataset.anular),mot=v('mot').trim();
    if(!mot)return err(f.elements.mot,'Escribe el motivo de la anulación');
    const m=mat(x.mat);if(m.stock-x.efecto<0)return err(f.elements.mot,`No se puede anular: el stock quedaría en negativo (${fmt(n2(m.stock-x.efecto))} ${m.unidad})`);
    x.anulado=true;addMov(x.mat,'ANULACIÓN',x.cant,-x.efecto,x.orden,`Anula el movimiento del ${fecha(x.f)} · ${mot}`);
    ui.confirm=null;save();render();toast('Movimiento anulado. Quedan ambos registros en el kardex.','ok');return}
  /* acciones de la orden */
  const o=ord(ui.ordenId),kind=f.dataset.form;if(!o||!kind)return;
  const cant=+v('cant'),m=v('mat')?mat(v('mat')):null,R=resumen(o),rx=m?R.find(x=>x.m===m.id):null;
  if(['entregar','devolver','merma'].includes(kind)&&!(cant>0))return err(f.elements.cant,'La cantidad debe ser mayor a 0');
  if(kind==='entregar'){
    if(cant>m.stock)return err(f.elements.cant,`Stock insuficiente: solo hay ${fmt(m.stock)} ${m.unidad} de ${m.nombre}`);
    const extra=rx&&rx.est&&rx.neto+cant>rx.est;
    addMov(m.id,'SALIDA',cant,-cant,o.id,extra?'Entrega adicional (supera lo estimado)':'Entrega a la orden');
    save();ui.accion=null;render();toast(`Entregado ${fmt(cant)} ${m.unidad} a ${op(o.id)}${low(m)?` · ${m.nombre} llegó al mínimo`:''}`,low(m)?'bad':'ok');return}
  if(kind==='devolver'){
    if(cant>rx.neto)return err(f.elements.cant,`La orden solo tiene ${fmt(rx.neto)} ${m.unidad} de ${m.nombre}`);
    addMov(m.id,'DEVOLUCION',cant,cant,o.id,'Sobrante devuelto por el taller');
    save();ui.accion=null;render();toast(`Devolución registrada: +${fmt(cant)} ${m.unidad} al almacén`,'ok');return}
  if(kind==='merma'){
    if(cant>n2(rx.neto-rx.mer))return err(f.elements.cant,`La merma no puede superar lo entregado sin merma (${fmt(n2(rx.neto-rx.mer))} ${m.unidad})`);
    addMov(m.id,'MERMA',cant,0,o.id,v('mot')+(v('nota').trim()?' · '+v('nota').trim():''));
    save();ui.accion=null;render();toast(`Merma registrada: ${fmt(cant)} ${m.unidad} de ${m.nombre}`,'ok');return}
  if(kind==='estado'){const to=+v('dir'),nota=v('nota').trim();
    if(to<o.estado&&!nota)return err(f.elements.nota,'Explica por qué regresa de etapa');
    if(to===2&&!o.costurero)return err(f.elements.dir,'Asigna una costurera antes de pasar a confección (botón Costurera)');
    o.estado=to;o.hist.push({f:now(),e:to,nota:nota||(to===2?'Asignada a '+o.costurero:'Cambio de estado'),u:user().n});
    save();ui.accion=null;render();toast(`${op(o.id)} pasó a ${ESTADOS[to]}`,'ok');return}
  if(kind==='reasignar'){const c=v('cos');if(c===o.costurero){ui.accion=null;render();return}
    o.hist.push({f:now(),e:o.estado,nota:`Costurera: ${o.costurero||'sin asignar'} → ${c||'sin asignar'}${v('nota').trim()?' · '+v('nota').trim():''}`,u:user().n});o.costurero=c;
    save();ui.accion=null;render();toast('Costurera actualizada','ok');return}
  if(kind==='cancelar'){const nota=v('nota').trim();if(!nota)return err(f.elements.nota,'Escribe el motivo de la cancelación');
    o.hist.push({f:now(),e:CANCELADA,nota:'Cancelada · '+nota,u:user().n});o.estado=CANCELADA;
    save();ui.accion=R.some(x=>x.neto>0)?'devolver':null;render();toast(`${op(o.id)} cancelada${ui.accion?'. Registra la devolución del material.':''}`,'ok');return}
});

function boot(){const on=D.user!==null&&D.user!==undefined&&USERS[D.user];$('#login').hidden=!!on;$('#app').hidden=!on;if(on)render()}
boot();
