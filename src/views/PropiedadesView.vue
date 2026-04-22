<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import api from '../api/axios'
import Swal from 'sweetalert2'

// --- ESTADO GENERAL Y DATOS ---
const propiedades = ref([])
const propietarios = ref([])
const manzanos = ref([])
const cargando = ref(true)
const guardando = ref(false)

// Paginación y Búsqueda
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

// --- VARIABLES DE MODALES ---
const isEditing = ref(false)
const btnCerrarModal = ref(null)
const erroresValidacion = ref({})
const propiedadSeleccionada = ref(null) // Para el Modal VER

// --- FORMULARIOS ---
const propiedadForm = ref({
  id: null, propietario_id: '', manzano_id: '', ubicacion_id: null,
  tipo: 'Lote', codigo: '', precio_venta: '', direccion: '', nro_lote: '', superficie_m2: '',
  colinda_norte: '', colinda_sur: '', colinda_este: '', colinda_oeste: '', estado: 'Disponible', activo: true
})

const ubicacionForm = ref({
  id: null, referencia: '', url_maps: '', latitud: '', longitud: ''
})

// --- CONFIGURACIÓN GOOGLE MAPS ---
const mapDiv = ref(null)
let map = null
let marker = null

const GOOGLE_MAPS_API_KEY = 'AIzaSyCaAjmxE-Aub9ty9q_-jcN1RULUSDa9XXY' 

const initMap = async (lat = -17.3411, lng = -63.2514) => {
  try {
    if (!mapDiv.value) return;

    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: "weekly" });
    const { Map } = await importLibrary("maps");
    const { Marker } = await importLibrary("marker");

    const lat_num = parseFloat(lat) || -17.3411;
    const lng_num = parseFloat(lng) || -63.2514;
    const center = { lat: lat_num, lng: lng_num };

    map = new Map(mapDiv.value, {
      center, zoom: 16, disableDefaultUI: false, mapTypeControl: false, mapId: "PROPIEDAD_MAP_ID"
    });

    marker = new Marker({
      position: center, map: map, draggable: true, title: "Ubicación"
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      updateCoordsInputs(pos.lat, pos.lng);
    });

    map.addListener("click", (e) => {
      marker.setPosition(e.latLng);
      updateCoordsInputs(e.latLng.lat(), e.latLng.lng());
    });

  } catch (error) {
    console.error("Error Google Maps:", error);
  }
}

