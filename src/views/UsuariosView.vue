<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2' // <-- IMPORTAMOS SWEETALERT2

// ==========================================
// 1. VARIABLES GENERALES
// ==========================================
const usuarios = ref([])
const rolesPermisosAgrupados = ref({})
const cargando = ref(true)

// Modal CRUD Usuarios
const isEditing = ref(false)
const usuarioForm = ref({ id: null, nombre: '', correo: '', password: '', estado: true })
const btnCerrarModal = ref(null)
const erroresValidacion = ref({})
const mostrarPassword = ref(false)

const validacionPassword = computed(() => {
  const pass = usuarioForm.value.password || '';
  return {
    longitud: pass.length >= 8,
    mayusculas: /[A-Z]/.test(pass),
    minusculas: /[a-z]/.test(pass),
    numeros: /[0-9]/.test(pass),
    simbolos: /[^A-Za-z0-9]/.test(pass) // Cualquier cosa que no sea letra o número
  }
})

// Panel de Asignación de Accesos
const usuarioSeleccionado = ref(null)
const cargandoAsignaciones = ref(false)
const panelAsignacion = ref(null)

// ==========================================
// 2. CARGA BASE DE DATOS
// ==========================================
const cargarDatosBase = async () => {
  try {
    cargando.value = true
    const [resUsuarios, resRolPermisos] = await Promise.all([
      api.get('/usuarios'),
      api.get('/asignar-permisos')
    ])

    usuarios.value = resUsuarios.data

    const agrupado = {}
    resRolPermisos.data.forEach(item => {
      const nombreRol = item.rol.nombre
      if (!agrupado[nombreRol]) agrupado[nombreRol] = []

      agrupado[nombreRol].push({
        rol_permiso_id: item.id,
        permiso: item.permiso,
        asignado: false
      })
    })
    rolesPermisosAgrupados.value = agrupado

  } catch (error) {
    console.error("Error al cargar datos:", error)
  } finally {
    cargando.value = false
  }
}

// ==========================================
// 3. CRUD DE USUARIOS
// ==========================================
const nuevoUsuario = () => {
  isEditing.value = false
  usuarioForm.value = { id: null, nombre: '', correo: '', password: '', estado: true }
  erroresValidacion.value = {}
  mostrarPassword.value = false
}

const editarUsuario = (user) => {
  isEditing.value = true
  usuarioForm.value = {
    id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    password: '',
    estado: user.estado == 1 || user.estado === true
  },
  erroresValidacion.value = {}
  mostrarPassword.value = false
}

const guardarUsuario = async () => {
  erroresValidacion.value = {}
  try {
    const payload = { ...usuarioForm.value }
    if (isEditing.value && payload.password === '') {
      delete payload.password
    }

    if (isEditing.value) {
      await api.put(`/usuarios/${payload.id}`, payload)
    } else {
      await api.post('/usuarios', payload)
    }

    await cargarDatosBase()
    btnCerrarModal.value.click()
    
    // Alerta de éxito suave
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditing.value ? 'Usuario actualizado' : 'Usuario creado',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })

  } catch (error) {
    console.error("Error al guardar usuario:", error)

    if (error.response && error.response.status === 422) {
      erroresValidacion.value = error.response.data.errors;
      const erroresDeValidacion = error.response.data.errors;
      // Formateamos los errores en una lista HTML para SweetAlert
      let mensajeHtml = "<ul style='text-align: left; font-size: 0.9rem;'>";
      for (const campo in erroresDeValidacion) {
        mensajeHtml += `<li>${erroresDeValidacion[campo].join('</li><li>')}</li>`;
      }
      mensajeHtml += "</ul>";

      Swal.fire({
        icon: 'warning',
        title: 'Verifica los datos',
        html: mensajeHtml,
        confirmButtonColor: '#a28bfa' // Tu color primario lila
      });
    } 
    else if (error.response && error.response.data && error.response.data.message) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response.data.message,
        confirmButtonColor: '#a28bfa'
      });
    } 
    else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Ocurrió un error al intentar guardar el usuario.',
        confirmButtonColor: '#a28bfa'
      });
    }
  }
}

