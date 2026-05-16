<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'
import { useCompanyStore } from '@/stores/company'

const route = useRoute()
const companyStore = useCompanyStore()
const baseUrl = 'http://localhost:8000'

// ── Estado del wizard ────────────────────────────────────────────────────────
const step = ref(1)
const buscando = ref(false)
const procesando = ref(false)

// ── Paso 1 ───────────────────────────────────────────────────────────────────
const ciInput = ref('')
const errorBusqueda = ref('')

// ── Paso 2 ───────────────────────────────────────────────────────────────────
const cliente = ref(null)
const pagosContado = ref([])
const cuotasPendientes = ref([])
const cuotasSeleccionadas = ref([])
const pagoContadoSeleccionado = ref(null)

// ── Paso 3 ───────────────────────────────────────────────────────────────────
const formPagador = ref({
  ci_pagador: '',
  telefono_pagador: '',
  nombres_pagador: '',
  apellidos_pagador: '',
  correo_pagador: '',
})
const aceptaTerminos = ref(false)
const erroresPagador = ref({})

// ── Paso 4 ───────────────────────────────────────────────────────────────────
const urlPago = ref('')
const qrUrl = ref('')
const idTransaccion = ref('')
const estadoPago = ref('PENDIENTE')
let pollingInterval = null

// ── Computed ─────────────────────────────────────────────────────────────────
const pagoIdsSeleccionados = computed(() => {
  const ids = []
  if (pagoContadoSeleccionado.value) ids.push(pagoContadoSeleccionado.value)
  return ids
})

const totalSeleccionado = computed(() => {
  let total = 0
  if (pagoContadoSeleccionado.value) {
    const p = pagosContado.value.find(p => p.id === pagoContadoSeleccionado.value)
    if (p) total += parseFloat(p.monto)
  }
  cuotasSeleccionadas.value.forEach(cid => {
    const c = cuotasPendientes.value.find(c => c.cuota_id === cid)
    if (c) total += parseFloat(c.monto_cuota)
  })
  return total.toFixed(2)
})

const monedaDetectada = computed(() => {
  if (pagoContadoSeleccionado.value) {
    const p = pagosContado.value.find(p => p.id === pagoContadoSeleccionado.value)
    if (p) return p.moneda
  }
  if (cuotasSeleccionadas.value.length) {
    const c = cuotasPendientes.value.find(c => c.cuota_id === cuotasSeleccionadas.value[0])
    if (c) return c.moneda
  }
  return 'Bs'
})

const haySeleccion = computed(() =>
  pagoContadoSeleccionado.value !== null || cuotasSeleccionadas.value.length > 0
)

const hayMontosUSD = computed(() => haySeleccion.value && monedaDetectada.value === 'USD')

const formularioPagadorValido = computed(() => {
  const f = formPagador.value
  return f.ci_pagador && f.telefono_pagador && f.nombres_pagador && f.apellidos_pagador && f.correo_pagador && aceptaTerminos.value
})

// ── Paso 1: Buscar cliente ────────────────────────────────────────────────────
const buscarCliente = async () => {
  if (!ciInput.value.trim()) return
  errorBusqueda.value = ''
  buscando.value = true
  try {
    const res = await api.post('/public/clientes/buscar', { ci: ciInput.value.trim() })
    cliente.value = res.data.cliente
    pagosContado.value = res.data.pagos_contado
    cuotasPendientes.value = res.data.cuotas_pendientes
    pagoContadoSeleccionado.value = null
    cuotasSeleccionadas.value = []
    step.value = 2
  } catch (err) {
    if (err.response?.status === 404) {
      errorBusqueda.value = err.response.data.message || 'CI no encontrado.'
    } else {
      errorBusqueda.value = 'Error al buscar. Intente nuevamente.'
    }
  } finally {
    buscando.value = false
  }
}

// ── Paso 2: Selección ────────────────────────────────────────────────────────
const toggleCuota = (cuotaId) => {
  const idx = cuotasSeleccionadas.value.indexOf(cuotaId)
  if (idx === -1) cuotasSeleccionadas.value.push(cuotaId)
  else cuotasSeleccionadas.value.splice(idx, 1)
}

const toggleContado = (pagoId) => {
  pagoContadoSeleccionado.value = pagoContadoSeleccionado.value === pagoId ? null : pagoId
}

const irPaso3 = () => {
  if (!haySeleccion.value) return
  formPagador.value.ci_pagador = cliente.value.ci || ''
  formPagador.value.telefono_pagador = cliente.value.telefono || ''
  formPagador.value.correo_pagador = cliente.value.correo || ''
  const parts = (cliente.value.nombre_completo || '').split(' ')
  formPagador.value.nombres_pagador = parts.slice(0, Math.ceil(parts.length / 2)).join(' ')
  formPagador.value.apellidos_pagador = parts.slice(Math.ceil(parts.length / 2)).join(' ')
  step.value = 3
}

