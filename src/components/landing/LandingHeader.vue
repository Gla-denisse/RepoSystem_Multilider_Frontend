<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import { Menu, X } from 'lucide-vue-next'

const props = defineProps({
  transparentAtTop: {
    type: Boolean,
    default: true
  }
})

const companyStore = useCompanyStore()
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const baseUrl = 'http://localhost:8000'

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const navLinks = [
  { name: 'Inicio', href: '/' },
  { name: 'Propiedades', href: '/propiedades-venta' },
  { name: 'Nosotros', href: '/#nosotros' },
  { name: 'Asesores', href: '/#asesores' },
  { name: 'Contacto', href: '/#contacto' },
]
</script>

<template>
  <header 
    :class="[
      'fixed-top w-100 transition-all duration-500',
      isScrolled ? 'bg-white shadow-sm py-2' : (props.transparentAtTop ? 'bg-transparent py-4' : 'bg-hero-solid py-3 shadow-sm')
    ]"
    style="backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);"
  >
    <div class="container d-flex justify-content-between align-items-center">
      <!-- Logo con mejor espaciado -->
      <RouterLink to="/" class="d-flex align-items-center gap-2 text-decoration-none group">
        <div class="logo-box rounded-3 p-1 transition-all">
           <img v-if="companyStore.company?.logo" 
                :src="baseUrl + companyStore.company.logo" 
                :class="['transition-all duration-500', isScrolled ? 'logo-scrolled-filter' : '']"
                style="max-height: 35px; object-fit: contain;">
           <i v-else class="bi bi-hexagon-fill fs-3 text-primary"></i>
        </div>
        <span :class="['fw-black fs-4 tracking-tighter transition-colors', isScrolled ? 'text-dark' : 'text-white']">
          {{ companyStore.company?.nombre || 'Multilider' }}
        </span>
      </RouterLink>

      <!-- Desktop Nav -->
      <nav class="d-none d-lg-flex align-items-center gap-5">
        <template v-for="link in navLinks" :key="link.name">
          <!-- Usar RouterLink si es ruta interna, de lo contrario anchor -->
          <RouterLink 
            v-if="!link.href.startsWith('/#')" 
            :to="link.href"
            :class="['nav-link-premium', isScrolled ? 'text-dark' : 'text-white']"
          >
            {{ link.name }}
          </RouterLink>
          <a 
            v-else
            :href="link.href"
            :class="['nav-link-premium', isScrolled ? 'text-dark' : 'text-white']"
          >
            {{ link.name }}
          </a>
        </template>
        <RouterLink to="/pagar" class="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm me-2">
          Pagos
        </RouterLink>
        <a href="/login" :class="['btn rounded-pill px-4 py-2 fw-bold shadow-sm transition-all', isScrolled ? 'btn-outline-dark' : 'btn-ghost-white']">
          Admin Portal
        </a>
      </nav>

      <!-- Mobile Toggle -->
      <button 
        class="d-lg-none btn p-2 border-0" 
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        :class="isScrolled ? 'text-dark' : 'text-white'"
      >
        <Menu v-if="!isMobileMenuOpen" />
        <X v-else />
      </button>
    </div>

    <!-- Mobile Menu -->
    <transition
      enter-active-class="animate__animated animate__slideInDown animate__faster"
      leave-active-class="animate__animated animate__slideOutUp animate__faster"
    >
      <div 
        v-if="isMobileMenuOpen" 
        class="mobile-overlay-premium d-lg-none position-fixed w-100 bg-white shadow-lg"
      >
        <div class="p-4 d-flex flex-column gap-3 pt-5">
          <template v-for="link in navLinks" :key="link.name">
            <RouterLink 
              v-if="!link.href.startsWith('/#')" 
              :to="link.href"
              class="text-dark fw-bold fs-5 text-decoration-none border-bottom pb-2"
              @click="isMobileMenuOpen = false"
            >
              {{ link.name }}
            </RouterLink>
            <a 
              v-else
              :href="link.href"
              class="text-dark fw-bold fs-5 text-decoration-none border-bottom pb-2"
              @click="isMobileMenuOpen = false"
            >
              {{ link.name }}
            </a>
          </template>
          <RouterLink to="/pagar" class="btn btn-success w-100 rounded-pill py-3 fw-bold mt-2 shadow" @click="isMobileMenuOpen = false">
            Pagos
          </RouterLink>
          <a href="/login" class="btn btn-primary w-100 rounded-pill py-3 fw-bold mt-2 shadow">
            Panel Administrativo
          </a>
        </div>
        <button class="btn-close-mobile" @click="isMobileMenuOpen = false"><X /></button>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.fw-black { font-weight: 900; }
.tracking-tighter { letter-spacing: -1.5px; }

.nav-link-premium {
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  position: relative;
  opacity: 0.9;
  transition: all 0.3s;
}

.nav-link-premium::after {
  content: '';
  position: absolute;
  width: 0; height: 2px;
  bottom: -5px; left: 0;
  background-color: var(--landing-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link-premium:hover::after { width: 100%; }
.nav-link-premium:hover { opacity: 1; transform: translateY(-1px); }

.mobile-overlay-premium {
  top: 0; left: 0; height: 100vh; z-index: 1000;
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(15px);
}

.btn-close-mobile {
  position: absolute; top: 20px; right: 20px;
  background: none; border: none; color: #000;
}

.logo-box:hover { transform: rotate(5deg) scale(1.1); }

.bg-hero-solid {
  background: linear-gradient(135deg, #020617 0%, #1e40af 100%);
}

.btn-ghost-white {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.btn-ghost-white:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: white;
}

.logo-scrolled-filter {
  /* Transforma el blanco en Navy (#0B2545) */
  filter: brightness(0) saturate(100%) invert(9%) sepia(43%) saturate(1915%) hue-rotate(194deg) brightness(96%) contrast(98%);
}
</style>
