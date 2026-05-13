<script setup>
import { onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingFeatures from '@/components/landing/LandingFeatures.vue'
import LandingCatalog from '@/components/landing/LandingCatalog.vue'
import LandingAbout from '@/components/landing/LandingAbout.vue'
import LandingAdvisors from '@/components/landing/LandingAdvisors.vue'
import LandingContact from '@/components/landing/LandingContact.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import WhatsAppButton from '@/components/landing/WhatsAppButton.vue'

const companyStore = useCompanyStore()

onMounted(() => {
  companyStore.fetchLandingData()
})
</script>

<template>
  <div class="landing-page">
    <LandingHeader />
    
    <main>
      <LandingHero />
      <LandingFeatures />
      <LandingCatalog />
      <LandingAbout />
      <LandingAdvisors />
      <LandingContact />
    </main>
    
    <LandingFooter />
    <WhatsAppButton />
  </div>
</template>

<style>
/* Los estilos base están en assets/landing.css */
</style>
