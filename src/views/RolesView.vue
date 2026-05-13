<script setup>
import { ref, onMounted, nextTick } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2' // <-- IMPORTAMOS SWEETALERT2

// Variables Generales
const roles = ref([])
const permisosBase = ref([])
const cargando = ref(true)
const guardando = ref(false)

// Variables Modal Roles
const isEditing = ref(false)
const rolForm = ref({ id: null, nombre: '', descripcion: '', estado: true })
const btnCerrarModal = ref(null)
const erroresValidacion = ref({}) // <-- NUEVA VARIABLE PARA ERRORES EN EL INPUT

// Variables para el Panel de Asignación
const rolSeleccionado = ref(null)
const cargandoAsignaciones = ref(false)
const asignacionPanel = ref(null)

// ==========================================
// 1. CARGA BASE
// ==========================================
const cargarDatosBase = async () => {
  try {
    cargando.value = true
    const [resRoles, resPermisos] = await Promise.all([
      api.get('/roles'),
      api.get('/permisos')
    ])
    roles.value = resRoles.data
    permisosBase.value = resPermisos.data.map(p => ({ ...p, asignado: false }))
  } catch (error) {
    console.error("Error al cargar datos:", error)
  } finally {
    cargando.value = false
  }
}

// ==========================================
// 2. CRUD DE ROLES (Crear/Editar/Eliminar)
// ==========================================
const nuevoRol = () => {
  isEditing.value = false
  rolForm.value = { id: null, nombre: '', descripcion: '', estado: true }
  erroresValidacion.value = {} // Limpiamos errores
}

const editarRol = (rol) => {
  isEditing.value = true
  rolForm.value = { ...rol, estado: rol.estado == 1 || rol.estado === true }
  erroresValidacion.value = {} // Limpiamos errores
}

const guardarRol = async () => {
  erroresValidacion.value = {} // Reiniciamos errores al intentar guardar
  guardando.value = true

  try {
    if (isEditing.value) {
      await api.put(`/roles/${rolForm.value.id}`, rolForm.value)
    } else {
      await api.post('/roles', rolForm.value)
    }
    
    await cargarDatosBase()
    btnCerrarModal.value.click()

    // Alerta Toast de éxito
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditing.value ? 'Rol actualizado' : 'Rol creado',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })

  } catch (error) {
    console.error(error)
    
    // Captura de errores de validación (Status 422)
    if (error.response && error.response.status === 422) {
      erroresValidacion.value = error.response.data.errors; 
      
      let mensajeHtml = "<ul style='text-align: left; font-size: 0.9rem;'>";
      for (const campo in erroresValidacion.value) {
        mensajeHtml += `<li>${erroresValidacion.value[campo].join('</li><li>')}</li>`;
      }
      mensajeHtml += "</ul>";

      Swal.fire({ icon: 'warning', title: 'Verifica los datos', html: mensajeHtml, confirmButtonColor: '#a28bfa' });
    } 
    else if (error.response && error.response.data && error.response.data.message) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response.data.message, confirmButtonColor: '#a28bfa' });
    } 
    else {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Ocurrió un error al guardar el rol.', confirmButtonColor: '#a28bfa' });
    }
  }
  finally {
    guardando.value = false // <-- APAGAMOS EL PRELOADER
  }
}

