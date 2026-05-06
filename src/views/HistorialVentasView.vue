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
const mostrarDetalle = ref(false)

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
// 1. CARGA INICIAL (Catálogos)
// ==========================================
onMounted(async () => {
  // Establecer fechas por defecto (Ej: Último mes)
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
  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los datos base.', 'error')
  }
})

// ==========================================
// 2. LÓGICA DE FILTROS Y VALIDACIÓN
// ==========================================

// Validar que Inicio no sea mayor a Fin
const validarFechas = () => {
  if (filtros.value.fecha_inicio && filtros.value.fecha_fin) {
    if (filtros.value.fecha_inicio > filtros.value.fecha_fin) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'La fecha de inicio no puede ser mayor a la fecha fin.', showConfirmButton: false, timer: 3000 })
      filtros.value.fecha_inicio = filtros.value.fecha_fin // Ajuste automático
    }
  }
}

// Watchers para limpiar los IDs si se selecciona "Todos"
watch(todosClientes, (newVal) => { if (newVal) filtros.value.cliente_id = null })
watch(todosAsesores, (newVal) => { if (newVal) filtros.value.asesor_id = null })

const cargarVentas = async (page = 1) => {
  try {
    cargando.value = true
    
    // Construimos los parámetros para el backend
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

  } catch (error) {
    console.error("Error al cargar historial:", error)
  } finally {
    cargando.value = false
  }
}

const buscar = () => cargarVentas(1)

// ==========================================
// 3. ACCIONES Y MODALES
// ==========================================
const verVenta = async (venta) => {
  try {
    idCargando.value = venta.id
    const res = await api.get(`/ventas/${venta.id}`)
    ventaSeleccionada.value = res.data
    mostrarDetalle.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    Swal.fire('Error', 'No se pudo obtener el detalle de la venta', 'error')
  } finally {
    idCargando.value = null
  }
}

