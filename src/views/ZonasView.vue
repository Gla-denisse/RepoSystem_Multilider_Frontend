<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'
import LiveSearchSelect from '../components/LiveSearchSelect.vue'

// ==========================================
// 1. ESTADO Y VARIABLES
// ==========================================
const zonas = ref([])
const ciudades = ref([])
const cargando = ref(true)
const guardando = ref(false)
const guardandoCiudad = ref(false)

// Paginación
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0
})

// Filtros
const filtros = ref({
  buscar: '',
  ciudad_id: ''
})

// Modal CRUD Zona
const isEditing = ref(false)
const zonaForm = ref({
  id: null,
  nombre: '',
  ciudad_id: null,
  estado: true
})
const btnCerrarModalZona = ref(null)
const erroresValidacion = ref({})

// Modal Nueva Ciudad (dentro de Zona)
const ciudadForm = ref({
  nombre: '',
  departamento: ''
})
const btnCerrarModalCiudad = ref(null)
const erroresValidacionCiudad = ref({})

// Modal Ver Detalles
const zonaDetalle = ref(null)

// ==========================================
// 2. CARGA DE DATOS
// ==========================================
const cargarZonas = async (page = 1) => {
  try {
    cargando.value = true
    const params = {
      page,
      per_page: pagination.value.per_page,
      search: filtros.value.buscar,
      ciudad_id: filtros.value.ciudad_id
    }
    
    const res = await api.get('/zonas', { params })
    
    zonas.value = res.data.data
    pagination.value = {
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      per_page: res.data.per_page,
      total: res.data.total
    }
  } catch (error) {
    console.error("Error al cargar zonas:", error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron cargar las zonas.',
      confirmButtonColor: 'var(--primary-color)'
    })
  } finally {
    cargando.value = false
  }
}

const cargarCiudades = async () => {
  try {
    // Obtenemos todas las ciudades para el selector (per_page alto o endpoint sin paginación si existiera)
    const res = await api.get('/ciudades', { params: { per_page: 1000 } })
    ciudades.value = res.data.data
  } catch (error) {
    console.error("Error al cargar ciudades:", error)
  }
}

// Debounce para búsqueda
let timeoutBusqueda = null
watch(() => filtros.value.buscar, () => {
  if (timeoutBusqueda) clearTimeout(timeoutBusqueda)
  timeoutBusqueda = setTimeout(() => {
    cargarZonas(1)
  }, 500)
})

// Filtro por ciudad inmediato
watch(() => filtros.value.ciudad_id, () => {
  cargarZonas(1)
})

// ==========================================
// 3. LÓGICA CRUD ZONA
// ==========================================
const nuevaZona = () => {
  isEditing.value = false
  zonaForm.value = { id: null, nombre: '', ciudad_id: null, estado: true }
  erroresValidacion.value = {}
}

const editarZona = (item) => {
  isEditing.value = true
  zonaForm.value = { 
    id: item.id, 
    nombre: item.nombre, 
    ciudad_id: item.ciudad_id,
    estado: item.estado == 1 || item.estado === true
  }
  erroresValidacion.value = {}
}

const verZona = (item) => {
  zonaDetalle.value = item
}

const guardarZona = async () => {
  erroresValidacion.value = {}
  guardando.value = true
  try {
    if (isEditing.value) {
      await api.put(`/zonas/${zonaForm.value.id}`, zonaForm.value)
    } else {
      await api.post('/zonas', zonaForm.value)
    }

    await cargarZonas(pagination.value.current_page)
    btnCerrarModalZona.value.click()
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditing.value ? 'Zona actualizada' : 'Zona registrada',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } catch (error) {
    if (error.response && error.response.status === 422) {
      erroresValidacion.value = error.response.data.errors
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al intentar guardar la zona.',
        confirmButtonColor: 'var(--primary-color)'
      })
    }
  } finally {
    guardando.value = false
  }
}

