<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// ─── Estado ───────────────────────────────────────────────────────────────────
const egresos       = ref([])
const cuentas       = ref([])
const asesores      = ref([])
const ventas        = ref([])
const cargando      = ref(true)
const guardando     = ref(false)
const pagando       = ref(false)

// Paginación
const currentPage   = ref(1)
const lastPage      = ref(1)
const totalItems    = ref(0)

// Totales
const totalesRaw    = ref([])

// Filtros
const hoy = new Date()
const haceDosMeses = new Date()
haceDosMeses.setMonth(haceDosMeses.getMonth() - 2)

const filtros = reactive({
  fecha_inicio: haceDosMeses.toISOString().split('T')[0],
  fecha_fin:    hoy.toISOString().split('T')[0],
  categoria:    '',
  origen:       '',
  estado:       '',
  asesor_id:    '',
})

// Modal crear/editar
const modalVisible  = ref(false)
const modoEdicion   = ref(false)
const egresoActual  = ref(null)
const form = reactive({
  fecha:              new Date().toISOString().substr(0, 10),
  concepto:           '',
  categoria:          'OTRO',
  monto:              '',
  moneda:             'Bs',
  nota_venta_id:      '',
  asesor_id:          '',
  cuenta_bancaria_id: '',
  beneficiario:       '',
  observaciones:      '',
  estado:             'PENDIENTE',
})

// Modal pagar
const modalPagarVisible = ref(false)
const egresoAPagar      = ref(null)
const formPagar = reactive({
  fecha:              new Date().toISOString().substr(0, 10),
  cuenta_bancaria_id: '',
  comprobante:        '',
  observaciones:      '',
})

// ─── Catálogos de etiquetas ───────────────────────────────────────────────────
const CATEGORIAS = {
  COMISION_ASESOR:      'Comisión Asesor',
  GASTO_ADMINISTRATIVO: 'Gasto Administrativo',
  GASTO_OPERATIVO:      'Gasto Operativo',
  GASTO_MARKETING:      'Gasto Marketing',
  PAGO_PROPIETARIO:     'Pago Propietario',
  OTRO:                 'Otro',
}

const categoriaBadge = (cat) => ({
  COMISION_ASESOR:      'badge-cat-purple',
  GASTO_ADMINISTRATIVO: 'badge-cat-secondary',
  GASTO_OPERATIVO:      'badge-cat-warning',
  GASTO_MARKETING:      'badge-cat-info',
  PAGO_PROPIETARIO:     'badge-cat-primary',
  OTRO:                 'badge-cat-dark',
}[cat] || 'badge-cat-secondary')

const estadoBadge = (est) => ({
  PENDIENTE: 'bg-warning text-dark',
  PAGADO:    'bg-success',
  ANULADO:   'bg-danger',
}[est] || 'bg-secondary')

// ─── Totales calculados ───────────────────────────────────────────────────────
const totalPagadoBs  = computed(() => totalesRaw.value.find(t => t.moneda === 'Bs' && t.estado === 'PAGADO')?.total  ?? 0)
const totalPagadoUsd = computed(() => totalesRaw.value.find(t => t.moneda === '$'  && t.estado === 'PAGADO')?.total  ?? 0)
const totalPendBs    = computed(() => totalesRaw.value.find(t => t.moneda === 'Bs' && t.estado === 'PENDIENTE')?.total ?? 0)
const totalPendUsd   = computed(() => totalesRaw.value.find(t => t.moneda === '$'  && t.estado === 'PENDIENTE')?.total ?? 0)

