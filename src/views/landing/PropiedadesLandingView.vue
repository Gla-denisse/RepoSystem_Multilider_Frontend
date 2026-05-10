<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import { 
  Search, MapPin, Maximize, Bed, Bath, 
  ArrowRight, Filter, X, ChevronLeft, ChevronRight 
} from 'lucide-vue-next'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import WhatsAppButton from '@/components/landing/WhatsAppButton.vue'

const route = useRoute()
const router = useRouter()
const companyStore = useCompanyStore()

const filters = ref({
  tipo: route.query.tipo || 'Todos',
  ciudad_id: route.query.ciudad_id || '',
  precio_min: route.query.precio_min || '',
  precio_max: route.query.precio_max || '',
  habitaciones: route.query.habitaciones || '',
  search: route.query.search || '',
  page: route.query.page || 1
})

const showFilters = ref(false)

const loadProperties = async () => {
  await companyStore.fetchProperties({
    tipo: filters.value.tipo,
    ciudad_id: filters.value.ciudad_id,
    precio_min: filters.value.precio_min,
    precio_max: filters.value.precio_max,
    habitaciones: filters.value.habitaciones,
    search: filters.value.search,
    page: filters.value.page,
    per_page: 12
  })
}

const applyFilters = () => {
  filters.value.page = 1
  updateQuery()
}

const updateQuery = () => {
  const query = { ...filters.value }
  // Limpiar vacíos
  Object.keys(query).forEach(key => {
    if (query[key] === '' || query[key] === 'Todos') delete query[key]
  })
  router.push({ name: 'PropiedadesLanding', query })
}

const changePage = (page) => {
  filters.value.page = page
  updateQuery()
}

const resetFilters = () => {
  filters.value = {
    tipo: 'Todos',
    ciudad_id: '',
    precio_min: '',
    precio_max: '',
    habitaciones: '',
    search: '',
    page: 1
  }
  updateQuery()
}

onMounted(async () => {
  if (!companyStore.company) await companyStore.fetchLandingData()
  await companyStore.fetchCities()
  await loadProperties()
})

watch(() => route.query, () => {
  filters.value = {
    tipo: route.query.tipo || 'Todos',
    ciudad_id: route.query.ciudad_id || '',
    precio_min: route.query.precio_min || '',
    precio_max: route.query.precio_max || '',
    habitaciones: route.query.habitaciones || '',
    search: route.query.search || '',
    page: route.query.page || 1
  }
  loadProperties()
})

const formatPrice = (price) => {
  return new Intl.NumberFormat('es-BO').format(price)
}
</script>