// ── Paso 3: Procesar ─────────────────────────────────────────────────────────
const procesarPago = async () => {
  erroresPagador.value = {}
  procesando.value = true
  try {
    const payload = {
      pago_ids:   pagoIdsSeleccionados.value,
      cuota_ids:  cuotasSeleccionadas.value,
      cliente_id: cliente.value.id,
      ...formPagador.value,
    }
    const res = await api.post('/public/pagos/procesar', payload)
    idTransaccion.value = res.data.id_transaccion
    urlPago.value = res.data.url_pago || ''
    qrUrl.value = res.data.qr_url || ''
    estadoPago.value = 'PENDIENTE'
    step.value = 4
    iniciarPolling()
  } catch (err) {
    if (err.response?.status === 422) {
      erroresPagador.value = err.response.data.errors || {}
    }
    const msg = err.response?.data?.message || 'Error al procesar el pago.'
    alert(msg)
  } finally {
    procesando.value = false
  }
}

// ── Canal entre pestañas (BroadcastChannel) ──────────────────────────────────
const pagoChannel = new BroadcastChannel('multilider_pagos')

// ── Paso 4: Polling ───────────────────────────────────────────────────────────
const confirmarPago = () => {
  estadoPago.value = 'PAGADO'
  detenerPolling()
}

const iniciarPolling = () => {
  pollingInterval = setInterval(async () => {
    try {
      const res = await api.get(`/public/pagos/verificar/${idTransaccion.value}`)
      if (res.data.estado === 'PAGADO') confirmarPago()
    } catch { /* silent */ }
  }, 3000)
  setTimeout(() => detenerPolling(), 15 * 60 * 1000)
}

const detenerPolling = () => {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null }
}

const confirmarManual = async () => {
  try {
    await api.post('/public/pagos/confirmar-retorno', { id_transaccion: idTransaccion.value })
  } catch { /* ignorar */ }
  confirmarPago()
}

onMounted(async () => {
  const txn = route.query.txn
  if (txn) {
    idTransaccion.value = txn
    step.value = 4
    pagoChannel.postMessage({ tipo: 'PAGO_CONFIRMADO', txn })
    try {
      await api.post('/public/pagos/confirmar-retorno', { id_transaccion: txn })
    } catch { /* silent */ }
    estadoPago.value = 'PAGADO'
  } else {
    pagoChannel.onmessage = (event) => {
      if (event.data?.tipo === 'PAGO_CONFIRMADO' && event.data.txn === idTransaccion.value) {
        confirmarPago()
      }
    }
  }
})

onUnmounted(() => {
  detenerPolling()
  pagoChannel.close()
})

const abrirPagina = () => window.open(urlPago.value, '_blank')
const nuevoPago = () => {
  step.value = 1; ciInput.value = ''; errorBusqueda.value = ''
  cliente.value = null; pagosContado.value = []; cuotasPendientes.value = []
  cuotasSeleccionadas.value = []; pagoContadoSeleccionado.value = null
  urlPago.value = ''; qrUrl.value = ''; idTransaccion.value = ''; estadoPago.value = 'PENDIENTE'
  aceptaTerminos.value = false; erroresPagador.value = {}
  detenerPolling()
}

