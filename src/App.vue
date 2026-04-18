<script setup>
import { ref, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import { useAuthStore } from './stores/auth'

const isCompact = ref(false)
const isOpenMobile = ref(false)
const route = useRoute()
const authStore = useAuthStore()

const toggleCompact = () => { isCompact.value = !isCompact.value }
const toggleMobile = () => { isOpenMobile.value = !isOpenMobile.value }
const closeMobile = () => { isOpenMobile.value = false }

// Lógica del Tema (Claro/Oscuro) en App.vue para afectarlo globalmente
const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('app-theme', theme)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('app-theme') || 'light'
  isDark.value = savedTheme === 'dark'
  document.documentElement.setAttribute('data-theme', savedTheme)
})
</script>

<template>
  <div v-if="route.name === 'login'">
    <RouterView />
  </div>

  <div v-else class="app-wrapper">
    <Sidebar :isCompact="isCompact" :isOpenMobile="isOpenMobile" @toggle-compact="toggleCompact" @close-mobile="closeMobile" />

    <div :class="['main-content', { 'is-compact': isCompact }]">
      
      <header class="topbar d-flex align-items-center justify-content-between px-4 border-bottom shadow-sm">
        <div class="d-flex align-items-center">
          <button class="btn btn-link d-md-none p-0 me-3 text-dark" @click="toggleMobile">
            <i class="bi bi-list fs-2"></i>
          </button>
          <button class="btn btn-link d-none d-md-block p-0 me-4 text-muted" @click="toggleCompact">
            <i class="bi" :class="isCompact ? 'bi-chevron-double-right' : 'bi-chevron-double-left'"></i>
          </button>
          <h4 class="m-0 fw-bold text-capitalize" style="color: var(--text-main)">
            {{ route.name || 'Dashboard' }}
          </h4>
        </div>

        <div class="d-flex align-items-center gap-3">
          <button @click="toggleTheme" class="btn btn-link p-0 text-decoration-none text-muted">
            <i class="fs-4" :class="isDark ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill'"></i>
          </button>

          <div class="dropdown">
            <div class="d-flex align-items-center ms-2 border-start ps-3 cursor-pointer" data-bs-toggle="dropdown" style="border-color: var(--border-color) !important;">
              <img :src="`https://ui-avatars.com/api/?name=${authStore.user?.nombre}&background=a28bfa&color=fff`" class="rounded-circle me-2" width="36" height="36">
              
              <div class="d-none d-lg-block text-start lh-1">
                <span class="d-block fw-semibold text-truncate" style="color: var(--text-main); font-size: 0.9rem; max-width: 120px;">
                  {{ authStore.user?.nombre }}
                </span>
                <small class="text-muted" style="font-size: 0.75rem;">Sesión Activa</small>
              </div>
              <i class="bi bi-chevron-down ms-2 fs-6 text-muted"></i>
            </div>
            
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li><a class="dropdown-item py-2" href="#"><i class="bi bi-person me-2"></i> Mi Perfil</a></li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a class="dropdown-item py-2 text-danger" href="#" @click.prevent="authStore.logout">
                  <i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main class="content-area p-4">
        <div v-if="route.name === 'Dashboard'" class="mb-4">
            <h1 class="h3 fw-bold">¡Bienvenido de nuevo, {{ authStore.user?.nombre.split(' ')[0] }}! 👋</h1>
            <p class="text-muted">Aquí tienes un resumen de lo que sucede en el sistema hoy.</p>
        </div>
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-content {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  background-color: var(--bg-body);
  transition: margin-left 0.3s ease;
}

.main-content.is-compact {
  margin-left: var(--sidebar-compact-width);
}

.topbar {
  height: var(--topbar-height);
  background-color: var(--bg-sidebar); /* La barra superior usa el mismo color que el sidebar */
  position: sticky;
  top: 0;
  z-index: 1020;
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 768px) {
  .main-content { margin-left: 0 !important; }
}
</style>