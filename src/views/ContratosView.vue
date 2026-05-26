<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// ---- Estado ----
const contratos     = ref([])
const cargando      = ref(true)
const idCargando    = ref(null)
const currentPage   = ref(1)
const totalPages    = ref(1)

// ---- Filtros ----
const filtros = ref({
  buscar:       '',
  estado:       'TODOS',
  fecha_inicio: '',
  fecha_fin:    '',
})

// ---- Modal Gestionar ----
const mostrarModal           = ref(false)
const contratoSeleccionado   = ref(null)
const archivoPdf             = ref(null)
const nombreArchivo          = ref('')
const esFirmado              = ref(false)
const fechaFirma             = ref('')
const subiendoDoc            = ref(false)

// ==========================================
// CARGA INICIAL
// ==========================================
onMounted(async () => {
  const hoy = new Date()
  const hace3Meses = new Date()
  hace3Meses.setMonth(hoy.getMonth() - 3)
  filtros.value.fecha_fin    = hoy.toISOString().substr(0, 10)
  filtros.value.fecha_inicio = hace3Meses.toISOString().substr(0, 10)
  await cargarContratos(1)
})

// ==========================================
// CARGAR LISTADO
// ==========================================
const cargarContratos = async (page = 1) => {
  cargando.value   = true
  currentPage.value = page
  try {
    const params = { page, per_page: 15, ...filtros.value }
    if (params.estado === 'TODOS') delete params.estado
    const res = await api.get('/contratos', { params })
    contratos.value  = res.data.data
    totalPages.value = res.data.last_page
  } catch {
    Swal.fire('Error', 'No se pudieron cargar los contratos.', 'error')
  } finally {
    cargando.value = false
  }
}

const buscar = () => cargarContratos(1)

// ==========================================
// MODAL GESTIONAR
// ==========================================
const abrirModal = (contrato) => {
  contratoSeleccionado.value = { ...contrato }
  archivoPdf.value    = null
  nombreArchivo.value = ''
  esFirmado.value     = contrato.estado === 'Firmado'
  fechaFirma.value    = contrato.fecha_firma || ''
  mostrarModal.value  = true
}

const cerrarModal = () => {
  mostrarModal.value         = false
  contratoSeleccionado.value = null
  archivoPdf.value           = null
  nombreArchivo.value        = ''
  esFirmado.value            = false
  fechaFirma.value           = ''
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) { archivoPdf.value = null; nombreArchivo.value = ''; return }
  if (file.type !== 'application/pdf') {
    Swal.fire('Formato inválido', 'Solo se permiten archivos PDF.', 'warning')
    e.target.value = ''
    archivoPdf.value = null
    nombreArchivo.value = ''
    return
  }
  archivoPdf.value    = file
  nombreArchivo.value = file.name
}

const guardarGestion = async () => {
  if (esFirmado.value && !fechaFirma.value) {
    Swal.fire('Fecha requerida', 'Ingresa la fecha de firma para marcar el contrato como Firmado.', 'warning')
    return
  }

  subiendoDoc.value = true
  try {
    const formData = new FormData()
    if (archivoPdf.value) formData.append('archivo', archivoPdf.value)
    formData.append('firmado', esFirmado.value ? '1' : '0')
    if (esFirmado.value && fechaFirma.value) formData.append('fecha_firma', fechaFirma.value)

    const res = await api.post(
      `/contratos/${contratoSeleccionado.value.id}/gestionar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.data.message, showConfirmButton: false, timer: 2500 })
    const idx = contratos.value.findIndex(c => c.id === contratoSeleccionado.value.id)
    if (idx !== -1) contratos.value[idx] = res.data.data
    cerrarModal()
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo actualizar el contrato.', 'error')
  } finally {
    subiendoDoc.value = false
  }
}

// ==========================================
// ANULAR
// ==========================================
const anularContrato = async (contrato) => {
  const result = await Swal.fire({
    title: `¿Anular contrato?`,
    html: `El contrato <strong>${contrato.codigo_contrato}</strong> quedará como <strong>Anulado</strong>. Esta acción no se puede revertir.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonText: 'Cancelar',
    confirmButtonText: 'Sí, anular',
  })
  if (!result.isConfirmed) return

  idCargando.value = contrato.id
  try {
    await api.put(`/contratos/${contrato.id}/anular`)
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Contrato anulado.', showConfirmButton: false, timer: 2500 })
    const idx = contratos.value.findIndex(c => c.id === contrato.id)
    if (idx !== -1) contratos.value[idx].estado = 'Anulado'
  } catch (e) {
    Swal.fire('Error', e.response?.data?.message || 'No se pudo anular el contrato.', 'error')
  } finally {
    idCargando.value = null
  }
}

