/* JS app with notifications, money format and locks */
const supabaseUrl = window.ENV_SUPABASE_URL || 'https://fapgbftyravkevqiqcww.supabase.co';
const supabaseKey = window.ENV_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGdiZnR5cmF2a2V2cWlxY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjQxNTQsImV4cCI6MjA3NjE0MDE1NH0.eOhDjVcpRoy5e8j1bZoU_K5RCkjkjRBxPTqyxwnom-U';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const toastEl = document.getElementById('toast');
function showToast(type='info', text='') {
  toastEl.className = 'toast ' + type;
  toastEl.textContent = text;
  toastEl.classList.remove('oculto');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add('oculto'), 2600);
}

async function verificarConexion() {
  const status = document.getElementById('conexion-status');
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    if (error) throw error;
    status.textContent = "✅ Conectado con Supabase correctamente";
    status.classList.add('conexion-ok');
    setTimeout(() => { status.style.transition="opacity .8s";status.style.opacity="0";
      setTimeout(() => (status.style.display="none"), 800);
    }, 2500);
  } catch (err) {
    status.textContent = "❌ Error al conectar con Supabase. Revisá tu URL y Key.";
    status.classList.add('conexion-error');
  }
}
verificarConexion();

const form = document.getElementById('repair-form');
const menu = document.getElementById('menu-principal');
const formSection = document.getElementById('form-section');
const listSection = document.getElementById('list-section');
const clientesSection = document.getElementById('clientes-section');

function hideAll(){[menu,formSection,listSection,clientesSection].forEach(s=>s.classList.add('oculto'));}

document.getElementById('btn-nueva').addEventListener('click', async () => {
  hideAll(); formSection.classList.remove('oculto');
  document.getElementById('fecha_ingreso').value = new Date().toLocaleString();
  await cargarClientesSelect();
});
document.getElementById('btn-listar').addEventListener('click', () => {
  hideAll(); listSection.classList.remove('oculto'); loadRepairs();
});
document.getElementById('btn-clientes').addEventListener('click', () => {
  hideAll(); clientesSection.classList.remove('oculto'); loadClientes();
});
document.getElementById('btn-volver-menu').addEventListener('click', () => { hideAll(); menu.classList.remove('oculto'); });
document.getElementById('btn-volver-menu-2').addEventListener('click', () => { hideAll(); menu.classList.remove('oculto'); });
document.getElementById('btn-volver-menu-3').addEventListener('click', () => { hideAll(); menu.classList.remove('oculto'); });

const precioInput = document.getElementById('precio');
const seniaInput = document.getElementById('senia');
const saldoInput = document.getElementById('saldo');
function actualizarSaldo(){ const p=parseFloat(precioInput.value)||0; const s=parseFloat(seniaInput.value)||0; saldoInput.value = Math.round(Math.max(0,p-s)); }
precioInput.addEventListener('input', actualizarSaldo);
seniaInput.addEventListener('input', actualizarSaldo);

