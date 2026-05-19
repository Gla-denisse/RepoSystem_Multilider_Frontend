<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../api/axios'
import { useAuthStore } from '../stores/auth'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

// ─── Estado principal ──────────────────────────────────────────────────────────
const asesores   = ref([])
const cuentas    = ref([])
const cargando   = ref(true)
const currentPage = ref(1)
const lastPage    = ref(1)
const totalItems  = ref(0)

const filtros = reactive({ search: '' })

// ─── Asesor seleccionado ───────────────────────────────────────────────────────
const asesorSeleccionado = ref(null)

// ─── Listado de comisiones impagas ────────────────────────────────────────────
const modalImpagasVisible = ref(false)
const impagasCargando     = ref(false)
const impagas             = ref([])
const impagasPage         = ref(1)
const impagasLastPage     = ref(1)
const impagasTotal        = ref(0)
const impagasTotales      = reactive({ bs: 0, usd: 0 })
const filtrosImpagas      = reactive({ fecha_inicio: '', fecha_fin: '' })

// ─── Listado de comisiones pagadas ────────────────────────────────────────────
const modalPagadasVisible = ref(false)
const pagadasCargando     = ref(false)
const pagadas             = ref([])
const pagadasPage         = ref(1)
const pagadasLastPage     = ref(1)
const pagadasTotal        = ref(0)
const pagadasTotales      = reactive({ bs: 0, usd: 0 })
const filtrosPagadas      = reactive({ fecha_inicio: '', fecha_fin: '' })

// ─── Modal Pagar comisión ──────────────────────────────────────────────────────
const modalPagarVisible = ref(false)
const egresoAPagar      = ref(null)
const pagando           = ref(false)
const formPagar = reactive({
  fecha:              new Date().toISOString().substr(0, 10),
  cuenta_bancaria_id: '',
  comprobante:        '',
  observaciones:      '',
})

// ─── Descarga comprobante ─────────────────────────────────────────────────────
const descargando = ref(null)

// ─── Cargar listado principal ─────────────────────────────────────────────────
const cargarAsesores = async (page = 1) => {
  cargando.value = true
  try {
    const params = { page, per_page: 15, ...filtros }
    const res = await api.get('/comisiones-asesores', { params })
    asesores.value  = res.data.data
    currentPage.value = res.data.meta.current_page
    lastPage.value    = res.data.meta.last_page
    totalItems.value  = res.data.meta.total
  } catch (e) {
    console.error(e)
  } finally {
    cargando.value = false
  }
}

const cargarCuentas = async () => {
  try {
    const res = await api.get('/cuentas-bancarias', { params: { per_page: 100 } })
    cuentas.value = res.data.data ?? res.data
  } catch (e) { console.error(e) }
}

// ─── Impagas ──────────────────────────────────────────────────────────────────
const abrirImpagas = async (asesor) => {
  const hoy = new Date()
  const haceUnMes = new Date()
  haceUnMes.setMonth(haceUnMes.getMonth() - 1)

  asesorSeleccionado.value = asesor
  impagasPage.value = 1
  filtrosImpagas.fecha_inicio = haceUnMes.toISOString().split('T')[0]
  filtrosImpagas.fecha_fin    = hoy.toISOString().split('T')[0]
  modalImpagasVisible.value = true
  await cargarImpagas()
}

const cargarImpagas = async (page = 1) => {
  if (!asesorSeleccionado.value) return
  impagasCargando.value = true
  try {
    const params = { page, per_page: 10, ...filtrosImpagas }
    const res = await api.get(`/comisiones-asesores/${asesorSeleccionado.value.id}/impagas`, { params })
    impagas.value          = res.data.data
    impagasPage.value      = res.data.meta.current_page
    impagasLastPage.value  = res.data.meta.last_page
    impagasTotal.value     = res.data.meta.total
    impagasTotales.bs      = res.data.totales?.bs ?? 0
    impagasTotales.usd     = res.data.totales?.usd ?? 0
  } catch (e) {
    console.error(e)
  } finally {
    impagasCargando.value = false
  }
}