// ==========================================
// DESCARGAR PDF (documento subido)
// ==========================================
const descargarContrato = async (contrato) => {
  if (!contrato.url_doc) {
    Swal.fire('Sin documento', 'Este contrato aún no tiene documento adjunto.', 'info')
    return
  }
  idCargando.value = contrato.id
  try {
    const res = await api.get(`/contratos/${contrato.id}/descargar`, { responseType: 'blob' })
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `${contrato.codigo_contrato}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    Swal.fire('Error', 'No se pudo descargar el documento.', 'error')
  } finally {
    idCargando.value = null
  }
}

// ==========================================
// GENERAR CONTRATO PDF (desde datos del sistema)
// ==========================================
const generandoId = ref(null)

const generarContrato = async (contrato) => {
  generandoId.value = contrato.id
  try {
    const res = await api.get(`/contratos/${contrato.id}/generar-pdf`, { responseType: 'blob' })
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `${contrato.codigo_contrato}_contrato.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    Swal.fire('Error', 'No se pudo generar el contrato.', 'error')
  } finally {
    generandoId.value = null
  }
}

// ==========================================
// HELPERS
// ==========================================
const estadoBadge = (estado) => {
  if (estado === 'Firmado')  return 'badge-status badge-status-active'
  if (estado === 'Anulado')  return 'badge-status badge-status-danger'
  return 'badge-status badge-status-inactive'
}

