// ===== SUPABASE CONFIG =====
const supabaseUrl = "https://fapgbftyravkevqiqcww.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGdiZnR5cmF2a2V2cWlxY3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjQxNTQsImV4cCI6MjA3NjE0MDE1NH0.eOhDjVcpRoy5e8j1bZoU_K5RCkjkjRBxPTqyxwnom-U";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== HELPERS =====
const $ = (id) => document.getElementById(id);
const formatMoney = (v) => `$${Math.round(v || 0)}`;
const parseMoney = (t) => parseFloat((t || "").replace(/[^0-9]/g, "")) || 0;
function showToast(text, type = "info", ms = 2800) {
  const t = $("toast");
  if (!t) return alert(text);
  t.className = `toast ${type}`;
  t.textContent = text;
  t.classList.remove("oculto");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add("oculto"), ms);
}
function disable(el, yes=true){ if(el){ el.disabled = yes; el.style.opacity = yes? .7:1; }}

// ===== SECCIONES =====
const menu = $("menu-principal");
const formSection = $("form-section");
const listSection = $("list-section");
const clientesSection = $("clientes-section");
function mostrarSolo(sec) {
  [menu, formSection, listSection, clientesSection].forEach(s => s.classList.add("oculto"));
  sec.classList.remove("oculto");
}

// ===== NAVEGACIÓN =====
$("btn-nueva").addEventListener("click", () => {
  mostrarSolo(formSection);
  $("fecha_ingreso").value = new Date().toLocaleString();
});
$("btn-listar").addEventListener("click", () => { mostrarSolo(listSection); loadRepairs(); });
$("btn-clientes").addEventListener("click", () => { mostrarSolo(clientesSection); loadClientes(); });
$("btn-volver-menu").addEventListener("click", () => mostrarSolo(menu));
$("btn-volver-menu-2").addEventListener("click", () => mostrarSolo(menu));
$("btn-volver-menu-3").addEventListener("click", () => mostrarSolo(menu));

// ===== FORM: saldo automático + preview local =====
["precio","senia"].forEach(id => $(id).addEventListener("input", () => {
  const precio = parseFloat($("precio").value) || 0;
  const senia = parseFloat($("senia").value) || 0;
  $("saldo").value = Math.round(Math.max(0, precio - senia));
}));
$("foto").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 50 * 1024 * 1024) { // 50 MB
    showToast("⚠️ La imagen supera los 50 MB", "warning");
    e.target.value = "";
    return;
  }
  const prev = $("preview");
  prev.src = URL.createObjectURL(f);
  prev.style.display = "block";
  prev.style.border = "2px solid #ccc";
  prev.style.borderRadius = "10px";
  prev.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
  prev.style.margin = "10px auto";
  let label = document.getElementById("cloud-label");
  if (label) label.remove();
});

// ===== AUTOCOMPLETADO DE CLIENTES =====
let clientesCache = [];
async function loadClientesParaAutocomplete() {
  const { data, error } = await supabase.from("clients").select("*");
  if (!error && data) clientesCache = data;
}
loadClientesParaAutocomplete();

