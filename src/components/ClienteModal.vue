<script setup>
import { ref } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

const emit = defineEmits(['cliente-creado'])
const btnCerrar = ref(null)
const guardando = ref(false)
const errores = ref({})

const form = ref({ ci: '', lugar_expedicion: '', nombre_completo: '', telefono: '', correo: '', direccion: '', estado: true })

const guardar = async () => {
  guardando.value = true
  errores.value = {}
  try {
    const res = await api.post('/clientes', form.value)
    emit('cliente-creado', res.data.data) // Devolvemos el cliente recién creado
    btnCerrar.value.click()
    form.value = { ci: '', lugar_expedicion: '', nombre_completo: '', telefono: '', correo: '', direccion: '', estado: true }
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente creado', showConfirmButton: false, timer: 2000 })
  } catch (error) {
    if (error.response?.status === 422) errores.value = error.response.data.errors
    else Swal.fire('Error', 'No se pudo crear el cliente', 'error')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="modal fade" id="modalCrearCliente" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <div class="modal-header bg-light border-0">
          <h6 class="fw-bold mb-0"><i class="bi bi-person-plus text-primary me-2"></i>Crear Cliente Rápido</h6>
          <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" ref="btnCerrar"></button>
        </div>
        <div class="modal-body p-4">
          <form @submit.prevent="guardar">
            <div class="row g-3">
              <div class="col-8">
                <label class="small fw-bold text-muted">CI *</label>
                <input type="text" class="form-control bg-light border-0" v-model="form.ci" :class="{'is-invalid': errores.ci}" required>
              </div>
              <div class="col-4">
                <label class="small fw-bold text-muted">Exp. *</label>
                <select class="form-select bg-light border-0" v-model="form.lugar_expedicion" :class="{'is-invalid': errores.lugar_expedicion}" required>
                  <option value="" disabled>...</option>
                  <option value="SC">SC</option><option value="LP">LP</option><option value="CB">CB</option>
                </select>
              </div>
              <div class="col-12">
                <label class="small fw-bold text-muted">Nombre Completo *</label>
                <input type="text" class="form-control bg-light border-0" v-model="form.nombre_completo" required>
              </div>
              <div class="col-12">
                <label class="small fw-bold text-muted">Correo *</label>
                <input type="email" class="form-control bg-light border-0" v-model="form.correo" :class="{'is-invalid': errores.correo}" required>
                <div v-if="errores.correo" class="invalid-feedback">{{ errores.correo[0] }}</div>
              </div>
              <div class="col-12">
                <label class="small fw-bold text-muted">Teléfono</label>
                <input type="text" class="form-control bg-light border-0" v-model="form.telefono">
              </div>
            </div>
            <div class="d-flex justify-content-end mt-4">
              <button type="button" class="btn btn-light me-2" data-bs-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-primary px-4" :disabled="guardando">{{ guardando ? 'Creando...' : 'Crear Cliente' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>