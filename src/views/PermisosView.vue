<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2' // <-- IMPORTAMOS SWEETALERT2

// Variables reactivas
const permisos = ref([])
const cargando = ref(true)

// Variables para el formulario
const isEditing = ref(false)
const permisoForm = ref({
  id: null,
  nombre: '',
  descripcion: ''
})

const btnCerrarModal = ref(null)
const erroresValidacion = ref({}) // <-- NUEVA VARIABLE PARA ERRORES EN EL INPUT
const guardando = ref(false)

// 1. OBTENER PERMISOS (GET)
const cargarPermisos = async () => {
  try {
    cargando.value = true
    const respuesta = await api.get('/permisos')
    permisos.value = respuesta.data
  } catch (error) {
    console.error("Error al cargar permisos:", error)
  } finally {
    cargando.value = false
  }
}

// 2. PREPARAR FORMULARIO PARA CREAR
const nuevoPermiso = () => {
  isEditing.value = false
  permisoForm.value = { id: null, nombre: '', descripcion: '' }
  erroresValidacion.value = {} // Limpiamos errores previos
}

// 3. PREPARAR FORMULARIO PARA EDITAR
const editarPermiso = (permiso) => {
  isEditing.value = true
  permisoForm.value = { ...permiso }
  erroresValidacion.value = {} // Limpiamos errores previos
}

// 4. GUARDAR O ACTUALIZAR (POST / PUT)
const guardarPermiso = async () => {
  erroresValidacion.value = {} // Reiniciamos los errores al intentar guardar
  guardando.value = true
  try {
    if (isEditing.value) {
      await api.put(`/permisos/${permisoForm.value.id}`, permisoForm.value)
    } else {
      await api.post('/permisos', permisoForm.value)
    }
    
    await cargarPermisos()
    btnCerrarModal.value.click()
    
    // Alerta Toast de éxito
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditing.value ? 'Permiso actualizado' : 'Permiso creado',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    
  } catch (error) {
    console.error("Error al guardar:", error)
    
    if (error.response && error.response.status === 422) {
      // Guardamos los errores para que los inputs se pongan rojos
      erroresValidacion.value = error.response.data.errors; 
      
      let mensajeHtml = "<ul style='text-align: left; font-size: 0.9rem;'>";
      for (const campo in erroresValidacion.value) {
        mensajeHtml += `<li>${erroresValidacion.value[campo].join('</li><li>')}</li>`;
      }
      mensajeHtml += "</ul>";

      Swal.fire({
        icon: 'warning',
        title: 'Verifica los datos',
        html: mensajeHtml,
        confirmButtonColor: '#a28bfa'
      });
    } else if (error.response && error.response.data && error.response.data.message) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response.data.message, confirmButtonColor: '#a28bfa' });
    } else {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Ocurrió un error al guardar el permiso.', confirmButtonColor: '#a28bfa' });
    }
  }
  finally {
    guardando.value = false
  }
}

// 5. ELIMINAR (DELETE)
const eliminarPermiso = async (id) => {
  // Reemplazamos el confirm() nativo
  Swal.fire({
    title: '¿Eliminar permiso?',
    text: "Si este permiso está asignado a un Rol, también se le quitará. Esta acción no se puede deshacer.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#a28bfa',
    cancelButtonColor: '#fb7185',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.delete(`/permisos/${id}`)
        await cargarPermisos()
        
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El permiso ha sido eliminado.',
          icon: 'success',
          confirmButtonColor: '#a28bfa'
        })
      } catch (error) {
        console.error("Error al eliminar:", error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el permiso.',
          confirmButtonColor: '#a28bfa'
        })
      }
    }
  })
}

onMounted(() => {
  cargarPermisos()
})
</script>

