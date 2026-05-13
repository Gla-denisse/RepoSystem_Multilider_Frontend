<script setup>
import { useCompanyStore } from '@/stores/company'
import { CheckCircle2 } from 'lucide-vue-next'

const companyStore = useCompanyStore()
</script>

<template>
  <section id="nosotros" class="section-padding bg-white overflow-hidden">
    <div class="container">
      <div class="row align-items-center g-5">
        
        <!-- Galería Asimétrica (Sección Izquierda) -->
        <div class="col-lg-6">
          <div class="position-relative pe-md-5 mb-5 mb-lg-0 animate__animated animate__fadeInLeft">
            <div class="row g-3 align-items-stretch">
                
                <!-- Columna Izquierda: Imagen Grande -->
                <div class="col-7">
                    <div class="h-100 h-fixed-400">
                        <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80" 
                             alt="Inmueble Principal" 
                             class="img-fluid rounded-4 shadow-sm w-100 object-fit-cover h-100 border border-white border-2">
                    </div>
                </div>

                <!-- Columna Derecha: Stack de dos imágenes -->
                <div class="col-5">
                    <div class="d-flex flex-column h-100 h-fixed-400 gap-3">
                        <div class="flex-grow-1 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80" 
                                 alt="Interior" 
                                 class="img-fluid rounded-4 shadow-sm w-100 object-fit-cover h-100 border border-white border-2">
                        </div>
                        <div class="flex-grow-1 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80" 
                                 alt="Arquitectura" 
                                 class="img-fluid rounded-4 shadow-sm w-100 object-fit-cover h-100 border border-white border-2">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Badge Flotante Corporativo -->
            <div class="position-absolute top-50 start-50 translate-middle z-1">
                <div class="bg-primary-landing text-white p-3 p-md-4 rounded-4 shadow-lg text-center border border-white border-4 animate__animated animate__zoomIn animate__delay-1s" 
                     style="min-width: 140px;">
                    <div class="h2 fw-bold mb-0 text-white text-technical">+10</div>
                    <div class="small fw-semibold text-uppercase tracking-wider" style="font-size: 0.7rem; opacity: 0.9;">
                        Años de éxito
                    </div>
                </div>
            </div>
          </div>
        </div>

        <!-- Contenido (Sección Derecha) -->
        <div class="col-lg-6 animate__animated animate__fadeInRight">
          <span class="text-primary-landing fw-bold text-uppercase small mb-2 d-block tracking-widest">Conoce nuestra historia</span>
          <h2 class="section-title text-start mb-4">
            Transformamos tus sueños en <span class="text-gradient">Inversiones Reales</span>
          </h2>
          
          <div class="text-muted mb-5 fs-5">
            <p v-if="companyStore.company?.descripcion_nosotros">{{ companyStore.company.descripcion_nosotros }}</p>
            <p v-else>En Multilider System, nos dedicamos a facilitar el acceso a la vivienda propia y terrenos de inversión. Nuestra trayectoria nos avala como líderes en el sector inmobiliario.</p>
          </div>

          <div class="row g-4 mb-5">
            <div class="col-md-6">
              <div class="p-4 rounded-4 bg-light border-0 card-hover-shadow transition-all h-100">
                <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                  <CheckCircle2 class="text-primary-landing" :size="20" /> Misión
                </h5>
                <p class="small text-muted mb-0">
                  {{ companyStore.company?.mision || 'Proveer soluciones habitacionales y de inversión inmobiliaria de alta calidad, garantizando seguridad jurídica.' }}
                </p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-4 rounded-4 bg-light border-0 card-hover-shadow transition-all h-100">
                <h5 class="fw-bold mb-3 d-flex align-items-center gap-2">
                  <CheckCircle2 class="text-primary-landing" :size="20" /> Visión
                </h5>
                <p class="small text-muted mb-0">
                  {{ companyStore.company?.vision || 'Ser la inmobiliaria referente a nivel nacional, reconocida por nuestra ética, innovación y compromiso.' }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="d-flex align-items-center gap-4 flex-wrap">
            <button class="btn-landing btn-landing-primary shadow">Descubrir más</button>
            <div class="d-flex align-items-center gap-2">
              <div class="avatar-group d-flex">
                <img v-for="i in 3" :key="i" :src="`https://i.pravatar.cc/100?u=${i}`" class="rounded-circle border border-2 border-white" width="38" height="35" style="margin-left: -10px;">
              </div>
              <span class="small text-muted fw-medium">+2k Clientes confían</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.h-fixed-400 {
  height: 450px;
}

@media (max-width: 768px) {
  .h-fixed-400 {
    height: 300px;
  }
}

.card-hover-shadow:hover {
  background-color: white !important;
  box-shadow: 0 10px 30px rgba(11, 37, 69, 0.08);
  transform: translateY(-5px);
}

.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.text-gradient {
  background: linear-gradient(135deg, var(--landing-primary) 0%, var(--landing-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