function ensureSugList() {
  let ul = document.querySelector("ul.sugerencias");
  if (!ul) {
    ul = document.createElement("ul");
    ul.className = "sugerencias";
    $("repair-form").appendChild(ul);
  }
  return ul;
}
function showSuggestionsFor(inputId) {
  const input = $(inputId);
  const val = input.value.trim().toLowerCase();
  const ul = ensureSugList();
  ul.style.position = "absolute";
  ul.style.top = (input.offsetTop + input.offsetHeight) + "px";
  ul.style.left = input.offsetLeft + "px";
  ul.style.width = input.offsetWidth + "px";
  if (val.length < 2) { ul.innerHTML = ""; return; }
  const sug = clientesCache.filter(c =>
    (c.nombre||"").toLowerCase().includes(val) ||
    (c.apellido||"").toLowerCase().includes(val)
  ).slice(0, 6);
  ul.innerHTML = "";
  sug.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.nombre} ${c.apellido}`;
    li.addEventListener("click", () => {
      $("nombre").value = c.nombre || "";
      $("apellido").value = c.apellido || "";
      $("direccion").value = c.direccion || "";
      $("telefono").value = c.telefono || "";
      $("telefono_contacto").value = c.telefono_contacto || "";
      ul.innerHTML = "";
    });
    ul.appendChild(li);
  });
}
["nombre","apellido"].forEach(id => $(id).addEventListener("input", () => showSuggestionsFor(id)));
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sugerencias") && !["nombre","apellido"].includes(e.target.id)) {
    const ul = document.querySelector(".sugerencias"); if (ul) ul.innerHTML = "";
  }
});

// ===== NUEVA REPARACIÓN =====
$("repair-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  disable(submitBtn, true);

  try {
    const nombre = $("nombre").value.trim();
    const apellido = $("apellido").value.trim();
    const telefono = $("telefono").value.trim();

    // Buscar cliente existente
    let { data: existing } = await supabase.from("clients").select("*")
      .eq("nombre", nombre).eq("apellido", apellido).limit(1).maybeSingle();

    if (!existing && telefono) {
      const { data: byPhone } = await supabase.from("clients").select("*")
        .eq("telefono", telefono).limit(1).maybeSingle();
      existing = byPhone;
    }

    let cliente_id;
    if (existing) {
      cliente_id = existing.id;
      showToast("📇 Cliente existente encontrado", "info");
    } else {
      const { data: nuevo, error: cErr } = await supabase.from("clients")
        .insert([{
          nombre,
          apellido,
          direccion: $("direccion").value.trim(),
          telefono,
          telefono_contacto: $("telefono_contacto").value.trim(),
        }]).select().single();
      if (cErr) throw new Error("Error al crear cliente");
      cliente_id = nuevo.id;
      loadClientesParaAutocomplete();
      showToast("✅ Nuevo cliente creado", "success");
    }

    // Subir foto a Storage
    let foto_url = null;
    const file = $("foto").files[0];
    if (file) {
      const filename = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("fotos")
        .upload(filename, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw new Error("Error al subir foto: " + upErr.message);
      const { data: pub } = supabase.storage.from("fotos").getPublicUrl(filename);
      foto_url = pub.publicUrl;
      // Vista previa desde la nube
      const prev = $("preview");
      prev.src = foto_url;
      prev.style.display = "block";
      prev.style.border = "2px solid #ccc";
      prev.style.borderRadius = "10px";
      prev.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
      prev.style.margin = "10px auto";
      let label = document.getElementById("cloud-label");
      if (!label) {
        label = document.createElement("p");
        label.id = "cloud-label";
        label.textContent = "Imagen almacenada en la nube";
        label.style.textAlign = "center";
        label.style.fontSize = "13px";
        label.style.color = "#555";
        $("repair-form").appendChild(label);
      }
    }

    // Insert reparación
    const precio = Math.round(parseFloat($("precio").value) || 0);
    const senia = Math.round(parseFloat($("senia").value) || 0);
    const saldo = Math.round(Math.max(0, precio - senia));

    const { error: rErr } = await supabase.from("repairs").insert([{
      cliente_id,
      modelo: $("modelo").value.trim(),
      imei: $("imei").value.trim(),
      color: $("color").value.trim(),
      estado: $("estado").value.trim(),             // Detalles del equipo
      estado_reparacion: "Recibido",                // Avance inicial
      problema: $("problema").value.trim(),
      precio, senia, saldo,
      metodo_pago: $("metodo_pago").value,
      fecha_ingreso: new Date().toISOString(),
      foto_url
    }]);
    if (rErr) throw new Error("Error al guardar reparación");

    showToast("✅ Reparación registrada", "success");
    e.target.reset();
    $("preview").style.display = "none";
    const label = document.getElementById("cloud-label"); if (label) label.remove();
  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    disable(submitBtn, false);
  }
});

// ===== REPARACIONES: listar / ordenar / filtrar =====
let repairsData = [];
let currentSort = { col: "fecha_ingreso", asc: false };
let loadingRepairs = false;

function sortRepairs(col, asc) {
  const getVal = (r, c) => {
    switch (c) {
      case "cliente": return (r.cliente || "").toLowerCase();
      case "precio":
      case "senia":
      case "saldo": return parseFloat(r[c]) || 0;
      case "fecha_ingreso":
      case "fecha_entregado": return r[c] ? new Date(r[c]).getTime() : 0;
      default: return (r[c] ?? "").toString().toLowerCase();
    }
  };
  repairsData.sort((a, b) => {
    const va = getVal(a, col), vb = getVal(b, col);
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
}

async function loadRepairs(col = currentSort.col, asc = currentSort.asc) {
  if (loadingRepairs) return;
  loadingRepairs = true;
  const body = $("repairs-body");
  body.innerHTML = `<tr><td colspan="16">Cargando...</td></tr>`;

  const { data, error } = await supabase
    .from("repairs")
    .select(`id, modelo, imei, color, estado, estado_reparacion, problema, precio, senia, saldo, comentario, metodo_pago, fecha_ingreso, fecha_entregado, foto_url, clients (nombre, apellido)`)
    .order("id", { ascending: false });

  if (error) {
    body.innerHTML = `<tr><td colspan="16">❌ Error al cargar</td></tr>`;
    loadingRepairs = false;
    return;
  }

  repairsData = (data || []).map(r => ({
    ...r,
    cliente: r.clients ? `${r.clients.nombre} ${r.clients.apellido}` : ""
  }));

  // Filtros
  const term = ($("busqueda").value || "").toLowerCase();
  const filtroEstado = $("filtro-estado").value;
  let listado = repairsData.filter(r =>
    (!term || (r.cliente || "").toLowerCase().includes(term) ||
              (r.modelo || "").toLowerCase().includes(term) ||
              (r.imei || "").toLowerCase().includes(term)) &&
    (!filtroEstado || r.estado_reparacion === filtroEstado)
  );

  // Orden
  sortRepairs(col, asc);
  currentSort = { col, asc };

  if (!listado.length) {
    body.innerHTML = `<tr><td colspan="16">Sin resultados</td></tr>`;
    loadingRepairs = false;
    return;
  }

  body.innerHTML = listado.map(r => {
    const bloqueado = r.estado_reparacion === "Entregado";
    const saldoCalc = Math.max(0, (r.precio || 0) - (r.senia || 0));
    return `
      <tr>
        <td data-label="ID">${r.id}</td>
        <td data-label="Foto">${r.foto_url ? `<img src="${r.foto_url}" alt="Foto">` : '-'}</td>
        <td data-label="Cliente">${r.cliente || '-'}</td>
        <td data-label="Modelo">${r.modelo || '-'}</td>
        <td data-label="IMEI">${r.imei || '-'}</td>
        <td data-label="Color">${r.color || '-'}</td>
        <td data-label="Detalles del equipo" class="detalles_equipo" ${bloqueado ? "" : 'contenteditable="true"'}>${r.estado || ''}</td>
        <td data-label="Estado reparación">
          <select class="estado-reparacion" ${bloqueado ? "disabled" : ""}>
            <option value="Recibido" ${r.estado_reparacion==='Recibido'?'selected':''}>Recibido</option>
            <option value="En revisión" ${r.estado_reparacion==='En revisión'?'selected':''}>En revisión</option>
            <option value="En reparación" ${r.estado_reparacion==='En reparación'?'selected':''}>En reparación</option>
            <option value="Listo para entregar" ${r.estado_reparacion==='Listo para entregar'?'selected':''}>Listo para entregar</option>
            <option value="Entregado" ${r.estado_reparacion==='Entregado'?'selected':''}>Entregado</option>
          </select>
        </td>
        <td data-label="Problema">${r.problema || ''}</td>
        <td data-label="Precio" class="precio" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.precio)}</td>
        <td data-label="Seña" class="senia" ${bloqueado ? "" : 'contenteditable="true"'}>${formatMoney(r.senia)}</td>
        <td data-label="Saldo" class="saldo">${formatMoney(saldoCalc)}</td>
        <td data-label="Comentario" class="comentario" ${bloqueado ? "" : 'contenteditable="true"'}>${r.comentario || ''}</td>
        <td data-label="Fecha ingreso">${r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleString() : '-'}</td>
        <td data-label="Fecha entrega">${r.fecha_entregado ? new Date(r.fecha_entregado).toLocaleString() : '-'}</td>
        <td data-label="Acciones">${bloqueado ? '<span style="color:gray;">🔒</span>' : `<button class="guardar-btn" data-id="${r.id}">💾</button>`}</td>
      </tr>`;
  }).join("");

  attachRepairEvents();
  loadingRepairs = false;
}

// Sort al click en encabezados
document.querySelectorAll('#repairs-table th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    const asc = currentSort.col === col ? !currentSort.asc : true;
    document.querySelectorAll('#repairs-table th[data-col]').forEach(h => {
      h.textContent = h.textContent.replace(' ▲','').replace(' ▼','');
    });
    th.textContent += asc ? ' ▲' : ' ▼';
    loadRepairs(col, asc);
  });
});
// Filtros
$("busqueda").addEventListener("input", () => loadRepairs());
$("filtro-estado").addEventListener("change", () => loadRepairs());
$("btn-limpiar-filtros").addEventListener("click", () => { $("busqueda").value=""; $("filtro-estado").value=""; loadRepairs(); });

// Guardar fila / bloquear entregado (FIX)
function attachRepairEvents() {
  document.querySelectorAll(".guardar-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = btn.dataset.id;
      const estadoReparacion = row.querySelector(".estado-reparacion").value;

      // Si YA está entregado (select disabled), impedir cambios
      if (row.querySelector(".estado-reparacion").disabled) {
        showToast("⚠️ Reparación entregada: no se puede modificar.", "warning");
        return;
      }

      // Guardar cambios (incluyendo pasar a Entregado)
      disable(btn, true);
      const detalles = row.querySelector(".detalles_equipo")?.textContent.trim() || "";
      const precio = parseMoney(row.querySelector(".precio").textContent);
      const senia = parseMoney(row.querySelector(".senia").textContent);
      const comentario = row.querySelector(".comentario").textContent.trim();
      const saldo = Math.max(0, precio - senia);
      let fecha_entregado = null;
      if (estadoReparacion === "Entregado") fecha_entregado = new Date().toISOString();

      const { error } = await supabase.from("repairs").update({
        estado: detalles,
        estado_reparacion: estadoReparacion,
        precio, senia, saldo, comentario, fecha_entregado
      }).eq("id", id);

      if (error) showToast("❌ Error al guardar", "error");
      else {
        showToast(estadoReparacion === "Entregado" ? "✅ Reparación marcada como entregada" : "✅ Cambios guardados", "success");
        loadRepairs();
      }
      disable(btn, false);
    });
  });
}

// ===== CLIENTES =====
let clientesData = [];
let clientesSort = { col: "apellido", asc: true };
let loadingClientes = false;

function sortClientes(col, asc) {
  clientesData.sort((a,b) => {
    const va = (a[col] || "").toString().toLowerCase();
    const vb = (b[col] || "").toString().toLowerCase();
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
  renderClientes();
}
function renderClientes() {
  const body = $("clientes-body");
  if (!clientesData.length) { body.innerHTML = `<tr><td colspan="6">No hay clientes</td></tr>`; return; }
  body.innerHTML = clientesData.map(c => `
    <tr data-id="${c.id}">
      <td data-label="Nombre" class="nombre bloqueado">${c.nombre || ''}</td>
      <td data-label="Apellido" class="apellido bloqueado">${c.apellido || ''}</td>
      <td data-label="Dirección" contenteditable="true" class="direccion">${c.direccion || ''}</td>
      <td data-label="Tel. particular" contenteditable="true" class="telefono">${c.telefono || ''}</td>
      <td data-label="Tel. contacto" contenteditable="true" class="telefono_contacto">${c.telefono_contacto || ''}</td>
      <td data-label="Acción"><button class="guardar-cliente">💾</button></td>
    </tr>
  `).join("");
  document.querySelectorAll(".guardar-cliente").forEach(btn => {
    btn.addEventListener("click", async () => {
      disable(btn, true);
      const fila = btn.closest("tr");
      const id = fila.dataset.id;
      const actualizado = {
        direccion: fila.querySelector(".direccion").textContent.trim(),
        telefono: fila.querySelector(".telefono").textContent.trim(),
        telefono_contacto: fila.querySelector(".telefono_contacto").textContent.trim()
      };
      const { error } = await supabase.from("clients").update(actualizado).eq("id", id);
      if (error) showToast("❌ Error al actualizar cliente", "error");
      else showToast("✅ Cliente actualizado", "success");
      disable(btn, false);
    });
  });
}
async function loadClientes() {
  if (loadingClientes) return;
  loadingClientes = true;
  const body = $("clientes-body");
  body.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
  const { data, error } = await supabase.from("clients").select("*").order("apellido", { ascending: true });
  if (error) { body.innerHTML = `<tr><td colspan="6">Error al cargar</td></tr>`; loadingClientes=false; return; }
  clientesData = data || [];
  sortClientes(clientesSort.col, clientesSort.asc);
  loadingClientes = false;
}
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

// ===== EXPORTAR A PDF (Imprimir) =====
async function exportarReparacion() {
  const seleccion = prompt("Ingrese el ID de la reparación a exportar:");
  if (!seleccion) return;
  const { data, error } = await supabase
    .from("repairs")
    .select(`*, clients (nombre, apellido, direccion, telefono, telefono_contacto)`)
    .eq("id", seleccion)
    .single();
  if (error || !data) { showToast("❌ No se encontró la reparación", "error"); return; }

  const LOGO_URL = "https://fapgbftyravkevqiqcww.supabase.co/storage/v1/object/public/logos/logo_nisoma.png";
  const clienteNombre = `${data.clients?.nombre || ""} ${data.clients?.apellido || ""}`.trim();

  const html = `
    <div style="text-align:center;">
      <img src="${LOGO_URL}" width="120" alt="Logo"><br>
      <h2 style="margin:6px 0 0;">Nisoma Celulares</h2>
      <div style="margin:2px 0 12px; font-weight:600;">Reparación #${data.id} — Cliente: ${clienteNombre}</div>
      <hr>
    </div>
    <h3>Datos del Cliente</h3>
    <p><b>Nombre:</b> ${clienteNombre || "-"}<br>
       <b>Dirección:</b> ${data.clients?.direccion || "-"}<br>
       <b>Teléfono:</b> ${data.clients?.telefono || "-"} / ${data.clients?.telefono_contacto || "-"}</p>

    <h3>Datos del Equipo</h3>
    <p><b>Modelo:</b> ${data.modelo || "-"}<br>
       <b>IMEI:</b> ${data.imei || "-"}<br>
       <b>Color:</b> ${data.color || "-"}<br>
       <b>Detalles del equipo:</b> ${data.estado || "-"}<br>
       <b>Problema:</b> ${data.problema || "-"}<br>
       <b>Estado reparación:</b> ${data.estado_reparacion || "-"}</p>

    <h3>Importe</h3>
    <p><b>Precio reparación:</b> ${formatMoney(data.precio)}<br>
       <b>Seña:</b> ${formatMoney(data.senia)}<br>
       <b>Saldo a pagar:</b> ${formatMoney(data.saldo)}<br>
       <b>Método de pago:</b> ${data.metodo_pago || "-"}</p>

    <p><b>Fecha ingreso:</b> ${data.fecha_ingreso ? new Date(data.fecha_ingreso).toLocaleString() : "-"}<br>
       <b>Fecha entrega:</b> ${data.fecha_entregado ? new Date(data.fecha_entregado).toLocaleString() : "-"}</p>

    ${data.foto_url ? `<div style="margin-top:10px;"><img src="${data.foto_url}" style="max-width:220px; border:1px solid #ddd; padding:4px; border-radius:6px;"></div>` : ""}

    <hr>
    <p style="text-align:center; font-weight:600;">Gracias por confiar en Nisoma Celulares — Servicio Técnico y Accesorios.</p>
  `;

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Reparación #${data.id} - Nisoma Celulares</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
          h3 { margin: 16px 0 6px; }
          hr { margin: 14px 0; }
          @media print { button { display: none; } }
          .print-actions { margin: 10px 0 20px; }
          .print-actions button { padding: 8px 14px; border-radius: 6px; border: 1px solid #007bff; background: #007bff; color: #fff; cursor: pointer; }
          .print-actions button:hover { background: #005dc1; }
        </style>
      </head>
      <body>
        <div class="print-actions">
          <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
        </div>
        ${html}
      </body>
    </html>
  `);
  win.document.close();
}
$("btn-exportar").addEventListener("click", exportarReparacion);