const toggleEstadoZona = (item) => {
  const isActivo = item.estado == 1 || item.estado === true;
  const accionTxt = isActivo ? 'Desactivar' : 'Activar';
  const tituloTxt = isActivo ? '¿Desactivar zona?' : '¿Activar zona?';
  
  Swal.fire({
    title: tituloTxt,
    text: `¿Estás seguro de ${accionTxt.toLowerCase()} "${item.nombre}"?`,
    icon: isActivo ? 'warning' : 'info',
    showCancelButton: true,
    confirmButtonColor: isActivo ? '#fb7185' : 'var(--primary-color)',
    cancelButtonColor: '#9ca3af',
    confirmButtonText: `Sí, ${accionTxt.toLowerCase()}`,
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.delete(`/zonas/${item.id}`)
        await cargarZonas(pagination.value.current_page)
        Swal.fire({
          title: `¡${isActivo ? 'Desactivada' : 'Activada'}!`,
          text: `La zona ha sido ${isActivo ? 'desactivada' : 'activada'} con éxito.`,
          icon: 'success',
          confirmButtonColor: 'var(--primary-color)'
        })
      } catch (error) {
        Swal.fire('Error', `No se pudo ${accionTxt.toLowerCase()} la zona.`, 'error')
      }
    }
  })
}

// ==========================================
// 4. LÓGICA NUEVA CIUDAD (Desde Zona)
// ==========================================
const nuevaCiudadRapida = () => {
  ciudadForm.value = { nombre: '', departamento: '' }
  erroresValidacionCiudad.value = {}
}

const guardarCiudadRapida = async () => {
  erroresValidacionCiudad.value = {}
  guardandoCiudad.value = true
  try {
    const res = await api.post('/ciudades', ciudadForm.value)
    
    // Recargamos ciudades para el LiveSearch
    await cargarCiudades()
    
    // Seleccionamos automáticamente la ciudad recién creada
    zonaForm.value.ciudad_id = res.data.data.id
    
    btnCerrarModalCiudad.value.click()
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Ciudad creada y seleccionada',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } catch (error) {
    if (error.response && error.response.status === 422) {
      erroresValidacionCiudad.value = error.response.data.errors
    } else {
      Swal.fire('Error', 'No se pudo crear la ciudad.', 'error')
    }
  } finally {
    guardandoCiudad.value = false
  }
}

onMounted(() => {
  cargarZonas()
  cargarCiudades()
})
</script>

