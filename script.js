// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://fapgbftyravkevqiqcww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGdiZnR5cmF2a2V2cWlxY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjQxNTQsImV4cCI6MjA3NjE0MDE1NH0.eOhDjVcpRoy5e8j1bZoU_K5RCkjkjRBxPTqyxwnom-U';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Verificar conexión ---
async function verificarConexion() {
  const status = document.getElementById('conexion-status');
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    if (error) throw error;
    status.textContent = "✅ Conectado con Supabase correctamente";
    status.classList.add('conexion-ok');
    setTimeout(() => {
      status.style.transition = "opacity 0.8s ease";
      status.style.opacity = "0";
      setTimeout(() => (status.style.display = "none"), 800);
    }, 3000);
  } catch (err) {
    status.textContent = "❌ Error al conectar con Supabase. Revisá tu URL y Key.";
    status.classList.add('conexion-error');
  }
}
verificarConexion();

// --- Variables ---
const form = document.getElementById('repair-form');
const menu = document.getElementById('menu-principal');
const formSection = document.getElementById('form-section');
const listSection = document.getElementById('list-section');
const clientesSection = document.getElementById('clientes-section');

// --- Menú principal ---
document.getElementById('btn-nueva').addEventListener('click', async () => {
  menu.classList.add('oculto');
  formSection.classList.remove('oculto');
  document.getElementById('fecha_ingreso').value = new Date().toLocaleString();
  await cargarClientesSelect();
});
document.getElementById('btn-listar').addEventListener('click', () => {
  menu.classList.add('oculto');
  listSection.classList.remove('oculto');
  loadRepairs();
});
document.getElementById('btn-clientes').addEventListener('click', () => {
  menu.classList.add('oculto');
  clientesSection.classList.remove('oculto');
  loadClientes();
});
document.getElementById('btn-volver-menu').addEventListener('click', () => {
  formSection.classList.add('oculto');
  menu.classList.remove('oculto');
});
document.getElementById('btn-volver-menu-2').addEventListener('click', () => {
  listSection.classList.add('oculto');
  menu.classList.remove('oculto');
});
document.getElementById('btn-volver-menu-3').addEventListener('click', () => {
  clientesSection.classList.add('oculto');
  menu.classList.remove('oculto');
});

