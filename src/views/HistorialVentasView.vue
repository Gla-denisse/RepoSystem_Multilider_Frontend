<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'
import LiveSearchSelect from '../components/LiveSearchSelect.vue'

// --- ESTADOS DE DATOS ---
const ventas = ref([])
const clientes = ref([])
const asesores = ref([])
const cargando = ref(true)
const idCargando = ref(null)

// --- PAGINACIÓN ---
const currentPage = ref(1)
const totalPages = ref(1)

// --- VARIABLES MODALES ---
const ventaSeleccionada = ref(null)
const planPagoDetalle = ref(null)
const resumenPlan = ref(null)
const mostrarDetalle = ref(false)
const cargandoPlan = ref(false)

// --- FILTROS DE BÚSQUEDA ---
const todosClientes = ref(true)
const todosAsesores = ref(true)

const filtros = ref({
  fecha_inicio: '',
  fecha_fin: '',
  cliente_id: null,
  asesor_id: null,
  tipo_venta: 'TODOS'
})

// ==========================================
// 1. CARGA INICIAL
// ==========================================
onMounted(async () => {
  const hoy = new Date()
  const haceUnMes = new Date()
  haceUnMes.setMonth(hoy.getMonth() - 1)
  filtros.value.fecha_fin = hoy.toISOString().substr(0, 10)
  filtros.value.fecha_inicio = haceUnMes.toISOString().substr(0, 10)

  try {
    const [resCli, resAse] = await Promise.all([
      api.get('/clientes?per_page=1000'),
      api.get('/asesores?per_page=100')
    ])
    clientes.value = resCli.data.data
    asesores.value = resAse.data.data
    await cargarVentas(1)
  } catch {
    Swal.fire('Error', 'No se pudieron cargar los datos base.', 'error')
  }
})

// ==========================================
// 2. FILTROS
// ==========================================
const validarFechas = () => {
  if (filtros.value.fecha_inicio && filtros.value.fecha_fin) {
    if (filtros.value.fecha_inicio > filtros.value.fecha_fin) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'La fecha de inicio no puede ser mayor a la fecha fin.', showConfirmButton: false, timer: 3000 })
      filtros.value.fecha_inicio = filtros.value.fecha_fin
    }
  }
}

watch(todosClientes, (v) => { if (v) filtros.value.cliente_id = null })
watch(todosAsesores, (v) => { if (v) filtros.value.asesor_id = null })

const cargarVentas = async (page = 1) => {
  try {
    cargando.value = true
    const params = new URLSearchParams({ page })
    if (filtros.value.fecha_inicio) params.append('fecha_inicio', filtros.value.fecha_inicio)
    if (filtros.value.fecha_fin) params.append('fecha_fin', filtros.value.fecha_fin)
    if (!todosClientes.value && filtros.value.cliente_id) params.append('cliente_id', filtros.value.cliente_id)
    if (!todosAsesores.value && filtros.value.asesor_id) params.append('asesor_id', filtros.value.asesor_id)
    if (filtros.value.tipo_venta !== 'TODOS') params.append('tipo_venta', filtros.value.tipo_venta)

    const res = await api.get(`/ventas?${params.toString()}`)
    ventas.value = res.data.data
    currentPage.value = res.data.current_page
    totalPages.value = res.data.last_page
  } catch (e) {
    console.error('Error al cargar historial:', e)
  } finally {
    cargando.value = false
  }
}

const buscar = () => cargarVentas(1)

// ==========================================
// 3. DETALLE DE VENTA
// ==========================================
const verVenta = async (venta) => {
  try {
    idCargando.value = venta.id
    const res = await api.get(`/ventas/${venta.id}`)
    ventaSeleccionada.value = res.data
    mostrarDetalle.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (res.data.tipo_venta === 'CREDITO') {
      await cargarPlanDetalle(venta.id)
    }
  } catch {
    Swal.fire('Error', 'No se pudo obtener el detalle de la venta', 'error')
  } finally {
    idCargando.value = null
  }
}

const cargarPlanDetalle = async (ventaId) => {
  try {
    cargandoPlan.value = true
    const res = await api.get(`/ventas/${ventaId}/plan-pago`)
    planPagoDetalle.value = res.data.plan_pago
    resumenPlan.value = res.data.resumen
  } catch (e) {
    console.error('Error al cargar plan de pago:', e)
  } finally {
    cargandoPlan.value = false
  }
}

