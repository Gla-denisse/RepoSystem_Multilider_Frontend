<script setup>
import { ref, onMounted, nextTick } from 'vue'
import api from '../api/axios'

// ==========================================
// 1. VARIABLES GENERALES
// ==========================================
const usuarios = ref([])
const rolesPermisosAgrupados = ref({}) // Guardará las combinaciones agrupadas por Rol
const cargando = ref(true)

// Modal CRUD Usuarios
const isEditing = ref(false)
const usuarioForm = ref({ id: null, nombre: '', correo: '', password: '', estado: true })
const btnCerrarModal = ref(null)

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
      api.get('/asignar-permisos') // Trae la tabla intermedia RolPermiso con sus relaciones
    ])
    
    usuarios.value = resUsuarios.data

    // Agrupamos las combinaciones Rol-Permiso por el nombre del Rol para una mejor UI
    const agrupado = {}
    resRolPermisos.data.forEach(item => {
      const nombreRol = item.rol.nombre
      if (!agrupado[nombreRol]) agrupado[nombreRol] = []
      
      agrupado[nombreRol].push({
        rol_permiso_id: item.id, // ID de la combinación real
        permiso: item.permiso,
        asignado: false // Estado para el Toggle
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
}

const editarUsuario = (user) => {
  isEditing.value = true
  usuarioForm.value = { 
    id: user.id, 
    nombre: user.nombre, 
    correo: user.correo, 
    password: '', // Se deja vacío para no sobreescribir si no escriben nada
    estado: user.estado == 1 || user.estado === true 
  }
}

const guardarUsuario = async () => {
  try {
    const payload = { ...usuarioForm.value }
    // Si estamos editando y no escribió password, lo eliminamos del payload para no borrarlo en BD
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
  } catch (error) {
    console.error("Error al guardar usuario:", error)
    alert("Ocurrió un error al guardar el usuario. Revisa que el correo no esté duplicado.")
  }
}

const eliminarUsuario = async (id) => {
  if (confirm("¿Desactivar este usuario del sistema?")) {
    try {
      await api.delete(`/usuarios/${id}`)
      await cargarDatosBase()
      if(usuarioSeleccionado.value?.id === id) cerrarPanelAsignacion()
    } catch (error) { console.error(error) }
  }
}

// ==========================================
// 4. LÓGICA DE ASIGNACIÓN DE ACCESOS
// ==========================================
const abrirPanelAsignacion = async (user) => {
  usuarioSeleccionado.value = user
  cargandoAsignaciones.value = true
  
  nextTick(() => { panelAsignacion.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })

  try {
    // 1. Apagamos todos los toggles por defecto
    Object.values(rolesPermisosAgrupados.value).forEach(grupo => {
      grupo.forEach(item => item.asignado = false)
    })

    // 2. Traemos los IDs de las combinaciones (rol_permiso_id) que tiene el usuario
    const res = await api.get(`/usuarios/${user.id}/asignaciones`)
    const asignacionesIds = res.data // ej: [1, 5, 8]

    // 3. Encendemos los toggles que coincidan
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
    // Recolectamos todos los rol_permiso_id de los toggles encendidos
    const seleccionados = []
    Object.values(rolesPermisosAgrupados.value).forEach(grupo => {
      grupo.forEach(item => {
        if (item.asignado) seleccionados.push(item.rol_permiso_id)
      })
    })

    await api.post(`/usuarios/${usuarioSeleccionado.value.id}/asignaciones/sync`, {
      rol_permiso_ids: seleccionados
    })

    alert(`¡Accesos actualizados para ${usuarioSeleccionado.value.nombre}!`)
    cerrarPanelAsignacion()
  } catch (error) {
    console.error("Error al sincronizar accesos:", error)
    alert("Ocurrió un error al guardar los accesos.")
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
      <button class="btn btn-primary d-flex align-items-center gap-2 border-0 shadow-sm" style="background-color: var(--primary-color);" data-bs-toggle="modal" data-bs-target="#modalUsuario" @click="nuevoUsuario">
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
              <tr v-for="user in usuarios" :key="user.id" :class="{'table-active-row': usuarioSeleccionado?.id === user.id}">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="`https://ui-avatars.com/api/?name=${user.nombre}&background=a28bfa&color=fff`" class="rounded-circle me-3" width="40" height="40" alt="Avatar">
                    <div>
                      <div class="fw-bold" style="color: var(--text-main);">{{ user.nombre }}</div>
                      <small class="text-muted">ID: #{{ user.id }}</small>
                    </div>
                  </div>
                </td>
                <td class="text-muted">{{ user.correo }}</td>
                <td>
                  <span v-if="user.estado == 1 || user.estado === true" class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Activo</span>
                  <span v-else class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactivo</span>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm me-2 custom-action-btn" 
                          :class="usuarioSeleccionado?.id === user.id ? 'btn-primary text-white' : 'btn-light text-info'" 
                          :style="usuarioSeleccionado?.id === user.id ? `background-color: var(--primary-color); border-color: var(--primary-color);` : ''"
                          @click="abrirPanelAsignacion(user)" title="Configurar Accesos">
                    <i class="bi bi-shield-check"></i> Accesos
                  </button>
                  <button class="btn btn-sm btn-light me-2 custom-action-btn" data-bs-toggle="modal" data-bs-target="#modalUsuario" @click="editarUsuario(user)">
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
      <div v-if="usuarioSeleccionado" class="card card-custom border-0 shadow-lg mt-4" style="border-top: 4px solid var(--primary-color) !important;">
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
              <h6 class="fw-bold mb-3 pb-2 border-bottom text-uppercase" style="color: var(--text-muted); font-size: 0.85rem;">
                <i class="bi bi-diagram-3 me-2"></i> Rol: {{ nombreRol }}
              </h6>
              
              <div class="row g-3">
                <div class="col-xl-3 col-lg-4 col-md-6 col-12" v-for="item in permisosAsociados" :key="item.rol_permiso_id">
                  <div class="p-3 border rounded h-100 d-flex justify-content-between align-items-center permission-card transition-all" 
                       :class="{'border-primary bg-primary bg-opacity-10': item.asignado, 'bg-card': !item.asignado}"
                       @click="item.asignado = !item.asignado" style="cursor: pointer;">
                    
                    <div class="pe-2 overflow-hidden">
                      <div class="fw-semibold text-truncate" :style="item.asignado ? 'color: var(--primary-color);' : 'color: var(--text-main);'">
                        {{ item.permiso.nombre }}
                      </div>
                      <div class="text-muted small text-truncate" style="font-size: 0.75rem;">
                        {{ item.permiso.descripcion || 'Sin descripción' }}
                      </div>
                    </div>
                    
                    <div class="form-check form-switch mb-0" @click.stop>
                      <input class="form-check-input custom-switch shadow-none fs-4 m-0" type="checkbox" role="switch" v-model="item.asignado">
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
          <button type="button" class="btn btn-primary border-0 shadow-sm" style="background-color: var(--primary-color);" @click="guardarAccesosPanel">
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
                <input type="text" class="form-control shadow-none bg-light border-0" v-model="usuarioForm.nombre" required>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">Correo Electrónico *</label>
                <input type="email" class="form-control shadow-none bg-light border-0" v-model="usuarioForm.correo" required>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted fw-medium fs-6">
                  Contraseña <span v-if="isEditing" class="text-secondary fw-normal fs-6">(Deja en blanco para no cambiar)</span> *
                </label>
                <input type="password" class="form-control shadow-none bg-light border-0" v-model="usuarioForm.password" :required="!isEditing" minlength="6">
              </div>
              <div v-if="isEditing" class="mb-4 form-check form-switch d-flex align-items-center">
                <input class="form-check-input shadow-none fs-5 me-2 custom-switch" type="checkbox" v-model="usuarioForm.estado">
                <label class="form-check-label text-muted fw-medium mt-1">{{ usuarioForm.estado ? 'Cuenta Activa' : 'Cuenta Suspendida' }}</label>
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
.table-active-row { background-color: rgba(162, 139, 250, 0.05) !important; }
.permission-card { transition: all 0.2s ease; background-color: var(--bg-card); }
.permission-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.custom-switch:checked { background-color: var(--primary-color) !important; border-color: var(--primary-color) !important; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-20px); }
.form-control:focus { background-color: var(--bg-card) !important; border: 1px solid var(--primary-color) !important; box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important; }
.custom-action-btn { background-color: transparent; border: 1px solid transparent; transition: all 0.2s; }
.custom-action-btn:hover:not(.btn-primary) { background-color: var(--border-color); }
[data-theme="dark"] .modal-content .bg-light { background-color: #2a2a2a !important; color: var(--text-main); }
[data-theme="dark"] .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
</style>