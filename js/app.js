/* ==========================================================
   app.js — Lógica del prototipo
   - Persistencia temporal en localStorage (clave 'mv-proto')
   - Vistas: panel, materiales, compras, órdenes, trazabilidad
   - Reglas: stock mínimo, kardex, estados de la orden,
     validación de stock al entregar material a una orden
   ========================================================== */
let D;try{D=JSON.parse(localStorage.getItem('mv-proto'))||seed()}catch(e){D=seed()}
const save=()=>{try{localStorage.setItem('mv-proto',JSON.stringify(D))}catch(e){}};
const $=s=>document.querySelector(s);
const now=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const mat=id=>D.materiales.find(m=>m.id===id);
const op=id=>'OP-'+String(id).padStart(3,'0');
const low=m=>m.stock<=m.min;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}
let tab='panel';
const TABS=[['panel','Panel'],['materiales','Materiales'],['compras','Compras'],['ordenes','Órdenes'],['traza','Trazabilidad']];
function renderNav(){const n=D.materiales.filter(low).length;
  $('#nav').innerHTML=TABS.map(([k,l])=>`<button type="button" data-tab="${k}" ${k===tab?'aria-current="page"':''}>${l}${k==='materiales'&&n?`<span class="badge">${n}</span>`:''}</button>`).join('');
  $('#who').innerHTML=`<b>${esc(USERS[D.user].n)}</b><br>${esc(USERS[D.user].rol)}`}
