<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// ─── Estado ───────────────────────────────────────────────────────────────────
const ingresos      = ref([])
const cuentas       = ref([])
const ventas        = ref([])
const cargando      = ref(true)
const guardando     = ref(false)

// Paginación
const currentPage   = ref(1)
const lastPage      = ref(1)
const totalItems    = ref(0)

// Totales del período
const totales       = ref([])

// Filtros
const hoy = new Date()
const haceDosMeses = new Date()
haceDosMeses.setMonth(haceDosMeses.getMonth() - 2)

const filtros = reactive({
  fecha_inicio: haceDosMeses.toISOString().split('T')[0],
  fecha_fin:    hoy.toISOString().split('T')[0],
  categoria:    '',
  origen:       '',
  estado:       'CONFIRMADO',
})

// Modal
const modalVisible  = ref(false)
const modoEdicion   = ref(false)
const ingresoActual = ref(null)
const form = reactive({
  fecha:              new Date().toISOString().substr(0, 10),
  concepto:           '',
  categoria:          'OTRO',
  monto:              '',
  moneda:             'Bs',
  cuenta_bancaria_id: '',
  nota_venta_id:      '',
  observaciones:      '',
})

// ─── Catálogos de etiquetas ───────────────────────────────────────────────────
const CATEGORIAS = {
  VENTA_CONTADO: 'Venta al Contado',
  CUOTA_INICIAL: 'Cuota Inicial',
  CUOTA:         'Cuota Crédito',
  OTRO:          'Otro',
}

const ORIGENES = { AUTOMATICO: 'Automático', MANUAL: 'Manual' }

const categoriaBadge = (cat) => ({
  VENTA_CONTADO: 'bg-success bg-opacity-10 text-success border border-success',
  CUOTA_INICIAL: 'bg-warning bg-opacity-10 text-warning border border-warning',
  CUOTA:         'bg-primary bg-opacity-10 text-primary border border-primary',
  OTRO:          'bg-secondary bg-opacity-10 text-secondary border border-secondary',
}[cat] || 'bg-secondary bg-opacity-10 text-secondary')

const totalBs  = computed(() => totales.value.find(t => t.moneda === 'Bs')?.total  ?? 0)
const totalUsd = computed(() => totales.value.find(t => t.moneda === '$')?.total   ?? 0)

// ─── Carga de datos ──────────────────────────────────────────────────────────
const cargar = async (page = 1) => {
  try {
    cargando.value  = true
    currentPage.value = page

    const params = new URLSearchParams({ page, per_page: 15 })
    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio)
    if (filtros.fecha_fin)    params.append('fecha_fin',    filtros.fecha_fin)
    if (filtros.categoria)    params.append('categoria',    filtros.categoria)
    if (filtros.origen)       params.append('origen',       filtros.origen)
    if (filtros.estado)       params.append('estado',       filtros.estado)

    const res = await api.get(`/ingresos?${params}`)
    ingresos.value  = res.data.data
    lastPage.value  = res.data.meta.last_page
    totalItems.value = res.data.meta.total
    totales.value   = res.data.totales ?? []

  } catch (e) {
    Swal.fire('Error', 'No se pudieron cargar los ingresos.', 'error')
  } finally {
    cargando.value = false
  }
}

const cargarCatalogos = async () => {
  const [resCuentas, resVentas] = await Promise.all([
    api.get('/cuentas-bancarias?per_page=100'),
    api.get('/ventas?per_page=100'),
  ])
  cuentas.value = resCuentas.data.data ?? []
  ventas.value  = resVentas.data.data  ?? []
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
    estado:       'CONFIRMADO'
  })
  cargar(1)
}

// ─── Modal Crear / Editar ────────────────────────────────────────────────────
const abrirModalNuevo = () => {
  modoEdicion.value   = false
  ingresoActual.value = null
  Object.assign(form, {
    fecha: new Date().toISOString().substr(0, 10),
    concepto: '', categoria: 'OTRO', monto: '', moneda: 'Bs',
    cuenta_bancaria_id: '', nota_venta_id: '', observaciones: '',
  })
  modalVisible.value = true
}

