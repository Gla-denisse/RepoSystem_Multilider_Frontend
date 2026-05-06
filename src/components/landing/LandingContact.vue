<script setup>
import { ref, reactive } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { Send, MapPin, Phone, Mail } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const companyStore = useCompanyStore()
const isSending = ref(false)

const form = reactive({
  nombre: '',
  email: '',
  telefono: '',
  mensaje: ''
})

const handleSubmit = async () => {
  isSending.value = true
  setTimeout(() => {
    Swal.fire({
      icon: 'success',
      title: 'Mensaje Enviado',
      text: 'Gracias por contactarnos. Un asesor se comunicará contigo pronto.',
      confirmButtonColor: companyStore.primaryColor
    })
    form.nombre = ''
    form.email = ''
    form.telefono = ''
    form.mensaje = ''
    isSending.value = false
  }, 1500)
}
</script>

<template>
  <section id="contacto" class="section-padding bg-dark text-white">
    <div class="container">
      <div class="row g-5">
        <!-- Info -->
        <div class="col-lg-5">
          <h2 class="display-5 fw-bold mb-4">Hablemos de tu <br><span class="text-primary-landing">Próximo Hogar</span></h2>
          <p class="text-muted mb-5 fs-5">¿Tienes alguna duda o quieres visitar un proyecto? Déjanos tus datos y nos pondremos en contacto contigo lo antes posible.</p>
          
          <div class="d-flex flex-column gap-4">
            <div class="d-flex gap-4 align-items-start">
              <div class="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10 shadow-sm">
                <MapPin class="text-primary-landing" :size="24" />
              </div>
              <div>
                <h5 class="fw-bold mb-1">Visítanos</h5>
                <p class="text-muted mb-0 small">{{ companyStore.company?.direccion || 'Santa Cruz, Bolivia' }}</p>
              </div>
            </div>

            <div class="d-flex gap-4 align-items-start">
              <div class="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10 shadow-sm">
                <Phone class="text-primary-landing" :size="24" />
              </div>
              <div>
                <h5 class="fw-bold mb-1">Llámanos</h5>
                <p class="text-muted mb-0 small">{{ companyStore.company?.telefono || '+591 70000000' }}</p>
              </div>
            </div>

            <div class="d-flex gap-4 align-items-start">
              <div class="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10 shadow-sm">
                <Mail class="text-primary-landing" :size="24" />
              </div>
              <div>
                <h5 class="fw-bold mb-1">Email</h5>
                <p class="text-muted mb-0 small">{{ companyStore.company?.email || 'contacto@multilider.com' }}</p>
              </div>
            </div>
          </div>

          <!-- Map -->
          <div v-if="companyStore.company?.mapa_iframe" class="mt-5 rounded-4 overflow-hidden border border-white border-opacity-10" style="height: 250px;">
            <div v-html="companyStore.company.mapa_iframe" class="w-100 h-100 iframe-container"></div>
          </div>
        </div>

        <!-- Form -->
        <div class="col-lg-7">
          <div class="bg-white p-5 rounded-4 shadow-lg text-dark">
            <h4 class="fw-bold mb-4">Envíanos un mensaje</h4>
            <form @submit.prevent="handleSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted text-uppercase">Nombre Completo</label>
                  <input v-model="form.nombre" type="text" class="form-control bg-light border-0 py-3 px-4 rounded-3" placeholder="Ej: Juan Perez" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold text-muted text-uppercase">Teléfono</label>
                  <input v-model="form.telefono" type="tel" class="form-control bg-light border-0 py-3 px-4 rounded-3" placeholder="+591 ..." required>
                </div>
                <div class="col-12">
                  <label class="form-label small fw-bold text-muted text-uppercase">Email</label>
                  <input v-model="form.email" type="email" class="form-control bg-light border-0 py-3 px-4 rounded-3" placeholder="tu@email.com" required>
                </div>
                <div class="col-12">
                  <label class="form-label small fw-bold text-muted text-uppercase">Mensaje</label>
                  <textarea v-model="form.mensaje" rows="4" class="form-control bg-light border-0 py-3 px-4 rounded-3" placeholder="Escribe tu mensaje aquí..." required></textarea>
                </div>
                <div class="col-12 mt-4">
                  <button type="submit" class="btn-landing btn-landing-primary w-100 justify-content-center py-3 fs-5 shadow" :disabled="isSending">
                    <Send v-if="!isSending" :size="20" />
                    <div v-else class="spinner-border spinner-border-sm me-2"></div>
                    <span>{{ isSending ? 'Enviando...' : 'Enviar Solicitud' }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.iframe-container :deep(iframe) {
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
}
.bg-dark { background-color: #0f172a !important; }
</style>
