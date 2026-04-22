<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineProps({
  isCompact: Boolean,
  isOpenMobile: Boolean
})

const emit = defineEmits(['toggle-compact', 'close-mobile'])
const authStore = useAuthStore()

// Estado para controlar qué menú desplegable está abierto
const openSubmenu = ref(null)

const toggleSubmenu = (menuName) => {
  // Si se hace clic en el mismo, se cierra. Si es otro, se abre.
  openSubmenu.value = openSubmenu.value === menuName ? null : menuName
}
</script>

<template>
  <aside :class="['sidebar sidebar-theme-dark shadow-sm border-end', { 'is-compact': isCompact, 'is-open-mobile': isOpenMobile }]">
    <div class="sidebar-brand d-flex align-items-center justify-content-center border-bottom" style="height: var(--topbar-height);">
        <img v-if="!isCompact" src="/assets/images/logo_multilider.png" alt="Logo" class="w-100 p-2" style="max-height: 63px; object-fit: contain;">
        <i v-else class="bi bi-hexagon-fill fs-3" style="color: var(--primary-color);"></i>
    </div>

    <ul class="nav flex-column px-2 mt-3 gap-1 flex-grow-1 overflow-auto">
      
      <li class="nav-item">
        <RouterLink to="/" class="nav-link custom-link d-flex align-items-center" active-class="active" :title="isCompact ? 'Dashboard' : ''">
          <i class="bi bi-house-door fs-5"></i>
          <span v-if="!isCompact" class="ms-3 fw-medium">Dashboard</span>
        </RouterLink>
      </li>

      <li class="nav-item mt-2" v-if="authStore.hasPermission('acceso_usuarios') || authStore.hasPermission('acceso_roles') || authStore.hasPermission('acceso_permisos')">
        
        <a href="#" class="nav-link custom-link d-flex align-items-center justify-content-between" 
           @click.prevent="toggleSubmenu('seguridad')" 
           :title="isCompact ? 'Seguridad' : ''">
          <div class="d-flex align-items-center">
            <i class="bi bi-shield-lock fs-5"></i>
            <span v-if="!isCompact" class="ms-3 fw-medium">Adm. Usuarios</span>
          </div>
          <i v-if="!isCompact" class="bi transition-icon" :class="openSubmenu === 'seguridad' ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
        </a>
        
        <ul v-show="!isCompact && openSubmenu === 'seguridad'" class="nav flex-column ms-3 mt-1 gap-1 border-start ms-4 ps-2">
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_usuarios')">
            <RouterLink to="/usuarios" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-people me-2 fs-6"></i> Usuarios
            </RouterLink>
          </li>
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_roles')">
            <RouterLink to="/roles" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-person-badge me-2 fs-6"></i> Roles
            </RouterLink>
          </li>
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_permisos')">
            <RouterLink to="/permisos" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-key me-2 fs-6"></i> Permisos
            </RouterLink>
          </li>

        </ul>
      </li>

      <li class="nav-item mt-2" v-if="authStore.hasPermission('acceso_propietarios') || authStore.hasPermission('acceso_manzanos') || authStore.hasPermission('acceso_propiedades')">
        
        <a href="#" class="nav-link custom-link d-flex align-items-center justify-content-between" 
           @click.prevent="toggleSubmenu('operativa')" 
           :title="isCompact ? 'Gestión Operativa' : ''">
          <div class="d-flex align-items-center">
            <i class="bi bi-building fs-5"></i>
            <span v-if="!isCompact" class="ms-3 fw-medium">Gestión Operativa</span>
          </div>
          <i v-if="!isCompact" class="bi transition-icon" :class="openSubmenu === 'operativa' ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
        </a>
        
        <ul v-show="!isCompact && openSubmenu === 'operativa'" class="nav flex-column ms-3 mt-1 gap-1 border-start ms-4 ps-2">
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_propietarios')">
            <RouterLink to="/propietarios" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-person-lines-fill me-2 fs-6"></i> Propietarios
            </RouterLink>
          </li>
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_manzanos')">
            <RouterLink to="/manzanos" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-grid-3x3-gap-fill me-2 fs-6"></i> Manzanos
            </RouterLink>
          </li>
          
          <li class="nav-item" v-if="authStore.hasPermission('acceso_propiedades')">
            <RouterLink to="/propiedades" class="nav-link custom-link sub-link d-flex align-items-center" active-class="active">
              <i class="bi bi-houses-fill me-2 fs-6"></i> Propiedades
            </RouterLink>
          </li>

        </ul>
      </li>

    </ul>
  </aside>

  <div v-if="isOpenMobile" class="sidebar-backdrop d-md-none" @click="emit('close-mobile')"></div>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background-color: var(--bg-sidebar);
  border-color: var(--border-sidebar) !important;
  color: var(--text-sidebar-main);
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  z-index: 1040;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar .fw-bold {
  color: var(--text-sidebar-main) !important;
}

.sidebar.is-compact { width: var(--sidebar-compact-width); }

@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.is-open-mobile { transform: translateX(0); }
  .sidebar.is-compact { width: var(--sidebar-width); }
}

.custom-link {
  border-radius: 8px;
  padding: 0.6rem 1rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  color: var(--text-sidebar-muted);
}

.custom-link:hover {
  background-color: rgba(128, 128, 128, 0.1); /* Fondo translúcido para que funcione en oscuro y claro */
  color: var(--text-sidebar-main);
}

.custom-link.active {
  background-color: var(--primary-color);
  color: #ffffff !important;
}

.sub-link {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

.sidebar-backdrop {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); z-index: 1030;
}


a.nav-link:hover {
  color: var(--primary-color) !important;
}

a.nav-link:focus {
  color: var(--primary-color) !important;
}
</style>