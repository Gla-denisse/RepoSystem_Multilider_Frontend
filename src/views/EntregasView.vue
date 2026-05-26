<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// ---- Estado ----
const entregas      = ref([])
const cargando      = ref(true)
const currentPage   = ref(1)
const totalPages    = ref(1)

// ---- Filtros ----
const filtros = ref({
  buscar:       '',
  estado:       'TODOS',
  fecha_inicio: '',
  fecha_fin:    '',
})

// ---- Modal ----
const mostrarModal        = ref(false)
const entregaSeleccionada = ref(null)
const guardando           = ref(false)

const hoy = () => new Date().toISOString().slice(0, 10)

// Campos del formulario del modal
const form = ref({
  estado:             'Pendiente',
  fecha_programada:   '',
  fecha_entrega:      '',
  condicion_inmueble: '',
  items_entregados:   '',
  observaciones:      '',
  entregado_por:      '',
  recibido_por:       '',
})

// ==========================================
// CARGA INICIAL
// ==========================================
onMounted(async () => {
  const hoy = new Date()
  const hace6Meses = new Date()
  hace6Meses.setMonth(hoy.getMonth() - 6)
  filtros.value.fecha_fin    = hoy.toISOString().substr(0, 10)
  filtros.value.fecha_inicio = hace6Meses.toISOString().substr(0, 10)
  await cargarEntregas(1)
})

// ==========================================
// CARGAR LISTADO
// ==========================================
const cargarEntregas = async (page = 1) => {
  cargando.value    = true
  currentPage.value = page
  try {
    const params = { page, per_page: 15, ...filtros.value }
    if (params.estado === 'TODOS') delete params.estado
    const res = await api.get('/entregas', { params })
    entregas.value  = res.data.data
    totalPages.value = res.data.last_page
  } catch {
    Swal.fire('Error', 'No se pudieron cargar las entregas.', 'error')
  } finally {
    cargando.value = false
  }
}

const buscar = () => cargarEntregas(1)

// ==========================================
// MODAL
// ==========================================
const abrirModal = (entrega) => {
  entregaSeleccionada.value = { ...entrega }
  form.value = {
    estado:             entrega.estado,
    fecha_programada:   entrega.fecha_programada   || hoy(),
    fecha_entrega:      entrega.fecha_entrega       || hoy(),
    condicion_inmueble: entrega.condicion_inmueble  || '',
    items_entregados:   entrega.items_entregados    || '',
    observaciones:      entrega.observaciones       || '',
    entregado_por:      entrega.entregado_por       || '',
    recibido_por:       entrega.recibido_por        || '',
  }
  mostrarModal.value = true
}

const cerrarModal = () => {
  mostrarModal.value        = false
  entregaSeleccionada.value = null
}

// ==========================================
// GUARDAR DATOS
// ==========================================
const guardarEntrega = async () => {
  guardando.value = true
  try {
    const res = await api.put(`/entregas/${entregaSeleccionada.value.id}`, form.value)
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.data.message, showConfirmButton: false, timer: 2500 })
    const idx = entregas.value.findIndex(e => e.id === entregaSeleccionada.value.id)
    if (idx !== -1) entregas.value[idx] = res.data.data
    cerrarModal()
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo guardar.', 'error')
  } finally {
    guardando.value = false
  }
}

// ==========================================
// HELPERS
// ==========================================
const estadoBadge = (estado) => {
  if (estado === 'Entregado') return 'badge-status badge-status-active'
  if (estado === 'Diferido')  return 'badge-status badge-status-danger'
  return 'badge-status badge-status-inactive'
}

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}
</script>