function chipEstado(i){const cls=i>=4?'c-ok':i===0?'c-warn':'c-brand';return `<span class="chip ${cls}">${ESTADOS[i]}</span>`}
function stockCell(m){const pct=Math.min(100,Math.round(m.stock/(m.min*3)*100));return `<div style="display:flex;align-items:center;gap:8px"><span class="num">${m.stock} ${m.unidad}</span><div class="bar"><i class="${low(m)?'low':''}" style="width:${pct}%"></i></div></div>`}
const views={
panel(){const bajos=D.materiales.filter(low),act=D.ordenes.filter(o=>o.estado<5);
 return `<div class="head"><div><h2>Panel de producción</h2><p>Estado actual de materiales y órdenes</p></div></div>
 <div class="kpis"><div class="kpi"><div class="v num">${act.length}</div><div class="l">Órdenes en curso</div></div>
 <div class="kpi"><div class="v num" style="color:${bajos.length?'var(--bad)':'var(--ok)'}">${bajos.length}</div><div class="l">Materiales en stock mínimo</div></div>
 <div class="kpi"><div class="v num">${D.materiales.length}</div><div class="l">Materiales registrados</div></div>
 <div class="kpi"><div class="v num">${D.movs.length}</div><div class="l">Movimientos en el kardex</div></div></div>
 <div class="grid2"><div class="panel"><h3>Alertas de stock mínimo</h3>${bajos.length?`<div class="tablewrap"><table><tr><th>Material</th><th>Stock</th><th class="r">Mínimo</th></tr>${bajos.map(m=>`<tr><td>${esc(m.nombre)}</td><td>${stockCell(m)}</td><td class="r num">${m.min}</td></tr>`).join('')}</table></div>`:'<p class="hint">Todos los materiales están sobre su stock mínimo.</p>'}</div>
 <div class="panel"><h3>Órdenes de producción</h3><div class="tablewrap"><table><tr><th>Orden</th><th>Cliente</th><th>Estado</th></tr>${D.ordenes.map(o=>`<tr><td class="code">${op(o.id)}</td><td>${esc(o.cliente)}</td><td>${chipEstado(o.estado)}</td></tr>`).join('')}</table></div></div></div>`},
materiales(){return `<div class="head"><div><h2>Materiales</h2><p>Telas, insumos, empaques y consumibles con su stock mínimo</p></div></div>
 <div class="panel"><div class="tablewrap"><table><tr><th>Código</th><th>Material</th><th>Tipo</th><th>Stock</th><th class="r">Mínimo</th><th>Estado</th></tr>
 ${D.materiales.map(m=>`<tr><td class="code">MAT-${String(m.id).padStart(3,'0')}</td><td>${esc(m.nombre)}</td><td>${m.tipo}</td><td>${stockCell(m)}</td><td class="r num">${m.min}</td><td>${low(m)?'<span class="chip c-bad">Reponer</span>':'<span class="chip c-ok">Disponible</span>'}</td></tr>`).join('')}</table></div></div>
 <form class="panel" id="fMat"><h3>Registrar material</h3><div class="form">
 <div class="field"><label for="mNom">Nombre</label><input id="mNom" required placeholder="Ej. Cartón 40×30"></div>
 <div class="field"><label for="mTipo">Tipo</label><select id="mTipo"><option>Tela</option><option>Insumo</option><option>Empaque</option><option>Consumible</option></select></div>
 <div class="field"><label for="mUni">Unidad</label><input id="mUni" required value="unid."></div>
 <div class="field"><label for="mStock">Stock inicial</label><input id="mStock" type="number" min="0" step="0.1" value="0"></div>
 <div class="field"><label for="mMin">Stock mínimo</label><input id="mMin" type="number" min="0" step="0.1" value="5"></div>
 <button class="btn" type="submit">Guardar material</button></div></form>`},
compras(){return `<div class="head"><div><h2>Compras y entradas</h2><p>Cada compra suma al stock y queda en el kardex</p></div></div>
 <form class="panel" id="fCom"><h3>Registrar compra</h3><div class="form">
 <div class="field"><label for="cProv">Proveedor</label><select id="cProv">${D.proveedores.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>
 <div class="field"><label for="cMat">Material</label><select id="cMat">${D.materiales.map(m=>`<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}</select></div>
 <div class="field"><label for="cCant">Cantidad</label><input id="cCant" type="number" min="0.1" step="0.1" value="10" required></div>
 <div class="field"><label for="cPre">Precio unitario (S/)</label><input id="cPre" type="number" min="0" step="0.01" value="6.50"></div>
 <button class="btn" type="submit">Registrar entrada</button></div></form>
 <div class="panel"><h3>Últimas entradas</h3><div class="tablewrap"><table><tr><th>Fecha</th><th>Material</th><th class="r">Cantidad</th><th>Detalle</th></tr>
 ${D.movs.filter(x=>x[2]==='ENTRADA').slice().reverse().map(x=>`<tr><td class="code">${x[0]}</td><td>${esc(mat(x[1]).nombre)}</td><td class="r num">+${x[3]} ${mat(x[1]).unidad}</td><td>${esc(x[5])}</td></tr>`).join('')}</table></div></div>`},
ordenes(){return `<div class="head"><div><h2>Pedidos y órdenes de producción</h2><p>Del pedido del cliente a la entrega</p></div></div>
 ${D.ordenes.map(o=>{const p=D.productos[o.producto];return `<div class="panel">
  <div class="head"><div><h3><span class="code">${op(o.id)}</span> · ${esc(o.cliente)}</h3><p>${o.cantidad} × ${esc(p.n)} · entrega ${o.entrega}${o.costurero?' · '+esc(o.costurero):''}</p></div>${chipEstado(o.estado)}</div>
  <div class="steps">${ESTADOS.map((e,i)=>`<span class="step ${i<o.estado?'done':i===o.estado?'now':''}">${e}</span>`).join('')}</div>
  <p class="hint" style="margin:0">Tela estimada: <b class="num">${(o.cantidad*p.consumo).toFixed(1)} m</b> de ${esc(mat(p.tela).nombre)} (${p.consumo} m por unidad)</p>
  <div class="form">
   <div class="field"><label for="em${o.id}">Material a entregar</label><select id="em${o.id}">${D.materiales.map(m=>`<option value="${m.id}">${esc(m.nombre)} (${m.stock} ${m.unidad})</option>`).join('')}</select></div>
   <div class="field"><label for="ec${o.id}">Cantidad</label><input id="ec${o.id}" type="number" min="0.1" step="0.1" value="5"></div>
   <button class="btn ghost" type="button" data-entregar="${o.id}">Entregar material</button>
   <div class="field"><label for="co${o.id}">Costurero</label><select id="co${o.id}"><option value="">Sin asignar</option>${D.costureros.map(c=>`<option ${c===o.costurero?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
   <button class="btn" type="button" data-avanzar="${o.id}" ${o.estado>=5?'disabled':''}>${o.estado>=5?'Entregada':'Pasar a '+ESTADOS[o.estado+1]}</button>
  </div></div>`}).join('')}
 <form class="panel" id="fPed"><h3>Registrar pedido</h3><div class="form">
 <div class="field"><label for="pCli">Cliente</label><input id="pCli" required placeholder="Ej. I.E. Santa Rosa"></div>
 <div class="field"><label for="pProd">Producto</label><select id="pProd">${D.productos.map((p,i)=>`<option value="${i}">${esc(p.n)}</option>`).join('')}</select></div>
 <div class="field"><label for="pCant">Cantidad</label><input id="pCant" type="number" min="1" value="20" required></div>
 <div class="field"><label for="pFec">Fecha de entrega</label><input id="pFec" type="date" value="2026-11-05" required></div>
 <button class="btn" type="submit">Crear orden</button></div></form>`},
traza(){const sm=+(traza.m||3),so=+(traza.o||1),o=D.ordenes.find(x=>x.id===so)||D.ordenes[0];
 let saldo=0;const k=D.movs.filter(x=>x[1]===sm);const ini=mat(sm).stock-k.reduce((a,x)=>a+(x[2]==='ENTRADA'?x[3]:-x[3]),0);saldo=ini;
 return `<div class="head"><div><h2>Trazabilidad</h2><p>Recorrido de un material y de una orden</p></div></div>
 <div class="grid2"><div class="panel"><div class="field"><label for="tM">Kardex del material</label><select id="tM">${D.materiales.map(m=>`<option value="${m.id}" ${m.id===sm?'selected':''}>${esc(m.nombre)}</option>`).join('')}</select></div>
 <div class="tablewrap"><table><tr><th>Fecha</th><th>Tipo</th><th class="r">Cant.</th><th class="r">Saldo</th><th>Orden</th></tr>
 <tr><td class="code">—</td><td>Saldo inicial</td><td></td><td class="r num">${+ini.toFixed(2)}</td><td></td></tr>
 ${k.map(x=>{saldo+=x[2]==='ENTRADA'?x[3]:-x[3];return `<tr><td class="code">${x[0]}</td><td><span class="chip ${x[2]==='ENTRADA'?'c-ok':'c-brand'}">${x[2]}</span></td><td class="r num">${x[2]==='ENTRADA'?'+':'−'}${x[3]}</td><td class="r num">${+saldo.toFixed(2)}</td><td class="code">${x[4]?op(x[4]):''}</td></tr>`}).join('')}</table></div></div>
 <div class="panel"><div class="field"><label for="tO">Historial de la orden</label><select id="tO">${D.ordenes.map(x=>`<option value="${x.id}" ${x.id===o.id?'selected':''}>${op(x.id)} · ${esc(x.cliente)}</option>`).join('')}</select></div>
 <h3 style="font-size:15px">Materiales entregados</h3>${o.materiales.length?`<div class="tablewrap"><table><tr><th>Material</th><th class="r">Cantidad</th></tr>${o.materiales.map(x=>`<tr><td>${esc(mat(x.m).nombre)}</td><td class="r num">${x.c} ${mat(x.m).unidad}</td></tr>`).join('')}</table></div>`:'<p class="hint">Todavía no se entregaron materiales a esta orden.</p>'}
 <h3 style="font-size:15px">Estados</h3><ul class="timeline">${o.hist.map(h=>`<li><time>${h[0]}</time><span>${chipEstado(ESTADOS.indexOf(h[1]))} ${esc(h[2])}</span></li>`).join('')}</ul></div></div>`}
};
function render(){renderNav();$('#view').innerHTML=views[tab]()}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render()}});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();if($('#lgPass').value!=='demo123'){$('#lgErr').hidden=false;return}D.user=+$('#lgUser').value;save();boot()});
$('#logout').onclick=()=>{D.user=null;save();boot()};
$('#reset').onclick=()=>{const u=D.user;D=seed();D.user=u;save();render();toast('Datos de ejemplo restablecidos')};
$('#view').addEventListener('submit',e=>{e.preventDefault();const id=e.target.id;
 if(id==='fMat'){const n=$('#mNom').value.trim();if(!n){toast('Escribe el nombre del material');return}
  D.materiales.push({id:Math.max(...D.materiales.map(m=>m.id))+1,nombre:n,tipo:$('#mTipo').value,unidad:$('#mUni').value||'unid.',stock:+$('#mStock').value||0,min:+$('#mMin').value||0});toast('Material registrado')}
 if(id==='fCom'){const m=mat(+$('#cMat').value),c=+$('#cCant').value;if(!(c>0)){toast('La cantidad debe ser mayor a 0');return}
  m.stock=+(m.stock+c).toFixed(2);D.movs.push([now(),m.id,'ENTRADA',c,null,'Compra a '+$('#cProv').value]);toast(`Entrada registrada: +${c} ${m.unidad} de ${m.nombre}`)}
 if(id==='fPed'){const cl=$('#pCli').value.trim();if(!cl){toast('Escribe el nombre del cliente');return}
  const nid=Math.max(...D.ordenes.map(o=>o.id))+1;D.ordenes.push({id:nid,cliente:cl,producto:+$('#pProd').value,cantidad:+$('#pCant').value||1,entrega:$('#pFec').value,estado:0,costurero:'',materiales:[],hist:[[now(),'PENDIENTE','Orden creada desde pedido']]});toast('Orden '+op(nid)+' creada')}
 save();render()});
