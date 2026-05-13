<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/axios'

const route = useRoute()

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
const cuotasSeleccionadas = ref([])   // array de cuota_ids seleccionados

// Pagos de contado se seleccionan todos automáticamente (normalmente 1 por venta)
const pagoContadoSeleccionado = ref(null) // solo un pago de contado a la vez, o null

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
const estadoPago = ref('PENDIENTE') // PENDIENTE | PAGADO | ERROR
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

    // Auto-seleccionar si hay un solo pago de contado
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
  // Pre-rellenar CI del pagador con el del cliente
  formPagador.value.ci_pagador = cliente.value.ci || ''
  formPagador.value.telefono_pagador = cliente.value.telefono || ''
  formPagador.value.correo_pagador = cliente.value.correo || ''
  // Separar nombre_completo en nombres/apellidos si es posible
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
// Permite que la pestaña de Libélula notifique a la pestaña original del QR
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

// Confirmación manual: el usuario ya ve "Pagado" en su app bancaria
const confirmarManual = async () => {
  try {
    await api.post('/public/pagos/confirmar-retorno', { id_transaccion: idTransaccion.value })
  } catch { /* ignorar, igual mostramos confirmación */ }
  confirmarPago()
}

// ── onMounted: dos roles ──────────────────────────────────────────────────────
onMounted(async () => {
  const txn = route.query.txn

  if (txn) {
    // ── Rol "pestaña de retorno": Libélula redirigió aquí tras el pago ──
    idTransaccion.value = txn
    step.value = 4

    // 1. Notificar a TODAS las pestañas del portal (la original con el QR)
    pagoChannel.postMessage({ tipo: 'PAGO_CONFIRMADO', txn })

    // 2. Confirmar en la BD
    try {
      await api.post('/public/pagos/confirmar-retorno', { id_transaccion: txn })
    } catch { /* silent */ }

    // 3. Mostrar confirmación también en esta pestaña
    estadoPago.value = 'PAGADO'

  } else {
    // ── Rol "pestaña original": escuchar confirmaciones de otras pestañas ──
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

const formatFecha = (f) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' }) : '-'
const formatMonto = (m) => new Intl.NumberFormat('es-BO').format(m)
</script>

<template>
  <div class="pago-publico-bg min-vh-100 d-flex flex-column">

    <!-- Header simple -->
    <div class="pago-header py-3 px-4 d-flex align-items-center gap-3 border-bottom bg-white shadow-sm">
      <RouterLink to="/" class="text-decoration-none d-flex align-items-center gap-2">
        <i class="bi bi-hexagon-fill text-primary fs-4"></i>
        <span class="fw-black fs-5 text-dark">Portal de Pagos</span>
      </RouterLink>
      <span class="text-muted small ms-auto"><i class="bi bi-shield-lock-fill text-success me-1"></i>Pago seguro</span>
    </div>

    <div class="flex-grow-1 d-flex align-items-start justify-content-center py-5 px-3">
      <div class="pago-wizard-card shadow-lg">

        <!-- Stepper -->
        <div class="stepper d-flex align-items-center justify-content-center gap-0 mb-5">
          <template v-for="(label, i) in ['Buscar', 'Seleccionar', 'Confirmar', 'Pagar']" :key="i">
            <div class="stepper-step" :class="{ active: step > i, current: step === i + 1 }">
              <div class="stepper-circle">
                <i v-if="step > i + 1" class="bi bi-check-lg"></i>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span class="stepper-label d-none d-sm-block">{{ label }}</span>
            </div>
            <div v-if="i < 3" class="stepper-line" :class="{ active: step > i + 1 }"></div>
          </template>
        </div>

        <!-- ═══════════════════════════════════════════════════════
             PASO 1: BUSCAR CLIENTE POR CI
        ════════════════════════════════════════════════════════════ -->
        <div v-if="step === 1" class="paso-fade">
          <div class="text-center mb-5">
            <div class="step-icon-wrap mx-auto mb-3"><i class="bi bi-person-search"></i></div>
            <h4 class="fw-bold mb-1">Consultar mis pagos pendientes</h4>
            <p class="text-muted small">Ingresa tu número de cédula de identidad para continuar</p>
          </div>

          <div class="mx-auto" style="max-width: 400px;">
            <label class="form-label fw-bold small">Número de CI</label>
            <div class="input-group input-group-lg shadow-sm">
              <span class="input-group-text bg-white border-end-0">
                <i class="bi bi-card-text text-primary"></i>
              </span>
              <input
                type="text"
                class="form-control border-start-0 border-end-0"
                :class="{ 'border-danger': errorBusqueda }"
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
                {{ buscando ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
            <div v-if="errorBusqueda" class="alert alert-danger d-flex align-items-center gap-2 mt-3 py-2">
              <i class="bi bi-exclamation-circle-fill"></i>
              <span class="small">{{ errorBusqueda }}</span>
            </div>
            <p class="text-muted smaller text-center mt-4">
              <i class="bi bi-info-circle me-1"></i>
              Solo se mostrarán pagos pendientes asociados a tu CI registrado en el sistema.
            </p>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════
             PASO 2: DATOS + SELECCIÓN DE PAGOS
        ════════════════════════════════════════════════════════════ -->
        <div v-if="step === 2 && cliente" class="paso-fade">

          <!-- Card del cliente -->
          <div class="cliente-card d-flex align-items-center gap-3 mb-5">
            <div class="cliente-avatar">{{ cliente.nombre_completo?.charAt(0) }}</div>
            <div>
              <div class="fw-bold fs-5">{{ cliente.nombre_completo }}</div>
              <div class="text-muted small">
                CI: <strong>{{ cliente.ci }}</strong>
                <span v-if="cliente.telefono" class="ms-3"><i class="bi bi-telephone me-1"></i>{{ cliente.telefono }}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-light border ms-auto" @click="step = 1">
              <i class="bi bi-arrow-left me-1"></i> Cambiar
            </button>
          </div>

          <!-- Sin pagos pendientes -->
          <div v-if="!pagosContado.length && !cuotasPendientes.length" class="text-center py-5">
            <i class="bi bi-check-circle-fill text-success display-3 d-block mb-3"></i>
            <h5 class="fw-bold">¡Sin pagos pendientes!</h5>
            <p class="text-muted">No tienes ningún pago pendiente en este momento.</p>
            <RouterLink to="/" class="btn btn-primary mt-2">Volver al inicio</RouterLink>
          </div>

          <template v-else>
            <!-- Pagos al contado / cuota inicial -->
            <div v-if="pagosContado.length" class="mb-5">
              <h6 class="section-title"><i class="bi bi-cash-coin me-2 text-success"></i>Pagos al Contado / Cuota Inicial</h6>
              <div class="pago-list">
                <div
                  v-for="pago in pagosContado"
                  :key="pago.id"
                  class="pago-item"
                  :class="{ selected: pagoContadoSeleccionado === pago.id }"
                  @click="toggleContado(pago.id)"
                >
                  <div class="pago-check">
                    <i class="bi" :class="pagoContadoSeleccionado === pago.id ? 'bi-check-circle-fill text-primary' : 'bi-circle text-muted'"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div class="fw-bold">{{ pago.tipo }}</div>
                    <div class="smaller text-muted">{{ pago.tipo_prop }} · {{ pago.propiedad }}</div>
                  </div>
                  <div class="fw-black text-success fs-5">{{ pago.moneda }} {{ formatMonto(pago.monto) }}</div>
                </div>
              </div>
            </div>

            <!-- Cuotas de crédito -->
            <div v-if="cuotasPendientes.length" class="mb-5">
              <h6 class="section-title"><i class="bi bi-calendar-check me-2 text-primary"></i>Cuotas de Crédito Pendientes</h6>
              <p class="text-muted smaller mb-3">Puedes seleccionar una o varias cuotas para pagar en una sola transacción.</p>
              <div class="pago-list">
                <div
                  v-for="cuota in cuotasPendientes"
                  :key="cuota.cuota_id"
                  class="pago-item"
                  :class="{ selected: cuotasSeleccionadas.includes(cuota.cuota_id) }"
                  @click="toggleCuota(cuota.cuota_id)"
                >
                  <div class="pago-check">
                    <i class="bi"
                      :class="cuotasSeleccionadas.includes(cuota.cuota_id) ? 'bi-check-circle-fill text-primary' : 'bi-circle text-muted'"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div class="fw-bold">Cuota N° {{ cuota.numero_cuota }}</div>
                    <div class="smaller text-muted">
                      {{ cuota.tipo_prop }} · {{ cuota.propiedad }}
                      <span class="ms-2"><i class="bi bi-calendar3 me-1"></i>Vence: {{ formatFecha(cuota.fecha_vencimiento) }}</span>
                    </div>
                  </div>
                  <div class="fw-black text-primary fs-5">{{ cuota.moneda }} {{ formatMonto(cuota.monto_cuota) }}</div>
                </div>
              </div>
            </div>

            <!-- Resumen y botón siguiente -->
            <div class="total-bar d-flex align-items-center justify-content-between">
              <div>
                <div class="text-muted smaller">Total seleccionado</div>
                <div class="fw-black fs-4 text-primary">{{ monedaDetectada }} {{ formatMonto(totalSeleccionado) }}</div>
              </div>
              <button class="btn btn-primary btn-lg px-5 fw-bold shadow" :disabled="!haySeleccion" @click="irPaso3">
                Continuar <i class="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </template>
        </div>

        <!-- ═══════════════════════════════════════════════════════
             PASO 3: CONFIRMAR + DATOS DEL PAGADOR
        ════════════════════════════════════════════════════════════ -->
        <div v-if="step === 3" class="paso-fade">

          <!-- Resumen de pagos a realizar -->
          <h5 class="fw-bold mb-4"><i class="bi bi-receipt me-2 text-primary"></i>Detalle de pagos a realizar</h5>

          <div class="resumen-box mb-4">
            <template v-if="pagoContadoSeleccionado">
              <div v-for="pago in pagosContado.filter(p => p.id === pagoContadoSeleccionado)" :key="pago.id"
                   class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-muted small">{{ pago.tipo }} — {{ pago.propiedad }}</span>
                <span class="fw-bold">{{ pago.moneda }} {{ formatMonto(pago.monto) }}</span>
              </div>
            </template>
            <template v-for="cid in cuotasSeleccionadas" :key="cid">
              <div v-for="cuota in cuotasPendientes.filter(c => c.cuota_id === cid)" :key="cuota.cuota_id"
                   class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-muted small">Cuota N° {{ cuota.numero_cuota }} — {{ cuota.propiedad }}</span>
                <span class="fw-bold">{{ cuota.moneda }} {{ formatMonto(cuota.monto_cuota) }}</span>
              </div>
            </template>
            <div class="border-top pt-2 mt-2 d-flex justify-content-between">
              <span class="fw-bold">Total a pagar</span>
              <span class="fw-black text-primary fs-5">{{ monedaDetectada }} {{ formatMonto(totalSeleccionado) }}</span>
            </div>
          </div>

          <!-- Método de pago -->
          <h6 class="fw-bold mb-3"><i class="bi bi-credit-card me-2"></i>Método de pago</h6>
          <div class="metodo-card active mb-4">
            <div class="d-flex align-items-center gap-3">
              <div class="metodo-icon"><i class="bi bi-qr-code"></i></div>
              <div>
                <div class="fw-bold">Transferencia QR</div>
                <div class="smaller text-muted">Paga con el QR de tu banco (BNB, BISA, Unión, BCP y más)</div>
              </div>
              <i class="bi bi-check-circle-fill text-primary ms-auto fs-5"></i>
            </div>
          </div>

          <!-- Datos del pagador -->
          <h6 class="fw-bold mb-3"><i class="bi bi-person-vcard me-2"></i>Datos de quien realiza el pago</h6>
          <p class="text-muted smaller mb-3">Esta información identifica a la persona que efectúa la transferencia.</p>

          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <label class="form-label small fw-bold">CI *</label>
              <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.ci_pagador }" v-model="formPagador.ci_pagador" placeholder="12345678">
              <div v-if="erroresPagador.ci_pagador" class="invalid-feedback">{{ erroresPagador.ci_pagador[0] }}</div>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Teléfono *</label>
              <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.telefono_pagador }" v-model="formPagador.telefono_pagador" placeholder="70000000">
              <div v-if="erroresPagador.telefono_pagador" class="invalid-feedback">{{ erroresPagador.telefono_pagador[0] }}</div>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Correo electrónico *</label>
              <input type="email" class="form-control" :class="{ 'is-invalid': erroresPagador.correo_pagador }" v-model="formPagador.correo_pagador" placeholder="correo@email.com">
              <div v-if="erroresPagador.correo_pagador" class="invalid-feedback">{{ erroresPagador.correo_pagador[0] }}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Nombre(s) *</label>
              <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.nombres_pagador }" v-model="formPagador.nombres_pagador" placeholder="Juan Carlos">
              <div v-if="erroresPagador.nombres_pagador" class="invalid-feedback">{{ erroresPagador.nombres_pagador[0] }}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Apellido(s) *</label>
              <input type="text" class="form-control" :class="{ 'is-invalid': erroresPagador.apellidos_pagador }" v-model="formPagador.apellidos_pagador" placeholder="Pérez García">
              <div v-if="erroresPagador.apellidos_pagador" class="invalid-feedback">{{ erroresPagador.apellidos_pagador[0] }}</div>
            </div>
          </div>

          <!-- Términos -->
          <div class="form-check mb-4">
            <input class="form-check-input" type="checkbox" id="chkTerminos" v-model="aceptaTerminos">
            <label class="form-check-label small" for="chkTerminos">
              He leído y acepto los <a href="#" class="text-primary fw-bold">Términos y Condiciones</a>
              del servicio de pagos en línea.
            </label>
          </div>

          <div class="d-flex gap-3">
            <button class="btn btn-light border px-4" @click="step = 2">
              <i class="bi bi-arrow-left me-1"></i> Volver
            </button>
            <button
              class="btn btn-success btn-lg flex-grow-1 fw-bold shadow"
              :disabled="!formularioPagadorValido || procesando"
              @click="procesarPago"
            >
              <span v-if="procesando" class="spinner-border spinner-border-sm me-2"></span>
              {{ procesando ? 'Generando pago...' : 'Proceder al pago QR' }}
              <i v-if="!procesando" class="bi bi-qr-code ms-2"></i>
            </button>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════
             PASO 4: QR DE PAGO
        ════════════════════════════════════════════════════════════ -->
        <div v-if="step === 4" class="paso-fade text-center">

          <!-- PAGO COMPLETADO -->
          <div v-if="estadoPago === 'PAGADO'" class="py-4">
            <div class="success-circle mx-auto mb-4">
              <i class="bi bi-check-lg"></i>
            </div>
            <h4 class="fw-bold text-success mb-2">¡Pago completado!</h4>
            <p class="text-muted mb-4">Tu pago fue procesado y confirmado correctamente.<br>Recibirás un comprobante a tu correo.</p>
            <div class="alert alert-success d-inline-block py-2 px-4">
              <i class="bi bi-receipt me-1"></i>
              Transacción: <strong>{{ idTransaccion }}</strong>
            </div>
            <div class="mt-4">
              <button class="btn btn-primary px-5" @click="nuevoPago">Realizar otro pago</button>
            </div>
          </div>

          <!-- ESPERANDO PAGO -->
          <div v-else class="py-2">
            <h4 class="fw-bold mb-1">Escanea el código QR para pagar</h4>
            <p class="text-muted small mb-4">Usa la app de tu banco y escanea el QR. La confirmación aparecerá aquí automáticamente.</p>

            <!-- QR embebido directo -->
            <div v-if="qrUrl" class="qr-box mx-auto mb-3">
              <img :src="qrUrl" alt="Código QR de pago" class="img-fluid">
            </div>

            <!-- Botón alternativo si no hay QR embebido o como respaldo -->
            <div class="mb-4">
              <button v-if="urlPago" class="btn btn-outline-primary px-4" @click="abrirPagina">
                <i class="bi bi-box-arrow-up-right me-2"></i>
                Abrir página de pago completa
              </button>
            </div>

            <!-- Instrucciones -->
            <div class="instrucciones-qr text-start mx-auto mb-4">
              <div class="instruccion-item">
                <div class="instruccion-num">1</div>
                <div>Abre la app de tu banco (BNB, BISA, Banco Unión, BCP, Tigo Money, etc.).</div>
              </div>
              <div class="instruccion-item">
                <div class="instruccion-num">2</div>
                <div>Selecciona la opción <strong>Pago por QR</strong> o <strong>Escanear QR</strong>.</div>
              </div>
              <div class="instruccion-item">
                <div class="instruccion-num">3</div>
                <div>Apunta la cámara al código QR de arriba y confirma el monto en tu app.</div>
              </div>
              <div class="instruccion-item">
                <div class="instruccion-num">4</div>
                <div>Esta pantalla se actualizará sola cuando el pago sea confirmado.</div>
              </div>
            </div>

            <!-- Indicador de espera -->
            <div class="waiting-indicator mb-3">
              <div class="spinner-border spinner-border-sm text-primary me-2"></div>
              <span class="text-muted small">Verificando pago automáticamente...</span>
            </div>

            <!-- Botón de confirmación manual -->
            <div class="mb-3">
              <button class="btn btn-success px-4 fw-bold" @click="confirmarManual">
                <i class="bi bi-check-circle me-2"></i>Ya realicé el pago
              </button>
              <div class="text-muted smaller mt-1">¿Ya ves "Pagado" en la app de tu banco? Pulsa este botón.</div>
            </div>

            <div class="mb-3">
              <span class="text-muted smaller">Ref: {{ idTransaccion }}</span>
            </div>

            <button class="btn btn-link text-muted small" @click="nuevoPago">
              <i class="bi bi-arrow-left me-1"></i> Cancelar y volver al inicio
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.pago-publico-bg {
  background: linear-gradient(135deg, #f0f4ff 0%, #f8faff 100%);
}

.pago-wizard-card {
  width: 100%;
  max-width: 760px;
  background: #fff;
  border-radius: 24px;
  padding: 2.5rem 2.5rem;
}

@media (max-width: 576px) {
  .pago-wizard-card { padding: 1.5rem 1.25rem; border-radius: 0; }
}

/* Stepper */
.stepper { gap: 0; }
.stepper-step { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.stepper-circle {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: .9rem;
  background: #e2e8f0; color: #64748b;
  transition: all .3s;
}
.stepper-step.active .stepper-circle  { background: var(--landing-primary, #1e40af); color: #fff; }
.stepper-step.current .stepper-circle { background: var(--landing-primary, #1e40af); color: #fff; box-shadow: 0 0 0 4px rgba(30,64,175,.15); }
.stepper-label { font-size: .72rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.stepper-step.active .stepper-label, .stepper-step.current .stepper-label { color: var(--landing-primary, #1e40af); }
.stepper-line { width: 60px; height: 3px; background: #e2e8f0; margin: 0 4px; margin-bottom: 22px; border-radius: 2px; transition: background .3s; }
.stepper-line.active { background: var(--landing-primary, #1e40af); }

/* Step icon */
.step-icon-wrap {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(30,64,175,.08); color: var(--landing-primary, #1e40af);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem;
}

/* Fade */
.paso-fade { animation: fadeSlide .3s ease; }
@keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

/* Cliente card */
.cliente-card {
  background: #f8faff; border: 1px solid #dbeafe; border-radius: 14px; padding: 1rem 1.25rem;
}
.cliente-avatar {
  width: 50px; height: 50px; border-radius: 50%;
  background: var(--landing-primary, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; font-weight: 900;
  flex-shrink: 0;
}

/* Section title */
.section-title { font-weight: 700; color: #1e293b; letter-spacing: -.01em; margin-bottom: 1rem; }

/* Pago items */
.pago-list { display: flex; flex-direction: column; gap: .6rem; }
.pago-item {
  display: flex; align-items: center; gap: 1rem;
  padding: .9rem 1.1rem; border-radius: 12px;
  border: 2px solid #e2e8f0; cursor: pointer;
  transition: all .2s;
}
.pago-item:hover { border-color: #93c5fd; background: #f0f6ff; }
.pago-item.selected { border-color: var(--landing-primary, #1e40af); background: #eff6ff; }
.pago-check { font-size: 1.3rem; flex-shrink: 0; }

/* Total bar */
.total-bar {
  background: #f8faff; border: 1px solid #dbeafe;
  border-radius: 14px; padding: 1rem 1.5rem; margin-top: 1rem;
}

/* Resumen box */
.resumen-box {
  background: #f8faff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem;
}

/* Método de pago */
.metodo-card {
  border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.25rem;
  cursor: pointer; transition: all .2s;
}
.metodo-card.active { border-color: var(--landing-primary, #1e40af); background: #eff6ff; }
.metodo-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: var(--landing-primary, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}

/* QR step */
.qr-box {
  width: 220px; height: 220px;
  border: 3px solid #dbeafe; border-radius: 16px;
  padding: 12px; background: #fff;
  box-shadow: 0 4px 24px rgba(30,64,175,.10);
  display: flex; align-items: center; justify-content: center;
}
.qr-box img { width: 100%; height: 100%; object-fit: contain; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(30,64,175,.25); } 50% { box-shadow: 0 0 0 16px rgba(30,64,175,0); } }

/* Instrucciones */
.instrucciones-qr { max-width: 480px; }
.instruccion-item {
  display: flex; align-items: flex-start; gap: .75rem;
  padding: .65rem 0; border-bottom: 1px solid #f1f5f9;
  font-size: .87rem; color: #475569;
}
.instruccion-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--landing-primary, #1e40af); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 700; flex-shrink: 0;
}

/* Success */
.success-circle {
  width: 100px; height: 100px; border-radius: 50%;
  background: #dcfce7; color: #16a34a;
  display: flex; align-items: center; justify-content: center;
  font-size: 3.5rem;
}

.waiting-indicator { display: inline-flex; align-items: center; }

.smaller { font-size: .75rem; }
</style>