// ─── Pagadas ──────────────────────────────────────────────────────────────────
const abrirPagadas = async (asesor) => {
  const hoy = new Date()
  const haceUnMes = new Date()
  haceUnMes.setMonth(haceUnMes.getMonth() - 1)

  asesorSeleccionado.value = asesor
  pagadasPage.value = 1
  filtrosPagadas.fecha_inicio = haceUnMes.toISOString().split('T')[0]
  filtrosPagadas.fecha_fin    = hoy.toISOString().split('T')[0]
  modalPagadasVisible.value = true
  await cargarPagadas()
}

const cargarPagadas = async (page = 1) => {
  if (!asesorSeleccionado.value) return
  pagadasCargando.value = true
  try {
    const params = { page, per_page: 10, ...filtrosPagadas }
    const res = await api.get(`/comisiones-asesores/${asesorSeleccionado.value.id}/pagadas`, { params })
    pagadas.value          = res.data.data
    pagadasPage.value      = res.data.meta.current_page
    pagadasLastPage.value  = res.data.meta.last_page
    pagadasTotal.value     = res.data.meta.total
    pagadasTotales.bs      = res.data.totales?.bs ?? 0
    pagadasTotales.usd     = res.data.totales?.usd ?? 0
  } catch (e) {
    console.error(e)
  } finally {
    pagadasCargando.value = false
  }
}

// ─── Pagar comisión ───────────────────────────────────────────────────────────
const abrirPagar = (egreso) => {
  egresoAPagar.value = egreso
  formPagar.fecha              = new Date().toISOString().substr(0, 10)
  formPagar.cuenta_bancaria_id = ''
  formPagar.comprobante        = ''
  formPagar.observaciones      = ''
  modalPagarVisible.value = true
}

const confirmarPago = async () => {
  if (!formPagar.fecha) {
    Swal.fire('Campo requerido', 'La fecha de pago es obligatoria.', 'warning')
    return
  }
  pagando.value = true
  try {
    await api.put(`/egresos/${egresoAPagar.value.id}/pagar`, formPagar)
    Swal.fire({ icon: 'success', title: 'Pago registrado', text: 'La comisión fue marcada como pagada.', timer: 2000, showConfirmButton: false })
    modalPagarVisible.value = false
    await cargarImpagas(impagasPage.value)
    await cargarAsesores(currentPage.value)
  } catch (e) {
    const msg = e.response?.data?.message || 'Error al procesar el pago.'
    Swal.fire('Error', msg, 'error')
  } finally {
    pagando.value = false
  }
}