$('#view').addEventListener('click',e=>{
 const a=e.target.closest('[data-avanzar]'),g=e.target.closest('[data-entregar]');
 if(a){const o=D.ordenes.find(x=>x.id===+a.dataset.avanzar);const c=$('#co'+o.id).value;if(c)o.costurero=c;
  if(o.estado===1&&!o.costurero){toast('Asigna un costurero antes de pasar a confección');return}
  o.estado++;o.hist.push([now(),ESTADOS[o.estado],o.estado===2?'Asignada a '+o.costurero:'Cambio de estado']);toast(op(o.id)+' pasó a '+ESTADOS[o.estado]);save();render()}
 if(g){const o=D.ordenes.find(x=>x.id===+g.dataset.entregar),m=mat(+$('#em'+o.id).value),c=+$('#ec'+o.id).value;
  if(!(c>0)){toast('La cantidad debe ser mayor a 0');return}if(c>m.stock){toast(`Stock insuficiente: solo hay ${m.stock} ${m.unidad} de ${m.nombre}`);return}
  m.stock=+(m.stock-c).toFixed(2);D.movs.push([now(),m.id,'SALIDA',c,o.id,'Entrega a orden '+op(o.id)]);
  const ex=o.materiales.find(x=>x.m===m.id);ex?ex.c=+(ex.c+c).toFixed(2):o.materiales.push({m:m.id,c});
  toast(`Entregado ${c} ${m.unidad} a ${op(o.id)}`+(low(m)?' · alerta: stock mínimo':''));save();render()}});
$('#view').addEventListener('change',e=>{if(e.target.id==='tM'){traza.m=e.target.value;render()}if(e.target.id==='tO'){traza.o=e.target.value;render()}});
function traza(){}
function boot(){const on=D.user!==null&&D.user!==undefined;$('#login').hidden=on;$('#app').hidden=!on;if(on)render()}
boot();
