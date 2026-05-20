<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import { ArrowRight } from 'lucide-vue-next'
import PropiedadCard from './PropiedadCard.vue'

const companyStore = useCompanyStore()
const filterType = ref('Todos')

const filteredProperties = computed(() => {
  if (filterType.value === 'Todos') return companyStore.latestProperties
  return companyStore.latestProperties.filter(p => p.tipo === filterType.value)
})
</script>

<template>
  <section id="catalogo" class="section-padding pp-catalog-bg">
    <div class="container">
      <div class="row align-items-end mb-5 g-4">
        <div class="col-lg-7">
          <h2 class="section-title text-start mb-2">Catálogo de Inmuebles</h2>
          <p class="text-muted mb-0">Explora nuestras últimas adquisiciones y encuentra la oportunidad perfecta.</p>
        </div>
        <div class="col-lg-5 d-flex justify-content-lg-end">
          <div class="nav nav-pills pp-tabs p-1 rounded-3 shadow-sm border">
            <button
              v-for="tab in ['Todos', 'Lote', 'Casa']"
              :key="tab"
              @click="filterType = tab"
              :class="['nav-link border-0 fw-bold px-4', filterType === tab ? 'bg-primary-landing text-white' : 'text-muted bg-transparent']"
            >
              {{ tab === 'Todos' ? 'Todos' : (tab === 'Lote' ? 'Lotes' : 'Casas') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Skeletons -->
      <div v-if="companyStore.loading" class="row g-4">
        <div v-for="i in 3" :key="i" class="col-md-6 col-lg-4">
          <div class="bg-card-theme rounded-4 overflow-hidden shadow-sm border-theme">
            <div class="skeleton-box w-100" style="height:230px"></div>
            <div class="p-4">
              <div class="skeleton-box w-25 mb-2" style="height:12px"></div>
              <div class="skeleton-box w-75 mb-3" style="height:20px"></div>
              <div class="skeleton-box w-60 mb-4" style="height:14px"></div>
              <div class="d-flex gap-2 mb-3">
                <div class="skeleton-box flex-grow-1" style="height:54px"></div>
                <div class="skeleton-box flex-grow-1" style="height:54px"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div v-else class="row g-4">
        <div v-for="prop in filteredProperties" :key="prop.id" class="col-md-6 col-lg-4">
          <PropiedadCard :prop="prop" />
        </div>
      </div>

      <div v-if="!companyStore.loading && filteredProperties.length === 0" class="text-center py-5">
        <p class="text-muted fst-italic">No hay propiedades disponibles actualmente.</p>
      </div>

      <div class="mt-5 text-center">
        <RouterLink to="/propiedades-venta" class="btn-landing btn-landing-outline text-decoration-none d-inline-flex align-items-center gap-2">
          Ver todas las propiedades <ArrowRight :size="18" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pp-catalog-bg {
  background-color: var(--bg-body);
}
.pp-tabs {
  background-color: var(--bg-card);
  border-color: var(--border-color) !important;
}
.bg-card-theme {
  background-color: var(--bg-card);
}
.border-theme {
  border: 1px solid var(--border-color);
}
</style>
