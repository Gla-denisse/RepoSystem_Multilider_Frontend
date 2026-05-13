<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// ==========================================
// 1. ESTADO Y VARIABLES
// ==========================================
const ciudades = ref([])
const cargando = ref(true)
const guardando = ref(false)

// Paginación
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0
})

// Filtros
const filtros = ref({
  buscar: ''
})

// Modal CRUD (Crear/Editar)
const isEditing = ref(false)
const ciudadForm = ref({
  id: null,
  nombre: '',
  departamento: '',
  estado: true
})
const btnCerrarModal = ref(null)
const erroresValidacion = ref({})

// Modal Ver Detalles
const ciudadDetalle = ref(null)

// ==========================================
// 2. CARGA DE DATOS
// ==========================================
const cargarCiudades = async (page = 1) => {
  try {
    cargando.value = true
    const params = {
      page,
      per_page: pagination.value.per_page,
      search: filtros.value.buscar
    }
    
    const res = await api.get('/ciudades', { params })
    
    // Según contexto_api_ciudades.md: respuesta.data.data
    ciudades.value = res.data.data
    pagination.value = {
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      per_page: res.data.per_page,
      total: res.data.total
    }
  } catch (error) {
    console.error("Error al cargar ciudades:", error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudieron cargar las ciudades.',
      confirmButtonColor: 'var(--primary-color)'
    })
  } finally {
    cargando.value = false
  }
}

// Watcher para búsqueda reactiva con Debounce
let timeoutBusqueda = null
watch(() => filtros.value.buscar, () => {
  if (timeoutBusqueda) clearTimeout(timeoutBusqueda)
  timeoutBusqueda = setTimeout(() => {
    cargarCiudades(1)
  }, 500) // Espera 500ms antes de disparar la búsqueda
})

// ==========================================
// 3. LÓGICA CRUD
// ==========================================
const nuevaCiudad = () => {
  isEditing.value = false
  ciudadForm.value = { id: null, nombre: '', departamento: '', estado: true }
  erroresValidacion.value = {}
}

const editarCiudad = (item) => {
  isEditing.value = true
  ciudadForm.value = { 
    ...item,
    estado: item.estado == 1 || item.estado === true
  }
  erroresValidacion.value = {}
}

const verCiudad = (item) => {
  ciudadDetalle.value = item
}

const guardarCiudad = async () => {
  erroresValidacion.value = {}
  guardando.value = true
  try {
    if (isEditing.value) {
      await api.put(`/ciudades/${ciudadForm.value.id}`, ciudadForm.value)
    } else {
      await api.post('/ciudades', ciudadForm.value)
    }

    await cargarCiudades(pagination.value.current_page)
    btnCerrarModal.value.click()
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditing.value ? 'Ciudad actualizada' : 'Ciudad creada',
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
        text: 'Ocurrió un error al intentar guardar la ciudad.',
        confirmButtonColor: 'var(--primary-color)'
      })
    }
  } finally {
    guardando.value = false
  }
}

const toggleEstadoCiudad = (item) => {
  const isActivo = item.estado == 1 || item.estado === true;
  const accionTxt = isActivo ? 'Desactivar' : 'Activar';
  const tituloTxt = isActivo ? '¿Desactivar ciudad?' : '¿Activar ciudad?';
  
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
        await api.delete(`/ciudades/${item.id}`)
        await cargarCiudades(pagination.value.current_page)
        Swal.fire({
          title: `¡${isActivo ? 'Desactivada' : 'Activada'}!`,
          text: `La ciudad ha sido ${isActivo ? 'desactivada' : 'activada'} con éxito.`,
          icon: 'success',
          confirmButtonColor: 'var(--primary-color)'
        })
      } catch (error) {
        Swal.fire('Error', `No se pudo ${accionTxt.toLowerCase()} la ciudad.`, 'error')
      }
    }
  })
}

onMounted(() => {
  cargarCiudades()
})
</script>