// Fix: strip time component (e.g. "2024-01-15T00:00:00Z") before parsing to avoid "Invalid Date"
const formatFecha = (f) => {
  if (!f) return '-'
  const datePart = String(f).substring(0, 10)
  return new Date(datePart + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}
const formatMonto = (m) => new Intl.NumberFormat('es-BO').format(m)
</script>

<template>
  <div class="pp-bg min-vh-100 d-flex flex-column">

    <!-- Header -->
    <header class="pp-header py-2 shadow-sm">
      <div class="container-xl d-flex align-items-center justify-content-between">
        <RouterLink to="/" class="d-flex align-items-center gap-2 text-decoration-none group">
          <div class="logo-box rounded-3 p-1 transition-all">
             <img v-if="companyStore.company?.logo" 
                  :src="baseUrl + companyStore.company.logo" 
                  class="pp-logo-filter"
                  style="max-height: 40px; object-fit: contain;">
             <i v-else class="bi bi-hexagon-fill fs-3 pp-accent-color"></i>
          </div>
          <span class="fw-black fs-4 text-dark tracking-tighter d-none d-sm-inline">
            {{ companyStore.company?.nombre || 'Multilider' }}
          </span>
        </RouterLink>

        <div class="d-flex align-items-center gap-2 gap-sm-3">
          <RouterLink to="/" class="btn btn-sm btn-light border rounded-pill px-3 d-flex align-items-center gap-1">
            <i class="bi bi-house"></i> <span class="d-none d-sm-inline">Inicio</span>
          </RouterLink>
          <span class="text-muted small border-start ps-2 ps-sm-3 d-flex align-items-center">
            <i class="bi bi-shield-lock-fill text-success me-1"></i>
            <span class="d-none d-md-inline">Pago seguro</span>
          </span>
        </div>
      </div>
    </header>

    <div class="flex-grow-1 py-4 py-lg-5 px-3">
      <div class="container-xl">

        <!-- ═══ PASO 1: BUSCAR (Diseño centrado) ═══ -->
        <div v-if="step === 1" class="pp-card shadow-lg mx-auto" style="max-width: 500px;">
          <div class="text-center mb-5">
            <h4 class="fw-bold mb-1">Consultar mis pagos pendientes</h4>
            <p class="text-muted small mb-0">Ingresa tu número de cédula de identidad para continuar</p>
          </div>

          <div class="mx-auto">
            <label class="form-label fw-semibold small text-uppercase letter-spacing-1">Número de CI</label>
            <div class="input-group input-group-lg pp-input-group">
              <span class="input-group-text">
                <i class="bi bi-card-text pp-accent-color"></i>
              </span>
              <input
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errorBusqueda }"
                v-model="ciInput"
                placeholder="Ej: 12345678"
                @keyup.enter="buscarCliente"
                :disabled="buscando"
              >
              <button
                class="btn btn-primary px-4 fw-bold"
                @click="buscarCliente"
                :disabled="buscando || !ciInput.trim()"
              >
                <span v-if="buscando" class="spinner-border spinner-border-sm me-1"></span>
                {{ buscando ? 'Buscando…' : 'Buscar' }}
              </button>
            </div>
            <div v-if="errorBusqueda" class="alert alert-danger d-flex align-items-center gap-2 mt-3 py-2 small">
              <i class="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <span>{{ errorBusqueda }}</span>
            </div>
            <p class="text-muted text-center mt-4" style="font-size:.78rem">
              <i class="bi bi-info-circle me-1"></i>
              Solo se mostrarán pagos pendientes asociados a tu CI registrado en el sistema.
            </p>
          </div>
        </div>

        <!-- ═══ PASOS 2, 3 y 4: SELECCIÓN, CONFIRMACIÓN Y QR (Dos columnas) ═══ -->
        <div v-else-if="(step === 2 || step === 3 || (step === 4 && estadoPago !== 'PAGADO')) && cliente" class="row g-4 justify-content-center">
          
          <!-- Columna Izquierda: Stepper + Content -->
          <div class="col-lg-8">
            <div class="pp-card shadow-sm p-4 p-md-5">
              
              <!-- Stepper -->
              <div class="pp-stepper mb-5">
                <template v-for="(label, i) in ['Buscar', 'Seleccionar', 'Confirmar', 'Pagar']" :key="i">
                  <div class="pp-step" :class="{ 'pp-step--done': step > i + 1, 'pp-step--current': step === i + 1 }">
                    <div class="pp-step-circle">
                      <i v-if="step > i + 1" class="bi bi-check-lg"></i>
                      <span v-else>{{ i + 1 }}</span>
                    </div>
                    <span class="pp-step-label d-none d-md-block">{{ label }}</span>
                  </div>
                  <div v-if="i < 3" class="pp-step-line" :class="{ 'pp-step-line--active': step > i + 1 }"></div>
                </template>
              </div>

              <!-- PASO 2: SELECCIONAR -->
              <div v-if="step === 2" class="paso-fade">
                <!-- ... existing step 2 content ... -->
                <div class="pp-cliente-card d-flex align-items-center gap-3 mb-5">
                  <div class="pp-avatar">{{ cliente.nombre_completo?.charAt(0) }}</div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="fw-bold fs-5 text-truncate">{{ cliente.nombre_completo }}</div>
                    <div class="text-muted small">
                      CI: <strong>{{ cliente.ci }}</strong>
                      <span v-if="cliente.telefono" class="ms-3 d-none d-sm-inline">
                        <i class="bi bi-telephone me-1"></i>{{ cliente.telefono }}
                      </span>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-light border flex-shrink-0" @click="step = 1">
                    <i class="bi bi-arrow-left me-1"></i>Cambiar
                  </button>
                </div>

                <!-- Sin pagos -->
                <div v-if="!pagosContado.length && !cuotasPendientes.length" class="text-center py-5">
                  <i class="bi bi-check-circle-fill text-success display-3 d-block mb-3"></i>
                  <h5 class="fw-bold">¡Sin pagos pendientes!</h5>
                  <p class="text-muted">No tienes ningún pago pendiente en este momento.</p>
                  <RouterLink to="/" class="btn btn-primary mt-2">Volver al inicio</RouterLink>
                </div>

                <template v-else>
                  <!-- Pagos al contado -->
                  <div v-if="pagosContado.length" class="mb-4">
                    <div class="pp-section-header mb-3">
                      <i class="bi bi-cash-coin text-success me-2"></i>
                      <span>Pagos al Contado / Cuota Inicial</span>
                      <span class="pp-section-badge">Selección única</span>
                    </div>
                    <div class="d-flex flex-column gap-2">
                      <div
                        v-for="pago in pagosContado"
                        :key="pago.id"
                        class="pp-sel-card"
                        :class="{ 'pp-sel-card--active': pagoContadoSeleccionado === pago.id }"
                        @click="toggleContado(pago.id)"
                        role="radio"
                        :aria-checked="pagoContadoSeleccionado === pago.id"
                      >
                        <div class="pp-indicator pp-indicator--radio">
                          <div class="pp-indicator-dot"></div>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                          <div class="pp-sel-title">{{ pago.tipo }}</div>
                          <div class="pp-sel-meta text-truncate">{{ pago.tipo_prop }} · {{ pago.propiedad }}</div>
                        </div>
                        <div class="pp-sel-amount">
                          <span class="pp-amount-currency">{{ pago.moneda }}</span>
                          <span class="pp-amount-value">{{ formatMonto(pago.monto) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Cuotas de crédito -->
                  <div v-if="cuotasPendientes.length" class="mb-4">
                    <div class="pp-section-header mb-2">
                      <i class="bi bi-calendar-check pp-accent-color me-2"></i>
                      <span>Cuotas de Crédito Pendientes</span>
                      <span class="pp-section-badge pp-section-badge--blue">Selección múltiple</span>
                    </div>
                    <p class="text-muted mb-3" style="font-size:.8rem">
                      Puedes marcar una o varias cuotas para pagarlas en una sola transacción.
                    </p>
                    <div class="d-flex flex-column gap-2">
                      <div
                        v-for="cuota in cuotasPendientes"
                        :key="cuota.cuota_id"
                        class="pp-sel-card"
                        :class="{ 'pp-sel-card--active': cuotasSeleccionadas.includes(cuota.cuota_id) }"
                        @click="toggleCuota(cuota.cuota_id)"
                        role="checkbox"
                        :aria-checked="cuotasSeleccionadas.includes(cuota.cuota_id)"
                      >
                        <div class="pp-indicator pp-indicator--checkbox">
                          <i class="bi bi-check2" style="font-size:.72rem"></i>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                          <div class="pp-sel-title">Cuota N° {{ cuota.numero_cuota }}</div>
                          <div class="pp-sel-meta d-flex flex-wrap align-items-center gap-2">
                            <span class="text-truncate">{{ cuota.tipo_prop }} · {{ cuota.propiedad }}</span>
                            <span class="pp-fecha-badge">
                              <i class="bi bi-calendar3 me-1"></i>Vence: {{ formatFecha(cuota.fecha_vencimiento) }}
                            </span>
                          </div>
                        </div>
                        <div class="pp-sel-amount">
                          <span class="pp-amount-currency">{{ cuota.moneda }}</span>
                          <span class="pp-amount-value pp-amount-value--blue">{{ formatMonto(cuota.monto_cuota) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- PASO 3: CONFIRMAR -->
              <div v-if="step === 3" class="paso-fade">
                <h5 class="fw-bold mb-4">
                  <i class="bi bi-person-vcard me-2 pp-accent-color"></i>Datos de quien realiza el pago
                </h5>
                <p class="text-muted small mb-4">Esta información identifica a la persona que efectúa la transferencia.</p>

                <div class="row g-3 mb-4">
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold">CI *</label>
                    <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.ci_pagador }"
                      v-model="formPagador.ci_pagador" placeholder="12345678">
                    <div v-if="erroresPagador.ci_pagador" class="invalid-feedback">{{ erroresPagador.ci_pagador[0] }}</div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold">Teléfono *</label>
                    <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.telefono_pagador }"
                      v-model="formPagador.telefono_pagador" placeholder="70000000">
                    <div v-if="erroresPagador.telefono_pagador" class="invalid-feedback">{{ erroresPagador.telefono_pagador[0] }}</div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold">Correo electrónico *</label>
                    <input type="email" class="form-control" :class="{ 'is-invalid': erroresPagador.correo_pagador }"
                      v-model="formPagador.correo_pagador" placeholder="correo@email.com">
                    <div v-if="erroresPagador.correo_pagador" class="invalid-feedback">{{ erroresPagador.correo_pagador[0] }}</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold">Nombre(s) *</label>
                    <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.nombres_pagador }"
                      v-model="formPagador.nombres_pagador" placeholder="Juan Carlos">
                    <div v-if="erroresPagador.nombres_pagador" class="invalid-feedback">{{ erroresPagador.nombres_pagador[0] }}</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold">Apellido(s) *</label>
                    <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.apellidos_pagador }"
                      v-model="formPagador.apellidos_pagador" placeholder="Pérez García">
                    <div v-if="erroresPagador.apellidos_pagador" class="invalid-feedback">{{ erroresPagador.apellidos_pagador[0] }}</div>
                  </div>
                </div>

                <!-- Método de pago -->
                <h6 class="fw-bold mb-3"><i class="bi bi-credit-card me-2"></i>Método de pago</h6>
                <div class="pp-metodo-card pp-metodo-card--active mb-4">
                  <div class="pp-metodo-icon"><i class="bi bi-qr-code"></i></div>
                  <div class="flex-grow-1">
                    <div class="fw-semibold">Transferencia QR</div>
                    <div class="text-muted small">BNB, BISA, Banco Unión, BCP, Tigo Money y más</div>
                  </div>
                  <i class="bi bi-check-circle-fill pp-accent-color fs-5"></i>
                </div>

                <!-- Términos -->
                <div class="form-check mb-4">
                  <input class="form-check-input" type="checkbox" id="chkTerminos" v-model="aceptaTerminos">
                  <label class="form-check-label small" for="chkTerminos">
                    He leído y acepto los <a href="#" class="fw-semibold pp-accent-color">Términos y Condiciones</a>
                  </label>
                </div>

                <div class="d-flex gap-3">
                  <button class="btn btn-light border px-4" @click="step = 2">
                    <i class="bi bi-arrow-left me-1"></i>Volver
                  </button>
                </div>
              </div>

              <!-- PASO 4: QR (DENTRO DE COLUMNA IZQUIERDA) -->
              <div v-if="step === 4" class="paso-fade text-center">
                <h4 class="fw-bold mb-2">Escanea el código QR para pagar</h4>
                <p class="text-muted small mb-4 px-3">
                  Usa la app de tu banco y escanea el código. La confirmación aparecerá aquí automáticamente al detectar la transferencia.
                </p>

                <div v-if="qrUrl" class="pp-qr-container mx-auto mb-4">
                  <div class="pp-qr-box shadow-sm">
                    <img :src="qrUrl" alt="Código QR de pago">
                    <div class="qr-corner top-left"></div>
                    <div class="qr-corner top-right"></div>
                    <div class="qr-corner bottom-left"></div>
                    <div class="qr-corner bottom-right"></div>
                  </div>
                </div>

                <div class="mb-4">
                  <button v-if="urlPago" class="btn btn-outline-primary px-4 btn-sm" @click="abrirPagina">
                    <i class="bi bi-box-arrow-up-right me-2"></i>Abrir página de pago completa
                  </button>
                </div>

                <div class="pp-instrucciones mx-auto mb-4">
                  <div v-for="(inst, i) in [
                    'Abre la app de tu banco (BNB, BISA, Unión, BCP, Tigo Money, etc).',
                    'Selecciona la opción <strong>Pago por QR</strong> o <strong>Escanear QR</strong>.',
                    'Apunta la cámara al código QR de arriba y confirma el monto.',
                    'Esta pantalla se actualizará sola cuando el pago sea confirmado.'
                  ]" :key="i" class="pp-inst-item">
                    <div class="pp-inst-num">{{ i + 1 }}</div>
                    <div class="small text-secondary" v-html="inst"></div>
                  </div>
                </div>

                <div class="pp-waiting mb-4">
                  <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                  <span class="text-muted small">Verificando pago automáticamente…</span>
                </div>

                <div class="mb-3">
                  <button class="btn btn-success px-5 fw-bold" @click="confirmarManual">
                    <i class="bi bi-check-circle me-2"></i>Ya realicé el pago
                  </button>
                </div>

                <button class="btn btn-link text-muted small" @click="nuevoPago">
                  <i class="bi bi-arrow-left me-1"></i>Cancelar y volver al inicio
                </button>
              </div>

            </div>
          </div>

          <!-- Columna Derecha: Panel de Resumen Sticky (Desktop) -->
          <div class="col-lg-4 d-none d-lg-block">
            <div class="pp-sidebar-sticky">
              <div class="pp-card shadow-sm p-4 border-0">
                <h5 class="fw-bold mb-4">Resumen de Pago</h5>
                
                <!-- Lista de items seleccionados -->
                <div class="mb-4">
                  <template v-if="pagoContadoSeleccionado">
                    <div v-for="pago in pagosContado.filter(p => p.id === pagoContadoSeleccionado)" :key="pago.id" class="d-flex justify-content-between mb-2 small">
                      <span class="text-muted">{{ pago.tipo }}</span>
                      <span class="fw-semibold">{{ pago.moneda }} {{ formatMonto(pago.monto) }}</span>
                    </div>
                  </template>
                  <template v-for="cid in cuotasSeleccionadas" :key="cid">
                    <div v-for="cuota in cuotasPendientes.filter(c => c.cuota_id === cid)" :key="cuota.cuota_id" class="d-flex justify-content-between mb-2 small">
                      <span class="text-muted">Cuota N° {{ cuota.numero_cuota }}</span>
                      <span class="fw-semibold">{{ cuota.moneda }} {{ formatMonto(cuota.monto_cuota) }}</span>
                    </div>
                  </template>
                  <div v-if="!haySeleccion" class="text-center text-muted py-3 small border border-dashed rounded">
                    Ningún pago seleccionado
                  </div>
                </div>

                <hr class="my-4 opacity-10">

                <div class="d-flex justify-content-between align-items-end mb-2">
                  <span class="text-muted small fw-bold text-uppercase">Total a pagar</span>
                  <span class="fw-black pp-accent-color fs-3" :class="{ 'opacity-25': !haySeleccion }">
                    {{ monedaDetectada }} {{ formatMonto(totalSeleccionado) }}
                  </span>
                </div>

                <!-- Nota de conversión USD → Bs -->
                <div v-if="hayMontosUSD" class="alert alert-info border-0 p-2 mb-4" style="font-size: .75rem;">
                  <i class="bi bi-info-circle-fill me-1"></i>
                  El QR se emitirá en <strong>Bs</strong> al tipo de cambio oficial.
                </div>

                <button
                  v-if="step === 2"
                  class="btn btn-primary btn-lg w-100 fw-bold py-3 mt-2 shadow-sm"
                  :disabled="!haySeleccion"
                  @click="irPaso3"
                >
                  Continuar <i class="bi bi-arrow-right ms-2"></i>
                </button>

                <button
                  v-if="step === 3"
                  class="btn btn-success btn-lg w-100 fw-bold py-3 mt-2 shadow-sm"
                  :disabled="!formularioPagadorValido || procesando"
                  @click="procesarPago"
                >
                  <span v-if="procesando" class="spinner-border spinner-border-sm me-2"></span>
                  {{ procesando ? 'Procesando…' : 'Pagar ahora' }}
                  <i v-if="!procesando" class="bi bi-qr-code ms-2"></i>
                </button>

                <!-- Info adicional en paso 4 -->
                <div v-if="step === 4" class="alert alert-warning border-0 small mt-3 mb-0">
                  <i class="bi bi-clock-history me-1"></i>
                  Esperando confirmación de la red bancaria. No cierres esta ventana.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ PASO FINAL: ÉXITO (Diseño centrado) ═══ -->
        <div v-else-if="step === 4 && estadoPago === 'PAGADO'" class="pp-card shadow-lg mx-auto text-center paso-fade" style="max-width: 600px;">
          <div class="py-4">
            <div class="pp-success-circle mx-auto mb-4">
              <i class="bi bi-check-lg"></i>
            </div>
            <h4 class="fw-bold text-success mb-2">¡Pago completado!</h4>
            <p class="text-muted mb-4">
              Tu pago fue procesado y confirmado correctamente.<br>
              Recibirás un comprobante a tu correo.
            </p>
            <div class="alert alert-success d-inline-block py-2 px-4">
              <i class="bi bi-receipt me-1"></i>
              Transacción: <strong>{{ idTransaccion }}</strong>
            </div>
            <div class="mt-4">
              <button class="btn btn-primary px-5" @click="nuevoPago">Realizar otro pago</button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══ Barra de Resumen Móvil (Sticky Bottom) ═══ -->
    <div v-if="(step === 2 || step === 3) && haySeleccion" class="pp-mobile-bottom-bar d-lg-none">
       <div class="d-flex align-items-center justify-content-between gap-3">
          <div class="flex-grow-1">
             <div class="text-muted small text-uppercase fw-bold letter-spacing-1" style="font-size: .65rem;">Total a pagar</div>
             <div class="fw-black pp-accent-color fs-4">{{ monedaDetectada }} {{ formatMonto(totalSeleccionado) }}</div>
          </div>
          <button
            v-if="step === 2"
            class="btn btn-primary fw-bold px-4 py-2 shadow-sm"
            @click="irPaso3"
          >
            Continuar <i class="bi bi-arrow-right ms-1"></i>
          </button>
          <button
            v-if="step === 3"
            class="btn btn-success fw-bold px-4 py-2 shadow-sm"
            :disabled="!formularioPagadorValido || procesando"
            @click="procesarPago"
          >
            <span v-if="procesando" class="spinner-border spinner-border-sm me-1"></span>
            {{ procesando ? '...' : 'Pagar' }} <i v-if="!procesando" class="bi bi-qr-code ms-1"></i>
          </button>
       </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Variables locales ─────────────────────────────────────────────────────── */