const volverListado = () => {
  mostrarDetalle.value = false
  ventaSeleccionada.value = null
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
    
    <div v-if="!mostrarDetalle" class="animate-fade">
      
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="h4 fw-bold mb-0" style="color: #2c3e50;">Historial de Ventas</h2>
          <p class="text-muted small mb-0">Auditoría, filtros y consultas de contratos</p>
        </div>
      </div>

      <div class="card card-custom border-0 shadow-sm mb-4">
        <div class="card-body p-4 bg-light bg-opacity-50">
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
      </div>

      <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
              <tr class="text-muted small text-uppercase">
                <th class="ps-4">Fecha & Nro</th>
                <th>Propiedad</th>
                <th>Comprador & Asesor</th>
                <th>Modalidad</th>
                <th class="text-end">Total Venta</th>
                <th class="text-center">Estado</th>
                <th class="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cargando"><td colspan="7" class="text-center py-5"><div class="spinner-border" style="color: #2c3e50;" role="status"></div></td></tr>
              <tr v-else-if="ventas.length === 0"><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i> No hay registros.</td></tr>
              <template v-else>
                <tr v-for="venta in ventas" :key="venta.id">
                  <td class="ps-4">
                    <div class="fw-bold text-dark">{{ venta.fecha }}</div>
                    <div class="text-muted smaller">VTA-{{ venta.id.toString().padStart(5, '0') }}</div>
                  </td>
                  <td>
                    <div class="fw-bold" style="color: #34495e;">{{ venta.propiedad?.codigo }}</div>
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
                  <td class="text-end fw-bold" style="color: #2c3e50;">Bs. {{ venta.monto_total }}</td>
                  <td class="text-center"><span class="badge" :class="venta.estado === 'Completada' ? 'bg-success' : 'bg-danger'">{{ venta.estado }}</span></td>
                  <td class="text-end pe-4">
                    <button 
                      class="btn btn-sm btn-light border shadow-sm" 
                      style="color: #2c3e50; min-width: 110px;" 
                      @click="verVenta(venta)" 
                      :disabled="idCargando === venta.id"
                      title="Ver Detalles"
                    >
                      <span v-if="idCargando === venta.id">
                        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Cargando...
                      </span>
                      <span v-else>
                        <i class="bi bi-eye"></i> Ver detalles
                      </span>
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
          <li class="page-item" v-for="page in paginasVisibles" :key="page" :class="{ active: currentPage === page }"><button class="page-link shadow-none" :style="currentPage === page ? 'background-color: #2c3e50; border-color: #2c3e50; color: white;' : 'color: #333;'" @click="cargarVentas(page)">{{ page }}</button></li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }"><button class="page-link text-secondary shadow-none" @click="cargarVentas(currentPage + 1)"><i class="bi bi-chevron-right"></i></button></li>
        </ul>
      </nav>

    </div>

    <div v-else class="animate-fade" v-if="ventaSeleccionada">
      
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light border shadow-sm" @click="volverListado" title="Volver al Listado">
            <i class="bi bi-arrow-left"></i>
          </button>
          <div>
            <h3 class="fw-bold mb-0" style="color: #2c3e50;">
              Expediente VTA-{{ ventaSeleccionada.id.toString().padStart(5, '0') }}
            </h3>
            <div class="text-muted small mt-1">
              Fecha de Registro: {{ ventaSeleccionada.fecha }}
            </div>
          </div>
        </div>
        <div class="text-end">
          <span class="badge fs-6 rounded-pill px-4 py-2 border" 
                :class="ventaSeleccionada.estado === 'Completada' ? 'bg-success bg-opacity-10 text-success border-success' : 'bg-danger bg-opacity-10 text-danger border-danger'">
            Estado: {{ ventaSeleccionada.estado }}
          </span>
        </div>
      </div>

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
                <span class="small text-muted fw-bold text-uppercase mb-1">Cuota Inicial Pagada</span>
                <span class="fs-5 text-dark fw-medium">Bs. {{ ventaSeleccionada.cuota_inicial }}</span>
              </div>
              <div class="col-md-3 p-4 border-end bg-white d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-1">Capital a Financiar</span>
                <span class="fs-5 fw-bold" style="color: #c0392b;">Bs. {{ ventaSeleccionada.saldo_credito }}</span>
              </div>
              <div class="col-md-3 p-4 bg-light d-flex flex-column justify-content-center">
                <span class="small text-muted fw-bold text-uppercase mb-2">Condiciones del Crédito</span>
                <div class="d-flex justify-content-between small border-bottom pb-1 mb-1">
                  <span class="text-muted">Plazo:</span>
                  <span class="fw-bold text-dark">{{ ventaSeleccionada.plan_pago?.numero_cuotas }} Meses</span>
                </div>
                <div class="d-flex justify-content-between small">
                  <span class="text-muted">Tasa Anual:</span>
                  <span class="fw-bold text-dark">{{ ventaSeleccionada.plan_pago?.tasa_interes }}%</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-if="ventaSeleccionada.tipo_venta === 'CREDITO'" class="card border-0 shadow-sm rounded-3 overflow-hidden mb-5">
        <div class="card-header border-bottom py-3 px-4 d-flex justify-content-between align-items-center" style="background-color: #ecf0f1;">
          <h6 class="mb-0 fw-bold text-uppercase" style="color: #2c3e50; letter-spacing: 1px;"><i class="bi bi-calendar-check me-2"></i>Tabla de Amortización</h6>
          <span class="small text-muted fw-medium">Cuota Fija (Sistema Francés)</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-striped mb-0 text-center align-middle" style="font-size: 0.9rem;">
              <thead style="background-color: #34495e; color: white;">
                <tr>
                  <th class="py-3 fw-medium border-0">Nro</th>
                  <th class="py-3 fw-medium border-0">Vencimiento</th>
                  <th class="py-3 fw-medium border-0">Cuota Total (Bs)</th>
                  <th class="py-3 fw-medium border-0">Capital (Bs)</th>
                  <th class="py-3 fw-medium border-0">Interés (Bs)</th>
                  <th class="py-3 fw-medium border-0">Saldo Restante (Bs)</th>
                  <th class="py-3 fw-medium border-0">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cuota in ventaSeleccionada.plan_pago?.cuotas" :key="cuota.id">
                  <td class="fw-bold text-muted">{{ cuota.numero_cuota }}</td>
                  <td>{{ cuota.fecha_vencimiento }}</td>
                  <td class="fw-bold" style="color: #2980b9;">{{ cuota.monto_cuota }}</td>
                  <td>{{ cuota.monto_capital }}</td>
                  <td style="color: #e74c3c;">{{ cuota.monto_interes }}</td>
                  <td class="fw-medium text-dark">{{ cuota.saldo_capital }}</td>
                  <td>
                    <span class="badge rounded-pill border fw-normal" 
                      :class="{
                        'bg-warning bg-opacity-10 text-dark border-warning': cuota.estado === 'Pendiente',
                        'bg-success bg-opacity-10 text-success border-success': cuota.estado === 'Pagada',
                        'bg-danger bg-opacity-10 text-danger border-danger': cuota.estado === 'Vencida'
                      }">
                      {{ cuota.estado }}
                    </span>
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
/* Animación suave al cambiar de vistas */
.animate-fade {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-custom { background-color: var(--bg-card); border-radius: 12px; }
.smaller { font-size: 0.75rem; }

/* Ajustes Tema Oscuro */
[data-theme="dark"] .bg-white, [data-theme="dark"] .bg-light, [data-theme="dark"] .card-header {
  background-color: #2a2a2a !important; border-color: #444 !important; color: #eee !important;
}
[data-theme="dark"] .form-control, [data-theme="dark"] .form-select {
  background-color: #333; border-color: #444; color: white;
}
[data-theme="dark"] .text-dark, [data-theme="dark"] .text-muted, [data-theme="dark"] [style*="color: #2c3e50"], [data-theme="dark"] [style*="color: #34495e"], [data-theme="dark"] [style*="color: #7f8c8d"] {
  color: #ccc !important;
}
</style>