// --- Cargar lista de clientes en el selector ---
async function cargarClientesSelect() {
  const select = document.getElementById('cliente-select');
  const { data, error } = await supabase.from('clients').select('id, nombre, apellido, telefono');
  if (error) return console.error(error);
  select.innerHTML = '<option value="">-- Nuevo cliente --</option>';
  data.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.apellido}, ${c.nombre} (${c.telefono || ''})`;
    select.appendChild(option);
  });
}

// --- Autocompletar datos del cliente ---
document.getElementById('cliente-select').addEventListener('change', async e => {
  const id = e.target.value;
  if (!id) return ['nombre','apellido','direccion','telefono'].forEach(f => document.getElementById(f).value = '');
  const { data } = await supabase.from('clients').select('*').eq('id', id).single();
  if (data) {
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('apellido').value = data.apellido;
    document.getElementById('direccion').value = data.direccion || '';
    document.getElementById('telefono').value = data.telefono || '';
  }
});

// --- Guardar nueva reparación ---
form.addEventListener('submit', async e => {
  e.preventDefault();

  let clienteId = document.getElementById('cliente-select').value;
  if (!clienteId) {
    const { data: nuevo, error } = await supabase.from('clients').insert([{
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      direccion: direccion.value.trim(),
      telefono: telefono.value.trim()
    }]).select().single();
    if (error) return alert('Error al crear cliente');
    clienteId = nuevo.id;
  }

  const celular = {
    modelo: modelo.value.trim(),
    imei: imei.value.trim(),
    color: color.value.trim(),
    estado: estado.value.trim(),
    problema: problema.value.trim(),
    precio: parseFloat(precio.value) || null,
    fecha_ingreso: new Date().toISOString()
  };

  let fotoUrl = null;
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
  if (error) alert('Error al guardar reparación');
  else {
    alert('✅ Reparación registrada correctamente');
    form.reset();
    preview.style.display = 'none';
  }
});

// --- Mostrar vista previa ---
foto.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
});

// --- Cargar reparaciones ---
async function loadRepairs() {
  const body = document.getElementById('repairs-body');
  body.innerHTML = `<tr><td colspan="11">Cargando...</td></tr>`;

  const { data, error } = await supabase
    .from('repairs')
    .select(`id, modelo, imei, color, estado, problema, precio, fecha_ingreso, fecha_entregado, foto_url, clients (nombre, apellido)`)
    .order('id', { ascending: false });

  console.log("Repairs:", data);
  console.log("Error Repairs:", error);

  if (error || !data) {
    body.innerHTML = `<tr><td colspan="11">Error al cargar reparaciones</td></tr>`;
    return;
  }

  if (data.length === 0) {
    body.innerHTML = `<tr><td colspan="11">No hay reparaciones registradas</td></tr>`;
    return;
  }

  body.innerHTML = data.map(r => `
    <tr>
      <td>${r.foto_url ? `<img src="${r.foto_url}" style="width:60px;border-radius:6px;">` : '-'}</td>
      <td>${r.clients ? `${r.clients.nombre} ${r.clients.apellido}` : '-'}</td>
      <td>${r.modelo}</td>
      <td>${r.imei || '-'}</td>
      <td>${r.color || '-'}</td>
      <td contenteditable="true" class="estado">${r.estado || ''}</td>
      <td>${r.problema}</td>
      <td contenteditable="true" class="precio">${r.precio || ''}</td>
      <td>${new Date(r.fecha_ingreso).toLocaleString()}</td>
      <td>${r.fecha_entregado ? new Date(r.fecha_entregado).toLocaleString() : '-'}</td>
      <td><button class="guardar-btn" data-id="${r.id}">💾</button></td>
    </tr>
  `).join('');

  attachSaveButtons();
}

// --- Guardar cambios en reparación ---
function attachSaveButtons() {
  document.querySelectorAll('.guardar-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fila = btn.closest('tr');
      const id = btn.dataset.id;
      const estado = fila.querySelector('.estado').textContent.trim();
      const precio = parseFloat(fila.querySelector('.precio').textContent) || null;
      const fecha_entregado = estado.toLowerCase() === 'entregado' ? new Date().toISOString() : null;

      const { error } = await supabase.from('repairs').update({ estado, precio, fecha_entregado }).eq('id', id);
      if (error) alert('❌ Error al guardar'); else alert('✅ Cambios guardados');
    });
  });
}

// --- Cargar clientes ---
async function loadClientes() {
  const body = document.getElementById('clientes-body');
  body.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  const { data, error } = await supabase.from('clients').select('*').order('id', { ascending: false });
  console.log("Clients:", data);
  console.log("Error Clients:", error);

  if (error || !data) {
    body.innerHTML = `<tr><td colspan="5">Error al cargar clientes</td></tr>`;
    return;
  }

  if (data.length === 0) {
    body.innerHTML = `<tr><td colspan="5">No hay clientes registrados</td></tr>`;
    return;
  }

  body.innerHTML = data.map(c => `
    <tr data-id="${c.id}">
      <td contenteditable="true" class="nombre">${c.nombre}</td>
      <td contenteditable="true" class="apellido">${c.apellido}</td>
      <td contenteditable="true" class="direccion">${c.direccion || ''}</td>
      <td contenteditable="true" class="telefono">${c.telefono || ''}</td>
      <td><button class="guardar-cliente">💾</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.guardar-cliente').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fila = btn.closest('tr');
      const id = fila.dataset.id;
      const actualizado = {
        nombre: fila.querySelector('.nombre').textContent.trim(),
        apellido: fila.querySelector('.apellido').textContent.trim(),
        direccion: fila.querySelector('.direccion').textContent.trim(),
        telefono: fila.querySelector('.telefono').textContent.trim()
      };
      const { error } = await supabase.from('clients').update(actualizado).eq('id', id);
      if (error) alert('❌ Error'); else alert('✅ Cliente actualizado');
    });
  });
}
