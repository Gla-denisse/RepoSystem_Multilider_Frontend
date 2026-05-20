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
  <section class="section-padding pp-features-bg">
    <div class="container text-center">
      <div class="row justify-content-center mb-5">
        <div class="col-lg-8">
          <h2 class="section-title">¿Por qué elegirnos?</h2>
          <p class="section-subtitle">
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
            <h4 class="fw-bold mb-3 text-main-theme">{{ feature.title }}</h4>
            <p class="text-muted small mb-0">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pp-features-bg {
  background-color: var(--bg-body);
}

.landing-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.text-main-theme {
  color: var(--text-main);
}

.landing-card:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-body);
  transform: translateY(-10px);
}

[data-theme="dark"] .landing-card {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
</style>
