<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/axios'
import Swal from 'sweetalert2'

// Estados
const pagosPendientes = ref([])
const metodosPago = ref([])
const cuentasBancarias = ref([])
const cargando = ref(true)
const procesando = ref(false)

// Modal de pago
const mostrarModalPago = ref(false)
const pagoProcesando = ref(null)
const formPago = ref({
  metodo_pago_id: '',
  cuenta_id: '',
  fecha_pago: new Date().toISOString().substr(0, 10),
  observaciones: ''
})

// Paginación
const currentPage = ref(1)
const totalPages = ref(1)
const perPage = ref(10)
const totalItems = ref(0)

// ==========================================
// 1. CARGAR DATOS INICIALES
// ==========================================
const cargarDatos = async (page = 1) => {
  try {
    cargando.value = true
    currentPage.value = page

    // Cargamos catálogos solo una vez
    if (metodosPago.value.length === 0) {
      const [resMetodos, resCuentas] = await Promise.all([
        api.get('/metodos-pago?per_page=100'),
        api.get('/cuentas-bancarias?per_page=100')
      ])
      
      // Extraer los datos del array 'data' si el backend responde con paginación
      // o usar el objeto directamente si es una lista simple.
      metodosPago.value = Array.isArray(resMetodos.data.data) ? resMetodos.data.data : (Array.isArray(resMetodos.data) ? resMetodos.data : [])
      cuentasBancarias.value = Array.isArray(resCuentas.data.data) ? resCuentas.data.data : (Array.isArray(resCuentas.data) ? resCuentas.data : [])
    }

    // Cargamos pagos con paginación - Filtrado solo para VENTAS AL CONTADO
    const resPagos = await api.get(`/pagos/pendientes/listar?page=${page}&per_page=${perPage.value}&concepto_pago=VENTA_CONTADO`)
    
    if (resPagos.data && resPagos.data.data) {
      pagosPendientes.value = resPagos.data.data
      totalPages.value = resPagos.data.last_page
      totalItems.value = resPagos.data.total
    } else {
      pagosPendientes.value = Array.isArray(resPagos.data) ? resPagos.data : []
      totalItems.value = pagosPendientes.value.length
      totalPages.value = 1
    }
  } catch (error) {
    console.error('Error al cargar datos:', error)
    Swal.fire('Error', 'No se pudieron cargar los datos', 'error')
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarDatos()
})

// ==========================================
// 2. LÓGICA DE PAGO
// ==========================================

const abrirModalPago = (pago) => {
  pagoProcesando.value = { ...pago }
  formPago.value = {
    metodo_pago_id: '',
    cuenta_id: '',
    fecha_pago: new Date().toISOString().substr(0, 10),
    observaciones: pago.observaciones || ''
  }
  mostrarModalPago.value = true
}

const cerrarModalPago = () => {
  mostrarModalPago.value = false
}

const onMetodoChange = async () => {
  if (!formPago.value.metodo_pago_id) {
    formPago.value.cuenta_id = ''
    return
  }

  try {
    const res = await api.get(`/mapeo-metodos-cuentas/obtener-cuenta/${formPago.value.metodo_pago_id}`)
    if (res.data && res.data.id) {
      formPago.value.cuenta_id = res.data.id
    } else {
      formPago.value.cuenta_id = ''
    }
  } catch (error) {
    formPago.value.cuenta_id = ''
  }
}

const procesarPago = async () => {
  if (!formPago.value.metodo_pago_id || !formPago.value.cuenta_id || !formPago.value.fecha_pago) {
    Swal.fire('Validación', 'Completa todos los campos requeridos', 'warning')
    return
  }

  try {
    procesando.value = true

    await api.post(`/pagos/${pagoProcesando.value.id}/procesar`, {
      metodo_pago_id: formPago.value.metodo_pago_id,
      cuenta_id: formPago.value.cuenta_id,
      fecha_pago: formPago.value.fecha_pago,
      observaciones: formPago.value.observaciones
    })

    Swal.fire('Éxito', 'Pago procesado correctamente', 'success')
    cargarDatos(currentPage.value)
    cerrarModalPago()
  } catch (error) {
    console.error('Error al procesar pago:', error)
    Swal.fire('Error', error.response?.data?.message || 'No se pudo procesar el pago', 'error')
  } finally {
    procesando.value = false
  }
}

// ==========================================
// 3. HELPERS
// ==========================================

const getNombreCuenta = (id) => {
  return cuentasBancarias.value.find(c => c.id === id)?.nombre || '-'
}