<template>
  <div class="container-fluid py-4">
    
    <!-- Encabezado de Pantalla -->
    <div class="row align-items-center mb-4">
      <div class="col-md-5 mb-3 mb-md-0">
        <h2 class="h4 fw-bold mb-0" style="color: var(--text-main);">Gestión de Ciudades</h2>
        <p class="text-muted small mb-0">Registra y administra las ciudades disponibles en el sistema.</p>
      </div>
      
      <div class="col-md-7 d-flex justify-content-md-end gap-2">
        <div class="input-group" style="max-width: 350px;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
          <input type="text" class="form-control border-start-0 border-end-0 ps-0 shadow-none" 
                 v-model="filtros.buscar" placeholder="Buscar por nombre o dpto...">
          <span class="input-group-text bg-white border-start-0 cursor-pointer" v-if="filtros.buscar" @click="filtros.buscar = ''" title="Limpiar">
            <i class="bi bi-x-circle-fill text-muted hover-danger transition-all"></i>
          </span>
          <span class="input-group-text bg-white border-start-0" v-else></span>
          <button class="btn btn-secondary shadow-none px-3" @click="cargarCiudades(1)" type="button">Buscar</button>
        </div>
        
        <button class="btn btn-primary d-flex align-items-center gap-2 shadow-sm border-0 px-3" 
                style="background-color: var(--primary-color);" 
                data-bs-toggle="modal" data-bs-target="#modalCiudad" @click="nuevaCiudad">
          <i class="bi bi-plus-lg"></i> Nueva
        </button>
      </div>
    </div>

    <!-- Tarjeta de Listado -->
    <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3">
      <div class="card-body p-0">
        <div v-if="cargando" class="text-center p-5">
          <div class="spinner-border text-primary" role="status"></div>
          <div class="mt-2 text-muted small">Cargando ciudades...</div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-muted small text-uppercase">
              <tr>
                <th class="ps-4 border-0">ID</th>
                <th class="border-0">Ciudad</th>
                <th class="border-0">Departamento</th>
                <th class="border-0">Estado</th>
                <th class="text-end pe-4 border-0">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ciudad in ciudades" :key="ciudad.id">
                <td class="ps-4 fw-medium text-muted">#{{ ciudad.id }}</td>
                <td><span class="fw-bold" style="color: var(--text-main);">{{ ciudad.nombre }}</span></td>
                <td>{{ ciudad.departamento }}</td>
                <td>
                  <span v-if="ciudad.estado == 1 || ciudad.estado === true"
                    class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Activo</span>
                  <span v-else
                    class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-light border" title="Ver Detalles"
                            data-bs-toggle="modal" data-bs-target="#modalDetalle" @click="verCiudad(ciudad)">
                      <i class="bi bi-eye text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" title="Editar"
                            data-bs-toggle="modal" data-bs-target="#modalCiudad" @click="editarCiudad(ciudad)">
                      <i class="bi bi-pencil-square text-info"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" 
                            @click="toggleEstadoCiudad(ciudad)"
                            :title="ciudad.estado == 1 || ciudad.estado === true ? 'Desactivar Ciudad' : 'Activar Ciudad'">
                      <i class="bi" :class="ciudad.estado == 1 || ciudad.estado === true ? 'bi-trash text-danger' : 'bi-check-circle text-success'"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="ciudades.length === 0">
                <td colspan="5" class="text-center py-5 text-muted">No se encontraron ciudades.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer con Paginación -->
      <div class="card-footer bg-transparent border-top p-4">
        <div class="d-flex justify-content-between align-items-center">
          <div class="small text-muted">
            Mostrando {{ ciudades.length }} de {{ pagination.total }} registros
          </div>
          <nav v-if="pagination.last_page > 1">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: pagination.current_page === 1 }">
                <a class="page-link shadow-none" href="#" @click.prevent="cargarCiudades(pagination.current_page - 1)">
                  <i class="bi bi-chevron-left"></i>
                </a>
              </li>
              <li v-for="page in pagination.last_page" :key="page" class="page-item" 
                  :class="{ active: pagination.current_page === page }">
                <a class="page-link shadow-none" href="#" @click.prevent="cargarCiudades(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: pagination.current_page === pagination.last_page }">
                <a class="page-link shadow-none" href="#" @click.prevent="cargarCiudades(pagination.current_page + 1)">
                  <i class="bi bi-chevron-right"></i>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal CRUD -->
    <div class="modal fade" id="modalCiudad" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">
              {{ isEditing ? 'Editar Ciudad' : 'Nueva Ciudad' }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" ref="btnCerrarModal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarCiudad">
              <div class="mb-3">
                <label class="form-label small fw-bold text-muted mb-1">Nombre de la Ciudad *</label>
                <input type="text" class="form-control bg-light border-0 shadow-none" 
                       v-model="ciudadForm.nombre" :class="{ 'is-invalid': erroresValidacion.nombre }" required>
                <div class="invalid-feedback" v-if="erroresValidacion.nombre">{{ erroresValidacion.nombre[0] }}</div>
              </div>
              <div class="mb-4">
                <label class="form-label small fw-bold text-muted mb-1">Departamento *</label>
                <input type="text" class="form-control bg-light border-0 shadow-none" 
                       v-model="ciudadForm.departamento" :class="{ 'is-invalid': erroresValidacion.departamento }" required>
                <div class="invalid-feedback" v-if="erroresValidacion.departamento">{{ erroresValidacion.departamento[0] }}</div>
              </div>

              <!-- <div v-if="isEditing" class="mb-4 form-check form-switch d-flex align-items-center ms-1">
                <input class="form-check-input shadow-none fs-5 me-2 custom-switch" type="checkbox" v-model="ciudadForm.estado">
                <label class="form-check-label text-muted fw-medium mt-1">
                  {{ ciudadForm.estado ? 'Ciudad Activa' : 'Ciudad Inactiva' }}
                </label>
              </div> -->

              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-light shadow-none" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary shadow-sm border-0" 
                        style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ isEditing ? 'Actualizar Ciudad' : 'Guardar Ciudad' }}
                </button>
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
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">Detalles de la Ciudad</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" v-if="ciudadDetalle">
            <div class="d-flex align-items-center mb-4">
              <div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                <i class="bi bi-geo-alt-fill fs-3 text-primary"></i>
              </div>
              <div>
                <h4 class="mb-0 fw-bold">{{ ciudadDetalle.nombre }}</h4>
                <p class="text-muted mb-0">{{ ciudadDetalle.departamento }}</p>
              </div>
            </div>
            <hr class="text-muted opacity-25">
            <div class="row g-3">
              <div class="col-6">
                <label class="small text-muted d-block">ID de Registro</label>
                <span class="fw-semibold">#{{ ciudadDetalle.id }}</span>
              </div>
              <div class="col-6 text-end">
                <label class="small text-muted d-block">Estado</label>
                <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill">Operativo</span>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0">
            <button type="button" class="btn btn-primary w-100 shadow-sm border-0" 
                    style="background-color: var(--primary-color);" data-bs-dismiss="modal">Entendido</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.card-custom {
  border-radius: 12px;
  background-color: var(--bg-card);
}

.page-link {
  color: var(--text-main);
  border: none;
  background-color: var(--bg-card);
  margin: 0 2px;
  border-radius: 4px;
}

.page-item.active .page-link {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

.btn-primary:active, .btn-primary:focus {
  background-color: var(--primary-color) !important;
  opacity: 0.9;
}

.custom-switch:checked {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

.cursor-pointer { cursor: pointer; }
.hover-danger:hover { color: #dc3545 !important; }
.transition-all { transition: all 0.2s ease-in-out; }

[data-theme="dark"] .bg-light { background-color: #252525 !important; }
[data-theme="dark"] .input-group-text.bg-white { background-color: #2a2a2a !important; border-color: #444 !important;}
[data-theme="dark"] .form-control.border-start-0 { border-color: #444 !important; background-color: #2a2a2a; color: white;}
[data-theme="dark"] .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
[data-theme="dark"] .page-link { background-color: #2a2a2a; border-color: #444; color: #ccc;}
[data-theme="dark"] .page-item.disabled .page-link { background-color: #1a1a1a; color: #666; }
</style>