:root {
  --pp-accent:      #1e40af;
  --pp-accent-mid:  #3b82f6;
  --pp-accent-soft: #eff6ff;
  --pp-accent-border: #bfdbfe;
}

/* ── Fondo ─────────────────────────────────────────────────────────────────── */
.pp-bg {
  background: linear-gradient(160deg, #eef2ff 0%, #f8faff 55%, #f0fdf4 100%);
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.pp-header {
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
  position: sticky; top: 0; z-index: 100;
}
.pp-accent-color { color: var(--pp-accent, #1e40af); }

/* ── Wizard card ───────────────────────────────────────────────────────────── */
.pp-card {
  width: 100%;
  background: #fff;
  border-radius: 24px;
  padding: 2.5rem;
}
@media (max-width: 576px) {
  .pp-card { padding: 1.5rem 1.25rem; border-radius: 16px; }
}

/* ── Sticky Sidebar (Desktop) ─────────────────────────────────────────────── */
.pp-sidebar-sticky {
  position: sticky;
  top: 100px;
  z-index: 10;
}

/* ── Mobile Bottom Bar ────────────────────────────────────────────────────── */
.pp-mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.08);
  padding: 1rem 1.25rem;
  z-index: 1050;
  border-top: 1px solid #e5e7eb;
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* ── Stepper ───────────────────────────────────────────────────────────────── */
.pp-stepper { display: flex; align-items: center; justify-content: center; }
.pp-step { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pp-step-circle {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: .88rem;
  background: #e2e8f0; color: #64748b;
  transition: all .3s;
}
.pp-step--done .pp-step-circle,
.pp-step--current .pp-step-circle {
  background: var(--pp-accent, #1e40af); color: #fff;
}
.pp-step--current .pp-step-circle {
  box-shadow: 0 0 0 5px rgba(30,64,175,.14);
}
.pp-step-label {
  font-size: .7rem; color: #94a3b8; font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em;
}
.pp-step--done .pp-step-label,
.pp-step--current .pp-step-label { color: var(--pp-accent, #1e40af); }
.pp-step-line {
  flex: 1; height: 2px; background: #e2e8f0;
  margin: 0 6px; margin-bottom: 22px;
  border-radius: 2px; transition: background .3s;
  min-width: 20px; max-width: 80px;
}
.pp-step-line--active { background: var(--pp-accent, #1e40af); }

/* ── Step icon (paso 1) ────────────────────────────────────────────────────── */
.pp-step-icon {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(30,64,175,.08); color: var(--pp-accent, #1e40af);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem;
}

/* ── Input grupo ───────────────────────────────────────────────────────────── */
.pp-input-group .input-group-text {
  background: #fff; border-right: 0;
}
.pp-input-group .form-control {
  border-left: 0;
}
.pp-input-group .form-control:focus {
  box-shadow: none; border-color: #ced4da;
}

/* ── Fade animación ────────────────────────────────────────────────────────── */
.paso-fade { animation: fadeSlide .25s ease; }
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card cliente ──────────────────────────────────────────────────────────── */
.pp-cliente-card {
  background: var(--pp-accent-soft, #eff6ff);
  border: 1px solid var(--pp-accent-border, #bfdbfe);
  border-radius: 14px; padding: 1rem 1.25rem;
}
.pp-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--pp-accent, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; font-weight: 900; flex-shrink: 0;
}

/* ── Section header ────────────────────────────────────────────────────────── */
.pp-section-header {
  display: flex; align-items: center;
  font-weight: 700; font-size: .95rem; color: #1e293b;
}
.pp-section-badge {
  margin-left: auto;
  font-size: .68rem; font-weight: 600; text-transform: uppercase;
  background: #f1f5f9; color: #64748b;
  border-radius: 20px; padding: 2px 10px; letter-spacing: .04em;
}
.pp-section-badge--blue {
  background: var(--pp-accent-soft, #eff6ff);
  color: var(--pp-accent, #1e40af);
}

/* ── Tarjeta de selección ──────────────────────────────────────────────────── */
.pp-sel-card {
  display: flex; align-items: center; gap: 1rem;
  padding: .9rem 1.1rem;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  cursor: pointer;
  transition: all .18s;
  background: #fff;
  box-shadow: inset 4px 0 0 transparent;
  user-select: none;
}

.pp-sel-card:hover {
  border-color: #93c5fd;
  background: #f8fbff;
  box-shadow: inset 4px 0 0 #93c5fd, 0 2px 8px rgba(30,64,175,.07);
}

.pp-sel-card--active {
  border-color: var(--pp-accent, #1e40af);
  background: var(--pp-accent-soft, #eff6ff);
  box-shadow: inset 4px 0 0 var(--pp-accent, #1e40af), 0 2px 12px rgba(30,64,175,.10);
}

.pp-indicator {
  width: 22px; height: 22px;
  border: 2px solid #cbd5e1;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all .18s;
  background: #fff;
  color: transparent;
}
.pp-indicator--radio    { border-radius: 50%; }
.pp-indicator--checkbox { border-radius: 5px; }

.pp-indicator-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: transparent; transition: background .18s;
}

.pp-sel-card--active .pp-indicator {
  border-color: var(--pp-accent, #1e40af);
  background: var(--pp-accent, #1e40af);
  color: #fff;
}
.pp-sel-card--active .pp-indicator-dot {
  background: #fff;
}

.pp-sel-title {
  font-weight: 600; font-size: .92rem; color: #1e293b; line-height: 1.3;
}
.pp-sel-meta {
  font-size: .76rem; color: #64748b; margin-top: 3px;
}

.pp-fecha-badge {
  display: inline-flex; align-items: center;
  background: #f1f5f9; border-radius: 4px;
  padding: 1px 7px; white-space: nowrap;
}
.pp-sel-card--active .pp-fecha-badge {
  background: #dbeafe;
}

.pp-sel-amount {
  text-align: right; flex-shrink: 0; line-height: 1.15;
}
.pp-amount-currency {
  display: block; font-size: .68rem; font-weight: 700;
  text-transform: uppercase; color: #94a3b8; letter-spacing: .06em;
}
.pp-amount-value {
  font-size: 1.15rem; font-weight: 800; color: #0f172a;
}
.pp-amount-value--blue { color: var(--pp-accent, #1e40af); }
.pp-sel-card--active .pp-amount-value { color: var(--pp-accent, #1e40af); }

/* ── Método de pago ────────────────────────────────────────────────────────── */
.pp-metodo-card {
  display: flex; align-items: center; gap: 1rem;
  border: 1.5px solid #e2e8f0; border-radius: 12px;
  padding: 1rem 1.25rem;
}
.pp-metodo-card--active {
  border-color: var(--pp-accent, #1e40af);
  background: var(--pp-accent-soft, #eff6ff);
}
.pp-metodo-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: var(--pp-accent, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}

/* ── Paso 4: QR ────────────────────────────────────────────────────────────── */
.pp-qr-container {
  width: fit-content;
  position: relative;
  padding: 10px;
}
.pp-qr-box {
  width: 280px; height: 280px;
  background: #fff;
  border-radius: 20px;
  padding: 15px;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  border: 1px solid #e2e8f0;
}
.pp-qr-box img { 
  width: 100%; height: 100%; 
  object-fit: contain;
  transition: transform 0.3s;
}
.pp-qr-box:hover img { transform: scale(1.02); }

/* Esquinas decorativas */
.qr-corner {
  position: absolute; width: 25px; height: 25px;
  border: 4px solid var(--pp-accent, #1e40af);
}
.top-left { top: -5px; left: -5px; border-right: 0; border-bottom: 0; border-top-left-radius: 12px; }
.top-right { top: -5px; right: -5px; border-left: 0; border-bottom: 0; border-top-right-radius: 12px; }
.bottom-left { bottom: -5px; left: -5px; border-right: 0; border-top: 0; border-bottom-left-radius: 12px; }
.bottom-right { bottom: -5px; right: -5px; border-left: 0; border-top: 0; border-bottom-right-radius: 12px; }

.pp-instrucciones { max-width: 500px; text-align: left; }
.pp-inst-item {
  display: flex; align-items: flex-start; gap: .75rem;
  padding: .6rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.pp-inst-item:last-child { border-bottom: 0; }
.pp-inst-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--pp-accent, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .74rem; font-weight: 700; flex-shrink: 0;
}

.pp-waiting { display: inline-flex; align-items: center; }

/* ── Éxito ─────────────────────────────────────────────────────────────────── */
.pp-success-circle {
  width: 100px; height: 100px; border-radius: 50%;
  background: #dcfce7; color: #16a34a;
  display: flex; align-items: center; justify-content: center;
  font-size: 3.5rem;
}

/* ── Utilidades ────────────────────────────────────────────────────────────── */
.letter-spacing-1 { letter-spacing: .05em; }
.min-w-0 { min-width: 0; }
.fw-black { font-weight: 900; }
.tracking-tighter { letter-spacing: -1.5px; }

.logo-box { transition: all 0.3s; }
.logo-box:hover { transform: rotate(5deg) scale(1.1); }

.pp-logo-filter {
  filter: brightness(0); /* Hace que el logo SVG sea negro para fondo blanco */
}
</style>

