<script setup>
import { ref, computed } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { MapPin, Maximize, Bed, Bath, ArrowRight } from 'lucide-vue-next'

const companyStore = useCompanyStore()
const filterType = ref('Todos')

const filteredProperties = computed(() => {
  if (filterType.value === 'Todos') return companyStore.latestProperties
  return companyStore.latestProperties.filter(p => p.tipo === filterType.value)
})
</script>

<template>
  <section id="catalogo" class="section-padding bg-light-landing">
    <div class="container">
      <div class="row align-items-end mb-5 g-4">
        <div class="col-lg-7">
          <h2 class="section-title text-start mb-2">Catálogo de Inmuebles</h2>
          <p class="text-muted mb-0">Explora nuestras últimas adquisiciones y encuentra la oportunidad perfecta.</p>
        </div>
        <div class="col-lg-5 d-flex justify-content-lg-end">
          <div class="nav nav-pills bg-white p-1 rounded-3 shadow-sm border">
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
          <div class="landing-card h-100">
            <div class="skeleton-box w-100" style="height: 250px;"></div>
            <div class="p-4">
              <div class="skeleton-box w-25 mb-3" style="height: 15px;"></div>
              <div class="skeleton-box w-75 mb-2" style="height: 25px;"></div>
              <div class="skeleton-box w-50" style="height: 15px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Property Grid -->
      <div v-else class="row g-4">
        <div v-for="prop in filteredProperties" :key="prop.id" class="col-md-6 col-lg-4">
          <div class="landing-card h-100 group transition-all">
            <!-- Image Wrap -->
            <div class="position-relative overflow-hidden" style="height: 250px;">
              <img 
                :src="'http://localhost:8000' + (prop.imagenes.find(i => i.es_principal)?.url || prop.imagenes[0]?.url)" 
                class="w-100 h-100 object-fit-cover transition-transform" 
                loading="lazy"
                style="transition: transform 0.6s ease;"
              >
              <div class="position-absolute top-0 start-0 p-3 d-flex gap-2">
                <span class="badge bg-primary-landing text-uppercase px-3 py-2 shadow-sm">{{ prop.tipo }}</span>
                <span v-if="prop.estado === 'Vendido'" class="badge bg-dark text-uppercase px-3 py-2 shadow-sm">Vendido</span>
              </div>
              <div class="position-absolute bottom-0 start-0 p-3 text-white">
                <h4 class="fw-bold mb-0 drop-shadow">{{ prop.moneda }} {{ prop.precio_venta }}</h4>
              </div>
            </div>

            <!-- Content -->
            <div class="p-4">
              <div class="d-flex align-items-center gap-1 text-muted small mb-2">
                <MapPin :size="14" class="text-primary-landing" />
                <span>{{ prop.zona?.nombre }}, {{ prop.zona?.ciudad?.nombre }}</span>
              </div>
              <h5 class="fw-bold mb-4">{{ prop.tipo }} en {{ prop.zona?.nombre }}</h5>
              
              <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                <div class="d-flex gap-3">
                  <div class="d-flex align-items-center gap-1 text-muted small" title="Superficie">
                    <Maximize :size="16" />
                    <span>{{ prop.superficie_m2 }}m²</span>
                  </div>
                  <template v-if="prop.tipo === 'Casa'">
                    <div class="d-flex align-items-center gap-1 text-muted small" title="Dormitorios">
                      <Bed :size="16" />
                      <span>{{ prop.habitaciones }}</span>
                    </div>
                  </template>
                </div>
                <button class="btn btn-outline-primary rounded-circle p-2 border-opacity-25 hover-bg-primary d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                  <ArrowRight :size="18" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!companyStore.loading && filteredProperties.length === 0" class="text-center py-5">
        <p class="text-muted fst-italic">No hay propiedades disponibles actualmente.</p>
      </div>

      <div class="mt-5 text-center">
        <button class="btn-landing btn-landing-outline">
          Ver todas las propiedades <ArrowRight :size="18" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.drop-shadow { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.landing-card:hover img { transform: scale(1.1); }
.hover-bg-primary:hover { background-color: var(--landing-primary); color: white !important; border-color: var(--landing-primary); }
</style>