<template>
  <div class="container-fluid py-4">

    <!-- Cabecera -->
    <div class="row align-items-center mb-4">
      <div class="col-md-5 mb-3 mb-md-0">
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Gestión de Entregas</h2>
        <p class="text-muted small mb-0">Controla la entrega física de propiedades a los compradores</p>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="table-controls mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-lg-4 col-md-6">
          <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-calendar3 me-1"></i>Rango de Fechas</label>
          <div class="input-group input-group-sm">
            <input type="date" class="form-control bg-white shadow-none" v-model="filtros.fecha_inicio">
            <span class="input-group-text bg-white text-muted border-start-0 border-end-0">a</span>
            <input type="date" class="form-control bg-white shadow-none" v-model="filtros.fecha_fin">
          </div>
        </div>

        <div class="col-lg-4 col-md-6">
          <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-search me-1"></i>Buscar</label>
          <input
            v-model="filtros.buscar"
            type="text"
            class="form-control form-control-sm bg-white shadow-none"
            placeholder="Código de contrato o nombre de cliente..."
            @keyup.enter="buscar"
          />
        </div>

        <div class="col-lg-4 col-md-12 d-flex gap-2">
          <div class="flex-grow-1">
            <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-info-circle me-1"></i>Estado</label>
            <select v-model="filtros.estado" class="form-select form-select-sm bg-white shadow-none">
              <option value="TODOS">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Entregado">Entregado</option>
              <option value="Diferido">Diferido</option>
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

    <!-- TABLA -->
    <div class="card card-custom border-0 shadow-sm overflow-hidden mb-3">
      <div class="card-body p-0">

        <div v-if="cargando" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted small">Cargando entregas...</p>
        </div>

        <div v-else-if="entregas.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-house-door fs-1 d-block mb-2"></i>
          No se encontraron entregas con los filtros aplicados.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-3">Contrato</th>
                <th>Cliente</th>
                <th>Propiedad</th>
                <th>F. Programada</th>
                <th>F. Entrega Real</th>
                <th>Estado</th>
                <th class="text-center pe-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in entregas" :key="e.id">
                <td class="ps-3 fw-semibold">{{ e.contrato?.codigo_contrato || '—' }}</td>
                <td>{{ e.contrato?.nota_venta?.cliente?.nombre_completo || '—' }}</td>
                <td>
                  <span class="fw-semibold">{{ e.contrato?.nota_venta?.propiedad?.codigo || '—' }}</span>
                  <br>
                  <small class="text-muted">{{ e.contrato?.nota_venta?.propiedad?.sector_urbano?.nombre || '' }}</small>
                </td>
                <td>{{ formatFecha(e.fecha_programada) }}</td>
                <td>{{ formatFecha(e.fecha_entrega) }}</td>
                <td>
                  <span :class="estadoBadge(e.estado)">{{ e.estado }}</span>
                </td>
                <td class="text-center pe-3">
                  <div class="d-flex justify-content-center gap-1">
                    <button
                      class="btn btn-sm"
                      :class="e.estado === 'Entregado' ? 'btn-outline-secondary' : 'btn-outline-primary'"
                      :title="e.estado === 'Entregado' ? 'Ver detalle' : 'Gestionar entrega'"
                      @click="abrirModal(e)"
                    >
                      <i :class="e.estado === 'Entregado' ? 'bi bi-eye' : 'bi bi-pencil-square'"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINACIÓN -->
        <div v-if="totalPages > 1" class="d-flex justify-content-center py-3">
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button class="page-link" @click="cargarEntregas(currentPage - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              <li
                v-for="p in totalPages"
                :key="p"
                class="page-item"
                :class="{ active: p === currentPage }"
              >
                <button class="page-link" @click="cargarEntregas(p)">{{ p }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="cargarEntregas(currentPage + 1)">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>

  </div>

  <!-- ===================== MODAL GESTIONAR ===================== -->
  <Teleport to="body">
    <div v-if="mostrarModal" class="modal-overlay-custom" @click.self="cerrarModal">
      <div class="modal-dialog-custom">
        <div class="modal-content card-custom border-0 shadow-lg">

          <!-- Header -->
          <div class="modal-header border-bottom-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold mb-0" style="color: var(--text-main);">
              Gestionar Entrega
            </h5>
            <button type="button" class="btn-close shadow-none" @click="cerrarModal"></button>
          </div>

          <!-- Body -->
          <div class="modal-body px-4 py-4" v-if="entregaSeleccionada">

            <!-- Resumen -->
            <div class="card bg-light border-0 shadow-none mb-3 p-3">
              <div class="row g-2 small">
                <div class="col-6">
                  <span class="text-muted">Contrato:</span>
                  <strong class="ms-1 text-dark">{{ entregaSeleccionada.contrato?.codigo_contrato || '—' }}</strong>
                </div>
                <div class="col-6 text-end">
                  <span class="text-muted">Estado actual:</span>
                  <span class="badge ms-1" :class="estadoBadge(entregaSeleccionada.estado)">{{ entregaSeleccionada.estado }}</span>
                </div>
                <div class="col-12 mt-1">
                  <span class="text-muted">Cliente:</span>
                  <strong class="ms-1 text-dark">{{ entregaSeleccionada.contrato?.nota_venta?.cliente?.nombre_completo || '—' }}</strong>
                </div>
                <div class="col-12 mt-1">
                  <span class="text-muted">Propiedad:</span>
                  <strong class="ms-1 text-dark">{{ entregaSeleccionada.contrato?.nota_venta?.propiedad?.codigo || '—' }}</strong>
                </div>
              </div>
            </div>

            <!-- Estado -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Estado de Entrega <span class="text-danger">*</span></label>
              <select v-model="form.estado" class="form-select form-select-sm bg-light border-0 shadow-none">
                <option value="Pendiente">Pendiente</option>
                <option value="Entregado">Entregado</option>
                <option value="Diferido">Diferido</option>
              </select>
            </div>

            <!-- Fechas -->
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fw-semibold">Fecha Programada</label>
                <input v-model="form.fecha_programada" type="date" class="form-control form-control-sm bg-light border-0 shadow-none" />
              </div>
              <div class="col-6">
                <label class="form-label fw-semibold">
                  Fecha Entrega Real
                  <span v-if="form.estado === 'Entregado'" class="text-danger">*</span>
                </label>
                <input v-model="form.fecha_entrega" type="date" class="form-control form-control-sm bg-light border-0 shadow-none" />
              </div>
            </div>

            <!-- Condición -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Condición del Inmueble</label>
              <input
                v-model="form.condicion_inmueble"
                type="text"
                class="form-control form-control-sm bg-light border-0 shadow-none"
                placeholder="Ej: Buenas condiciones, requiere pintura..."
              />
            </div>

            <!-- Ítems entregados -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Ítems Entregados</label>
              <textarea
                v-model="form.items_entregados"
                class="form-control form-control-sm bg-light border-0 shadow-none"
                rows="2"
                placeholder="Ej: 2 llaves, planos originales, documentación de DDRR..."
              ></textarea>
            </div>

            <!-- Entregado/Recibido por -->
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label fw-semibold">Entregado por</label>
                <input v-model="form.entregado_por" type="text" class="form-control form-control-sm bg-light border-0 shadow-none" placeholder="Nombre del representante..." />
              </div>
              <div class="col-6">
                <label class="form-label fw-semibold">Recibido por</label>
                <input v-model="form.recibido_por" type="text" class="form-control form-control-sm bg-light border-0 shadow-none" placeholder="Nombre del receptor..." />
              </div>
            </div>

            <!-- Observaciones -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Observaciones</label>
              <textarea
                v-model="form.observaciones"
                class="form-control form-control-sm bg-light border-0 shadow-none"
                rows="2"
                placeholder="Notas adicionales sobre la entrega..."
              ></textarea>
            </div>

            <!-- Botones -->
            <div class="d-flex justify-content-end gap-2 pt-3 border-top mt-4">
              <button class="btn btn-light shadow-none px-4" @click="cerrarModal" :disabled="guardando">
                Cancelar
              </button>
              <button
                class="btn btn-primary border-0 shadow-sm px-4"
                style="background-color: var(--primary-color);"
                @click="guardarEntrega"
                :disabled="guardando"
              >
                <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-save me-1"></i>
                {{ guardando ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay-custom {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.modal-dialog-custom {
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  overflow-y: auto;
}
.form-control:focus, .form-select:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}
</style>