async function cargarClientesSelect() {
  const select = document.getElementById('cliente-select');
  const { data, error } = await supabase.from('clients').select('id, nombre, apellido, telefono').order('apellido', { ascending: true });
  if (error) return console.error(error);
  select.innerHTML = '<option value="">-- Nuevo cliente --</option>';
  data.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.apellido}, ${c.nombre} (${c.telefono || ''})`;
    select.appendChild(opt);
  });
}
document.getElementById('cliente-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  if (!id) return ['nombre','apellido','direccion','telefono','telefono_contacto'].forEach(f => document.getElementById(f).value = '');
  const { data } = await supabase.from('clients').select('*').eq('id', id).single();
  if (data) {
    document.getElementById('nombre').value = data.nombre || '';
    document.getElementById('apellido').value = data.apellido || '';
    document.getElementById('direccion').value = data.direccion || '';
    document.getElementById('telefono').value = data.telefono || '';
    document.getElementById('telefono_contacto').value = data.telefono_contacto || '';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let clienteId = document.getElementById('cliente-select').value;
  if (!clienteId) {
    const nuevoCliente = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      direccion: direccion.value.trim(),
      telefono: telefono.value.trim(),
      telefono_contacto: telefono_contacto.value.trim()
    };
    const { data: nuevo, error: errCliente } = await supabase.from('clients').insert([nuevoCliente]).select().single();
    if (errCliente) { showToast('error','Error al crear cliente'); return; }
    clienteId = nuevo.id;
  }

  const celular = {
    modelo: modelo.value.trim(),
    imei: imei.value.trim(),
    color: color.value.trim(),
    estado: estado.value.trim(),
    problema: problema.value.trim(),
    precio: Math.round(parseFloat(precio.value) || 0),
    senia: Math.round(parseFloat(senia.value) || 0),
    saldo: Math.round(parseFloat(saldo.value) || 0),
    metodo_pago: document.getElementById('metodo_pago').value,
    fecha_ingreso: new Date().toISOString()
  };

  let fotoUrl = null;
  const foto = document.getElementById('foto');
  if (foto.files.length > 0) {
    const archivo = foto.files[0];
    const nombreArchivo = `${Date.now()}_${archivo.name}`;
    const { error: upErr } = await supabase.storage.from('fotos').upload(nombreArchivo, archivo);
    if (!upErr) {
      const { data: publicUrl } = supabase.storage.from('fotos').getPublicUrl(nombreArchivo);
      fotoUrl = publicUrl.publicUrl;
    }
  }

  const { error } = await supabase.from('repairs').insert([{ ...celular, cliente_id: clienteId, foto_url: fotoUrl }]);
  if (error) showToast('error','Error al guardar reparación');
  else { showToast('success','Reparación registrada'); form.reset(); actualizarSaldo(); const preview=document.getElementById('preview'); if(preview) preview.style.display='none'; }
});

document.getElementById('foto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const preview = document.getElementById('preview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
});

const formatMoney = (v)=> `$${Math.round(v||0)}`;
const parseMoney = (t)=> parseFloat((t||'').replace(/[^0-9]/g,''))||0;

let repairsData = [];
let currentSort = { col: 'fecha_ingreso', asc: false };

function sortRepairs(col, asc){
  const getVal = (r,c)=>{
    switch(c){
      case 'cliente': return (r.clients ? `${r.clients.nombre} ${r.clients.apellido}` : '').toLowerCase();
      case 'precio': case 'senia': case 'saldo': return parseFloat(r[c])||0;
      case 'fecha_ingreso': case 'fecha_entregado': return r[c] ? new Date(r[c]).getTime() : 0;
      default: return (r[c] ?? '').toString().toLowerCase();
    }
  };
  repairsData.sort((a,b)=>{
    const va=getVal(a,col), vb=getVal(b,col);
    if(va<vb) return asc?-1:1; if(va>vb) return asc?1:-1; return 0;
  });
}

async function loadRepairs(sortCol=currentSort.col, sortAsc=currentSort.asc){
  const body = document.getElementById('repairs-body');
  body.innerHTML = `<tr><td colspan="14">Cargando...</td></tr>`;
  const { data, error } = await supabase
    .from('repairs')
    .select(`id, modelo, imei, color, estado, problema, precio, senia, saldo, comentario, fecha_ingreso, fecha_entregado, foto_url, metodo_pago, clients (nombre, apellido)`)
    .order('id', { ascending: false });
  if (error || !data){ console.error(error); body.innerHTML = `<tr><td colspan="14">Error al cargar reparaciones</td></tr>`; return; }
  repairsData = data.map(r=>({ ...r, cliente: r.clients ? `${r.clients.nombre} ${r.clients.apellido}` : '' }));
  sortRepairs(sortCol, sortAsc);
  body.innerHTML = repairsData.map(r=>{
    const bloqueado = r.estado === "Entregado";
    const saldoCalc = Math.max(0,(r.precio||0)-(r.senia||0));
    return `
      <tr>
        <td data-label="Foto">${r.foto_url ? `<img src="${r.foto_url}" alt="Foto">` : '-'}</td>
        <td data-label="Cliente">${r.cliente || '-'}</td>
        <td data-label="Modelo">${r.modelo}</td>
        <td data-label="IMEI">${r.imei || '-'}</td>
        <td data-label="Color">${r.color || '-'}</td>
        <td data-label="Estado">
          <select class="estado-select" ${bloqueado ? "disabled" : ""}>
            <option value="Recibido" ${r.estado==='Recibido'?'selected':''}>Recibido</option>
            <option value="En revisión" ${r.estado==='En revisión'?'selected':''}>En revisión</option>
            <option value="En reparación" ${r.estado==='En reparación'?'selected':''}>En reparación</option>
            <option value="Listo para entregar" ${r.estado==='Listo para entregar'?'selected':''}>Listo para entregar</option>
            <option value="Entregado" ${r.estado==='Entregado'?'selected':''}>Entregado</option>
          </select>
        </td>
        <td data-label="Problema">${r.problema}</td>
        <td data-label="Precio" class="precio" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.precio)}</td>
        <td data-label="Seña" class="senia" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.senia)}</td>
        <td data-label="Saldo" class="saldo">${formatMoney(saldoCalc)}</td>
        <td data-label="Comentario" class="comentario" ${bloqueado ? "" : 'contenteditable="true"'}>${r.comentario || ''}</td>
        <td data-label="Fecha ingreso">${r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleString() : '-'}</td>
        <td data-label="Fecha entrega">${r.fecha_entregado ? new Date(r.fecha_entregado).toLocaleString() : '-'}</td>
        <td data-label="Acciones">${bloqueado ? '<span style="color:gray;">🔒</span>' : `<button class="guardar-btn" data-id="${r.id}">💾</button>`}</td>
      </tr>`;
  }).join('');
  attachRepairEvents();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#repairs-table th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      const asc = currentSort.col === col ? !currentSort.asc : true;
      currentSort = { col, asc };
      document.querySelectorAll('#repairs-table th[data-col]').forEach(h => {
        h.textContent = h.textContent.replace(' ▲','').replace(' ▼','');
      });
      th.textContent += asc ? ' ▲' : ' ▼';
      loadRepairs(col, asc);
    });
  });
});

function attachRepairEvents(){
  document.querySelectorAll('.guardar-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const row = btn.closest('tr');
      const estadoSel = row.querySelector('.estado-select').value;
      if (estadoSel === 'Entregado') { showToast('warning','Esta reparación ya fue entregada y no se puede modificar.'); return; }
      const id = btn.dataset.id;
      const precio = parseMoney(row.querySelector('.precio').textContent);
      const senia = parseMoney(row.querySelector('.senia').textContent);
      const comentario = row.querySelector('.comentario').textContent.trim();
      const saldo = Math.round(Math.max(0, precio - senia));
      let fecha_entregado = null;
      if (estadoSel === 'Listo para entregar' || estadoSel === 'Entregado') {
        fecha_entregado = new Date().toISOString();
      }
      const { error } = await supabase.from('repairs').update({
        estado: estadoSel, precio, senia, saldo, comentario, fecha_entregado
      }).eq('id', id);
      if (error) showToast('error','Error al guardar');
      else { showToast('success','Cambios guardados'); loadRepairs(); }
    });
  });
}

const busquedaInput = document.getElementById('busqueda');
document.getElementById('btn-limpiar-filtros').addEventListener('click', () => { busquedaInput.value=''; loadRepairs(); });
busquedaInput.addEventListener('input', () => {
  const term = busquedaInput.value.trim().toLowerCase();
  const body = document.getElementById('repairs-body');
  const filtered = repairsData.filter(r =>
    (r.cliente || '').toLowerCase().includes(term) ||
    (r.modelo || '').toLowerCase().includes(term) ||
    (r.imei || '').toLowerCase().includes(term)
  );
  body.innerHTML = filtered.map(r => {
    const bloqueado = r.estado === "Entregado";
    const saldoCalc = Math.max(0,(r.precio||0)-(r.senia||0));
    return `
      <tr>
        <td data-label="Foto">${r.foto_url ? `<img src="${r.foto_url}" alt="Foto">` : '-'}</td>
        <td data-label="Cliente">${r.cliente || '-'}</td>
        <td data-label="Modelo">${r.modelo}</td>
        <td data-label="IMEI">${r.imei || '-'}</td>
        <td data-label="Color">${r.color || '-'}</td>
        <td data-label="Estado">
          <select class="estado-select" ${bloqueado ? "disabled" : ""}>
            <option value="Recibido" ${r.estado==='Recibido'?'selected':''}>Recibido</option>
            <option value="En revisión" ${r.estado==='En revisión'?'selected':''}>En revisión</option>
            <option value="En reparación" ${r.estado==='En reparación'?'selected':''}>En reparación</option>
            <option value="Listo para entregar" ${r.estado==='Listo para entregar'?'selected':''}>Listo para entregar</option>
            <option value="Entregado" ${r.estado==='Entregado'?'selected':''}>Entregado</option>
          </select>
        </td>
        <td data-label="Problema">${r.problema}</td>
        <td data-label="Precio" class="precio" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.precio)}</td>
        <td data-label="Seña" class="senia" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.senia)}</td>
        <td data-label="Saldo" class="saldo">${formatMoney(saldoCalc)}</td>
        <td data-label="Comentario" class="comentario" ${bloqueado ? "" : 'contenteditable="true"'}>${r.comentario || ''}</td>
        <td data-label="Fecha ingreso">${r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleString() : '-'}</td>
        <td data-label="Fecha entrega">${r.fecha_entregado ? new Date(r.fecha_entregado).toLocaleString() : '-'}</td>
        <td data-label="Acciones">${bloqueado ? '<span style="color:gray;">🔒</span>' : `<button class="guardar-btn" data-id="${r.id}">💾</button>`}</td>
      </tr>`;
  }).join('');
  attachRepairEvents();
});

let clientesData = [];
let clientesSort = { col: 'apellido', asc: true };

function sortClientes(col, asc){
  clientesData.sort((a,b)=>{
    const va = (a[col] || '').toString().toLowerCase();
    const vb = (b[col] || '').toString().toLowerCase();
    if(va<vb) return asc?-1:1; if(va>vb) return asc?1:-1; return 0;
  });
  renderClientes();
}

function renderClientes(){
  const body = document.getElementById('clientes-body');
  if(!clientesData.length){ body.innerHTML = `<tr><td colspan="6">No hay clientes</td></tr>`; return; }
  body.innerHTML = clientesData.map(c=>`
    <tr data-id="${c.id}">
      <td data-label="Nombre" contenteditable="true" class="nombre">${c.nombre || ''}</td>
      <td data-label="Apellido" contenteditable="true" class="apellido">${c.apellido || ''}</td>
      <td data-label="Dirección" contenteditable="true" class="direccion">${c.direccion || ''}</td>
      <td data-label="Tel. particular" contenteditable="true" class="telefono">${c.telefono || ''}</td>
      <td data-label="Tel. contacto" contenteditable="true" class="telefono_contacto">${c.telefono_contacto || ''}</td>
      <td data-label="Acción"><button class="guardar-cliente">💾</button></td>
    </tr>
  `).join('');
  attachClienteSave();
}

async function loadClientes(){
  const body = document.getElementById('clientes-body');
  body.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
  const { data, error } = await supabase.from('clients').select('*').order('apellido', { ascending: true });
  if (error){ body.innerHTML = `<tr><td colspan="6">Error al cargar clientes</td></tr>`; return; }
  clientesData = data || [];
  sortClientes(clientesSort.col, clientesSort.asc);
}

function attachClienteSave(){
  document.querySelectorAll('.guardar-cliente').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const fila = btn.closest('tr');
      const id = fila.dataset.id;
      const actualizado = {
        nombre: fila.querySelector('.nombre').textContent.trim(),
        apellido: fila.querySelector('.apellido').textContent.trim(),
        direccion: fila.querySelector('.direccion').textContent.trim(),
        telefono: fila.querySelector('.telefono').textContent.trim(),
        telefono_contacto: fila.querySelector('.telefono_contacto').textContent.trim()
      };
      const { error } = await supabase.from('clients').update(actualizado).eq('id', id);
      if (error) showToast('error','Error al actualizar cliente'); else showToast('success','Cliente actualizado');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#clientes-table th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      const asc = clientesSort.col === col ? !clientesSort.asc : true;
      clientesSort = { col, asc };
      document.querySelectorAll('#clientes-table th[data-col]').forEach(h => h.textContent = h.textContent.replace(' ▲','').replace(' ▼',''));
      th.textContent += asc ? ' ▲' : ' ▼';
      sortClientes(col, asc);
    });
  });
});