// ==========================================
// MÉTODO PARA ACTIVAR / DESACTIVAR (TOGGLE)
// ==========================================
const toggleEstadoRol = async (rol) => {
  // Verificamos el estado actual del rol
  const isActivo = rol.estado == 1 || rol.estado === true;
  
  // Textos dinámicos según la acción
  const accionTxt = isActivo ? 'Desactivar' : 'Activar';
  const tituloTxt = isActivo ? '¿Desactivar rol?' : '¿Activar rol?';
  const msjTxt = isActivo 
    ? "Los usuarios con este rol perderán sus accesos configurados." 
    : "Los usuarios con este rol recuperarán sus accesos al sistema.";
  
  // Colores dinámicos: Rojo para desactivar, Lila para activar
  const btnColor = isActivo ? '#fb7185' : '#a28bfa';

  Swal.fire({
    title: tituloTxt,
    text: msjTxt,
    icon: isActivo ? 'warning' : 'info',
    showCancelButton: true,
    confirmButtonColor: btnColor,
    cancelButtonColor: '#9ca3af', // Gris para cancelar
    confirmButtonText: `Sí, ${accionTxt.toLowerCase()}`,
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Llamamos a la misma ruta DELETE, pero ahora el backend hará un "toggle"
        await api.delete(`/roles/${rol.id}`)
        await cargarDatosBase()
        
        // Si desactivamos el rol que estábamos configurando en el panel inferior, cerramos el panel
        if(isActivo && rolSeleccionado.value && rolSeleccionado.value.id === rol.id) {
          cerrarPanelAsignacion()
        }
        
        // Alerta de éxito dinámica
        Swal.fire({ 
          title: `¡${isActivo ? 'Desactivado' : 'Activado'}!`, 
          text: `El rol ha sido ${isActivo ? 'desactivado' : 'activado'} con éxito.`, 
          icon: 'success', 
          confirmButtonColor: '#a28bfa' 
        })
      } catch (error) { 
        console.error(error)
        Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo ${accionTxt.toLowerCase()} el rol.`, confirmButtonColor: '#a28bfa' })
      }
    }
  })
}

// ==========================================
// 3. LÓGICA DE ASIGNACIÓN (PANEL INTEGRADO)
// ==========================================
const abrirPanelAsignacion = async (rol) => {
  rolSeleccionado.value = rol
  cargandoAsignaciones.value = true
  
  nextTick(() => { asignacionPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })

  try {
    permisosBase.value.forEach(p => p.asignado = false)
    const res = await api.get(`/roles/${rol.id}/permisos`)
    const permisosAsignadosIds = res.data

    permisosBase.value.forEach(p => {
      if (permisosAsignadosIds.includes(Number(p.id))) { p.asignado = true }
    })
  } catch (error) {
    console.error("Error cargando permisos:", error)
  } finally {
    cargandoAsignaciones.value = false
  }
}

const cerrarPanelAsignacion = () => {
  rolSeleccionado.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const guardarPermisosPanel = async () => {
  try {
    const permisosSeleccionados = permisosBase.value.filter(p => p.asignado === true).map(p => p.id)

    await api.post(`/roles/${rolSeleccionado.value.id}/permisos/sync`, {
      permisos: permisosSeleccionados
    })

    // CORRECCIÓN VITAL: Guardamos el nombre antes de limpiar la variable
    const nombreRol = rolSeleccionado.value.nombre;
    
    cerrarPanelAsignacion()
    
    // Alerta de éxito con SweetAlert
    Swal.fire({
      icon: 'success',
      title: '¡Permisos sincronizados!',
      text: `Se han configurado los accesos para el rol: ${nombreRol}.`,
      confirmButtonColor: '#a28bfa'
    })

  } catch (error) {
    console.error("Error al sincronizar:", error)
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: 'Ocurrió un error al sincronizar los permisos.',
      confirmButtonColor: '#a28bfa'
    })
  }
}

onMounted(() => {
  cargarDatosBase()
})
</script>

<template>
  <div class="roles-container pb-5">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Gestión de Roles</h2>
        <p class="text-muted mb-0 fs-6">Administra los accesos del sistema.</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 border-0 shadow-sm" style="background-color: var(--primary-color);" data-bs-toggle="modal" data-bs-target="#modalRol" @click="nuevoRol">
        <i class="bi bi-plus-lg"></i> Nuevo Rol
      </button>
    </div>

    <div class="card card-custom border-0 mb-4">
      <div class="card-body p-0">
        <div v-if="cargando" class="text-center p-5">
          <div class="spinner-border" style="color: var(--primary-color);" role="status"></div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light text-muted" style="font-size: 0.85rem; text-transform: uppercase;">
              <tr>
                <th class="ps-4 border-0 rounded-start">Rol</th>
                <th class="border-0">Estado</th>
                <th class="text-end pe-4 border-0 rounded-end">Acciones</th>
              </tr>
            </thead>
            <tbody style="border-top: none;">
              <tr v-for="rol in roles" :key="rol.id" :class="{'table-active-row': rolSeleccionado?.id === rol.id}">
                <td class="ps-4">
                  <div class="fw-semibold" style="color: var(--text-main);">{{ rol.nombre }}</div>
                  <small class="text-muted">{{ rol.descripcion }}</small>
                </td>
                <td>
                  <span v-if="rol.estado == 1 || rol.estado === true" class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Activo</span>
                  <span v-else class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  
                  <button class="btn btn-sm me-2 custom-action-btn" 
                          :class="rolSeleccionado?.id === rol.id ? 'btn-primary text-white' : 'btn-light text-info'" 
                          :style="rolSeleccionado?.id === rol.id ? `background-color: var(--primary-color); border-color: var(--primary-color);` : ''"
                          @click="abrirPanelAsignacion(rol)" title="Asignar Permisos">
                    <i class="bi bi-ui-checks"></i> Configurar
                  </button>

                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal" data-bs-target="#modalRol" @click="editarRol(rol)" title="Editar">
                    <i class="bi bi-pencil-square" style="color: var(--primary-color);"></i>
                  </button>
                  <button class="btn btn-sm btn-light custom-action-btn" 
                          @click="toggleEstadoRol(rol)" 
                          :title="rol.estado == 1 || rol.estado === true ? 'Desactivar Rol' : 'Activar Rol'">
                    <i class="bi" :class="rol.estado == 1 || rol.estado === true ? 'bi-trash text-danger' : 'bi-check-circle text-success'"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div ref="asignacionPanel"></div> <transition name="fade-slide">
      <div v-if="rolSeleccionado" class="card card-custom border-0 shadow-lg mt-4" style="border-top: 4px solid var(--primary-color) !important;">
        <div class="card-header bg-transparent border-bottom p-4 d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-0 fw-bold" style="color: var(--text-main);">
              <i class="bi bi-shield-lock me-2" style="color: var(--primary-color);"></i>
              Permisos para: <span style="color: var(--primary-color);">{{ rolSeleccionado.nombre }}</span>
            </h5>
            <small class="text-muted">Activa o desactiva las funciones que este rol puede ejecutar.</small>
          </div>
          <button type="button" class="btn-close shadow-none" @click="cerrarPanelAsignacion" title="Cerrar Panel"></button>
        </div>
        
        <div class="card-body p-4 bg-light bg-opacity-50">
          <div v-if="cargandoAsignaciones" class="text-center py-4">
            <div class="spinner-border spinner-border-sm" style="color: var(--primary-color);"></div> Cargando configuraciones...
          </div>
          
          <div v-else class="row g-3">
            <div v-if="permisosBase.length === 0" class="col-12 text-muted text-center py-3">
              No existen permisos creados en el sistema.
            </div>

            <div class="col-xl-3 col-lg-4 col-md-6 col-12" v-for="permiso in permisosBase" :key="permiso.id">
              <div class="p-3 border rounded h-100 d-flex justify-content-between align-items-center permission-card transition-all" 
                   :class="{'border-primary bg-primary bg-opacity-10': permiso.asignado, 'bg-card': !permiso.asignado}"
                   @click="permiso.asignado = !permiso.asignado" style="cursor: pointer;">
                
                <div class="pe-2 overflow-hidden">
                  <div class="fw-semibold text-truncate" :style="permiso.asignado ? 'color: var(--primary-color);' : 'color: var(--text-main);'">
                    {{ permiso.nombre }}
                  </div>
                  <div class="text-muted small text-truncate" style="font-size: 0.75rem;">
                    {{ permiso.descripcion || 'Sin descripción' }}
                  </div>
                </div>
                
                <div class="form-check form-switch mb-0" @click.stop>
                  <input class="form-check-input custom-switch shadow-none fs-4 m-0" type="checkbox" role="switch" v-model="permiso.asignado">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer bg-transparent border-top p-3 d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-light shadow-none" @click="cerrarPanelAsignacion">Cancelar</button>
          <button type="button" class="btn btn-primary border-0 shadow-sm" style="background-color: var(--primary-color);" @click="guardarPermisosPanel">
            <i class="bi bi-save me-1"></i> Guardar Cambios
          </button>
        </div>
      </div>
    </transition>

    <div class="modal fade" id="modalRol" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">{{ isEditing ? 'Editar Rol' : 'Nuevo Rol' }}</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" ref="btnCerrarModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="guardarRol">
              
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Nombre *</label>
                <input type="text" 
                       class="form-control shadow-none bg-light border-0" 
                       :class="{ 'is-invalid border-danger': erroresValidacion.nombre }"
                       v-model="rolForm.nombre" required>
                <div v-if="erroresValidacion.nombre" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.nombre[0] }}
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Descripción</label>
                <textarea class="form-control shadow-none bg-light border-0" 
                          :class="{ 'is-invalid border-danger': erroresValidacion.descripcion }"
                          v-model="rolForm.descripcion" rows="2"></textarea>
                <div v-if="erroresValidacion.descripcion" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.descripcion[0] }}
                </div>
              </div>
              
              <div v-if="isEditing" class="mb-4 form-check form-switch d-flex align-items-center">
                <input class="form-check-input shadow-none fs-5 me-2 custom-switch" type="checkbox" v-model="rolForm.estado">
                <label class="form-check-label text-muted fw-medium mt-1">{{ rolForm.estado ? 'Activo' : 'Inactivo' }}</label>
              </div>
              
              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-light shadow-none" data-bs-dismiss="modal" :disabled="guardando">
                  Cancelar
                </button>
                
                <button type="submit" class="btn btn-primary border-0 shadow-sm" style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  
                  {{ guardando ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Resaltar la fila seleccionada */
.table-active-row {
  background-color: rgba(162, 139, 250, 0.05) !important; /* Tu color lila con opacidad */
}

/* Efectos de la tarjeta de permiso (Grid) */
.permission-card {
  transition: all 0.2s ease;
  background-color: var(--bg-card);
}
.permission-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

/* Color personalizado para tu Toggle Lila */
.custom-switch:checked {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

/* Animación de entrada para el panel */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Estilos básicos reciclados */
.form-control:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}
.custom-action-btn { background-color: transparent; border: 1px solid transparent; transition: all 0.2s; }
.custom-action-btn:hover:not(.btn-primary) { background-color: var(--border-color); }
</style>