<template>
  <div class="permisos-container">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Gestión de Permisos</h2>
        <p class="text-muted mb-0 fs-6">Administra los permisos disponibles en el sistema.</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2" style="background-color: var(--primary-color); border-color: var(--primary-color);" data-bs-toggle="modal" data-bs-target="#modalPermiso" @click="nuevoPermiso">
        <i class="bi bi-plus-lg"></i> Nuevo Permiso
      </button>
    </div>

    <div class="card card-custom border-0">
      <div class="card-body p-0">
        
        <div v-if="cargando" class="text-center p-5">
          <div class="spinner-border" style="color: var(--primary-color);" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light text-muted" style="font-size: 0.85rem; text-transform: uppercase;">
              <tr>
                <th class="ps-4 fw-medium border-0 rounded-start">ID</th>
                <th class="fw-medium border-0">Nombre</th>
                <th class="fw-medium border-0">Descripción</th>
                <th class="text-end pe-4 fw-medium border-0 rounded-end">Acciones</th>
              </tr>
            </thead>
            <tbody style="border-top: none;">
              
              <tr v-if="permisos.length === 0">
                <td colspan="4" class="text-center py-4 text-muted">
                  No hay permisos registrados. ¡Crea el primero!
                </td>
              </tr>

              <tr v-for="permiso in permisos" :key="permiso.id">
                <td class="ps-4 text-muted">#{{ permiso.id }}</td>
                <td class="fw-semibold" style="color: var(--text-main);">{{ permiso.nombre }}</td>
                <td class="text-muted">{{ permiso.descripcion || 'Sin descripción' }}</td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal" data-bs-target="#modalPermiso" @click="editarPermiso(permiso)">
                    <i class="bi bi-pencil-square" style="color: var(--primary-color);"></i>
                  </button>
                  <button class="btn btn-sm btn-light custom-action-btn" @click="eliminarPermiso(permiso.id)">
                    <i class="bi bi-trash text-danger"></i>
                  </button>
                </td>
              </tr>
              
            </tbody>
          </table>
        </div>
        
      </div>
    </div>

    <div class="modal fade" id="modalPermiso" tabindex="-1" aria-labelledby="modalPermisoLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" id="modalPermisoLabel" style="color: var(--text-main);">
              {{ isEditing ? 'Editar Permiso' : 'Nuevo Permiso' }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" ref="btnCerrarModal"></button>
          </div>
          
          <div class="modal-body">
            <form @submit.prevent="guardarPermiso">
              
              <div class="mb-3">
                <label for="nombre" class="form-label text-muted fw-medium fs-6">Nombre del Permiso *</label>
                <input type="text" 
                       class="form-control shadow-none bg-light border-0" 
                       :class="{ 'is-invalid border-danger': erroresValidacion.nombre }"
                       id="nombre" v-model="permisoForm.nombre" placeholder="Ej. acceso_modulo" required>
                <div v-if="erroresValidacion.nombre" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.nombre[0] }}
                </div>
              </div>
              
              <div class="mb-4">
                <label for="descripcion" class="form-label text-muted fw-medium fs-6">Descripción</label>
                <textarea class="form-control shadow-none bg-light border-0" 
                          :class="{ 'is-invalid border-danger': erroresValidacion.descripcion }"
                          id="descripcion" v-model="permisoForm.descripcion" rows="3" placeholder="Detalla qué hace este permiso..."></textarea>
                <div v-if="erroresValidacion.descripcion" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.descripcion[0] }}
                </div>
              </div>
              
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-light shadow-none" data-bs-dismiss="modal" :disabled="guardando">
                  Cancelar
                </button>
                
                <button type="submit" class="btn btn-primary border-0 shadow-sm" style="background-color: var(--primary-color);" :disabled="guardando">
                  <span v-if="guardando" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <i v-else class="bi bi-save me-1"></i>
                  
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
/* Estilos para los campos del formulario cuando reciben foco */
.form-control:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}

/* Efecto hover suave para los botones de acción en la tabla */
.custom-action-btn {
  background-color: transparent;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.custom-action-btn:hover {
  background-color: var(--border-color);
}

/* Ajustes para el Modal en modo oscuro */
[data-theme="dark"] .modal-content .bg-light {
  background-color: #2a2a2a !important; /* Un gris un poco más claro que el fondo de la tarjeta */
  color: var(--text-main);
}
[data-theme="dark"] .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%);
}
</style>