<template>
  <div class="landing-page bg-light-landing min-vh-100 d-flex flex-column">
    <LandingHeader />

    <!-- Hero Section para la vista de listado -->
    <section class="propiedades-hero py-5 mt-5">
      <div class="container mt-4">
        <div class="row align-items-center">
          <div class="col-lg-8">
            <h1 class="display-5 fw-bold text-white mb-2">Encuentra tu próximo <span class="text-gradient">Hogar</span></h1>
            <p class="lead text-white mb-0" style="opacity: 0.9;">Explora nuestro catálogo completo de lotes y casas disponibles.</p>
          </div>
        </div>
      </div>
    </section>

    <main class="flex-grow-1 py-5">
      <div class="container">
        <div class="row g-4">
          
          <!-- Filtros Desktop -->
          <div class="col-lg-3 d-none d-lg-block">
            <div class="card border-0 shadow-sm rounded-4 p-4 sticky-top" style="top: 100px;">
              <div class="d-flex align-items-center justify-content-between mb-4">
                <h5 class="fw-bold mb-0">Filtros</h5>
                <button @click="resetFilters" class="btn btn-link btn-sm text-decoration-none text-muted p-0">Limpiar</button>
              </div>

              <div class="mb-4">
                <label class="form-label small fw-bold text-muted text-uppercase">Búsqueda</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-light border-0"><Search :size="14" /></span>
                  <input type="text" v-model="filters.search" @keyup.enter="applyFilters" class="form-control bg-light border-0" placeholder="Código o zona...">
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label small fw-bold text-muted text-uppercase">Tipo de Inmueble</label>
                <select v-model="filters.tipo" @change="applyFilters" class="form-select form-select-sm bg-light border-0 shadow-none">
                  <option value="Todos">Todos los tipos</option>
                  <option value="Lote">Lotes de Terreno</option>
                  <option value="Casa">Casas Residenciales</option>
                </select>
              </div>

              <div class="mb-4">
                <label class="form-label small fw-bold text-muted text-uppercase">Ciudad</label>
                <select v-model="filters.ciudad_id" @change="applyFilters" class="form-select form-select-sm bg-light border-0 shadow-none">
                  <option value="">Todas las ciudades</option>
                  <option v-for="ciudad in companyStore.cities" :key="ciudad.id" :value="ciudad.id">
                    {{ ciudad.nombre }}
                  </option>
                </select>
              </div>

              <div class="mb-4">
                <label class="form-label small fw-bold text-muted text-uppercase">Rango de Precio ($)</label>
                <div class="row g-2">
                  <div class="col-6">
                    <input type="number" v-model="filters.precio_min" @keyup.enter="applyFilters" class="form-control form-control-sm bg-light border-0" placeholder="Min">
                  </div>
                  <div class="col-6">
                    <input type="number" v-model="filters.precio_max" @keyup.enter="applyFilters" class="form-control form-control-sm bg-light border-0" placeholder="Max">
                  </div>
                </div>
              </div>

              <div class="mb-4" v-if="filters.tipo === 'Casa' || filters.tipo === 'Todos'">
                <label class="form-label small fw-bold text-muted text-uppercase">Habitaciones (+)</label>
                <div class="d-flex gap-2">
                  <button 
                    v-for="n in [1, 2, 3, 4]" 
                    :key="n"
                    @click="filters.habitaciones = n; applyFilters()"
                    :class="['btn btn-sm flex-grow-1 border-0', filters.habitaciones == n ? 'btn-primary-landing' : 'bg-light']"
                  >
                    {{ n }}+
                  </button>
                </div>
              </div>

              <button @click="applyFilters" class="btn btn-primary-landing w-100 py-2 rounded-3 mt-2">
                Aplicar Filtros
              </button>
            </div>
          </div>

          <!-- Botón Filtros Mobile -->
          <div class="col-12 d-lg-none mb-3">
            <button @click="showFilters = true" class="btn btn-white w-100 shadow-sm border-0 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2">
              <Filter :size="18" /> Filtrar y Buscar
            </button>
          </div>

          <!-- Listado de Propiedades -->
          <div class="col-lg-9">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <p class="text-muted mb-0">
                Se encontraron <span class="fw-bold text-dark">{{ companyStore.pagination.totalItems }}</span> propiedades
              </p>
              <div class="d-flex gap-2">
                <!-- Ordenar (Opcional futuro) -->
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="companyStore.loading" class="row g-4">
              <div v-for="i in 6" :key="i" class="col-md-6">
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

            <!-- Empty State -->
            <div v-else-if="companyStore.allProperties.length === 0" class="text-center py-5">
              <div class="bg-white rounded-5 p-5 shadow-sm">
                <i class="bi bi-search display-1 text-muted opacity-25 d-block mb-4"></i>
                <h3 class="fw-bold">No hay resultados</h3>
                <p class="text-muted">Intenta ajustando tus filtros de búsqueda.</p>
                <button @click="resetFilters" class="btn btn-primary-landing px-4 mt-2">Ver todo el catálogo</button>
              </div>
            </div>

            <!-- Grid -->
            <div v-else class="row g-4">
              <div v-for="prop in companyStore.allProperties" :key="prop.id" class="col-md-6">
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
                      <span v-if="prop.es_destacado" class="badge bg-warning text-dark text-uppercase px-3 py-2 shadow-sm">Destacado</span>
                    </div>
                    <div class="position-absolute bottom-0 start-0 p-3 text-white">
                      <h4 class="fw-bold mb-0 drop-shadow">{{ prop.moneda }} {{ formatPrice(prop.precio_venta) }}</h4>
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

            <!-- Paginación -->
            <div v-if="companyStore.pagination.totalPages > 1" class="d-flex justify-content-center mt-5">
              <nav>
                <ul class="pagination gap-2 border-0">
                  <li class="page-item" :class="{ disabled: companyStore.pagination.currentPage === 1 }">
                    <button @click="changePage(companyStore.pagination.currentPage - 1)" class="page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                      <ChevronLeft :size="20" />
                    </button>
                  </li>
                  <li v-for="p in companyStore.pagination.totalPages" :key="p" class="page-item">
                    <button 
                      @click="changePage(p)" 
                      :class="['page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center', companyStore.pagination.currentPage === p ? 'bg-primary-landing text-white' : 'bg-white']"
                      style="width: 45px; height: 45px;"
                    >
                      {{ p }}
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: companyStore.pagination.currentPage === companyStore.pagination.totalPages }">
                    <button @click="changePage(companyStore.pagination.currentPage + 1)" class="page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                      <ChevronRight :size="20" />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

          </div>
        </div>
      </div>
    </main>

    <!-- Modal Filtros Mobile -->
    <div v-if="showFilters" class="mobile-filters-overlay animate__animated animate__fadeIn">
      <div class="mobile-filters-content p-4 animate__animated animate__slideInUp">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h5 class="fw-bold mb-0">Filtros de Búsqueda</h5>
          <button @click="showFilters = false" class="btn btn-light rounded-circle p-2"><X :size="20" /></button>
        </div>

        <div class="mb-4">
          <label class="form-label small fw-bold text-muted text-uppercase">Búsqueda</label>
          <input type="text" v-model="filters.search" class="form-control bg-light border-0 py-3 rounded-3" placeholder="Código o zona...">
        </div>

        <div class="mb-4">
          <label class="form-label small fw-bold text-muted text-uppercase">Tipo de Inmueble</label>
          <div class="d-flex gap-2">
            <button 
              v-for="t in ['Todos', 'Lote', 'Casa']" 
              :key="t"
              @click="filters.tipo = t"
              :class="['btn flex-grow-1 border-0 py-3 rounded-3', filters.tipo === t ? 'btn-primary-landing' : 'bg-light']"
            >
              {{ t === 'Todos' ? 'Todos' : t }}
            </button>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label small fw-bold text-muted text-uppercase">Ciudad</label>
          <select v-model="filters.ciudad_id" class="form-select bg-light border-0 py-3 rounded-3 shadow-none">
            <option value="">Todas las ciudades</option>
            <option v-for="ciudad in companyStore.cities" :key="ciudad.id" :value="ciudad.id">
              {{ ciudad.nombre }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label class="form-label small fw-bold text-muted text-uppercase">Rango de Precio ($)</label>
          <div class="row g-2">
            <div class="col-6">
              <input type="number" v-model="filters.precio_min" class="form-control bg-light border-0 py-3 rounded-3" placeholder="Mínimo">
            </div>
            <div class="col-6">
              <input type="number" v-model="filters.precio_max" class="form-control bg-light border-0 py-3 rounded-3" placeholder="Máximo">
            </div>
          </div>
        </div>

        <div class="d-grid gap-2 mt-5 pt-4">
          <button @click="applyFilters(); showFilters = false" class="btn btn-primary-landing py-3 rounded-3">
            Mostrar Resultados
          </button>
          <button @click="resetFilters(); showFilters = false" class="btn btn-link text-muted py-2 text-decoration-none">
            Limpiar todo
          </button>
        </div>
      </div>
    </div>

    <LandingFooter />
    <WhatsAppButton />
  </div>
</template>

<style scoped>
.propiedades-hero {
  background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.propiedades-hero::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.text-gradient-custom {
  background: linear-gradient(135deg, #fff 0%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.landing-card:hover img { transform: scale(1.1); }
.drop-shadow { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }

.mobile-filters-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.mobile-filters-content {
  width: 100%;
  background: white;
  border-radius: 30px 30px 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.hover-bg-primary:hover { 
  background-color: var(--landing-primary); 
  color: white !important; 
  border-color: var(--landing-primary); 
}

/* Pagination custom styles */
.page-link {
  color: #64748b;
  transition: all 0.3s;
}
.page-link:hover {
  background-color: #f1f5f9;
}
.active > .page-link {
  background-color: var(--landing-primary) !important;
  color: white !important;
}
</style>