const eliminarUsuario = async (id) => {
  // Reemplazamos el confirm() nativo por Swal
  Swal.fire({
    title: '¿Desactivar usuario?',
    text: "El usuario ya no podrá ingresar al sistema.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#a28bfa',
    cancelButtonColor: '#fb7185', // Tu color danger
    confirmButtonText: 'Sí, desactivar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.delete(`/usuarios/${id}`)
        await cargarDatosBase()
        if (usuarioSeleccionado.value?.id === id) cerrarPanelAsignacion()
        
        Swal.fire({
          title: '¡Desactivado!',
          text: 'El usuario ha sido desactivado con éxito.',
          icon: 'success',
          confirmButtonColor: '#a28bfa'
        })
      } catch (error) { 
        console.error(error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo desactivar al usuario.',
          confirmButtonColor: '#a28bfa'
        })
      }
    }
  })
}

// ==========================================
// 4. LÓGICA DE ASIGNACIÓN DE ACCESOS
// ==========================================
const abrirPanelAsignacion = async (user) => {
  usuarioSeleccionado.value = user
  cargandoAsignaciones.value = true

  nextTick(() => { panelAsignacion.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })

  try {
    Object.values(rolesPermisosAgrupados.value).forEach(grupo => {
      grupo.forEach(item => item.asignado = false)
    })

    const res = await api.get(`/usuarios/${user.id}/asignaciones`)
    const asignacionesIds = res.data

    Object.values(rolesPermisosAgrupados.value).forEach(grupo => {
      grupo.forEach(item => {
        if (asignacionesIds.includes(Number(item.rol_permiso_id))) {
          item.asignado = true
        }
      })
    })
  } catch (error) {
    console.error("Error cargando accesos:", error)
  } finally {
    cargandoAsignaciones.value = false
  }
}

const cerrarPanelAsignacion = () => {
  usuarioSeleccionado.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const guardarAccesosPanel = async () => {
  try {
    const seleccionados = []
    Object.values(rolesPermisosAgrupados.value).forEach(grupo => {
      grupo.forEach(item => {
        if (item.asignado) seleccionados.push(item.rol_permiso_id)
      })
    })

    // 1. Guardamos en el backend
    await api.post(`/usuarios/${usuarioSeleccionado.value.id}/asignaciones/sync`, {
      rol_permiso_ids: seleccionados
    })

    // 2. ¡EL TRUCO! Guardamos el nombre antes de destruir la variable
    const nombreUsuario = usuarioSeleccionado.value.nombre;

    // 3. Ahora sí, cerramos el panel de forma segura
    cerrarPanelAsignacion()
    
    // 4. Mostramos la alerta verde de éxito usando nuestra variable temporal
    Swal.fire({
      icon: 'success',
      title: '¡Accesos actualizados!',
      text: `Se han configurado los permisos para ${nombreUsuario}.`,
      confirmButtonColor: '#a28bfa'
    })

  } catch (error) {
    console.error("Error al sincronizar accesos:", error)
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: 'Ocurrió un error al actualizar los accesos. Intenta nuevamente.',
      confirmButtonColor: '#a28bfa'
    })
  }
}

onMounted(() => {
  cargarDatosBase()
})
</script>

