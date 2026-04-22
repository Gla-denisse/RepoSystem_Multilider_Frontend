<script setup>
import { ref, onMounted, computed } from 'vue' // <-- IMPORTAMOS computed
import api from '../api/axios'
import Swal from 'sweetalert2'

// Variables Generales
const propietarios = ref([])
const cargando = ref(true)
const guardando = ref(false)

// Paginación y Búsqueda
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

// Variables Modal Propietarios (Crear/Editar)
const isEditing = ref(false)
const propietarioForm = ref({
  id: null, ci: '', lugar_expedicion: '', nombre_completo: '', telefono: '', correo: '', direccion: ''
})
const btnCerrarModal = ref(null)
const erroresValidacion = ref({})

// Variables Modal "VER Detalles"
const propietarioSeleccionado = ref(null)

// ==========================================
// 1. CARGA BASE (PAGINACIÓN Y BÚSQUEDA)
// ==========================================
const cargarDatosBase = async (page = 1) => {
  try {
    cargando.value = true
    const res = await api.get(`/propietarios?page=${page}&search=${searchQuery.value}`)
    
    propietarios.value = res.data.data 
    currentPage.value = res.data.current_page
    totalPages.value = res.data.last_page
  } catch (error) {
    console.error("Error al cargar propietarios:", error)
  } finally {
    cargando.value = false
  }
}

// LÓGICA DE BÚSQUEDA
const buscar = () => {
  cargarDatosBase(1)
}

const limpiarBusqueda = () => {
  searchQuery.value = ''
  buscar()
}