const formatoMoneda = (valor) => {
  return parseFloat(valor || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const tipoVentaBadge = (tipo) => {
  return tipo === 'CONTADO'
    ? 'border-success text-success bg-success bg-opacity-10'
    : 'border-primary text-primary bg-primary bg-opacity-10'
}

const conceptoPagoBadge = (concepto) => {
  const mapeo = {
    'VENTA_CONTADO': { bg: 'bg-info', text: 'text-info', border: 'border-info' },
    'CUOTA_INICIAL': { bg: 'bg-warning', text: 'text-warning', border: 'border-warning' },
    'CUOTA': { bg: 'bg-secondary', text: 'text-secondary', border: 'border-secondary' },
    'OTRO': { bg: 'bg-dark', text: 'text-dark', border: 'border-dark' }
  }
  const estilos = mapeo[concepto] || mapeo['OTRO']
  return `${estilos.bg} ${estilos.text} bg-opacity-10 border ${estilos.border}`
}
</script>

<template>
  <div class="container-fluid py-4 pb-5">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="h4 fw-bold mb-0" style="color: #2c3e50;">Pagos al Contado</h2>
        <p class="text-muted small mb-0">Gestión de pagos pendientes para ventas al contado</p>
      </div>
      <div>
        <span class="badge bg-danger fs-6">{{ totalItems }} Pendientes</span>
      </div>
    </div>

    <!-- Información de Ayuda -->
    <div class="alert alert-info border-0 rounded-3 mb-4" style="background-color: #e8f4f8;">
      <div class="d-flex">
        <i class="bi bi-info-circle me-3 mt-1" style="color: #0c5460; font-size: 1.2rem;"></i>
        <div>
          <strong style="color: #0c5460;">¿Cómo funciona?</strong>
          <p class="mb-0 small" style="color: #0c5460;">Aquí se muestran únicamente los pagos pendientes de ventas realizadas bajo la modalidad <strong>AL CONTADO</strong>. Selecciona el método de pago y la cuenta de destino para formalizar el ingreso.</p>
        </div>
      </div>
    </div>

    <!-- Tabla de Pagos Pendientes -->
    <div class="card card-custom border-0 shadow-sm rounded-3 overflow-hidden">
      <div class="card-header border-bottom py-3 px-4 d-flex justify-content-between align-items-center" style="background-color: #ecf0f1;">
        <h6 class="mb-0 fw-bold text-uppercase" style="color: #2c3e50; letter-spacing: 1px;"><i class="bi bi-clock-history me-2"></i>Pagos Pendientes de Procesamiento</h6>
        <button class="btn btn-sm btn-outline-secondary" @click="cargarDatos(currentPage)" :disabled="cargando">
          <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
      </div>

      <div class="card-body p-0">
        <div v-if="cargando" class="text-center py-5">
          <div class="spinner-border" style="color: #2c3e50;" role="status"></div>
        </div>

        <div v-else-if="pagosPendientes.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-check-circle fs-2 d-block mb-2" style="color: #27ae60;"></i>
          <p class="mb-0">¡Todos los pagos están procesados!</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="ps-4">Venta</th>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Modalidad</th>
                <th class="text-end">Monto (Bs)</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pago in pagosPendientes" :key="pago.id">
                <td class="fw-bold text-dark">
                  <span class="d-block">VTA-{{ (pago.nota_venta_id || 0).toString().padStart(5, '0') }}</span>
                  <span class="small text-muted">{{ pago.created_at ? pago.created_at.substr(0, 10) : '-' }}</span>
                </td>
                <td>
                  <div class="fw-medium">{{ pago.nota_venta?.cliente?.nombre_completo || 'Cliente no definido' }}</div>
                  <div class="small text-muted">{{ pago.nota_venta?.cliente?.ci || '-' }}</div>
                </td>
                <td>
                  <span class="badge rounded-pill" :class="conceptoPagoBadge(pago.concepto_pago)">
                    {{ (pago.concepto_pago || '').replace('_', ' ') }}
                  </span>
                </td>
                <td>
                  <span class="badge rounded-pill border" :class="tipoVentaBadge(pago.nota_venta?.tipo_venta)">
                    {{ pago.nota_venta?.tipo_venta || '-' }}
                  </span>
                </td>
                <td class="text-end fw-bold" style="color: #2980b9;">Bs. {{ formatoMoneda(pago.monto) }}</td>
                <td class="text-center">
                  <button
                    class="btn btn-sm btn-success"
                    @click="abrirModalPago(pago)"
                    title="Procesar Pago"
                  >
                    <i class="bi bi-check-lg me-1"></i> Procesar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="card-footer bg-white border-top py-3">
        <nav aria-label="Navegación de pagos">
          <ul class="pagination pagination-sm justify-content-center mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="cargarDatos(currentPage - 1)">Anterior</button>
            </li>
            <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page }">
              <button class="page-link" @click="cargarDatos(page)">{{ page }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="cargarDatos(currentPage + 1)">Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Modal para Procesar Pago -->
    <div v-if="mostrarModalPago" class="modal d-block" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 rounded-3 shadow-lg" v-if="pagoProcesando">
          <div class="modal-header border-bottom py-3 px-4" style="background-color: #ecf0f1;">
            <h5 class="modal-title fw-bold" style="color: #2c3e50;">
              <i class="bi bi-credit-card me-2"></i>Procesar Pago
            </h5>
            <button
              type="button"
              class="btn-close"
              @click="cerrarModalPago"
              :disabled="procesando"
            ></button>
          </div>

          <div class="modal-body p-4">
            <!-- Resumen del Pago -->
            <div class="alert alert-light border rounded-3 mb-4" style="background-color: #f8f9fa;">
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="small text-muted fw-bold text-uppercase mb-1">Venta</div>
                  <div class="fw-bold text-dark">VTA-{{ (pagoProcesando.nota_venta_id || 0).toString().padStart(5, '0') }}</div>
                </div>
                <div class="col-md-6">
                  <div class="small text-muted fw-bold text-uppercase mb-1">Cliente</div>
                  <div class="fw-bold text-dark">{{ pagoProcesando.nota_venta?.cliente?.nombre_completo || 'N/A' }}</div>
                </div>
                <div class="col-md-6">
                  <div class="small text-muted fw-bold text-uppercase mb-1">Concepto</div>
                  <div class="fw-bold text-dark">{{ (pagoProcesando.concepto_pago || '').replace('_', ' ') }}</div>
                </div>
                <div class="col-md-6">
                  <div class="small text-muted fw-bold text-uppercase mb-1">Monto</div>
                  <div class="fw-bold" style="color: #27ae60; font-size: 1.2rem;">Bs. {{ formatoMoneda(pagoProcesando.monto) }}</div>
                </div>
              </div>
            </div>

            <!-- Formulario de Pago -->
            <form @submit.prevent="procesarPago" class="needs-validation">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label fw-bold" style="color: #2c3e50;">
                    <i class="bi bi-credit-card me-2"></i>Método de Pago *
                  </label>
                  <select
                    v-model="formPago.metodo_pago_id"
                    @change="onMetodoChange"
                    class="form-select form-select-sm"
                    :disabled="procesando"
                    required
                  >
                    <option value="">-- Selecciona un método --</option>
                    <option v-for="metodo in metodosPago" :key="metodo.id" :value="metodo.id">
                      {{ metodo.nombre_metodo }}
                    </option>
                  </select>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label fw-bold" style="color: #2c3e50;">
                    <i class="bi bi-bank me-2"></i>Cuenta Bancaria *
                  </label>
                  <select
                    v-model="formPago.cuenta_id"
                    class="form-select form-select-sm"
                    :disabled="procesando"
                    required
                  >
                    <option value="">-- Selecciona una cuenta --</option>
                    <option v-for="cuenta in cuentasBancarias" :key="cuenta.id" :value="cuenta.id">
                      {{ cuenta.nombre }} ({{ cuenta.tipo }})
                    </option>
                  </select>
                  <small class="text-muted d-block mt-1" v-if="formPago.cuenta_id">
                    <i class="bi bi-check-circle me-1" style="color: #27ae60;"></i>
                    {{ getNombreCuenta(formPago.cuenta_id) }}
                  </small>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label fw-bold" style="color: #2c3e50;">
                    <i class="bi bi-calendar-event me-2"></i>Fecha de Pago *
                  </label>
                  <input
                    v-model="formPago.fecha_pago"
                    type="date"
                    class="form-control form-control-sm"
                    :disabled="procesando"
                    required
                  />
                </div>

                <div class="col-md-12 mb-4">
                  <label class="form-label fw-bold" style="color: #2c3e50;">
                    <i class="bi bi-chat-left-text me-2"></i>Observaciones
                  </label>
                  <textarea
                    v-model="formPago.observaciones"
                    class="form-control form-control-sm"
                    rows="2"
                    placeholder="Notas adicionales sobre el pago..."
                    :disabled="procesando"
                  ></textarea>
                </div>
              </div>

              <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button
                  type="button"
                  class="btn btn-sm btn-light border"
                  @click="cerrarModalPago"
                  :disabled="procesando"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="btn btn-sm btn-success"
                  :disabled="procesando"
                >
                  <span v-if="procesando">
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </span>
                  <span v-else>
                    <i class="bi bi-check-lg me-1"></i>Procesar Pago
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1050;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-responsive {
  max-height: 500px;
  overflow-y: auto;
}
</style>