<template>
  <div class="usuarios-container pb-5">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Gestión de Usuarios</h2>
        <p class="text-muted mb-0 fs-6">Administra el personal y sus credenciales de acceso.</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 border-0 shadow-sm"
        style="background-color: var(--primary-color);" data-bs-toggle="modal" data-bs-target="#modalUsuario"
        @click="nuevoUsuario">
        <i class="bi bi-person-plus-fill"></i> Nuevo Usuario
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
                <th class="ps-4 border-0 rounded-start">Usuario</th>
                <th class="border-0">Correo Electrónico</th>
                <th class="border-0">Estado</th>
                <th class="text-end pe-4 border-0 rounded-end">Acciones</th>
              </tr>
            </thead>
            <tbody style="border-top: none;">
              <tr v-for="user in usuarios" :key="user.id"
                :class="{ 'table-active-row': usuarioSeleccionado?.id === user.id }">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="`https://ui-avatars.com/api/?name=${user.nombre}&background=a28bfa&color=fff`"
                      class="rounded-circle me-3" width="40" height="40" alt="Avatar">
                    <div>
                      <div class="fw-bold" style="color: var(--text-main);">{{ user.nombre }}</div>
                      <small class="text-muted">ID: #{{ user.id }}</small>
                    </div>
                  </div>
                </td>
                <td class="text-muted">{{ user.correo }}</td>
                <td>
                  <span v-if="user.estado == 1 || user.estado === true"
                    class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Activo</span>
                  <span v-else
                    class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm me-2 custom-action-btn"
                    :class="usuarioSeleccionado?.id === user.id ? 'btn-primary text-white' : 'btn-light text-info'"
                    :style="usuarioSeleccionado?.id === user.id ? `background-color: var(--primary-color); border-color: var(--primary-color);` : ''"
                    @click="abrirPanelAsignacion(user)" title="Configurar Accesos">
                    <i class="bi bi-shield-check"></i> Accesos
                  </button>
                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal"
                    data-bs-target="#modalUsuario" @click="editarUsuario(user)">
                    <i class="bi bi-pencil-square" style="color: var(--primary-color);"></i>
                  </button>
                  <button class="btn btn-sm btn-light custom-action-btn" @click="eliminarUsuario(user.id)">
                    <i class="bi bi-trash text-danger"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div ref="panelAsignacion"></div>

    <transition name="fade-slide">
      <div v-if="usuarioSeleccionado" class="card card-custom border-0 shadow-lg mt-4"
        style="border-top: 4px solid var(--primary-color) !important;">
        <div class="card-header bg-transparent border-bottom p-4 d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-0 fw-bold" style="color: var(--text-main);">
              <i class="bi bi-person-bounding-box me-2" style="color: var(--primary-color);"></i>
              Accesos de <span style="color: var(--primary-color);">{{ usuarioSeleccionado.nombre }}</span>
            </h5>
            <small class="text-muted">Habilita los permisos que este usuario tendrá heredados de cada rol.</small>
          </div>
          <button type="button" class="btn-close shadow-none" @click="cerrarPanelAsignacion"></button>
        </div>

        <div class="card-body p-4 bg-light bg-opacity-50">
          <div v-if="cargandoAsignaciones" class="text-center py-4">
            <div class="spinner-border spinner-border-sm" style="color: var(--primary-color);"></div> Cargando...
          </div>

          <div v-else>
            <div v-for="(permisosAsociados, nombreRol) in rolesPermisosAgrupados" :key="nombreRol" class="mb-4">
              <h6 class="fw-bold mb-3 pb-2 border-bottom text-uppercase"
                style="color: var(--text-muted); font-size: 0.85rem;">
                <i class="bi bi-diagram-3 me-2"></i> Rol: {{ nombreRol }}
              </h6>

              <div class="row g-3">
                <div class="col-xl-3 col-lg-4 col-md-6 col-12" v-for="item in permisosAsociados"
                  :key="item.rol_permiso_id">
                  <div
                    class="p-3 border rounded h-100 d-flex justify-content-between align-items-center permission-card transition-all"
                    :class="{ 'border-primary bg-primary bg-opacity-10': item.asignado, 'bg-card': !item.asignado }"
                    @click="item.asignado = !item.asignado" style="cursor: pointer;">

                    <div class="pe-2 overflow-hidden">
                      <div class="fw-semibold text-truncate"
                        :style="item.asignado ? 'color: var(--primary-color);' : 'color: var(--text-main);'">
                        {{ item.permiso.nombre }}
                      </div>
                      <div class="text-muted small text-truncate" style="font-size: 0.75rem;">
                        {{ item.permiso.descripcion || 'Sin descripción' }}
                      </div>
                    </div>

                    <div class="form-check form-switch mb-0" @click.stop>
                      <input class="form-check-input custom-switch shadow-none fs-4 m-0" type="checkbox" role="switch"
                        v-model="item.asignado">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="Object.keys(rolesPermisosAgrupados).length === 0" class="text-center text-muted py-3">
              No hay combinaciones de Rol-Permiso creadas en el sistema.
            </div>
          </div>
        </div>

        <div class="card-footer bg-transparent border-top p-3 d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-light shadow-none" @click="cerrarPanelAsignacion">Cancelar</button>
          <button type="button" class="btn btn-primary border-0 shadow-sm"
            style="background-color: var(--primary-color);" @click="guardarAccesosPanel">
            <i class="bi bi-save me-1"></i> Guardar Accesos
          </button>
        </div>
      </div>
    </transition>

    <div class="modal fade" id="modalUsuario" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content card-custom border-0">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: var(--text-main);">{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" ref="btnCerrarModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="guardarUsuario">
              
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Nombre Completo *</label>
                <input type="text" 
                       class="form-control shadow-none bg-light border-0" 
                       :class="{ 'is-invalid border-danger': erroresValidacion.nombre }"
                       v-model="usuarioForm.nombre" required>
                <div v-if="erroresValidacion.nombre" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.nombre[0] }}
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Correo Electrónico *</label>
                <input type="email" 
                       class="form-control shadow-none bg-light border-0" 
                       :class="{ 'is-invalid border-danger': erroresValidacion.correo }"
                       v-model="usuarioForm.correo" required>
                <div v-if="erroresValidacion.correo" class="invalid-feedback d-block fw-medium">
                  {{ erroresValidacion.correo[0] }}
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">
                  Contraseña <span v-if="isEditing" class="text-secondary fw-normal fs-6">(Deja en blanco para no cambiar)</span> *
                </label>
                
                <div class="input-group has-validation">
                  <input :type="mostrarPassword ? 'text' : 'password'" 
                         class="form-control shadow-none bg-light border-0 no-validation-icon" 
                         :class="{ 'is-invalid border-danger': erroresValidacion.password }"
                         v-model="usuarioForm.password" 
                         :required="!isEditing">
                  
                  <button type="button" 
                          class="btn btn-light bg-light border-0" 
                          :class="{ 'border-danger border-top border-bottom border-end': erroresValidacion.password }"
                          @click="mostrarPassword = !mostrarPassword"
                          style="z-index: 5;">
                    <i class="bi fs-5" :class="mostrarPassword ? 'bi-eye-slash-fill text-primary' : 'bi-eye-fill text-muted'"></i>
                  </button>

                  <div v-if="erroresValidacion.password" class="invalid-feedback fw-medium mt-1">
                    <div v-for="(err, index) in erroresValidacion.password" :key="index">{{ err }}</div>
                  </div>
                </div>

                <div v-if="!isEditing || usuarioForm.password.length > 0" class="mt-2 p-2 rounded bg-light bg-opacity-50">
                  <ul class="list-unstyled mb-0" style="font-size: 0.8rem;">
                    
                    <li :class="validacionPassword.longitud ? 'text-success fw-bold' : 'text-muted'" class="mb-1 transition-colors">
                      <i class="bi me-1" :class="validacionPassword.longitud ? 'bi-check-circle-fill' : 'bi-circle'"></i> 
                      Mínimo 8 caracteres
                    </li>
                    
                    <li :class="validacionPassword.mayusculas && validacionPassword.minusculas ? 'text-success fw-bold' : 'text-muted'" class="mb-1 transition-colors">
                      <i class="bi me-1" :class="validacionPassword.mayusculas && validacionPassword.minusculas ? 'bi-check-circle-fill' : 'bi-circle'"></i> 
                      Al menos una mayúscula y una minúscula
                    </li>
                    
                    <li :class="validacionPassword.numeros ? 'text-success fw-bold' : 'text-muted'" class="mb-1 transition-colors">
                      <i class="bi me-1" :class="validacionPassword.numeros ? 'bi-check-circle-fill' : 'bi-circle'"></i> 
                      Al menos un número
                    </li>
                    
                    <li :class="validacionPassword.simbolos ? 'text-success fw-bold' : 'text-muted'" class="transition-colors">
                      <i class="bi me-1" :class="validacionPassword.simbolos ? 'bi-check-circle-fill' : 'bi-circle'"></i> 
                      Al menos un símbolo (ej. !@#$%)
                    </li>

                  </ul>
                </div>
              </div>

              <div v-if="isEditing" class="mb-4 form-check form-switch d-flex align-items-center">
                <input class="form-check-input shadow-none fs-5 me-2 custom-switch" type="checkbox" v-model="usuarioForm.estado">
                <label class="form-check-label text-muted fw-medium mt-1">
                  {{ usuarioForm.estado ? 'Cuenta Activa' : 'Cuenta Suspendida' }}
                </label>
              </div>

              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-light shadow-none" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary border-0 shadow-sm" style="background-color: var(--primary-color);">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Las mismas clases reutilizadas de RolesView para mantener consistencia visual */
.table-active-row {
  background-color: rgba(162, 139, 250, 0.05) !important;
}

.permission-card {
  transition: all 0.2s ease;
  background-color: var(--bg-card);
}

.permission-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.custom-switch:checked {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.form-control:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}

.custom-action-btn {
  background-color: transparent;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.custom-action-btn:hover:not(.btn-primary) {
  background-color: var(--border-color);
}

[data-theme="dark"] .modal-content .bg-light {
  background-color: #2a2a2a !important;
  color: var(--text-main);
}

[data-theme="dark"] .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%);
}

/* Quita la "X" roja o el check nativo de Bootstrap que se encimaba al botón */
.no-validation-icon {
  background-image: none !important;
}

/* Transición suave para cuando las letras pasen de gris a verde */
.transition-colors {
  transition: color 0.3s ease;
}
</style>