<script setup>
import { ShieldCheck, TrendingUp, MapPin, BadgeCheck } from 'lucide-vue-next'

const features = [
  {
    title: 'Seguridad Jurídica',
    desc: 'Todos nuestros proyectos cuentan con papeles al día y transferencia inmediata.',
    icon: ShieldCheck,
    color: 'bg-primary-landing text-white'
  },
  {
    title: 'Ubicación Estratégica',
    desc: 'Lotes y casas ubicados en zonas de alto crecimiento y plusvalía garantizada.',
    icon: MapPin,
    color: 'bg-primary-landing text-white'
  },
  {
    title: 'Alta Plusvalía',
    desc: 'Tu inversión crece con el tiempo gracias al desarrollo urbano de nuestros proyectos.',
    icon: TrendingUp,
    color: 'bg-primary-landing text-white'
  },
  {
    title: 'Garantía Multilider',
    desc: 'Más de 10 años en el mercado brindando soluciones habitacionales reales.',
    icon: BadgeCheck,
    color: 'bg-primary-landing text-white'
  }
]
</script>

<template>
  <section class="section-padding bg-white">
    <div class="container text-center">
      <div class="row justify-content-center mb-5">
        <div class="col-lg-8">
          <h2 class="section-title text-dark">¿Por qué elegirnos?</h2>
          <p class="section-subtitle text-muted">
            Nos enfocamos en brindar la mejor experiencia de compra, asegurando que tu patrimonio esté en las mejores manos.
          </p>
        </div>
      </div>

      <div class="row g-4">
        <div v-for="feature in features" :key="feature.title" class="col-md-6 col-lg-3">
          <div class="landing-card h-100 p-5 text-center transition-all">
            <div :class="['d-inline-flex p-3 rounded-4 mb-4 shadow-sm', feature.color]">
              <component :is="feature.icon" :size="32" />
            </div>
            <h4 class="fw-bold mb-3">{{ feature.title }}</h4>
            <p class="text-muted small mb-0">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-card {
  border: 1px solid #f1f5f9;
}
.landing-card:hover {
  border-color: var(--landing-primary);
  background-color: #f8fafc;
}
</style>