const tipoBadge = (tipo) => {
  const t = String(tipo).toUpperCase()
  if (t === 'CREDITO' || t === 'CRÉDITO') {
    return 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
  }
  return 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25'
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
        <h2 class="h4 mb-0 fw-bold" style="color: var(--text-main);">Gestión de Contratos</h2>
        <p class="text-muted small mb-0">Gestiona los contratos generados por cada venta</p>
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
            placeholder="Código o nombre de cliente..."
            @keyup.enter="buscar"
          />
        </div>

        <div class="col-lg-4 col-md-12 d-flex gap-2">
          <div class="flex-grow-1">
            <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-info-circle me-1"></i>Estado</label>
            <select v-model="filtros.estado" class="form-select form-select-sm bg-white shadow-none">
              <option value="TODOS">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Firmado">Firmado</option>
              <option value="Anulado">Anulado</option>
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
          <p class="mt-2 text-muted small">Cargando contratos...</p>
        </div>

        <div v-else-if="contratos.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-file-earmark-x fs-1 d-block mb-2"></i>
          No se encontraron contratos con los filtros aplicados.
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-3">Código</th>
                <th>Cliente</th>
                <th>Propiedad</th>
                <th>Tipo</th>
                <th>F. Emisión</th>
                <th>F. Firma</th>
                <th>Estado</th>
                <th class="text-center pe-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in contratos" :key="c.id">
                <td class="ps-3 fw-semibold">{{ c.codigo_contrato }}</td>
                <td>{{ c.nota_venta?.cliente?.nombre_completo || '—' }}</td>
                <td>
                  <span class="fw-semibold">{{ c.nota_venta?.propiedad?.codigo || '—' }}</span>
                  <br>
                  <small class="text-muted">{{ c.nota_venta?.propiedad?.sector_urbano?.nombre || '' }}</small>
                </td>
                <td>
                  <span class="badge rounded-pill fw-medium px-3 py-2" :class="tipoBadge(c.tipo_venta)">{{ c.tipo_venta }}</span>
                </td>
                <td>{{ formatFecha(c.fecha_emision) }}</td>
                <td>{{ formatFecha(c.fecha_firma) }}</td>
                <td>
                  <span :class="estadoBadge(c.estado)">{{ c.estado }}</span>
                </td>
                <td class="text-center pe-3">
                  <div class="d-flex justify-content-center gap-1">
                    <!-- Gestionar (subir PDF / estado) -->
                    <button
                      v-if="c.estado !== 'Anulado'"
                      class="btn btn-sm btn-outline-primary"
                      title="Gestionar contrato"
                      :disabled="idCargando === c.id || generandoId === c.id"
                      @click="abrirModal(c)"
                    >
                      <i class="bi bi-file-earmark-arrow-up"></i>
                    </button>

                    <!-- Generar contrato (desde datos del sistema) -->
                    <button
                      class="btn btn-sm btn-outline-info"
                      title="Generar contrato"
                      :disabled="idCargando === c.id || generandoId === c.id"
                      @click="generarContrato(c)"
                    >
                      <span v-if="generandoId === c.id" class="spinner-border spinner-border-sm"></span>
                      <i v-else class="bi bi-file-earmark-text"></i>
                    </button>

                    <!-- Descargar PDF subido -->
                    <button
                      class="btn btn-sm"
                      :class="c.url_doc ? 'btn-outline-success' : 'btn-outline-secondary'"
                      :title="c.url_doc ? 'Descargar contrato PDF' : 'Sin documento'"
                      :disabled="idCargando === c.id || generandoId === c.id"
                      @click="descargarContrato(c)"
                    >
                      <span v-if="idCargando === c.id" class="spinner-border spinner-border-sm"></span>
                      <i v-else class="bi bi-file-earmark-pdf"></i>
                    </button>

                    <!-- Anular -->
                    <button
                      v-if="c.estado !== 'Anulado'"
                      class="btn btn-sm btn-outline-danger"
                      title="Anular contrato"
                      :disabled="idCargando === c.id || generandoId === c.id"
                      @click="anularContrato(c)"
                    >
                      <i class="bi bi-x-circle"></i>
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
                <button class="page-link" @click="cargarContratos(currentPage - 1)">
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              <li
                v-for="p in totalPages"
                :key="p"
                class="page-item"
                :class="{ active: p === currentPage }"
              >
                <button class="page-link" @click="cargarContratos(p)">{{ p }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="cargarContratos(currentPage + 1)">
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
              <!-- <i class="bi bi-file-earmark-text me-2 text-primary"></i> -->
              Gestionar Contrato
            </h5>
            <button type="button" class="btn-close shadow-none" @click="cerrarModal"></button>
          </div>

          <!-- Body -->
          <div class="modal-body px-4 py-4" v-if="contratoSeleccionado">

            <!-- Info resumen -->
            <div class="card bg-light border-0 shadow-none mb-3 p-3">
              <div class="row g-2 small">
                <div class="col-6">
                  <span class="text-muted">Código:</span>
                  <strong class="ms-1 text-dark">{{ contratoSeleccionado.codigo_contrato }}</strong>
                </div>
                <div class="col-6 text-end">
                  <span class="text-muted">Tipo:</span>
                  <span class="badge ms-1" :class="tipoBadge(contratoSeleccionado.tipo_venta)">{{ contratoSeleccionado.tipo_venta }}</span>
                </div>
                <div class="col-12 mt-1">
                  <span class="text-muted">Cliente:</span>
                  <strong class="ms-1 text-dark">{{ contratoSeleccionado.nota_venta?.cliente?.nombre_completo || '—' }}</strong>
                </div>
                <div class="col-12 mt-1">
                  <span class="text-muted">Estado actual:</span>
                  <span class="badge ms-1" :class="estadoBadge(contratoSeleccionado.estado)">{{ contratoSeleccionado.estado }}</span>
                </div>
              </div>
            </div>

            <!-- Documento actual -->
            <div v-if="contratoSeleccionado.url_doc" class="mb-3 p-3 bg-light rounded-3 d-flex align-items-center gap-2">
              <i class="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
              <div class="small flex-grow-1 text-truncate">
                <span class="text-muted">Documento actual:</span>
                <span class="ms-1 fw-semibold text-dark">{{ contratoSeleccionado.codigo_contrato }}.pdf</span>
              </div>
            </div>

            <!-- Subir nuevo PDF -->
            <div class="mb-3">
              <label class="form-label fw-semibold">
                {{ contratoSeleccionado.url_doc ? 'Reemplazar documento PDF' : 'Subir documento PDF' }}
              </label>
              <div class="input-group input-group-sm">
                <input
                  type="file"
                  class="form-control bg-light border-0 shadow-none"
                  accept="application/pdf"
                  @change="onFileChange"
                />
              </div>
              <div v-if="nombreArchivo" class="form-text text-success">
                <i class="bi bi-check-circle me-1"></i>{{ nombreArchivo }}
              </div>
              <div class="form-text text-muted">Solo archivos PDF. Máximo 10 MB.</div>
            </div>

            <hr class="my-3">

            <!-- Toggle firmado -->
            <div class="mb-3">
              <div class="d-flex align-items-center justify-content-between">
                <label class="form-label fw-semibold mb-0">Marcar como Firmado</label>
                <div class="form-check form-switch">
                  <input
                    v-model="esFirmado"
                    class="form-check-input custom-switch shadow-none"
                    type="checkbox"
                    role="switch"
                    style="width: 2.5em; height: 1.3em; cursor: pointer;"
                  />
                </div>
              </div>
              <div class="form-text text-muted">Al activar, el contrato cambia su estado a <strong>Firmado</strong>.</div>
            </div>

            <!-- Fecha firma (solo si firmado) -->
            <div v-if="esFirmado" class="mb-3">
              <label class="form-label fw-semibold">Fecha de Firma <span class="text-danger">*</span></label>
              <input
                v-model="fechaFirma"
                type="date"
                class="form-control form-control-sm bg-light border-0 shadow-none"
              />
            </div>

            <!-- Botones de Acción -->
            <div class="d-flex justify-content-end gap-2 pt-3 border-top mt-4">
              <button class="btn btn-light shadow-none px-4" @click="cerrarModal" :disabled="subiendoDoc">
                Cancelar
              </button>
              <button
                class="btn btn-primary border-0 shadow-sm px-4"
                style="background-color: var(--primary-color);"
                @click="guardarGestion"
                :disabled="subiendoDoc || (!archivoPdf && contratoSeleccionado?.estado === (esFirmado ? 'Firmado' : 'Pendiente'))"
              >
                <span v-if="subiendoDoc" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-save me-1"></i>
                {{ subiendoDoc ? 'Guardando...' : 'Guardar cambios' }}
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
  max-width: 560px;
}
.custom-switch:checked {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}
.form-control:focus, .form-select:focus {
  background-color: var(--bg-card) !important;
  border: 1px solid var(--primary-color) !important;
  box-shadow: 0 0 0 0.25rem rgba(162, 139, 250, 0.25) !important;
}
</style>