// ─── Carga de datos ──────────────────────────────────────────────────────────
const cargar = async (page = 1) => {
  try {
    cargando.value    = true
    currentPage.value = page

    const params = new URLSearchParams({ page, per_page: 15 })
    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio)
    if (filtros.fecha_fin)    params.append('fecha_fin',    filtros.fecha_fin)
    if (filtros.categoria)    params.append('categoria',    filtros.categoria)
    if (filtros.origen)       params.append('origen',       filtros.origen)
    if (filtros.estado)       params.append('estado',       filtros.estado)
    if (filtros.asesor_id)    params.append('asesor_id',    filtros.asesor_id)

    const res = await api.get(`/egresos?${params}`)
    egresos.value     = res.data.data
    lastPage.value    = res.data.meta.last_page
    totalItems.value  = res.data.meta.total
    totalesRaw.value  = res.data.totales ?? []

  } catch (e) {
    Swal.fire('Error', 'No se pudieron cargar los egresos.', 'error')
  } finally {
    cargando.value = false
  }
}

const cargarCatalogos = async () => {
  const [resCuentas, resAsesores, resVentas] = await Promise.all([
    api.get('/cuentas-bancarias?per_page=100'),
    api.get('/asesores?per_page=100'),
    api.get('/ventas?per_page=100'),
  ])
  cuentas.value   = resCuentas.data.data   ?? []
  asesores.value  = resAsesores.data.data  ?? []
  ventas.value    = resVentas.data.data    ?? []
}

onMounted(async () => {
  await Promise.all([cargar(), cargarCatalogos()])
})

const limpiarFiltros = () => {
  Object.assign(filtros, {
    fecha_inicio: haceDosMeses.toISOString().split('T')[0],
    fecha_fin:    hoy.toISOString().split('T')[0],
    categoria:    '',
    origen:       '',
    estado:       '',
    asesor_id:    ''
  })
  cargar(1)
}

// ─── Modal Crear / Editar ────────────────────────────────────────────────────
const abrirModalNuevo = () => {
  modoEdicion.value  = false
  egresoActual.value = null
  Object.assign(form, {
    fecha: new Date().toISOString().substr(0, 10),
    concepto: '', categoria: 'OTRO', monto: '', moneda: 'Bs',
    nota_venta_id: '', asesor_id: '', cuenta_bancaria_id: '',
    beneficiario: '', observaciones: '', estado: 'PENDIENTE',
  })
  modalVisible.value = true
}

const abrirModalEditar = (egreso) => {
  if (egreso.origen === 'AUTOMATICO') {
    Swal.fire('Atención', 'Los egresos automáticos solo permiten editar la cuenta y las observaciones.', 'info')
  }
  modoEdicion.value  = true
  egresoActual.value = egreso
  Object.assign(form, {
    fecha:              egreso.fecha?.substr(0, 10) ?? '',
    concepto:           egreso.concepto,
    categoria:          egreso.categoria,
    monto:              egreso.monto,
    moneda:             egreso.moneda,
    nota_venta_id:      egreso.nota_venta_id      ?? '',
    asesor_id:          egreso.asesor_id           ?? '',
    cuenta_bancaria_id: egreso.cuenta_bancaria_id  ?? '',
    beneficiario:       egreso.beneficiario        ?? '',
    observaciones:      egreso.observaciones       ?? '',
    estado:             egreso.estado,
  })
  modalVisible.value = true
}

const cerrarModal = () => { modalVisible.value = false }

const guardar = async () => {
  if (!form.concepto || !form.monto || !form.fecha) {
    return Swal.fire('Validación', 'Fecha, concepto y monto son obligatorios.', 'warning')
  }
  try {
    guardando.value = true
    if (modoEdicion.value) {
      await api.put(`/egresos/${egresoActual.value.id}`, form)
      Swal.fire('Actualizado', 'Egreso actualizado correctamente.', 'success')
    } else {
      await api.post('/egresos', form)
      Swal.fire('Registrado', 'Egreso registrado correctamente.', 'success')
    }
    cerrarModal()
    cargar(currentPage.value)
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo guardar el egreso.', 'error')
  } finally {
    guardando.value = false
  }
}

