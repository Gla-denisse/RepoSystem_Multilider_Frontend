<script setup>
import { useCompanyStore } from '@/stores/company'
import { CheckCircle2 } from 'lucide-vue-next'

const companyStore = useCompanyStore()
</script>

<template>
  <section id="nosotros" class="section-padding bg-white overflow-hidden">
    <div class="container">
      <div class="row align-items-center g-5">
        <!-- Image Grid -->
        <div class="col-lg-6 position-relative">
          <div class="row g-3">
            <div class="col-6 pt-5">
              <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80" class="img-fluid rounded-4 shadow mb-3 h-250 object-fit-cover" alt="Real Estate 1">
              <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80" class="img-fluid rounded-4 shadow h-200 object-fit-cover" alt="Real Estate 2">
            </div>
            <div class="col-6">
              <img src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80" class="img-fluid rounded-4 shadow mb-3 h-200 object-fit-cover" alt="Real Estate 3">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80" class="img-fluid rounded-4 shadow h-250 object-fit-cover" alt="Real Estate 4">
            </div>
          </div>
          
          <!-- Experience Badge -->
          <div class="experience-badge position-absolute top-50 start-50 translate-middle bg-primary-landing p-4 rounded-4 shadow-lg text-white text-center border border-white border-5">
            <span class="d-block h2 fw-black mb-0">+10</span>
            <span class="small fw-bold text-uppercase tracking-wider">Años de éxito</span>
          </div>
        </div>

        <!-- Content -->
        <div class="col-lg-6">
          <span class="text-primary-landing fw-bold text-uppercase small mb-2 d-block tracking-widest">Conoce nuestra historia</span>
          <h2 class="display-5 fw-extrabold mb-4 lh-sm">
            Transformamos tus sueños en <span class="text-primary-landing">Inversiones Reales</span>
          </h2>
          
          <div class="text-muted mb-5 fs-5">
            <p v-if="companyStore.company?.descripcion_nosotros">{{ companyStore.company.descripcion_nosotros }}</p>
            <p v-else>En Multilider System, nos dedicamos a facilitar el acceso a la vivienda propia y terrenos de inversión. Nuestra trayectoria nos avala como líderes en el sector inmobiliario.</p>
          </div>

          <div class="row g-4 mb-5">
            <div class="col-md-6">
              <div class="p-4 rounded-4 bg-light border">
                <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                  <CheckCircle2 class="text-primary-landing" :size="20" /> Misión
                </h5>
                <p class="small text-muted mb-0">Proveer soluciones habitacionales y de inversión inmobiliaria de alta calidad, garantizando seguridad jurídica.</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-4 rounded-4 bg-light border">
                <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                  <CheckCircle2 class="text-primary-landing" :size="20" /> Visión
                </h5>
                <p class="small text-muted mb-0">Ser la inmobiliaria referente a nivel nacional, reconocida por nuestra ética, innovación y compromiso.</p>
              </div>
            </div>
          </div>
          
          <div class="d-flex align-items-center gap-4 flex-wrap">
            <button class="btn-landing btn-landing-primary">Descubrir más</button>
            <div class="d-flex align-items-center gap-2">
              <div class="avatar-group d-flex">
                <img v-for="i in 3" :key="i" :src="`https://i.pravatar.cc/100?u=${i}`" class="rounded-circle border border-2 border-white" width="35" height="35" style="margin-left: -10px;">
              </div>
              <span class="small text-muted fw-medium">+2k Clientes felices confían</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.h-250 { height: 250px; }
.h-200 { height: 200px; }
.object-fit-cover { object-fit: cover; }
.fw-extrabold { font-weight: 800; }
.fw-black { font-weight: 900; }
.experience-badge { min-width: 140px; }
</style>