const volverListado = () => {
  mostrarDetalle.value = false
  ventaSeleccionada.value = null
  planPagoDetalle.value = null
  resumenPlan.value = null
}

// ==========================================
// 4. HELPERS
// ==========================================
const formatFecha = (valor) => {
  if (!valor) return '-'
  // Toma solo la parte de fecha (YYYY-MM-DD) antes de parsear para evitar
  // desfases de zona horaria al construir Date desde una cadena ISO completa.
  const solo = String(valor).slice(0, 10)
  const [y, m, d] = solo.split('-')
  return `${d}/${m}/${y}`
}

const paginasVisibles = computed(() => {
  let pages = []
  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})
</script>

<template>
  <div class="container-fluid py-4 pb-5">

    <!-- ============================== LISTADO ============================== -->
    <div v-if="!mostrarDetalle" class="animate-fade">

      <div class="mb-4">
        <h2 class="h4 fw-bold mb-0" style="color: var(--text-main);">Historial de Ventas</h2>
        <p class="text-muted small mb-0">Auditoría, filtros y consultas de contratos</p>
      </div>

      <div class="table-controls mb-0">
        <div class="row g-3 align-items-end">
          <div class="col-lg-3 col-md-6">
            <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-calendar3 me-1"></i>Rango de Fechas</label>
            <div class="input-group input-group-sm">
              <input type="date" class="form-control bg-white shadow-none" v-model="filtros.fecha_inicio" @change="validarFechas">
              <span class="input-group-text bg-white text-muted border-start-0 border-end-0">a</span>
              <input type="date" class="form-control bg-white shadow-none" v-model="filtros.fecha_fin" @change="validarFechas">
            </div>
          </div>

          <div class="col-lg-3 col-md-6">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label small fw-bold text-muted mb-0"><i class="bi bi-person-badge me-1"></i>Asesor</label>
              <div class="form-check form-switch m-0">
                <input class="form-check-input shadow-none" type="checkbox" v-model="todosAsesores" style="transform: scale(0.8);">
                <label class="form-check-label" style="font-size: 0.75rem;">Todos</label>
              </div>
            </div>
            <div v-if="todosAsesores"><input type="text" class="form-control form-control-sm bg-white text-muted" value="Todos..." disabled></div>
            <div v-else><LiveSearchSelect v-model="filtros.asesor_id" :options="asesores" displayKey="nombre_completo" placeholder="Buscar..." /></div>
          </div>

          <div class="col-lg-3 col-md-6">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label small fw-bold text-muted mb-0"><i class="bi bi-people me-1"></i>Cliente</label>
              <div class="form-check form-switch m-0">
                <input class="form-check-input shadow-none" type="checkbox" v-model="todosClientes" style="transform: scale(0.8);">
                <label class="form-check-label" style="font-size: 0.75rem;">Todos</label>
              </div>
            </div>
            <div v-if="todosClientes"><input type="text" class="form-control form-control-sm bg-white text-muted" value="Todos..." disabled></div>
            <div v-else><LiveSearchSelect v-model="filtros.cliente_id" :options="clientes" displayKey="nombre_completo" subKey="ci" placeholder="Buscar..." /></div>
          </div>

          <div class="col-lg-3 col-md-6 d-flex gap-2">
            <div class="flex-grow-1">
              <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-tag me-1"></i>Modalidad</label>
              <select class="form-select form-select-sm bg-white shadow-none" v-model="filtros.tipo_venta">
                <option value="TODOS">Todas</option>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>
            <div>
              <label class="form-label small fw-bold text-muted mb-1" style="color: transparent; user-select: none;">&nbsp;</label>
              <button class="btn justify-content-start px-3 d-flex align-items-center btn-sm btn-primary" @click="buscar">
                <i class="bi bi-arrow-clockwise me-1"></i> Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3" style="border-top-left-radius: 0; border-top-right-radius: 0;">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-4">Fecha & Nro</th>
                <th>Propiedad</th>
                <th>Comprador & Asesor</th>
                <th>Modalidad</th>
                <th>Método de Pago</th>
                <th class="text-end">Total Venta</th>
                <th class="text-center">Estado</th>
                <th class="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cargando"><td colspan="8" class="text-center py-5"><div class="spinner-border" style="color: var(--primary-color);" role="status"></div></td></tr>
              <tr v-else-if="ventas.length === 0"><td colspan="8" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i> No hay registros.</td></tr>
              <template v-else>
                <tr v-for="venta in ventas" :key="venta.id">
                  <td class="ps-4">
                    <div class="fw-bold text-dark">{{ formatFecha(venta.fecha) }}</div>
                    <div class="text-muted smaller">VTA-{{ venta.id.toString().padStart(5, '0') }}</div>
                  </td>
                  <td>
                    <div class="fw-bold" style="color: var(--text-main);">{{ venta.propiedad?.codigo }}</div>
                    <div class="smaller text-muted">{{ venta.propiedad?.tipo }}</div>
                  </td>
                  <td>
                    <div class="fw-medium text-truncate" style="max-width: 180px;"><i class="bi bi-person-fill text-muted me-1"></i>{{ venta.cliente?.nombre_completo }}</div>
                    <div class="smaller text-muted text-truncate" style="max-width: 180px;"><i class="bi bi-person-badge text-muted me-1"></i>{{ venta.asesor?.nombre_completo }}</div>
                  </td>
                  <td>
                    <span class="badge rounded-pill border" :class="venta.tipo_venta === 'CONTADO' ? 'border-success text-success bg-success bg-opacity-10' : 'border-primary text-primary bg-primary bg-opacity-10'">
                      {{ venta.tipo_venta }}
                    </span>
                  </td>
                  <td>
                    <div class="small fw-medium" v-if="venta.pagos && venta.pagos.length > 0">
                      {{ venta.pagos[0]?.metodo_pago?.nombre_metodo || '-' }}
                    </div>
                    <div class="small text-muted" v-else>-</div>
                  </td>
                  <td class="text-end fw-bold" style="color: var(--text-main);">Bs. {{ venta.monto_total }}</td>
                  <td class="text-center">
                    <span v-if="venta.estado === 'Completada'" class="badge-status badge-status-active">Completada</span>
                    <span v-else class="badge-status badge-status-danger">{{ venta.estado }}</span>
                  </td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border shadow-sm" style="color: var(--primary-color); min-width: 110px;"
                      @click="verVenta(venta)" :disabled="idCargando === venta.id">
                      <span v-if="idCargando === venta.id">
                        <span class="spinner-border spinner-border-sm me-1" role="status"></span>Cargando...
                      </span>
                      <span v-else><i class="bi bi-eye"></i> Ver detalles</span>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <nav v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-muted">Página {{ currentPage }} de {{ totalPages }}</small>
        <ul class="pagination pagination-sm mb-0 shadow-sm">
          <li class="page-item" :class="{ disabled: currentPage === 1 }"><button class="page-link text-secondary shadow-none" @click="cargarVentas(currentPage - 1)"><i class="bi bi-chevron-left"></i></button></li>
          <li class="page-item" v-for="page in paginasVisibles" :key="page" :class="{ active: currentPage === page }">
            <button class="page-link shadow-none" :style="currentPage === page ? 'background-color: #2c3e50; border-color: #2c3e50; color: white;' : 'color: #333;'" @click="cargarVentas(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }"><button class="page-link text-secondary shadow-none" @click="cargarVentas(currentPage + 1)"><i class="bi bi-chevron-right"></i></button></li>
        </ul>
      </nav>
    </div>

    <!-- ============================== DETALLE ============================== -->
    <div v-else class="animate-fade">

      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light border shadow-sm" @click="volverListado"><i class="bi bi-arrow-left"></i></button>
          <div>
            <h3 class="fw-bold mb-0" style="color: #2c3e50;">
              Expediente VTA-{{ ventaSeleccionada.id.toString().padStart(5, '0') }}
            </h3>
            <div class="text-muted small mt-1">Fecha de Registro: {{ formatFecha(ventaSeleccionada.fecha) }}</div>
          </div>
        </div>
        <div class="text-end">
          <span class="badge fs-6 rounded-pill px-4 py-2 border"
            :class="ventaSeleccionada.estado === 'Completada' ? 'bg-success bg-opacity-10 text-success border-success' : 'bg-danger bg-opacity-10 text-danger border-danger'">
            Estado: {{ ventaSeleccionada.estado }}
          </span>
        </div>
      </div>

      <!-- Datos del comprador y propiedad -->
      <div class="row g-4 mb-4">
        <div class="col-md-6">
          <div class="card h-100 border-0 shadow-sm rounded-3">
            <div class="card-header bg-white fw-bold py-3 text-uppercase small" style="color: #7f8c8d; letter-spacing: 1px;">
              <i class="bi bi-person-bounding-box me-2"></i> Datos del Comprador
            </div>
            <div class="card-body">
              <div class="row mb-2">
                <div class="col-4 text-muted small fw-medium">Razón Social / Nombre:</div>
                <div class="col-8 fw-bold" style="color: #34495e;">{{ ventaSeleccionada.cliente?.nombre_completo }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-4 text-muted small fw-medium">Documento de Identidad:</div>
                <div class="col-8 text-dark">{{ ventaSeleccionada.cliente?.ci }} {{ ventaSeleccionada.cliente?.lugar_expedicion }}</div>
              </div>
              <div class="row mb-2">
                <div class="col-4 text-muted small fw-medium">Correo Electrónico:</div>
                <div class="col-8 text-dark">{{ ventaSeleccionada.cliente?.correo }}</div>
              </div>
              <div class="row">
                <div class="col-4 text-muted small fw-medium">Contacto Telefónico:</div>
                <div class="col-8 text-dark">{{ ventaSeleccionada.cliente?.telefono || 'No registrado' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card h-100 border-0 shadow-sm rounded-3">
            <div class="card-header bg-white fw-bold py-3 text-uppercase small" style="color: #7f8c8d; letter-spacing: 1px;">
              <i class="bi bi-building me-2"></i> Propiedad Adjudicada
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <div class="fw-bold fs-5" style="color: #2c3e50;">{{ ventaSeleccionada.propiedad?.codigo }} <span class="badge bg-secondary ms-2 fw-normal">{{ ventaSeleccionada.propiedad?.tipo }}</span></div>
                  <div class="small text-muted mt-1">Lote Nro. {{ ventaSeleccionada.propiedad?.nro_lote || '-' }}</div>
                  <div class="small text-muted">Superficie Legal: {{ ventaSeleccionada.propiedad?.superficie_m2 }} m²</div>
                </div>
              </div>
              <div>
                <div class="small text-muted fw-bold text-uppercase mb-1">Responsable Comercial</div>
                <div class="d-flex align-items-center">
                  <i class="bi bi-person-badge fs-4 text-muted me-2"></i>
                  <div>
                    <div class="text-dark fw-medium">{{ ventaSeleccionada.asesor?.nombre_completo }}</div>
                    <div class="small text-muted">Asesor Inmobiliario</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen Financiero -->
      <h5 class="fw-bold mb-3" style="color: #2c3e50;"><i class="bi bi-cash-coin me-2"></i>Resumen Financiero</h5>

      <div class="card border-0 shadow-sm mb-4 rounded-3 overflow-hidden">
        <div class="card-body p-0">
          <div class="row g-0">
            <div class="col-md-3 p-4 border-end bg-white d-flex flex-column justify-content-center">
              <span class="small text-muted fw-bold text-uppercase mb-1">Valor Contrato</span>
              <span class="fs-4 fw-bold" style="color: #2c3e50;">Bs. {{ ventaSeleccionada.monto_total }}</span>
              <span class="badge bg-light text-dark border mt-2 align-self-start">{{ ventaSeleccionada.tipo_venta }}</span>
            </div>

            <template v-if="ventaSeleccionada.tipo_venta === 'CONTADO'">
              <div class="col-md-3 p-4 border-end bg-white d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-1">Descuento Aplicado</span>
                <span class="fs-5 text-danger">- Bs. {{ ventaSeleccionada.descuento || 0 }}</span>
              </div>
              <div class="col-md-6 p-4 d-flex flex-column justify-content-center" style="background-color: #f8f9fa;">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-uppercase text-muted">Total Cancelado Líquido</span>
                  <span class="fs-3 fw-bold text-success">Bs. {{ ventaSeleccionada.monto_liquido }}</span>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="col-md-3 p-4 border-end bg-white d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-1">Cuota Inicial</span>
                <span class="fs-5 text-dark fw-medium">Bs. {{ ventaSeleccionada.cuota_inicial }}</span>
              </div>
              <div class="col-md-3 p-4 border-end bg-white d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-1">Capital Financiado</span>
                <span class="fs-5 fw-bold" style="color: #c0392b;">Bs. {{ ventaSeleccionada.saldo_credito }}</span>
              </div>
              <div class="col-md-3 p-4 bg-light d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-2">Condiciones del Crédito</span>
                <div class="d-flex justify-content-between small border-bottom pb-1 mb-1">
                  <span class="text-muted">Plazo:</span>
                  <span class="fw-bold text-dark">{{ planPagoDetalle?.numero_cuotas ?? ventaSeleccionada.plan_pago?.numero_cuotas }} Meses</span>
                </div>
                <div class="d-flex justify-content-between small">
                  <span class="text-muted">Tasa Anual:</span>
                  <span class="fw-bold text-dark">{{ planPagoDetalle?.tasa_interes ?? ventaSeleccionada.plan_pago?.tasa_interes }}%</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- ====== SECCIÓN CRÉDITO: RESUMEN DEL PLAN ====== -->
      <template v-if="ventaSeleccionada.tipo_venta === 'CREDITO'">

        <div v-if="cargandoPlan" class="text-center py-4">
          <div class="spinner-border" style="color: var(--primary-color);" role="status"></div>
        </div>

        <div v-else-if="resumenPlan" class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm rounded-3 text-center p-3">
              <div class="small text-muted fw-bold text-uppercase mb-1">Cuotas Pagadas</div>
              <div class="fs-3 fw-bold text-success">{{ resumenPlan.cuotas_pagadas }}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm rounded-3 text-center p-3">
              <div class="small text-muted fw-bold text-uppercase mb-1">Cuotas Pendientes</div>
              <div class="fs-3 fw-bold text-warning">{{ resumenPlan.cuotas_pendientes }}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm rounded-3 text-center p-3">
              <div class="small text-muted fw-bold text-uppercase mb-1">Total Cobrado</div>
              <div class="fs-5 fw-bold text-success">Bs. {{ resumenPlan.total_pagado }}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm rounded-3 text-center p-3">
              <div class="small text-muted fw-bold text-uppercase mb-1">Saldo Capital</div>
              <div class="fs-5 fw-bold" style="color: #c0392b;">Bs. {{ resumenPlan.saldo_capital }}</div>
            </div>
          </div>
        </div>

      </template>

      <!-- Pagos registrados -->
      <div v-if="ventaSeleccionada.pagos?.length" class="card border-0 shadow-sm rounded-3 overflow-hidden mb-5">
        <div class="card-header border-bottom py-3 px-4" style="background-color: #ecf0f1;">
          <h6 class="mb-0 fw-bold text-uppercase" style="color: #2c3e50; letter-spacing: 1px;"><i class="bi bi-cash-coin me-2"></i>Pagos Registrados</h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0 align-middle" style="font-size: 0.9rem;">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Método de Pago</th>
                  <th class="text-end">Monto (Bs)</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pago in ventaSeleccionada.pagos" :key="pago.id">
                  <td class="fw-medium">{{ formatFecha(pago.fecha_pago) }}</td>
                  <td><span class="badge bg-secondary">{{ pago.concepto_pago }}</span></td>
                  <td>{{ pago.metodo_pago?.nombre_metodo || '-' }}</td>
                  <td class="text-end fw-bold" style="color: #27ae60;">Bs. {{ pago.monto }}</td>
                  <td>
                    <span v-if="pago.estado === 'Registrado'" class="badge-status badge-status-active">Registrado</span>
                    <span v-else-if="pago.estado === 'Cancelado' || pago.estado === 'Rechazado'" class="badge-status badge-status-danger">{{ pago.estado }}</span>
                    <span v-else class="badge-status badge-status-inactive">{{ pago.estado }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
.animate-fade {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

.smaller { font-size: 0.75rem; }

/* Estado badge extra */
:global(.badge-status-reprog) {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 12px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.modal-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-card-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.modal-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
}
</style>