// ─── Modal Pagar ──────────────────────────────────────────────────────────────
const abrirModalPagar = (egreso) => {
  egresoAPagar.value = egreso
  Object.assign(formPagar, {
    fecha:              new Date().toISOString().substr(0, 10),
    cuenta_bancaria_id: egreso.cuenta_bancaria_id ?? '',
    comprobante:        '',
    observaciones:      '',
  })
  modalPagarVisible.value = true
}

const cerrarModalPagar = () => { modalPagarVisible.value = false }

const confirmarPago = async () => {
  if (!formPagar.fecha) return Swal.fire('Validación', 'La fecha de pago es obligatoria.', 'warning')
  try {
    pagando.value = true
    await api.put(`/egresos/${egresoAPagar.value.id}/pagar`, formPagar)
    Swal.fire('Pagado', 'El egreso fue marcado como pagado correctamente.', 'success')
    cerrarModalPagar()
    cargar(currentPage.value)
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo registrar el pago.', 'error')
  } finally {
    pagando.value = false
  }
}

// ─── Anular ───────────────────────────────────────────────────────────────────
const anular = async (egreso) => {
  const { isConfirmed } = await Swal.fire({
    title: '¿Anular egreso?',
    text: `"${egreso.concepto}" por ${egreso.moneda} ${formatMonto(egreso.monto)} quedará anulado.`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
  })
  if (!isConfirmed) return
  try {
    await api.put(`/egresos/${egreso.id}/anular`)
    Swal.fire('Anulado', 'El egreso ha sido anulado.', 'success')
    cargar(currentPage.value)
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo anular.', 'error')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMonto = (v) => parseFloat(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatFecha = (f) => f ? f.substr(0, 10) : '-'
</script>

<template>
  <div class="container-fluid py-4 pb-5">

    <!-- Cabecera -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 fw-bold mb-0" style="color: var(--text-main);">
          <i class="bi bi-arrow-up-circle-fill text-danger me-2"></i>Egresos
        </h2>
        <p class="text-muted small mb-0">Registro y seguimiento de todos los egresos y gastos de la empresa</p>
      </div>
      <button class="btn btn-danger shadow-sm" @click="abrirModalNuevo">
        <i class="bi bi-plus-lg me-1"></i> Nuevo Egreso
      </button>
    </div>

    <!-- Tarjetas de totales -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-wallet2 text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Pagado (Bs)</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">Bs {{ formatMonto(totalPagadoBs) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-cash-stack text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Pagado ($)</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">$ {{ formatMonto(totalPagadoUsd) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-clock-history text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Pendiente (Bs)</div>
              <div class="fw-bold fs-5 text-warning">Bs {{ formatMonto(totalPendBs) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-exclamation-circle text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Pendiente ($)</div>
              <div class="fw-bold fs-5 text-danger">$ {{ formatMonto(totalPendUsd) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card border-0 shadow-sm rounded-3 mb-3">
      <div class="card-body py-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Desde</label>
            <input type="date" class="form-control form-control-sm" v-model="filtros.fecha_inicio">
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Hasta</label>
            <input type="date" class="form-control form-control-sm" v-model="filtros.fecha_fin">
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Categoría</label>
            <select class="form-select form-select-sm" v-model="filtros.categoria">
              <option value="">Todas</option>
              <option v-for="(label, key) in CATEGORIAS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Estado</label>
            <select class="form-select form-select-sm" v-model="filtros.estado">
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADO">Pagado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Asesor</label>
            <select class="form-select form-select-sm" v-model="filtros.asesor_id">
              <option value="">Todos</option>
              <option v-for="a in asesores" :key="a.id" :value="a.id">{{ a.nombre_completo }}</option>
            </select>
          </div>
          <div class="col-md-2 d-flex gap-2">
            <button class="btn btn-sm btn-primary flex-grow-1" @click="cargar(1)">
              <i class="bi bi-search me-1"></i> Filtrar
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="limpiarFiltros" title="Limpiar">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
      <div class="card-header py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
        <h6 class="mb-0 fw-bold text-uppercase" style="letter-spacing:1px; color: var(--text-main);">
          <i class="bi bi-table me-2"></i>Listado de Egresos
        </h6>
        <button class="btn btn-sm btn-outline-secondary" @click="cargar(currentPage)" :disabled="cargando">
          <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
      </div>

      <div class="card-body p-0">
        <div v-if="cargando" class="text-center py-5">
          <div class="spinner-border text-danger" role="status"></div>
          <p class="text-muted mt-2 small">Cargando egresos...</p>
        </div>

        <div v-else-if="egresos.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2"></i>
          <p class="mb-0">No se encontraron egresos con los filtros aplicados.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0" style="font-size:0.875rem;">
            <thead class="table-light">
              <tr>
                <th class="ps-4">Fecha</th>
                <th>Concepto / Beneficiario</th>
                <th>Categoría</th>
                <th class="text-center">Origen</th>
                <th class="text-end">Monto</th>
                <th>Cuenta</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="egreso in egresos" :key="egreso.id"
                  :class="{ 'table-danger bg-opacity-25': egreso.estado === 'ANULADO', 'table-warning bg-opacity-25': egreso.estado === 'PENDIENTE' }">
                <td class="ps-4 text-nowrap">
                  <span class="fw-medium">{{ formatFecha(egreso.fecha) }}</span>
                  <span v-if="egreso.nota_venta_id" class="d-block text-muted" style="font-size:0.75rem;">
                    Venta #{{ String(egreso.nota_venta_id).padStart(4,'0') }}
                  </span>
                </td>
                <td style="max-width:230px;">
                  <span class="fw-medium text-truncate d-block" :title="egreso.concepto">{{ egreso.concepto }}</span>
                  <span v-if="egreso.beneficiario || egreso.asesor" class="text-muted d-block" style="font-size:0.75rem;">
                    <i class="bi bi-person me-1"></i>{{ egreso.asesor?.nombre_completo ?? egreso.beneficiario }}
                  </span>
                </td>
                <td>
                  <span :class="categoriaBadge(egreso.categoria)">
                    {{ CATEGORIAS[egreso.categoria] ?? egreso.categoria }}
                  </span>
                </td>
                <td class="text-center">
                  <span class="badge" :class="egreso.origen === 'AUTOMATICO' ? 'bg-primary bg-opacity-10 text-primary border border-primary' : 'bg-warning bg-opacity-10 text-warning border border-warning'">
                    <i class="bi me-1" :class="egreso.origen === 'AUTOMATICO' ? 'bi-robot' : 'bi-pencil'"></i>
                    {{ egreso.origen === 'AUTOMATICO' ? 'Automático' : 'Manual' }}
                  </span>
                </td>
                <td class="text-end fw-bold text-danger text-nowrap">
                  {{ egreso.moneda }} {{ formatMonto(egreso.monto) }}
                </td>
                <td class="text-muted small">
                  {{ egreso.cuenta_bancaria?.nombre ?? '—' }}
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill" :class="estadoBadge(egreso.estado)">
                    {{ egreso.estado }}
                  </span>
                </td>
                <td class="text-center text-nowrap">
                  <!-- Pagar: solo si está PENDIENTE -->
                  <button class="btn btn-sm btn-success me-1"
                          v-if="egreso.estado === 'PENDIENTE'"
                          @click="abrirModalPagar(egreso)"
                          title="Marcar como Pagado">
                    <i class="bi bi-check-circle"></i>
                  </button>
                  <!-- Editar -->
                  <button class="btn btn-sm btn-outline-secondary me-1"
                          @click="abrirModalEditar(egreso)"
                          :disabled="egreso.estado === 'ANULADO'"
                          title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <!-- Anular -->
                  <button class="btn btn-sm btn-outline-danger"
                          @click="anular(egreso)"
                          :disabled="egreso.estado === 'ANULADO'"
                          title="Anular">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Paginación -->
      <div v-if="lastPage > 1" class="card-footer bg-white border-top py-3">
        <nav>
          <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="cargar(currentPage - 1)">Anterior</button>
            </li>
            <li v-for="p in lastPage" :key="p" class="page-item" :class="{ active: currentPage === p }">
              <button class="page-link" @click="cargar(p)">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === lastPage }">
              <button class="page-link" @click="cargar(currentPage + 1)">Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- ─── Modal Crear / Editar ─────────────────────────────────────────── -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content bg-white border-0 shadow-lg rounded-3">

          <div class="modal-header border-bottom px-4 py-3">
            <h5 class="modal-title fw-bold">
              <i class="bi me-2" :class="modoEdicion ? 'bi-pencil-square' : 'bi-plus-circle-fill text-danger'"></i>
              {{ modoEdicion ? 'Editar Egreso' : 'Registrar Nuevo Egreso' }}
            </h5>
            <button class="btn-close" @click="cerrarModal" :disabled="guardando"></button>
          </div>

          <div class="modal-body p-4">
            <div v-if="modoEdicion && egresoActual?.origen === 'AUTOMATICO'" class="alert alert-info py-2 small mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Egreso generado automáticamente. Solo puedes editar la cuenta bancaria y las observaciones.
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Fecha *</label>
                <input type="date" class="form-control" v-model="form.fecha"
                       :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Moneda *</label>
                <select class="form-select" v-model="form.moneda"
                        :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
                  <option value="Bs">Bs (Bolivianos)</option>
                  <option value="$">$ (Dólares)</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Concepto *</label>
                <input type="text" class="form-control" v-model="form.concepto" placeholder="Descripción del egreso"
                       :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Categoría *</label>
                <select class="form-select" v-model="form.categoria"
                        :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
                  <option v-for="(label, key) in CATEGORIAS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Monto *</label>
                <div class="input-group">
                  <span class="input-group-text">{{ form.moneda }}</span>
                  <input type="number" step="0.01" min="0.01" class="form-control" v-model="form.monto"
                         placeholder="0.00" :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Asesor (si aplica)</label>
                <select class="form-select" v-model="form.asesor_id"
                        :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
                  <option value="">— Sin asesor —</option>
                  <option v-for="a in asesores" :key="a.id" :value="a.id">{{ a.nombre_completo }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Beneficiario</label>
                <input type="text" class="form-control" v-model="form.beneficiario"
                       placeholder="Nombre del proveedor o receptor"
                       :disabled="modoEdicion && egresoActual?.origen === 'AUTOMATICO'">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Cuenta Bancaria (origen del gasto)</label>
                <select class="form-select" v-model="form.cuenta_bancaria_id">
                  <option value="">— Sin cuenta asignada —</option>
                  <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
                </select>
              </div>
              <div class="col-md-6" v-if="!modoEdicion">
                <label class="form-label small fw-bold text-muted">Estado inicial</label>
                <select class="form-select" v-model="form.estado">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADO">Pagado directamente</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Observaciones</label>
                <textarea class="form-control" rows="2" v-model="form.observaciones"
                          placeholder="Notas adicionales..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer px-4 py-3 border-top d-flex justify-content-end gap-2">
            <button class="btn btn-light border" @click="cerrarModal" :disabled="guardando">Cancelar</button>
            <button class="btn btn-danger" @click="guardar" :disabled="guardando">
              <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
              {{ guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Registrar Egreso') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Modal Pagar ──────────────────────────────────────────────────── -->
    <div v-if="modalPagarVisible" class="modal-overlay" @click.self="cerrarModalPagar">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-white border-0 shadow-lg rounded-3" v-if="egresoAPagar">

          <div class="modal-header border-bottom px-4 py-3 bg-success bg-opacity-10">
            <h5 class="modal-title fw-bold text-success">
              <i class="bi bi-check-circle-fill me-2"></i>Confirmar Desembolso
            </h5>
            <button class="btn-close" @click="cerrarModalPagar" :disabled="pagando"></button>
          </div>

          <div class="modal-body p-4">
            <!-- Resumen del egreso -->
            <div class="alert alert-light border rounded-3 mb-4">
              <div class="row g-2">
                <div class="col-6">
                  <div class="small text-muted fw-bold">Concepto</div>
                  <div class="fw-medium">{{ egresoAPagar.concepto }}</div>
                </div>
                <div class="col-6">
                  <div class="small text-muted fw-bold">Monto a pagar</div>
                  <div class="fw-bold text-danger fs-5">{{ egresoAPagar.moneda }} {{ formatMonto(egresoAPagar.monto) }}</div>
                </div>
                <div class="col-12" v-if="egresoAPagar.asesor || egresoAPagar.beneficiario">
                  <div class="small text-muted fw-bold">Beneficiario</div>
                  <div>{{ egresoAPagar.asesor?.nombre_completo ?? egresoAPagar.beneficiario }}</div>
                </div>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Fecha de desembolso *</label>
                <input type="date" class="form-control" v-model="formPagar.fecha">
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Cuenta de origen del pago</label>
                <select class="form-select" v-model="formPagar.cuenta_bancaria_id">
                  <option value="">— Sin cuenta asignada —</option>
                  <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Comprobante / N° transferencia</label>
                <input type="text" class="form-control" v-model="formPagar.comprobante"
                       placeholder="URL, número de transferencia, voucher...">
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Observaciones</label>
                <textarea class="form-control" rows="2" v-model="formPagar.observaciones"></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer px-4 py-3 border-top d-flex justify-content-end gap-2">
            <button class="btn btn-light border" @click="cerrarModalPagar" :disabled="pagando">Cancelar</button>
            <button class="btn btn-success" @click="confirmarPago" :disabled="pagando">
              <span v-if="pagando" class="spinner-border spinner-border-sm me-2"></span>
              {{ pagando ? 'Procesando...' : 'Confirmar Pago' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 1050;
  background-color: rgba(0, 0, 0, 0.5); 
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}

[data-theme="dark"] .modal-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
  background-color: var(--bg-card) !important;
  color: var(--text-main) !important;
}

.modal-dialog { width: 100%; max-width: 680px; margin: 0; }

/* Estilos de Badges de Categoría (Formales) */
[class^="badge-cat-"] {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: 4px;
  border: 1px solid transparent;
}

.badge-cat-purple { background: rgba(124, 58, 237, 0.08); color: #7c3aed; border-color: rgba(124, 58, 237, 0.2); }
.badge-cat-secondary { background: rgba(107, 114, 128, 0.08); color: #6b7280; border-color: rgba(107, 114, 128, 0.2); }
.badge-cat-warning { background: rgba(245, 158, 11, 0.08); color: #d97706; border-color: rgba(245, 158, 11, 0.2); }
.badge-cat-info { background: rgba(6, 182, 212, 0.08); color: #0891b2; border-color: rgba(6, 182, 212, 0.2); }
.badge-cat-primary { background: rgba(11, 37, 69, 0.06); color: #0b2545; border-color: rgba(11, 37, 69, 0.15); }
.badge-cat-dark { background: rgba(31, 41, 55, 0.08); color: #1f2937; border-color: rgba(31, 41, 55, 0.2); }

[data-theme="dark"] .badge-cat-primary { background: rgba(96, 165, 250, 0.1); color: #60a5fa; border-color: rgba(96, 165, 250, 0.2); }
[data-theme="dark"] .badge-cat-secondary { color: #9ca3af; border-color: rgba(156, 163, 175, 0.2); }

/* Color morado para comisiones */
.text-purple  { color: #7c3aed !important; }
.border-purple { border-color: #7c3aed !important; }
.bg-purple    { background-color: #7c3aed !important; }
</style>