<template>
  <div class="container-fluid py-4 pb-5">
    
    <!-- Encabezado de Pantalla -->
    <div class="row align-items-center mb-4">
      <div class="col-md-5 mb-3 mb-md-0">
        <h2 class="h4 fw-bold mb-0" style="color: var(--text-main);">Gestión de Zonas / Urbanizaciones</h2>
        <p class="text-muted small mb-0">Administra los sectores y barrios de cada ciudad.</p>
      </div>
      
      <div class="col-md-7 d-flex justify-content-md-end gap-2">
        <div class="input-group" style="max-width: 350px;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
          <input type="text" class="form-control border-start-0 border-end-0 ps-0 shadow-none" 
                 v-model="filtros.buscar" placeholder="Buscar zona o ciudad...">
          <span class="input-group-text bg-white border-start-0 cursor-pointer" v-if="filtros.buscar" @click="filtros.buscar = ''" title="Limpiar">
            <i class="bi bi-x-circle-fill text-muted hover-danger transition-all"></i>
          </span>
          <span class="input-group-text bg-white border-start-0" v-else></span>
          <button class="btn btn-secondary shadow-none px-3" @click="cargarZonas(1)" type="button">Buscar</button>
        </div>
        
        <button class="btn btn-primary d-flex align-items-center gap-2 shadow-sm border-0 px-3" 
                style="background-color: var(--primary-color);" 
                data-bs-toggle="modal" data-bs-target="#modalZona" @click="nuevaZona">
          <i class="bi bi-plus-lg"></i> Nueva
        </button>
      </div>
    </div>

    <!-- Tarjeta de Listado -->
    <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3">
      <div class="card-body p-0">
        <div v-if="cargando" class="text-center p-5">
          <div class="spinner-border text-primary" role="status"></div>
          <div class="mt-2 text-muted small">Cargando zonas...</div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-muted small text-uppercase">
              <tr>
                <th class="ps-4 border-0">ID</th>
                <th class="border-0">Nombre de la Zona</th>
                <th class="border-0">Ciudad</th>
                <th class="border-0">Estado</th>
                <th class="text-end pe-4 border-0">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="zona in zonas" :key="zona.id">
                <td class="ps-4 fw-medium text-muted">#{{ zona.id }}</td>
                <td><span class="fw-bold" style="color: var(--text-main);">{{ zona.nombre }}</span></td>
                <td>
                  <div class="d-flex align-items-center">
                    <i class="bi bi-geo-alt text-primary me-2"></i>
                    <div>
                      <div class="fw-medium">{{ zona.ciudad?.nombre }}</div>
                      <div class="smaller text-muted">{{ zona.ciudad?.departamento }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span v-if="zona.estado == 1 || zona.estado === true"
                    class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Activo</span>
                  <span v-else
                    class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  <div class="btn-group shadow-sm rounded">
                    <button class="btn btn-sm btn-light border text-primary" title="Ver Detalles"
                            data-bs-toggle="modal" data-bs-target="#modalDetalle" @click="verZona(zona)">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-light border text-info" title="Editar"
                            data-bs-toggle="modal" data-bs-target="#modalZona" @click="editarZona(zona)">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" 
                            @click="toggleEstadoZona(zona)"
                            :title="zona.estado == 1 || zona.estado === true ? 'Desactivar Zona' : 'Activar Zona'">
                      <i class="bi" :class="zona.estado == 1 || zona.estado === true ? 'bi-trash text-danger' : 'bi-check-circle text-success'"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="zonas.length === 0">
                <td colspan="5" class="text-center py-5 text-muted">No se encontraron zonas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer con Paginación -->
      <div class="card-footer bg-transparent border-top p-4">
        <div class="d-flex justify-content-between align-items-center">
          <div class="small text-muted">
            Mostrando {{ zonas.length }} de {{ pagination.total }} registros
          </div>
          <nav v-if="pagination.last_page > 1">
            <ul class="pagination pagination-sm mb-0 shadow-sm">
              <li class="page-item" :class="{ disabled: pagination.current_page === 1 }">
                <button class="page-link shadow-none" @click="cargarZonas(pagination.current_page - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              <li v-for="page in pagination.last_page" :key="page" class="page-item" 
                  :class="{ active: pagination.current_page === page }">
                <button class="page-link shadow-none custom-page-btn" @click="cargarZonas(page)">{{ page }}</button>
              </li>
              <li class="page-item" :class="{ disabled: pagination.current_page === pagination.last_page }">
                <button class="page-link shadow-none" @click="cargarZonas(pagination.current_page + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal CRUD Zona -->
    <div class="modal fade" id="modalZona" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">
              <i class="bi bi-pin-map-fill me-2 text-primary"></i>
              {{ isEditing ? 'Editar Zona' : 'Registrar Nueva Zona' }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" ref="btnCerrarModalZona"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarZona">
              
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="form-label small fw-bold text-muted mb-0">Seleccionar Ciudad *</label>
                  <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fw-bold" 
                          data-bs-toggle="modal" data-bs-target="#modalNuevaCiudad" @click="nuevaCiudadRapida">
                    <i class="bi bi-plus-circle me-1"></i> Nueva Ciudad
                  </button>
                </div>
                <LiveSearchSelect 
                  v-model="zonaForm.ciudad_id"
                  :options="ciudades"
                  displayKey="nombre"
                  subKey="departamento"
                  valueKey="id"
                  placeholder="Escribe para buscar ciudad..."
                  :hasError="!!erroresValidacion.ciudad_id"
                />
                <div class="text-danger smaller mt-1" v-if="erroresValidacion.ciudad_id">{{ erroresValidacion.ciudad_id[0] }}</div>
              </div>

              <div class="mb-4">
                <label class="form-label small fw-bold text-muted mb-1">Nombre de la Zona / Urbanización *</label>
                <input type="text" class="form-control bg-light border-0 shadow-none" 
                       v-model="zonaForm.nombre" :class="{ 'is-invalid': erroresValidacion.nombre }" required
                       placeholder="Ej: Satélite Norte">
                <div class="invalid-feedback" v-if="erroresValidacion.nombre">{{ erroresValidacion.nombre[0] }}</div>
              </div>

              <!-- <div v-if="isEditing" class="mb-4 form-check form-switch d-flex align-items-center ms-1">
                <input class="form-check-input shadow-none fs-5 me-2 custom-switch" type="checkbox" v-model="zonaForm.estado">
                <label class="form-check-label text-muted fw-medium mt-1">
                  {{ zonaForm.estado ? 'Zona Activa' : 'Zona Inactiva' }}
                </label>
              </div> -->

              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-light shadow-none border" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary shadow-sm border-0 px-4" 
                        style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ guardando ? 'Guardando...' : (isEditing ? 'Actualizar Zona' : 'Guardar Zona') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Nueva Ciudad (Acceso Rápido) -->
    <div class="modal fade" id="modalNuevaCiudad" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-light border-bottom-0 pb-2">
            <h6 class="modal-title fw-bold">Nueva Ciudad</h6>
            <button type="button" class="btn-close shadow-none" data-bs-toggle="modal" data-bs-target="#modalZona" ref="btnCerrarModalCiudad"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="guardarCiudadRapida">
              <div class="mb-3">
                <label class="form-label smaller fw-bold text-muted mb-1">Nombre</label>
                <input type="text" class="form-control form-control-sm bg-light border-0" v-model="ciudadForm.nombre" required>
                <div class="text-danger smaller" v-if="erroresValidacionCiudad.nombre">{{ erroresValidacionCiudad.nombre[0] }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label smaller fw-bold text-muted mb-1">Departamento</label>
                <input type="text" class="form-control form-control-sm bg-light border-0" v-model="ciudadForm.departamento" required>
                <div class="text-danger smaller" v-if="erroresValidacionCiudad.departamento">{{ erroresValidacionCiudad.departamento[0] }}</div>
              </div>
              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary btn-sm border-0" style="background-color: var(--primary-color);" :disabled="guardandoCiudad">
                  <span v-if="guardandoCiudad" class="spinner-border spinner-border-sm me-1"></span>
                  Guardar y Seleccionar
                </button>
                <button type="button" class="btn btn-light btn-sm border" data-bs-toggle="modal" data-bs-target="#modalZona">Volver</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ver Detalles -->
    <div class="modal fade" id="modalDetalle" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-light border-bottom-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">Información de la Zona</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" v-if="zonaDetalle">
            <div class="d-flex align-items-center mb-4">
              <div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                <i class="bi bi-pin-map-fill fs-3 text-primary"></i>
              </div>
              <div>
                <h4 class="mb-0 fw-bold">{{ zonaDetalle.nombre }}</h4>
                <p class="text-muted mb-0">Zona / Urbanización</p>
              </div>
            </div>
            <hr class="text-muted opacity-25">
            <div class="row g-4">
              <div class="col-12">
                <div class="p-3 rounded bg-light border-start border-4 border-primary">
                  <label class="smaller text-muted d-block text-uppercase fw-bold mb-1">Ubicación Geográfica</label>
                  <div class="d-flex align-items-center">
                    <i class="bi bi-building me-2 text-primary"></i>
                    <span class="fw-bold fs-5">{{ zonaDetalle.ciudad?.nombre }}</span>
                  </div>
                  <div class="ms-4 text-muted small">{{ zonaDetalle.ciudad?.departamento }}, Bolivia</div>
                </div>
              </div>
              <div class="col-6">
                <label class="smaller text-muted d-block">ID Registro</label>
                <span class="fw-semibold">#{{ zonaDetalle.id }}</span>
              </div>
              <div class="col-6 text-end">
                <label class="smaller text-muted d-block">Fecha de Registro</label>
                <span class="small text-muted">{{ new Date(zonaDetalle.created_at).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0">
            <button type="button" class="btn btn-primary w-100 shadow-sm border-0" 
                    style="background-color: var(--primary-color);" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.card-custom { border-radius: 12px; background-color: var(--bg-card); }
.smaller { font-size: 0.75rem; }
.cursor-pointer { cursor: pointer; }
.hover-danger:hover { color: #dc3545 !important; }
.transition-all { transition: all 0.2s ease-in-out; }

.page-link {
  color: var(--text-main);
  border: none;
  background-color: var(--bg-card);
  margin: 0 2px;
  border-radius: 4px;
}

.page-item.active .custom-page-btn {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
}
.custom-page-btn { color: var(--text-main); font-weight: 500; }

.btn-primary:active, .btn-primary:focus {
  background-color: var(--primary-color) !important;
  opacity: 0.9;
}

[data-theme="dark"] .bg-light { background-color: #252525 !important; }
[data-theme="dark"] .input-group-text.bg-white { background-color: #2a2a2a !important; border-color: #444 !important;}
[data-theme="dark"] .form-control, [data-theme="dark"] .form-select { background-color: #2a2a2a; color: white; border-color: #444 !important;}
[data-theme="dark"] .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
[data-theme="dark"] .page-link { background-color: #2a2a2a; border-color: #444; color: #ccc;}
</style>