// LÓGICA DE PAGINACIÓN NUMÉRICA (Muestra un máximo de 5 números a la vez)
const paginasVisibles = computed(() => {
  let pages = []
  const maxVisible = 5 
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = start + maxVisible - 1

  if (end > totalPages.value) {
    end = totalPages.value
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// ==========================================
// 2. PREPARAR FORMULARIOS Y VISTAS
// ==========================================
const nuevoPropietario = () => {
  isEditing.value = false
  propietarioForm.value = { id: null, ci: '', lugar_expedicion: '', nombre_completo: '', telefono: '', correo: '', direccion: '' }
  erroresValidacion.value = {}
}

const editarPropietario = (prop) => {
  isEditing.value = true
  propietarioForm.value = { ...prop }
  erroresValidacion.value = {}
}

const verPropietario = (prop) => {
  propietarioSeleccionado.value = prop
}

// ==========================================
// 3. GUARDAR (POST / PUT)
// ==========================================
const guardarPropietario = async () => {
  erroresValidacion.value = {}
  guardando.value = true

  try {
    if (isEditing.value) {
      await api.put(`/propietarios/${propietarioForm.value.id}`, propietarioForm.value)
    } else {
      await api.post('/propietarios', propietarioForm.value)
    }
    
    await cargarDatosBase(currentPage.value)
    
    guardando.value = false 
    btnCerrarModal.value.click()

    Swal.fire({
      toast: true, position: 'top-end', icon: 'success',
      title: isEditing.value ? 'Propietario actualizado' : 'Propietario registrado',
      showConfirmButton: false, timer: 3000, timerProgressBar: true
    })

  } catch (error) {
    if (error.response && error.response.status === 422) {
      erroresValidacion.value = error.response.data.errors;
      let mensajeHtml = "<ul style='text-align: left; font-size: 0.9rem;'>";
      for (const campo in erroresValidacion.value) {
        mensajeHtml += `<li>${erroresValidacion.value[campo].join('</li><li>')}</li>`;
      }
      mensajeHtml += "</ul>";
      Swal.fire({ icon: 'warning', title: 'Verifica los datos', html: mensajeHtml, confirmButtonColor: '#a28bfa' });
    } else {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Ocurrió un error al guardar.', confirmButtonColor: '#a28bfa' });
    }
  } finally {
    guardando.value = false
  }
}

// ==========================================
// 4. ACTIVAR / DESACTIVAR (TOGGLE)
// ==========================================
const toggleEstadoPropietario = async (prop) => {
  const isActivo = prop.estado == 1 || prop.estado === true;
  const accionTxt = isActivo ? 'Desactivar' : 'Activar';
  const btnColor = isActivo ? '#fb7185' : '#a28bfa';

  Swal.fire({
    title: `¿${accionTxt} propietario?`,
    text: "Cambiará la disponibilidad en el sistema.",
    icon: isActivo ? 'warning' : 'info',
    showCancelButton: true, confirmButtonColor: btnColor, cancelButtonColor: '#9ca3af',
    confirmButtonText: `Sí, ${accionTxt.toLowerCase()}`, cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.delete(`/propietarios/${prop.id}`)
        await cargarDatosBase(currentPage.value)
        Swal.fire({ title: `¡Éxito!`, icon: 'success', showConfirmButton: false, timer: 1500 })
      } catch (error) { 
        Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo procesar.` })
      }
    }
  })
}

onMounted(() => {
  cargarDatosBase()
})
</script>

<template>
  <div class="propietarios-container pb-5">
    
    <div class="row align-items-center mb-4">
      <div class="col-md-5 mb-3 mb-md-0">
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Directorio de Propietarios</h2>
        <p class="text-muted mb-0 fs-6">Administra los dueños de los lotes y propiedades.</p>
      </div>
      <div class="col-md-7 d-flex justify-content-md-end gap-2">
        
        <div class="input-group" style="max-width: 350px;">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
          <input type="text" class="form-control border-start-0 border-end-0 ps-0 shadow-none" 
                 v-model="searchQuery" @keyup.enter="buscar" placeholder="Buscar CI o Nombre...">
          
          <span class="input-group-text bg-white border-start-0 cursor-pointer" 
                v-if="searchQuery" @click="limpiarBusqueda" title="Limpiar búsqueda">
            <i class="bi bi-x-circle-fill text-muted hover-danger transition-all"></i>
          </span>
          <span class="input-group-text bg-white border-start-0" v-else></span>

          <button class="btn btn-secondary shadow-none px-3" @click="buscar" type="button">Buscar</button>
        </div>
        
        <button class="btn btn-primary d-flex align-items-center gap-2 border-0 shadow-sm" style="background-color: var(--primary-color);" data-bs-toggle="modal" data-bs-target="#modalPropietario" @click="nuevoPropietario">
          <i class="bi bi-person-plus-fill"></i> Nuevo
        </button>
      </div>
    </div>

    <div class="card card-custom border-0 shadow-sm mb-3">
      <div class="card-body p-0">
        <div v-if="cargando" class="text-center p-5">
          <div class="spinner-border" style="color: var(--primary-color);" role="status"></div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light text-muted" style="font-size: 0.85rem; text-transform: uppercase;">
              <tr>
                <th class="ps-4 border-0 rounded-start">Cédula</th>
                <th class="border-0">Nombre Completo</th>
                <th class="border-0">Contacto</th>
                <th class="border-0 text-center">Estado</th>
                <th class="text-end pe-4 border-0 rounded-end">Acciones</th>
              </tr>
            </thead>
            <tbody style="border-top: none;">
              <tr v-if="propietarios.length === 0">
                <td colspan="5" class="text-center py-5 text-muted">
                  <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                  No se encontraron resultados para "{{ searchQuery }}".
                </td>
              </tr>
              <tr v-for="prop in propietarios" :key="prop.id">
                <td class="ps-4">
                  <span class="fw-medium text-dark">{{ prop.ci }}</span> <span class="text-muted small ms-1">{{ prop.lugar_expedicion }}</span>
                </td>
                <td>
                  <div class="fw-semibold" style="color: var(--text-main);">{{ prop.nombre_completo }}</div>
                </td>
                <td>
                  <div class="small text-muted">{{ prop.telefono || 'Sin teléfono' }}</div>
                </td>
                <td class="text-center">
                  <span v-if="prop.estado == 1" class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill">Activo</span>
                  <span v-else class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal" data-bs-target="#modalVerPropietario" @click="verPropietario(prop)" title="Ver Detalles">
                    <i class="bi bi-eye text-primary"></i>
                  </button>
                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal" data-bs-target="#modalPropietario" @click="editarPropietario(prop)" title="Editar">
                    <i class="bi bi-pencil-square" style="color: var(--primary-color);"></i>
                  </button>
                  <button class="btn btn-sm btn-light custom-action-btn" @click="toggleEstadoPropietario(prop)" :title="prop.estado == 1 ? 'Desactivar' : 'Activar'">
                    <i class="bi" :class="prop.estado == 1 ? 'bi-trash text-danger' : 'bi-check-circle text-success'"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <nav v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
      <small class="text-muted">Mostrando página {{ currentPage }} de {{ totalPages }}</small>
      <ul class="pagination pagination-sm mb-0 shadow-sm">
        
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link shadow-none text-secondary" @click="cargarDatosBase(currentPage - 1)">
            <i class="bi bi-chevron-left"></i>
          </button>
        </li>
        
        <li class="page-item" v-for="page in paginasVisibles" :key="page" :class="{ active: currentPage === page }">
          <button class="page-link shadow-none custom-page-btn" @click="cargarDatosBase(page)">
            {{ page }}
          </button>
        </li>

        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link shadow-none text-secondary" @click="cargarDatosBase(currentPage + 1)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </li>

      </ul>
    </nav>

    <div class="modal fade" id="modalPropietario" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">
              <i class="bi bi-person-lines-fill me-2" style="color: var(--primary-color);"></i>
              {{ isEditing ? 'Editar Propietario' : 'Registrar Propietario' }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" :disabled="guardando"></button>
            <button type="button" class="d-none" data-bs-dismiss="modal" ref="btnCerrarModal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarPropietario">
              <div class="row mb-3">
                <div class="col-md-8">
                  <label class="form-label text-muted fw-medium fs-6">Cédula de Identidad *</label>
                  <input type="text" class="form-control shadow-none bg-light border-0" :class="{ 'is-invalid border-danger': erroresValidacion.ci }" v-model="propietarioForm.ci" required>
                  <div class="invalid-feedback">{{ erroresValidacion.ci?.[0] }}</div>
                </div>
                <div class="col-md-4">
                  <label class="form-label text-muted fw-medium fs-6">Expedido en</label>
                  <select class="form-select shadow-none bg-light border-0" v-model="propietarioForm.lugar_expedicion">
                    <option value="" disabled>Seleccione...</option>
                    <option value="SC">SC</option><option value="LP">LP</option><option value="CB">CB</option>
                    <option value="OR">OR</option><option value="PT">PT</option><option value="TJ">TJ</option>
                    <option value="CH">CH</option><option value="BE">BE</option><option value="PD">PD</option>
                  </select>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Nombre Completo *</label>
                <input type="text" class="form-control shadow-none bg-light border-0" :class="{ 'is-invalid border-danger': erroresValidacion.nombre_completo }" v-model="propietarioForm.nombre_completo" required>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label text-muted fw-medium fs-6">Teléfono / Celular</label>
                  <input type="text" class="form-control shadow-none bg-light border-0" v-model="propietarioForm.telefono">
                </div>
                <div class="col-md-6">
                  <label class="form-label text-muted fw-medium fs-6">Correo Electrónico</label>
                  <input type="email" class="form-control shadow-none bg-light border-0" v-model="propietarioForm.correo">
                </div>
              </div>
              <div class="mb-4">
                <label class="form-label text-muted fw-medium fs-6">Dirección de Residencia</label>
                <textarea class="form-control shadow-none bg-light border-0" v-model="propietarioForm.direccion" rows="2"></textarea>
              </div>
              <div class="d-flex justify-content-end gap-2 pt-2 border-top">
                <button type="button" class="btn btn-light shadow-none px-4" data-bs-dismiss="modal" :disabled="guardando">Cancelar</button>
                <button type="submit" class="btn btn-primary border-0 shadow-sm px-4" style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span> {{ guardando ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalVerPropietario" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          <div class="modal-header bg-light border-bottom-0 pb-3 p-4">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-vcard text-primary me-2"></i> Perfil del Propietario
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" v-if="propietarioSeleccionado">
            <div class="text-center mb-4">
              <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style="width: 70px; height: 70px;">
                <i class="bi bi-person-fill fs-1"></i>
              </div>
              <h5 class="fw-bold mb-1">{{ propietarioSeleccionado.nombre_completo }}</h5>
              <span v-if="propietarioSeleccionado.estado == 1" class="badge bg-success rounded-pill">Sistema Activo</span>
              <span v-else class="badge bg-danger rounded-pill">Sistema Inactivo</span>
            </div>
            <div class="card bg-light border-0 shadow-none mb-3">
              <div class="card-body">
                <div class="row mb-2">
                  <div class="col-5 text-muted small fw-bold">Cédula (CI)</div>
                  <div class="col-7 fw-medium">{{ propietarioSeleccionado.ci }} {{ propietarioSeleccionado.lugar_expedicion }}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-5 text-muted small fw-bold">Teléfono</div>
                  <div class="col-7">{{ propietarioSeleccionado.telefono || '-' }}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-5 text-muted small fw-bold">Correo</div>
                  <div class="col-7 text-truncate" :title="propietarioSeleccionado.correo">{{ propietarioSeleccionado.correo || '-' }}</div>
                </div>
                <div class="row">
                  <div class="col-5 text-muted small fw-bold">Dirección</div>
                  <div class="col-7">{{ propietarioSeleccionado.direccion || 'No registrada' }}</div>
                </div>
              </div>
            </div>
            <div class="text-end mt-4">
              <button type="button" class="btn btn-secondary px-4 shadow-none" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.form-control:focus, .form-select:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}

.custom-action-btn { background-color: transparent; border: 1px solid transparent; transition: all 0.2s; }
.custom-action-btn:hover { background-color: var(--border-color); }

/* UTILIDADES NUEVAS */
.cursor-pointer { cursor: pointer; }
.hover-danger:hover { color: #dc3545 !important; }
.transition-all { transition: all 0.2s ease-in-out; }

/* ESTILOS DE PAGINACIÓN */
.page-item.active .custom-page-btn {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  color: white !important;
}
.custom-page-btn {
  color: var(--text-main);
  font-weight: 500;
}

/* Ajustes Modal modo oscuro */
[data-theme="dark"] .modal-content .bg-light { background-color: #2a2a2a !important; color: var(--text-main); }
[data-theme="dark"] .input-group-text.bg-white { background-color: #2a2a2a !important; border-color: #444 !important;}
[data-theme="dark"] .form-control.border-start-0 { border-color: #444 !important; background-color: #2a2a2a; color: white;}
[data-theme="dark"] .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
[data-theme="dark"] .page-link { background-color: #2a2a2a; border-color: #444; color: #ccc;}
[data-theme="dark"] .page-item.disabled .page-link { background-color: #1a1a1a; color: #666; }
</style>