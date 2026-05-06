<script setup>
import { useCompanyStore } from '@/stores/company'
import { MessageCircle } from 'lucide-vue-next'

const companyStore = useCompanyStore()

const openWhatsApp = () => {
  const phone = companyStore.company?.whatsapp || '59170000000'
  const cleanPhone = phone.replace(/\D/g, '')
  window.open(`https://wa.me/${cleanPhone}?text=Hola, vi su página web y me gustaría recibir información.`, '_blank')
}
</script>

<template>
  <button 
    @click="openWhatsApp"
    class="whatsapp-float border-0 shadow-lg d-flex align-items-center justify-content-center transition-all"
    title="Chatear con nosotros"
  >
    <div class="whatsapp-tooltip position-absolute bg-white text-dark px-3 py-2 rounded-3 shadow-sm small fw-bold opacity-0 transition-all border d-none d-md-block">
      ¡Escríbenos ahora! 👋
    </div>
    <MessageCircle :size="32" />
  </button>
</template>

<style scoped>
.whatsapp-float {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 65px;
  height: 65px;
  background-color: #25d366;
  color: white;
  border-radius: 50%;
  z-index: 1000;
  cursor: pointer;
}

.whatsapp-float:hover {
  transform: scale(1.1);
  background-color: #20ba5a;
}

.whatsapp-float:active {
  transform: scale(0.9);
}

.whatsapp-tooltip {
  right: 80px;
  width: max-content;
  pointer-events: none;
}

.whatsapp-float:hover .whatsapp-tooltip {
  opacity: 1 !important;
  transform: translateX(-10px);
}
</style>