// ─── Anular comisión pagada ────────────────────────────────────────────────────
const anularComision = async (egreso) => {
  const confirm = await Swal.fire({
    title: '¿Anular esta comisión?',
    html: `<b>${egreso.concepto}</b><br><small>Monto: ${egreso.moneda} ${Number(egreso.monto).toFixed(2)}</small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, anular',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
  })
  if (!confirm.isConfirmed) return

  try {
    await api.put(`/egresos/${egreso.id}/anular`)
    Swal.fire({ icon: 'success', title: 'Anulada', text: 'La comisión fue anulada.', timer: 1800, showConfirmButton: false })
    await cargarPagadas(pagadasPage.value)
    await cargarAsesores(currentPage.value)
  } catch (e) {
    const msg = e.response?.data?.message || 'Error al anular.'
    Swal.fire('Error', msg, 'error')
  }
}

// ─── Descargar comprobante PDF ────────────────────────────────────────────────
const descargarComprobante = async (egreso) => {
  descargando.value = egreso.id
  try {
    const res = await api.get(`/comisiones-asesores/egreso/${egreso.id}/comprobante`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  } catch (e) {
    Swal.fire('Error', 'No se pudo generar el comprobante.', 'error')
  } finally {
    descargando.value = null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) => Number(val || 0).toFixed(2)

const fmtFecha = (f) => {
  if (!f) return '—'
  // Si es solo fecha YYYY-MM-DD, forzamos T00:00:00 para evitar desfases de zona horaria
  const dateStr = (typeof f === 'string' && f.length === 10) ? f + 'T00:00:00' : f
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return f
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

let searchTimer = null
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => cargarAsesores(1), 350)
}

onMounted(() => {
  cargarAsesores()
  cargarCuentas()
})
</script>

<template>
  <div class="container-fluid py-4">

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-bold mb-1">
          <i class="bi bi-cash-coin me-2 text-warning"></i>Comisiones de Asesores
        </h4>
        <p class="text-muted small mb-0">Seguimiento de comisiones pendientes y pagadas por asesor</p>
      </div>
    </div>

    <!-- Buscador -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body py-3">
        <div class="row g-2 align-items-center">
          <div class="col-md-5">
            <div class="input-group">
              <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
              <input type="text" class="form-control" placeholder="Buscar por nombre o correo..."
                     v-model="filtros.search" @input="onSearch" />
              <button class="btn btn-outline-secondary" v-if="filtros.search" @click="filtros.search = ''; cargarAsesores(1)">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
          <div class="col-md-4 text-muted small">
            <template v-if="!cargando">
              {{ totalItems }} asesor(es) con comisiones registradas
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla principal -->
    <div class="card shadow-sm border-0">
      <div class="card-body p-0">
        <div v-if="cargando" class="text-center py-5 text-muted">
          <div class="spinner-border spinner-border-sm me-2"></div> Cargando...
        </div>
        <div v-else-if="asesores.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          No hay asesores con comisiones registradas
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-dark">
              <tr>
                <th>Asesor</th>
                <th class="text-center">% Com.</th>
                <th class="text-center text-danger">Pendientes</th>
                <th class="text-end text-danger">Deuda Bs</th>
                <th class="text-end text-danger">Deuda $</th>
                <th class="text-center text-success">Pagadas</th>
                <th class="text-end text-success">Pagado Bs</th>
                <th class="text-end text-success">Pagado $</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in asesores" :key="a.id"
                  :class="{ 'table-warning': a.comisiones_pendientes > 0 }">
                <td>
                  <div class="fw-semibold">{{ a.nombre_completo }}</div>
                  <div class="text-muted small">{{ a.correo }}</div>
                </td>
                <td class="text-center">
                  <span class="badge bg-secondary">{{ a.porcentaje_comision ?? '—' }}%</span>
                </td>
                <!-- Pendientes -->
                <td class="text-center">
                  <span class="badge"
                        :class="a.comisiones_pendientes > 0 ? 'bg-danger' : 'bg-secondary bg-opacity-25 text-secondary'">
                    {{ a.comisiones_pendientes }}
                  </span>
                </td>
                <td class="text-end fw-semibold text-danger">
                  {{ a.total_deuda_bs > 0 ? 'Bs. ' + fmt(a.total_deuda_bs) : '—' }}
                </td>
                <td class="text-end fw-semibold text-danger">
                  {{ a.total_deuda_usd > 0 ? '$ ' + fmt(a.total_deuda_usd) : '—' }}
                </td>
                <!-- Pagadas -->
                <td class="text-center">
                  <span class="badge"
                        :class="a.comisiones_pagadas > 0 ? 'bg-success' : 'bg-secondary bg-opacity-25 text-secondary'">
                    {{ a.comisiones_pagadas }}
                  </span>
                </td>
                <td class="text-end fw-semibold text-success">
                  {{ a.total_pagado_bs > 0 ? 'Bs. ' + fmt(a.total_pagado_bs) : '—' }}
                </td>
                <td class="text-end fw-semibold text-success">
                  {{ a.total_pagado_usd > 0 ? '$ ' + fmt(a.total_pagado_usd) : '—' }}
                </td>
                <!-- Acciones -->
                <td class="text-center">
                  <div class="d-flex gap-1 justify-content-center flex-wrap">
                    <button class="btn btn-sm btn-outline-danger" @click="abrirImpagas(a)"
                            :disabled="a.comisiones_pendientes === 0"
                            title="Ver comisiones impagas">
                      <i class="bi bi-clock-history me-1"></i>Impagas
                    </button>
                    <button class="btn btn-sm btn-outline-success" @click="abrirPagadas(a)"
                            :disabled="a.comisiones_pagadas === 0"
                            title="Ver comisiones pagadas">
                      <i class="bi bi-check2-circle me-1"></i>Pagadas
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación principal -->
        <div v-if="lastPage > 1" class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
          <small class="text-muted">Pág. {{ currentPage }} de {{ lastPage }} ({{ totalItems }} asesores)</small>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary" :disabled="currentPage <= 1" @click="cargarAsesores(currentPage - 1)">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="currentPage >= lastPage" @click="cargarAsesores(currentPage + 1)">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: VER IMPAGAS                                                      -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="modalImpagasVisible" class="modal d-block" style="background:rgba(0,0,0,0.5); z-index:1050;">
      <div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered" style="max-width: 1350px;">
        <div class="modal-content card-custom border-0 shadow-lg">
          <div class="modal-header bg-danger text-white border-0">
            <div>
              <h5 class="modal-title fw-bold mb-0">
                <i class="bi bi-clock-history me-2"></i>Comisiones Impagas
              </h5>
              <small class="opacity-75">{{ asesorSeleccionado?.nombre_completo }}</small>
            </div>
            <button class="btn-close btn-close-white shadow-none" @click="modalImpagasVisible = false"></button>
          </div>

          <div class="modal-body p-4">
            <!-- Filtros de fecha -->
            <div class="row g-2 mb-3">
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Desde</label>
                <input type="date" class="form-control form-control-sm" v-model="filtrosImpagas.fecha_inicio" />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Hasta</label>
                <input type="date" class="form-control form-control-sm" v-model="filtrosImpagas.fecha_fin" />
              </div>
              <div class="col-md-4 d-flex align-items-end gap-2">
                <button class="btn btn-sm btn-danger border-0 shadow-sm px-3" @click="cargarImpagas(1)">
                  <i class="bi bi-funnel me-1"></i>Filtrar
                </button>
                <button class="btn btn-sm btn-outline-secondary px-3" @click="filtrosImpagas.fecha_inicio=''; filtrosImpagas.fecha_fin=''; cargarImpagas(1)">
                  Limpiar
                </button>
              </div>
            </div>

            <!-- Totales -->
            <div class="row g-2 mb-3" v-if="!impagasCargando && impagas.length > 0">
              <div class="col-6 col-md-3">
                <div class="alert alert-danger py-2 mb-0 text-center border-0 shadow-sm bg-danger bg-opacity-10 text-danger">
                  <div class="small fw-semibold">Total Deuda Bs</div>
                  <div class="fw-bold">Bs. {{ fmt(impagasTotales.bs) }}</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="alert alert-danger py-2 mb-0 text-center border-0 shadow-sm bg-danger bg-opacity-10 text-danger">
                  <div class="small fw-semibold">Total Deuda $</div>
                  <div class="fw-bold">$ {{ fmt(impagasTotales.usd) }}</div>
                </div>
              </div>
              <div class="col-12 col-md-6 d-flex align-items-center justify-content-end">
                <span class="text-muted small">{{ impagasTotal }} comisión(es) pendiente(s)</span>
              </div>
            </div>

            <!-- Spinner / vacío -->
            <div v-if="impagasCargando" class="text-center py-5 text-muted">
              <div class="spinner-border spinner-border-sm me-2"></div> Cargando...
            </div>
            <div v-else-if="impagas.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-check2-circle fs-1 d-block mb-2 text-success"></i>
              No hay comisiones impagas
            </div>

            <!-- Tabla impagas -->
            <div v-else class="table-responsive">
              <table class="table table-sm table-hover align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto / Venta</th>
                    <th>Propiedad</th>
                    <th>Cliente</th>
                    <th class="text-end">Monto</th>
                    <th class="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in impagas" :key="e.id">
                    <td>
                      <div>{{ fmtFecha(e.fecha) }}</div>
                      <span class="badge bg-danger bg-opacity-10 text-danger border border-danger" style="font-size:10px">PENDIENTE</span>
                    </td>
                    <td>
                      <div class="small fw-medium">{{ e.concepto }}</div>
                      <div v-if="e.nota_venta_id" class="text-muted" style="font-size:11px">Venta #{{ e.nota_venta_id }}</div>
                    </td>
                    <td>
                      <div class="small text-muted">
                        {{ e.nota_venta?.propiedad?.codigo ?? '—' }}
                      </div>
                    </td>
                    <td>
                      <div class="small">
                        {{ e.nota_venta?.cliente?.nombre_completo ?? '—' }}
                      </div>
                    </td>
                    <td class="text-end fw-bold text-danger">
                      {{ e.moneda }} {{ fmt(e.monto) }}
                    </td>
                    <td class="text-center">
                      <button class="btn btn-sm btn-success border-0 shadow-sm" @click="abrirPagar(e)" title="Pagar comisión">
                        <i class="bi bi-check-circle me-1"></i>Pagar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación impagas -->
            <div v-if="impagasLastPage > 1" class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted small">Pág. {{ impagasPage }} de {{ impagasLastPage }}</small>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-secondary" :disabled="impagasPage <= 1" @click="cargarImpagas(impagasPage - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" :disabled="impagasPage >= impagasLastPage" @click="cargarImpagas(impagasPage + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer border-0 bg-light p-3">
            <button class="btn btn-secondary px-4 shadow-sm" @click="modalImpagasVisible = false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: VER PAGADAS                                                      -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="modalPagadasVisible" class="modal d-block" style="background:rgba(0,0,0,0.5); z-index:1050;">
      <div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered" style="max-width: 1350px;">
        <div class="modal-content card-custom border-0 shadow-lg">
          <div class="modal-header bg-success text-white border-0">
            <div>
              <h5 class="modal-title fw-bold mb-0">
                <i class="bi bi-check2-circle me-2"></i>Comisiones Pagadas
              </h5>
              <small class="opacity-75">{{ asesorSeleccionado?.nombre_completo }}</small>
            </div>
            <button class="btn-close btn-close-white shadow-none" @click="modalPagadasVisible = false"></button>
          </div>

          <div class="modal-body p-4">
            <!-- Filtros de fecha -->
            <div class="row g-2 mb-3">
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Desde</label>
                <input type="date" class="form-control form-control-sm" v-model="filtrosPagadas.fecha_inicio" />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-semibold">Hasta</label>
                <input type="date" class="form-control form-control-sm" v-model="filtrosPagadas.fecha_fin" />
              </div>
              <div class="col-md-4 d-flex align-items-end gap-2">
                <button class="btn btn-sm btn-success border-0 shadow-sm px-3" @click="cargarPagadas(1)">
                  <i class="bi bi-funnel me-1"></i>Filtrar
                </button>
                <button class="btn btn-sm btn-outline-secondary px-3" @click="filtrosPagadas.fecha_inicio=''; filtrosPagadas.fecha_fin=''; cargarPagadas(1)">
                  Limpiar
                </button>
              </div>
            </div>

            <!-- Totales -->
            <div class="row g-2 mb-3" v-if="!pagadasCargando && pagadas.length > 0">
              <div class="col-6 col-md-3">
                <div class="alert alert-success py-2 mb-0 text-center border-0 shadow-sm bg-success bg-opacity-10 text-success">
                  <div class="small fw-semibold">Total Pagado Bs</div>
                  <div class="fw-bold">Bs. {{ fmt(pagadasTotales.bs) }}</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="alert alert-success py-2 mb-0 text-center border-0 shadow-sm bg-success bg-opacity-10 text-success">
                  <div class="small fw-semibold">Total Pagado $</div>
                  <div class="fw-bold">$ {{ fmt(pagadasTotales.usd) }}</div>
                </div>
              </div>
              <div class="col-12 col-md-6 d-flex align-items-center justify-content-end">
                <span class="text-muted small">{{ pagadasTotal }} comisión(es) pagada(s)</span>
              </div>
            </div>

            <!-- Spinner / vacío -->
            <div v-if="pagadasCargando" class="text-center py-5 text-muted">
              <div class="spinner-border spinner-border-sm me-2"></div> Cargando...
            </div>
            <div v-else-if="pagadas.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              No hay comisiones pagadas en este período
            </div>

            <!-- Tabla pagadas -->
            <div v-else class="table-responsive">
              <table class="table table-sm table-hover align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Fecha Pago</th>
                    <th>Concepto / Venta</th>
                    <th>Propiedad</th>
                    <th>Cliente</th>
                    <th class="text-end">Monto</th>
                    <th>Cuenta / Comprobante</th>
                    <th class="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in pagadas" :key="e.id">
                    <td>
                      <div>{{ fmtFecha(e.fecha) }}</div>
                      <span class="badge bg-success bg-opacity-10 text-success border border-success" style="font-size:10px">PAGADO</span>
                    </td>
                    <td>
                      <div class="small fw-medium">{{ e.concepto }}</div>
                      <div v-if="e.nota_venta_id" class="text-muted" style="font-size:11px">Venta #{{ e.nota_venta_id }}</div>
                    </td>
                    <td>
                      <div class="small text-muted">
                        {{ e.nota_venta?.propiedad?.codigo ?? '—' }}
                      </div>
                    </td>
                    <td>
                      <div class="small">
                        {{ e.nota_venta?.cliente?.nombre_completo ?? '—' }}
                      </div>
                    </td>
                    <td class="text-end fw-bold text-success">
                      {{ e.moneda }} {{ fmt(e.monto) }}
                    </td>
                    <td>
                      <div class="small">{{ e.cuenta_bancaria?.nombre ?? '—' }}</div>
                      <div class="text-muted" style="font-size:11px">{{ e.comprobante || '—' }}</div>
                    </td>
                    <td class="text-center">
                      <div class="d-flex gap-1 justify-content-center">
                        <button class="btn btn-sm btn-outline-primary border-0 shadow-none bg-light" @click="descargarComprobante(e)"
                                :disabled="descargando === e.id"
                                title="Descargar comprobante PDF">
                          <span v-if="descargando === e.id" class="spinner-border spinner-border-sm"></span>
                          <i v-else class="bi bi-file-earmark-pdf"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger border-0 shadow-none bg-light" @click="anularComision(e)" title="Anular comisión">
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginación pagadas -->
            <div v-if="pagadasLastPage > 1" class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted small">Pág. {{ pagadasPage }} de {{ pagadasLastPage }}</small>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-secondary" :disabled="pagadasPage <= 1" @click="cargarPagadas(pagadasPage - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" :disabled="pagadasPage >= pagadasLastPage" @click="cargarPagadas(pagadasPage + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer border-0 bg-light p-3">
            <button class="btn btn-secondary px-4 shadow-sm" @click="modalPagadasVisible = false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: PAGAR COMISIÓN                                                   -->
    <!-- ════════════════════════════════════════════════════════════════════════ -->
    <div v-if="modalPagarVisible" class="modal d-block" style="background:rgba(0,0,0,0.6); z-index:1060;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content card-custom border-0 shadow-lg">
          <div class="modal-header bg-success text-white border-0">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-cash-coin me-2"></i>Registrar Pago
            </h5>
            <button class="btn-close btn-close-white shadow-none" @click="modalPagarVisible = false"></button>
          </div>
          <div class="modal-body p-4">
            <div class="alert alert-info py-2 small mb-4 border-0 shadow-none bg-primary bg-opacity-10 text-primary">
              <div class="mb-1"><strong>Asesor:</strong> {{ asesorSeleccionado?.nombre_completo }}</div>
              <div class="mb-1"><strong>Concepto:</strong> {{ egresoAPagar?.concepto }}</div>
              <div><strong>Monto:</strong> <span class="fw-bold text-danger">{{ egresoAPagar?.moneda }} {{ fmt(egresoAPagar?.monto) }}</span></div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Fecha de Pago *</label>
              <input type="date" class="form-control bg-light border-0 shadow-none" v-model="formPagar.fecha" required />
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Cuenta Bancaria</label>
              <select class="form-select bg-light border-0 shadow-none" v-model="formPagar.cuenta_bancaria_id">
                <option value="">— Sin especificar —</option>
                <option v-for="c in cuentas" :key="c.id" :value="c.id">
                  {{ c.nombre }} ({{ c.banco || c.tipo }})
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">N° Comprobante / Referencia</label>
              <input type="text" class="form-control bg-light border-0 shadow-none" v-model="formPagar.comprobante"
                     placeholder="Ej: TRF-00123" />
            </div>
            <div class="mb-0">
              <label class="form-label small fw-bold text-muted">Observaciones</label>
              <textarea class="form-control bg-light border-0 shadow-none" rows="2" v-model="formPagar.observaciones" placeholder="Opcional..."></textarea>
            </div>
          </div>
          <div class="modal-footer border-0 bg-light p-3">
            <button class="btn btn-secondary px-4 shadow-sm" @click="modalPagarVisible = false" :disabled="pagando">Cancelar</button>
            <button class="btn btn-success px-4 border-0 shadow-sm" :disabled="pagando" @click="confirmarPago">
              <span v-if="pagando" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-check-circle me-1"></i>
              Confirmar Pago
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