const updateCoordsInputs = (lat, lng) => {
  // Aseguramos que las coordenadas tengan un formato decimal limpio
  const latitude = Number(lat).toFixed(14);
  const longitude = Number(lng).toFixed(14);
  
  ubicacionForm.value.latitud = latitude;
  ubicacionForm.value.longitud = longitude;
  ubicacionForm.value.url_maps = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

// ==========================================
// 1. CARGA BASE (PAGINACIÓN Y BÚSQUEDA)
// ==========================================
const cargarDatosBase = async (page = 1) => {
  try {
    cargando.value = true;
    
    // Le decimos a Laravel que nos mande 1000 registros para que no falte nadie en los <select>
    const [resProp, resOwn, resManz] = await Promise.all([
      api.get(`/propiedades?page=${page}&search=${searchQuery.value}`),
      api.get('/propietarios?per_page=1000'), 
      api.get('/manzanos?per_page=1000')      
    ]);
    
    propiedades.value = resProp.data.data;
    currentPage.value = resProp.data.current_page;
    totalPages.value = resProp.data.last_page;

    // 🌟 LA CORRECCIÓN CLAVE: Agregamos .data.data porque ahora los datos vienen paginados
    propietarios.value = resOwn.data.data.filter(p => p.estado == 1 || p.estado === true);
    manzanos.value = resManz.data.data.filter(m => m.estado == 1 || m.estado === true);
    
  } catch (error) {
    // Imprimimos el error real en la consola por si acaso
    console.error("Detalle del error en JS:", error); 
    Swal.fire('Error', 'No se pudieron procesar los datos', 'error');
  } finally {
    cargando.value = false;
  }
}

const buscar = () => cargarDatosBase(1)

const limpiarBusqueda = () => {
  searchQuery.value = ''
  buscar()
}

const paginasVisibles = computed(() => {
  let pages = []
  const maxVisible = 5 
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1

  if (end > totalPages.value) {
    end = totalPages.value
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ==========================================
// 2. PREPARAR MODALES
// ==========================================
const abrirModalGuardar = (prop = null) => {
  erroresValidacion.value = {};
  if (prop) {
    isEditing.value = true;
    propiedadForm.value = { ...prop };
    if (prop.ubicacion) ubicacionForm.value = { ...prop.ubicacion };
    else resetUbicacionForm();
  } else {
    isEditing.value = false;
    resetPropiedadForm();
    resetUbicacionForm();
  }

  nextTick(() => {
    const modalEl = document.getElementById('modalProp');
    const onModalShown = () => {
      initMap(ubicacionForm.value.latitud, ubicacionForm.value.longitud);
      modalEl.removeEventListener('shown.bs.modal', onModalShown);
    };
    modalEl.addEventListener('shown.bs.modal', onModalShown);
  });
}

const abrirModalVer = (prop) => {
  propiedadSeleccionada.value = prop;
}

const resetPropiedadForm = () => {
  propiedadForm.value = {
    id: null, propietario_id: '', manzano_id: '', tipo: 'Lote', codigo: '', 
    precio_venta: '', superficie_m2: '', estado: 'Disponible', activo: true
  };
}

const resetUbicacionForm = () => {
  ubicacionForm.value = { id: null, referencia: '', url_maps: '', latitud: -17.3411, longitud: -63.2514 };
}

// ==========================================
// 3. GUARDAR PROPIEDAD
// ==========================================
const guardar = async () => {
  guardando.value = true;
  erroresValidacion.value = {};
  try {
    let ubiId = propiedadForm.value.ubicacion_id;
    const resUbi = ubiId 
      ? await api.put(`/ubicaciones/${ubiId}`, ubicacionForm.value)
      : await api.post('/ubicaciones', ubicacionForm.value);
    
    if (!ubiId) propiedadForm.value.ubicacion_id = resUbi.data.data.id;

    if (isEditing.value) await api.put(`/propiedades/${propiedadForm.value.id}`, propiedadForm.value);
    else await api.post('/propiedades', propiedadForm.value);

    await cargarDatosBase(currentPage.value);
    btnCerrarModal.value.click();
    Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  } catch (error) {
    if (error.response?.status === 422) erroresValidacion.value = error.response.data.errors;
    Swal.fire('Error', 'Verifica los campos obligatorios', 'error');
  } finally {
    guardando.value = false;
  }
}

// ==========================================
// 4. ACTIVAR / DESACTIVAR
// ==========================================
const toggleActivo = async (prop) => {
  const isActivo = prop.activo == 1 || prop.activo === true;
  const accionTxt = isActivo ? 'Ocultar' : 'Publicar';
  const btnColor = isActivo ? '#fb7185' : '#a28bfa';

  Swal.fire({
    title: `¿${accionTxt} del Catálogo?`,
    text: "Cambiará la visibilidad de la propiedad.",
    icon: isActivo ? 'warning' : 'info',
    showCancelButton: true, confirmButtonColor: btnColor, cancelButtonColor: '#9ca3af',
    confirmButtonText: `Sí, ${accionTxt.toLowerCase()}`, cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.delete(`/propiedades/${prop.id}`);
        await cargarDatosBase(currentPage.value);
        Swal.fire({ title: `¡Éxito!`, icon: 'success', showConfirmButton: false, timer: 1500 });
      } catch (error) {
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
      }
    }
  })
}

onMounted(() => cargarDatosBase(1));
</script>

<template>
  <div class="container-fluid py-4 pb-5">
    
    <div class="row align-items-center mb-4">
      <div class="col-md-5 mb-3 mb-md-0">
        <h2 class="h4 fw-bold mb-0" style="color: var(--text-main);">Catálogo de Propiedades</h2>
        <p class="text-muted small mb-0">Gestión de inventario y ubicación geográfica</p>
      </div>
      
      <div class="col-md-7 d-flex justify-content-md-end gap-2">
        <div class="input-group" style="max-width: 350px;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
          <input type="text" class="form-control border-start-0 border-end-0 ps-0 shadow-none" 
                 v-model="searchQuery" @keyup.enter="buscar" placeholder="Buscar por Código o Dueño...">
          
          <span class="input-group-text bg-white border-start-0 cursor-pointer" 
                v-if="searchQuery" @click="limpiarBusqueda" title="Limpiar">
            <i class="bi bi-x-circle-fill text-muted hover-danger transition-all"></i>
          </span>
          <span class="input-group-text bg-white border-start-0" v-else></span>

          <button class="btn btn-secondary shadow-none px-3" @click="buscar" type="button">Buscar</button>
        </div>
        
        <button class="btn btn-primary d-flex align-items-center gap-2 shadow-sm border-0 px-3" 
                style="background-color: var(--primary-color);" 
                data-bs-toggle="modal" data-bs-target="#modalProp" @click="abrirModalGuardar()">
          <i class="bi bi-plus-lg"></i> Nueva
        </button>
      </div>
    </div>

    <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="bg-light">
            <tr class="text-muted small text-uppercase">
              <th class="ps-4">Código</th>
              <th>Propietario / Lote</th>
              <th>Precio / Sup.</th>
              <th class="text-center">Estado</th>
              <th class="text-end pe-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando">
              <td colspan="5" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted small">Cargando propiedades...</div>
              </td>
            </tr>
            
            <tr v-else-if="propiedades.length === 0">
              <td colspan="5" class="text-center py-5 text-muted">
                <i class="bi bi-inbox fs-2 d-block mb-2"></i> No se encontraron propiedades.
              </td>
            </tr>
            
            <template v-else>
              <tr v-for="prop in propiedades" :key="prop.id">
                <td class="ps-4">
                  <span class="fw-bold">{{ prop.codigo }}</span>
                  <div class="text-muted smaller">{{ prop.tipo }}</div>
                </td>
                <td>
                  <div class="fw-medium text-truncate" style="max-width: 200px;" :title="prop.propietario?.nombre_completo">
                    {{ prop.propietario?.nombre_completo || 'Sin Propietario' }}
                  </div>
                  <div class="smaller text-muted">Manzano {{ prop.manzano?.codigo }} | Lote {{ prop.nro_lote || 'N/A' }}</div>
                </td>
                <td>
                  <div class="fw-bold text-success">Bs. {{ prop.precio_venta }}</div>
                  <div class="smaller text-muted">{{ prop.superficie_m2 }} m²</div>
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill px-3" 
                        :class="prop.estado === 'Disponible' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'">
                    {{ prop.estado }}
                  </span>
                  <!-- <div class="smaller mt-1" :class="prop.activo ? 'text-primary' : 'text-danger'">
                    <i class="bi" :class="prop.activo ? 'bi-globe' : 'bi-eye-slash'"></i> 
                    {{ prop.activo ? 'Público' : 'Oculto' }}
                  </div> -->
                </td>
                <td class="text-end pe-4">
                  <div class="btn-group shadow-sm rounded">
                    <button class="btn btn-sm btn-white text-primary border" @click="abrirModalVer(prop)" data-bs-toggle="modal" data-bs-target="#modalVerProp" title="Ver Detalles">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-white text-info border" @click="abrirModalGuardar(prop)" data-bs-toggle="modal" data-bs-target="#modalProp" title="Editar">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-white border" :class="prop.activo ? 'text-danger' : 'text-success'" @click="toggleActivo(prop)" :title="prop.activo ? 'Ocultar' : 'Publicar'">
                      <i class="bi" :class="prop.activo ? 'bi-trash' : 'bi-check-circle'"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <nav v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
      <small class="text-muted">Mostrando página {{ currentPage }} de {{ totalPages }}</small>
      <ul class="pagination pagination-sm mb-0 shadow-sm">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link shadow-none text-secondary" @click="cargarDatosBase(currentPage - 1)"><i class="bi bi-chevron-left"></i></button>
        </li>
        <li class="page-item" v-for="page in paginasVisibles" :key="page" :class="{ active: currentPage === page }">
          <button class="page-link shadow-none custom-page-btn" @click="cargarDatosBase(page)">{{ page }}</button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link shadow-none text-secondary" @click="cargarDatosBase(currentPage + 1)"><i class="bi bi-chevron-right"></i></button>
        </li>
      </ul>
    </nav>

    <div class="modal fade" id="modalProp" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content card-custom border-0 overflow-hidden">
          <div class="modal-header border-0 bg-light p-4">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-houses-fill me-2" style="color: var(--primary-color);"></i>
              {{ isEditing ? 'Actualizar Propiedad' : 'Registro de Propiedad' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" :disabled="guardando"></button>
            <button type="button" class="d-none" data-bs-dismiss="modal" ref="btnCerrarModal"></button>
          </div>
          
          <div class="modal-body p-0">
            <form @submit.prevent="guardar">
              <div class="row g-0">
                <div class="col-lg-6 p-4 border-end">
                  <h6 class="fw-bold mb-3 text-muted">Información General</h6>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label small fw-bold">Código *</label>
                      <input type="text" class="form-control bg-light border-0 text-uppercase" v-model="propiedadForm.codigo" :class="{'is-invalid': erroresValidacion.codigo}" required>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label small fw-bold">Tipo *</label>
                      <select class="form-select bg-light border-0" v-model="propiedadForm.tipo">
                        <option value="Lote">Lote</option>
                        <option value="Casa">Casa</option>
                        <!-- <option value="Terreno">Terreno</option> -->
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label small fw-bold">Manzano *</label>
                      <select class="form-select bg-light border-0" v-model="propiedadForm.manzano_id" required>
                        <option v-for="m in manzanos" :key="m.id" :value="m.id">{{ m.codigo }}</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label small fw-bold">Nro Lote</label>
                      <input type="text" class="form-control bg-light border-0" v-model="propiedadForm.nro_lote">
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold">Propietario *</label>
                      <select class="form-select bg-light border-0" v-model="propiedadForm.propietario_id" required>
                        <option v-for="p in propietarios" :key="p.id" :value="p.id">{{ p.nombre_completo }} (CI: {{ p.ci }})</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label small fw-bold">Superficie (m²) *</label>
                      <input type="number" step="0.01" class="form-control bg-light border-0" v-model="propiedadForm.superficie_m2" required>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label small fw-bold">Precio (Bs) *</label>
                      <input type="number" step="0.01" class="form-control bg-light border-0 text-success fw-bold" v-model="propiedadForm.precio_venta" required>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label small fw-bold">Estado</label>
                      <select class="form-select bg-light border-0" v-model="propiedadForm.estado">
                        <option value="Disponible">Disponible</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Vendido">Vendido</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold">Referencia Ubicación</label>
                      <textarea class="form-control bg-light border-0" rows="2" v-model="ubicacionForm.referencia"></textarea>
                    </div>
                  </div>
                </div>

                <div class="col-lg-6 p-4 bg-light bg-opacity-25">
                  <h6 class="fw-bold mb-3 text-muted">Geolocalización</h6>
                  <div class="map-container shadow-sm rounded overflow-hidden mb-3 border">
                    <div ref="mapDiv" style="width: 100%; height: 350px;"></div>
                  </div>
                  <div class="row g-2">
                    <div class="col-md-6">
                      <label class="smaller text-muted">Latitud</label>
                      <input type="text" class="form-control form-control-sm bg-white" v-model="ubicacionForm.latitud" readonly>
                    </div>
                    <div class="col-md-6">
                      <label class="smaller text-muted">Longitud</label>
                      <input type="text" class="form-control form-control-sm bg-white" v-model="ubicacionForm.longitud" readonly>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-light d-flex justify-content-end gap-2 border-top">
                <button type="button" class="btn btn-white border px-4" data-bs-dismiss="modal" :disabled="guardando">Cancelar</button>
                <button type="submit" class="btn btn-primary px-5 shadow-sm border-0" 
                        style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
                  {{ guardando ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalVerProp" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          <div class="modal-header bg-light border-bottom-0 pb-3 p-4">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-info-circle text-primary me-2"></i> Detalle de Propiedad
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" v-if="propiedadSeleccionada">
            
            <div class="row">
              <div class="col-md-6 mb-4">
                <h6 class="fw-bold border-bottom pb-2 text-muted">Datos de la Propiedad</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item px-0 bg-transparent"><strong>Código:</strong> {{ propiedadSeleccionada.codigo }} ({{ propiedadSeleccionada.tipo }})</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>Manzano:</strong> {{ propiedadSeleccionada.manzano?.codigo }}</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>Lote Nro:</strong> {{ propiedadSeleccionada.nro_lote || '-' }}</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>Superficie:</strong> {{ propiedadSeleccionada.superficie_m2 }} m²</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>Precio:</strong> <span class="text-success fw-bold">Bs. {{ propiedadSeleccionada.precio_venta }}</span></li>
                </ul>
              </div>
              <div class="col-md-6 mb-4">
                <h6 class="fw-bold border-bottom pb-2 text-muted">Datos del Propietario</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item px-0 bg-transparent"><strong>Nombre:</strong> {{ propiedadSeleccionada.propietario?.nombre_completo }}</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>CI:</strong> {{ propiedadSeleccionada.propietario?.ci }}</li>
                  <li class="list-group-item px-0 bg-transparent"><strong>Teléfono:</strong> {{ propiedadSeleccionada.propietario?.telefono || '-' }}</li>
                </ul>
                
                <div class="mt-3 p-2 bg-light rounded text-center border">
                  <strong>Estado Comercial:</strong> 
                  <span class="ms-2 badge" :class="propiedadSeleccionada.estado === 'Disponible' ? 'bg-success' : 'bg-warning text-dark'">
                    {{ propiedadSeleccionada.estado }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="propiedadSeleccionada.ubicacion?.url_maps" class="mt-3 text-center">
              <a :href="propiedadSeleccionada.ubicacion.url_maps" target="_blank" class="btn btn-outline-primary btn-sm rounded-pill px-4">
                <i class="bi bi-geo-alt-fill me-1"></i> Abrir en Google Maps
              </a>
            </div>
            
            <div class="text-end mt-4 border-top pt-3">
              <button type="button" class="btn btn-secondary px-4 shadow-none" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.card-custom { background-color: var(--bg-card); border-radius: 12px; }
.smaller { font-size: 0.75rem; }
.btn-white { background-color: #fff; }
.cursor-pointer { cursor: pointer; }
.hover-danger:hover { color: #dc3545 !important; }
.transition-all { transition: all 0.2s ease-in-out; }

.page-item.active .custom-page-btn {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
}
.custom-page-btn { color: var(--text-main); font-weight: 500; }

.form-control:focus, .form-select:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}

[data-theme="dark"] .btn-white { background-color: #333; color: #eee; border-color: #444; }
[data-theme="dark"] .bg-light { background-color: #252525 !important; }
[data-theme="dark"] .form-control, [data-theme="dark"] .form-select { color: #fff; }
[data-theme="dark"] .input-group-text.bg-white { background-color: #2a2a2a !important; border-color: #444 !important;}
[data-theme="dark"] .form-control.border-start-0 { border-color: #444 !important; background-color: #2a2a2a; color: white;}
[data-theme="dark"] .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
[data-theme="dark"] .page-link { background-color: #2a2a2a; border-color: #444; color: #ccc;}
[data-theme="dark"] .page-item.disabled .page-link { background-color: #1a1a1a; color: #666; }
</style>