// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://fapgbftyravkevqiqcww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGdiZnR5cmF2a2V2cWlxY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjQxNTQsImV4cCI6MjA3NjE0MDE1NH0.eOhDjVcpRoy5e8j1bZoU_K5RCkjkjRBxPTqyxwnom-U';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Verificación conexión ---
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

// --- VARIABLES GLOBALES ---
const ES_ADMIN = false;
const form = document.getElementById('repair-form');
const tableBody = document.getElementById('repairs-body');
const menu = document.getElementById('menu-principal');
const formSection = document.getElementById('form-section');
const listSection = document.getElementById('list-section');
const clientesSection = document.getElementById('clientes-section');

// --- MENÚ PRINCIPAL ---
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

// --- CARGAR CLIENTES EN SELECT ---
async function cargarClientesSelect() {
  const select = document.getElementById('cliente-select');
  const { data, error } = await supabase.from('clients').select('id, nombre, apellido, telefono').order('apellido', { ascending: true });
  if (error) return console.error(error);
  select.innerHTML = '<option value="">-- Nuevo cliente --</option>';
  data.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.apellido}, ${c.nombre} (${c.telefono || 'sin teléfono'})`;
    select.appendChild(opt);
  });
}

// --- AUTOCOMPLETAR DATOS CLIENTE ---
document.getElementById('cliente-select').addEventListener('change', async e => {
  const id = e.target.value;
  if (!id) return ['nombre','apellido','direccion','telefono'].forEach(f=>document.getElementById(f).value='');
  const { data } = await supabase.from('clients').select('*').eq('id', id).single();
  if (data) {
    document.getElementById('nombre').value = data.nombre || '';
    document.getElementById('apellido').value = data.apellido || '';
    document.getElementById('direccion').value = data.direccion || '';
    document.getElementById('telefono').value = data.telefono || '';
  }
});

// --- GUARDAR NUEVA REPARACIÓN ---
form.addEventListener('submit', async e => {
  e.preventDefault();
  let clienteId = document.getElementById('cliente-select').value;
  if (!clienteId) {
    const cliente = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      direccion: direccion.value.trim(),
      telefono: telefono.value.trim()
    };
    const { data: nuevo, error } = await supabase.from('clients').insert([cliente]).select().single();
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
  if (error) alert('Error al guardar reparación'); else {
    alert('Reparación registrada correctamente');
    form.reset();
    preview.style.display = 'none';
  }
});

// --- MOSTRAR FOTO PREVIA ---
foto.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
});

// --- RESTO DE FUNCIONES (loadRepairs, loadClientes, edición, filtros) ---