const abrirModalEditar = (ingreso) => {
  if (ingreso.origen === 'AUTOMATICO') {
    Swal.fire('Atención', 'Los ingresos automáticos solo permiten editar la cuenta bancaria y las observaciones.', 'info')
  }
  modoEdicion.value   = true
  ingresoActual.value = ingreso
  Object.assign(form, {
    fecha:              ingreso.fecha?.substr(0, 10) ?? '',
    concepto:           ingreso.concepto,
    categoria:          ingreso.categoria,
    monto:              ingreso.monto,
    moneda:             ingreso.moneda,
    cuenta_bancaria_id: ingreso.cuenta_bancaria_id ?? '',
    nota_venta_id:      ingreso.nota_venta_id ?? '',
    observaciones:      ingreso.observaciones ?? '',
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
      await api.put(`/ingresos/${ingresoActual.value.id}`, form)
      Swal.fire('Actualizado', 'Ingreso actualizado correctamente.', 'success')
    } else {
      await api.post('/ingresos', form)
      Swal.fire('Registrado', 'Ingreso registrado correctamente.', 'success')
    }
    cerrarModal()
    cargar(currentPage.value)
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo guardar el ingreso.', 'error')
  } finally {
    guardando.value = false
  }
}

// ─── Anular ───────────────────────────────────────────────────────────────────
const anular = async (ingreso) => {
  const { isConfirmed } = await Swal.fire({
    title: '¿Anular ingreso?',
    text: `"${ingreso.concepto}" por ${ingreso.moneda} ${formatMonto(ingreso.monto)} quedará anulado.`,
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc3545',
  })
  if (!isConfirmed) return
  try {
    await api.put(`/ingresos/${ingreso.id}/anular`)
    Swal.fire('Anulado', 'El ingreso ha sido anulado.', 'success')
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
          <i class="bi bi-arrow-down-circle-fill text-success me-2"></i>Ingresos
        </h2>
        <p class="text-muted small mb-0">Registro y seguimiento de todos los ingresos de la empresa</p>
      </div>
      <button class="btn btn-success shadow-sm" @click="abrirModalNuevo">
        <i class="bi bi-plus-lg me-1"></i> Nuevo Ingreso
      </button>
    </div>

    <!-- Tarjetas de totales -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-cash-coin text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Confirmado (Bs)</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">Bs {{ formatMonto(totalBs) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-currency-dollar text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Confirmado ($)</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">$ {{ formatMonto(totalUsd) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-list-check text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Registros</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">{{ totalItems }} <small class="fw-normal text-muted" style="font-size: 0.75rem;">Ingresos</small></div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card card-custom h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-light rounded-3 d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
              <i class="bi bi-calendar3 text-secondary fs-4"></i>
            </div>
            <div>
              <div class="text-muted small fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Vista Actual</div>
              <div class="fw-bold fs-5" style="color: var(--text-main);">{{ currentPage }} / {{ lastPage }} <small class="fw-normal text-muted" style="font-size: 0.75rem;">Pág.</small></div>
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
            <label class="form-label small fw-bold text-muted mb-1">Origen</label>
            <select class="form-select form-select-sm" v-model="filtros.origen">
              <option value="">Todos</option>
              <option value="AUTOMATICO">Automático</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold text-muted mb-1">Estado</label>
            <select class="form-select form-select-sm" v-model="filtros.estado">
              <option value="">Todos</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>
          <div class="col-md-2 d-flex gap-2">
            <button class="btn btn-sm btn-primary flex-grow-1" @click="cargar(1)">
              <i class="bi bi-search me-1"></i> Filtrar
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="limpiarFiltros" title="Limpiar filtros">
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
          <i class="bi bi-table me-2"></i>Listado de Ingresos
        </h6>
        <button class="btn btn-sm btn-outline-secondary" @click="cargar(currentPage)" :disabled="cargando">
          <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
      </div>

      <div class="card-body p-0">
        <!-- Loading -->
        <div v-if="cargando" class="text-center py-5">
          <div class="spinner-border text-success" role="status"></div>
          <p class="text-muted mt-2 small">Cargando ingresos...</p>
        </div>

        <!-- Vacío -->
        <div v-else-if="ingresos.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2"></i>
          <p class="mb-0">No se encontraron ingresos con los filtros aplicados.</p>
        </div>

        <!-- Tabla -->
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0" style="font-size:0.875rem;">
            <thead class="table-light">
              <tr>
                <th class="ps-4">Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th class="text-center">Origen</th>
                <th class="text-end">Monto</th>
                <th>Cuenta</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ingreso in ingresos" :key="ingreso.id"
                  :class="{ 'table-danger bg-opacity-50': ingreso.estado === 'ANULADO' }">
                <td class="ps-4 text-nowrap">
                  <span class="fw-medium">{{ formatFecha(ingreso.fecha) }}</span>
                  <span v-if="ingreso.nota_venta_id" class="d-block text-muted" style="font-size:0.75rem;">
                    Venta #{{ String(ingreso.nota_venta_id).padStart(4, '0') }}
                  </span>
                </td>
                <td style="max-width:220px;">
                  <span class="text-truncate d-block" :title="ingreso.concepto">{{ ingreso.concepto }}</span>
                </td>
                <td>
                  <span class="badge rounded-pill" :class="categoriaBadge(ingreso.categoria)">
                    {{ CATEGORIAS[ingreso.categoria] ?? ingreso.categoria }}
                  </span>
                </td>
                <td class="text-center">
                  <span class="badge" :class="ingreso.origen === 'AUTOMATICO' ? 'bg-primary bg-opacity-10 text-primary border border-primary' : 'bg-warning bg-opacity-10 text-warning border border-warning'">
                    <i class="bi me-1" :class="ingreso.origen === 'AUTOMATICO' ? 'bi-robot' : 'bi-pencil'"></i>
                    {{ ORIGENES[ingreso.origen] }}
                  </span>
                </td>
                <td class="text-end fw-bold text-success text-nowrap">
                  {{ ingreso.moneda }} {{ formatMonto(ingreso.monto) }}
                </td>
                <td class="text-muted small">
                  {{ ingreso.cuenta_bancaria?.nombre ?? '—' }}
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill" :class="ingreso.estado === 'CONFIRMADO' ? 'bg-success' : 'bg-danger'">
                    {{ ingreso.estado }}
                  </span>
                </td>
                <td class="text-center text-nowrap">
                  <button class="btn btn-sm btn-outline-secondary me-1"
                          @click="abrirModalEditar(ingreso)"
                          :disabled="ingreso.estado === 'ANULADO'"
                          title="Editar">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger"
                          @click="anular(ingreso)"
                          :disabled="ingreso.estado === 'ANULADO'"
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
        <div class="modal-content border-0 shadow-lg rounded-3">

          <div class="modal-header border-bottom px-4 py-3">
            <h5 class="modal-title fw-bold">
              <i class="bi me-2" :class="modoEdicion ? 'bi-pencil-square' : 'bi-plus-circle-fill text-success'"></i>
              {{ modoEdicion ? 'Editar Ingreso' : 'Registrar Nuevo Ingreso' }}
            </h5>
            <button class="btn-close" @click="cerrarModal" :disabled="guardando"></button>
          </div>

          <div class="modal-body p-4">
            <!-- Aviso automático -->
            <div v-if="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'" class="alert alert-info py-2 small mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Ingreso generado automáticamente. Solo puedes editar la cuenta bancaria y las observaciones.
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Fecha *</label>
                <input type="date" class="form-control" v-model="form.fecha"
                       :disabled="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Moneda *</label>
                <select class="form-select" v-model="form.moneda"
                        :disabled="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'">
                  <option value="Bs">Bs (Bolivianos)</option>
                  <option value="$">$ (Dólares)</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-muted">Concepto *</label>
                <input type="text" class="form-control" v-model="form.concepto" placeholder="Descripción del ingreso"
                       :disabled="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Categoría *</label>
                <select class="form-select" v-model="form.categoria"
                        :disabled="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'">
                  <option v-for="(label, key) in CATEGORIAS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Monto *</label>
                <div class="input-group">
                  <span class="input-group-text">{{ form.moneda }}</span>
                  <input type="number" step="0.01" min="0.01" class="form-control" v-model="form.monto"
                         placeholder="0.00" :disabled="modoEdicion && ingresoActual?.origen === 'AUTOMATICO'">
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-muted">Cuenta Bancaria</label>
                <select class="form-select" v-model="form.cuenta_bancaria_id">
                  <option value="">— Sin cuenta asignada —</option>
                  <option v-for="c in cuentas" :key="c.id" :value="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
                </select>
              </div>
              <div class="col-md-6" v-if="!modoEdicion">
                <label class="form-label small fw-bold text-muted">Venta relacionada</label>
                <select class="form-select" v-model="form.nota_venta_id">
                  <option value="">— Sin venta relacionada —</option>
                  <option v-for="v in ventas" :key="v.id" :value="v.id">
                    #{{ String(v.id).padStart(4, '0') }} – {{ v.cliente?.nombre_completo }}
                  </option>
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
            <button class="btn btn-success" @click="guardar" :disabled="guardando">
              <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
              {{ guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Registrar Ingreso') }}
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
  background-color: rgba(11, 37, 69, 0.4); /* Navy overlay con transparencia */
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.modal-dialog { width: 100%; max-width: 700px; margin: 0; }
.modal-content {
  background-color: var(--bg-card);
  color: var(--text-main);
}
</style>
