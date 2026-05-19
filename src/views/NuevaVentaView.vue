<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import Swal from 'sweetalert2'
import LiveSearchSelect from '../components/LiveSearchSelect.vue'
import ClienteModal from '../components/ClienteModal.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const step = ref(1)
const guardando = ref(false)

const isAsesor = computed(() => {
  const asignaciones = authStore.user?.roles_permisos || authStore.user?.rolesPermisos || []
  return asignaciones.some(item => {
    const rol = item.rol_permiso?.rol || item.rolPermiso?.rol
    return rol?.nombre === 'Asesor de Ventas'
  })
})

// Data de catálogos
const clientes = ref([])
const propiedades = ref([])
const asesores = ref([])

// Selecciones
const clienteSeleccionadoId = ref(null)
const propiedadSeleccionadaId = ref(null)

// Formulario de Venta
const formVenta = ref({
  asesor_id: '',
  fecha: new Date().toISOString().substr(0, 10),
  tipo_venta: 'CONTADO',

  // Contado
  descuento: 0,

  // Crédito
  cuota_inicial: 0,
  numero_cuotas: 12,
  tasa_interes: 10,
  fecha_inicio_pago: ''
})

// Objetos completos seleccionados
const clienteObj = computed(() => clientes.value.find(c => c.id === clienteSeleccionadoId.value))
const propiedadObj = computed(() => propiedades.value.find(p => p.id === propiedadSeleccionadaId.value))
const asesorObj = computed(() => asesores.value.find(a => a.id === formVenta.value.asesor_id))

// ==========================================
// 1. CARGA INICIAL
// ==========================================
onMounted(async () => {
  try {
    const [resCli, resProp, resAse] = await Promise.all([
      api.get('/clientes?per_page=50'),
      api.get('/propiedades?per_page=100'),
      api.get('/asesores?per_page=100')
    ])
    clientes.value = resCli.data.data.filter(c => c.estado == 1)
    propiedades.value = resProp.data.data.filter(p => p.estado === 'Disponible' && p.activo)
    asesores.value = resAse.data.data

    if (isAsesor.value) {
      const propio = asesores.value.find(a => a.user_id === authStore.user?.id)
      if (propio) formVenta.value.asesor_id = propio.id
    }

  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los catálogos.', 'error')
  }
})

// ==========================================
// 2. BÚSQUEDA REMOTA CON DEBOUNCE (Punto 4)
// ==========================================
let searchClienteTimeout = null
let searchPropiedadTimeout = null
let searchAsesorTimeout = null

const buscarClientesRemoto = (query) => {
  clearTimeout(searchClienteTimeout)
  if (!query || query.length < 2) return
  searchClienteTimeout = setTimeout(async () => {
    try {
      const res = await api.get(`/clientes?search=${query}&per_page=30`)
      clientes.value = res.data.data.filter(c => c.estado == 1)
    } catch { /* silent */ }
  }, 300)
}

const buscarPropiedadesRemoto = (query) => {
  clearTimeout(searchPropiedadTimeout)
  if (!query || query.length < 2) return
  searchPropiedadTimeout = setTimeout(async () => {
    try {
      const res = await api.get(`/propiedades?search=${query}&per_page=30`)
      propiedades.value = res.data.data.filter(p => p.estado === 'Disponible' && p.activo)
    } catch { /* silent */ }
  }, 300)
}

const buscarAsesoresRemoto = (query) => {
  clearTimeout(searchAsesorTimeout)
  if (!query || query.length < 2) return
  searchAsesorTimeout = setTimeout(async () => {
    try {
      const res = await api.get(`/asesores?search=${query}&per_page=30`)
      asesores.value = res.data.data
    } catch { /* silent */ }
  }, 300)
}

// ==========================================
// 3. LÓGICA FINANCIERA
// ==========================================
const monedaPropiedad = computed(() => propiedadObj.value?.moneda || 'Bs')
const montoTotal = computed(() => propiedadObj.value ? parseFloat(propiedadObj.value.precio_venta) : 0)
const montoLiquido = computed(() => montoTotal.value - formVenta.value.descuento)
const saldoCredito = computed(() => montoTotal.value - formVenta.value.cuota_inicial)

// Comisión calculada en base al porcentaje del asesor
const montoComisionPreview = computed(() => {
  if (!asesorObj.value || !montoTotal.value) return '0.00'
  const pct = parseFloat(asesorObj.value.porcentaje_comision) || 0
  return (montoTotal.value * pct / 100).toFixed(2)
})

// Plan de pagos (Sistema Francés)
const planPagosPreview = computed(() => {
  if (formVenta.value.tipo_venta !== 'CREDITO' || saldoCredito.value <= 0 || formVenta.value.numero_cuotas < 1) return []

  const meses = parseInt(formVenta.value.numero_cuotas)
  const tasaAnual = parseFloat(formVenta.value.tasa_interes)
  const P = saldoCredito.value
  const i = (tasaAnual / 100) / 12

  let cuotaFija = i > 0 ? P * (i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1) : P / meses

  let saldo = P
  let cuotas = []

  for (let mes = 1; mes <= meses; mes++) {
    let interes = saldo * i
    let capital = cuotaFija - interes

    if (mes === meses) {
      capital = saldo
      cuotaFija = capital + interes
    }
    saldo -= capital

    cuotas.push({
      nro: mes,
      cuota: cuotaFija.toFixed(2),
      interes: interes.toFixed(2),
      capital: capital.toFixed(2),
      saldo: Math.abs(saldo).toFixed(2)
    })
  }
  return cuotas
})

// ==========================================
// 4. ACCIONES Y VALIDACIONES
// ==========================================
const alCrearCliente = (nuevoCliente) => {
  clientes.value.push(nuevoCliente)
  clienteSeleccionadoId.value = nuevoCliente.id
}

const siguientePaso = () => {
  if (step.value === 1 && !clienteSeleccionadoId.value) return Swal.fire('Atención', 'Debe seleccionar un cliente.', 'warning')
  if (step.value === 2 && !propiedadSeleccionadaId.value) return Swal.fire('Atención', 'Debe seleccionar una propiedad.', 'warning')

  // Punto 5: solo autollenar si el campo está vacío (no sobreescribir si el usuario ya editó)
  if (step.value === 2 && !formVenta.value.fecha_inicio_pago) {
    let fechaPago = new Date()
    fechaPago.setMonth(fechaPago.getMonth() + 1)
    formVenta.value.fecha_inicio_pago = fechaPago.toISOString().substr(0, 10)
  }
  step.value++
}

const registrarVenta = async () => {
  if (!isAsesor.value && !formVenta.value.asesor_id) {
    return Swal.fire('Atención', 'Debe seleccionar un asesor responsable.', 'warning')
  }
  guardando.value = true

  const payload = {
    asesor_id: formVenta.value.asesor_id,
    cliente_id: clienteSeleccionadoId.value,
    propiedad_id: propiedadSeleccionadaId.value,
    fecha: formVenta.value.fecha,
    moneda: monedaPropiedad.value,
    monto_total: montoTotal.value,
    tipo_venta: formVenta.value.tipo_venta
  }

  if (payload.tipo_venta === 'CONTADO') {
    payload.descuento = formVenta.value.descuento
    payload.monto_liquido = montoLiquido.value
  } else {
    payload.cuota_inicial = formVenta.value.cuota_inicial
    payload.saldo_credito = saldoCredito.value
    payload.numero_cuotas = formVenta.value.numero_cuotas
    payload.tasa_interes = formVenta.value.tasa_interes
    payload.fecha_inicio_pago = formVenta.value.fecha_inicio_pago
  }

  try {
    await api.post('/ventas', payload)
    Swal.fire('¡Venta Registrada!', 'El contrato y plan de pagos han sido generados exitosamente.', 'success').then(() => {
      resetAsistente()
    })
  } catch (error) {
    let msg = error.response?.data?.message || 'Revisa los datos e intenta nuevamente.'
    Swal.fire('Error al procesar la venta', msg, 'error')
  } finally {
    guardando.value = false
  }
}

const resetAsistente = () => {
  step.value = 1
  clienteSeleccionadoId.value = null
  propiedadSeleccionadaId.value = null
  const defaultAsesorId = isAsesor.value
    ? (asesores.value.find(a => a.user_id === authStore.user?.id)?.id || '')
    : ''
  formVenta.value = {
    asesor_id: defaultAsesorId,
    fecha: new Date().toISOString().substr(0, 10),
    tipo_venta: 'CONTADO',
    descuento: 0,
    cuota_inicial: 0,
    numero_cuotas: 12,
    tasa_interes: 10,
    fecha_inicio_pago: ''
  }
}
</script>

<template>
  <div class="container py-4 pb-5" style="max-width: 900px;">

    <div class="text-center mb-5">
      <h2 class="fw-bold mb-2" style="color: var(--text-main);">Registro de Nueva Venta</h2>
      <p class="text-muted">Asistente paso a paso para generación de contratos</p>

      <div class="d-flex justify-content-center mt-4">
        <div class="step-indicator" :class="{'active': step >= 1}">1. Cliente</div>
        <div class="step-line" :class="{'active': step >= 2}"></div>
        <div class="step-indicator" :class="{'active': step >= 2}">2. Propiedad</div>
        <div class="step-line" :class="{'active': step >= 3}"></div>
        <div class="step-indicator" :class="{'active': step >= 3}">3. Contrato y Pagos</div>
      </div>
    </div>

    <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
      <div class="card-body p-0">

        <!-- PASO 1: CLIENTE -->
        <div v-show="step === 1" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-person-check me-2"></i>Selección del Comprador</h5>

          <div class="d-flex gap-3 mb-4">
            <div class="flex-grow-1">
              <label class="form-label small fw-bold text-muted">Buscar Cliente Registrado</label>
              <LiveSearchSelect
                v-model="clienteSeleccionadoId"
                :options="clientes" displayKey="nombre_completo" subKey="ci" valueKey="id"
                placeholder="Busca por Nombre o CI..."
                @search="buscarClientesRemoto"
              />
            </div>
            <div class="pt-4 mt-1">
              <button class="btn btn-outline-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#modalCrearCliente">
                <i class="bi bi-plus-lg"></i> Nuevo
              </button>
            </div>
          </div>

          <div v-if="clienteObj" class="alert bg-light border p-4 rounded-3 d-flex align-items-center">
            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-4" style="width: 60px; height: 60px;">
              <i class="bi bi-person-fill fs-3"></i>
            </div>
            <div>
              <h5 class="fw-bold mb-1">{{ clienteObj.nombre_completo }}</h5>
              <div class="text-muted small">
                <i class="bi bi-card-text me-1"></i> CI: {{ clienteObj.ci }} {{ clienteObj.lugar_expedicion }} |
                <i class="bi bi-telephone me-1 ms-2"></i> {{ clienteObj.telefono || 'Sin Teléfono' }}
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 2: PROPIEDAD -->
        <div v-show="step === 2" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-house-door me-2"></i>Propiedad a Vender</h5>

          <div class="mb-4">
            <label class="form-label small fw-bold text-muted">Seleccionar Propiedad Disponible</label>
            <LiveSearchSelect
              v-model="propiedadSeleccionadaId"
              :options="propiedades" displayKey="codigo" subKey="tipo" valueKey="id"
              placeholder="Busca por Código de Propiedad..."
              @search="buscarPropiedadesRemoto"
            />
          </div>

          <div v-if="propiedadObj" class="alert bg-light border p-4 rounded-3">
            <div class="row">
              <div class="col-md-6 border-end">
                <h3 class="fw-bold text-success mb-0">{{ propiedadObj.moneda }} {{ propiedadObj.precio_venta }}</h3>
                <div class="text-muted small mb-3">Valor Oficial de Venta</div>
                <div class="fw-bold">{{ propiedadObj.tipo }} - {{ propiedadObj.codigo }}</div>
                <div class="small text-muted">Superficie: {{ propiedadObj.superficie_m2 }} m²</div>
              </div>
              <div class="col-md-6 ps-4">
                <div class="small fw-bold text-muted mb-1">Ubicación</div>
                <!-- Punto 3: mostrar sector urbano y ciudad -->
                <div v-if="propiedadObj.sector_urbano?.nombre" class="fw-medium">
                  <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                  {{ propiedadObj.sector_urbano.nombre }}{{ propiedadObj.sector_urbano?.distrito?.ciudad?.nombre ? ', ' + propiedadObj.sector_urbano.distrito.ciudad.nombre : '' }}
                </div>
                <div class="small mt-2 text-muted">Lote: {{ propiedadObj.nro_lote || '-' }}</div>
                <div class="small mt-1 text-muted" v-if="propiedadObj.direccion">
                  <i class="bi bi-signpost me-1"></i> {{ propiedadObj.direccion }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 3: CONTRATO Y PAGOS -->
        <div v-show="step === 3" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-file-earmark-text me-2"></i>Términos Comerciales</h5>

          <div class="row bg-light border rounded p-3 mb-4 g-3">
            <div :class="isAsesor ? 'col-md-12' : 'col-md-6'">
              <label class="small fw-bold text-muted">Fecha del Contrato</label>
              <input type="date" class="form-control border-0" v-model="formVenta.fecha">
            </div>
            <div v-if="!isAsesor" class="col-md-6">
              <label class="small fw-bold text-muted">Asesor Responsable</label>
              <LiveSearchSelect
                v-model="formVenta.asesor_id"
                :options="asesores" displayKey="nombre_completo" subKey="correo" valueKey="id"
                placeholder="Busca por nombre o correo..."
                @search="buscarAsesoresRemoto"
              />
            </div>
          </div>

          <!-- Info de comisión calculada (solo lectura) -->
          <div v-if="asesorObj && montoTotal > 0" class="alert alert-info d-flex align-items-center gap-2 py-2 mb-4">
            <i class="bi bi-percent"></i>
            <small>
              Comisión del asesor <strong>{{ asesorObj.nombre_completo }}</strong>
              ({{ asesorObj.porcentaje_comision }}%):
              <strong>{{ monedaPropiedad }} {{ montoComisionPreview }}</strong>
              — se registrará automáticamente.
            </small>
          </div>

          <h6 class="fw-bold border-bottom pb-2">Modalidad de Pago</h6>
          <div class="d-flex gap-4 mb-4">
            <div class="form-check">
              <input class="form-check-input" type="radio" v-model="formVenta.tipo_venta" value="CONTADO" id="pagoContado">
              <label class="form-check-label fw-bold" for="pagoContado">Al Contado</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" v-model="formVenta.tipo_venta" value="CREDITO" id="pagoCredito">
              <label class="form-check-label fw-bold" for="pagoCredito">Crédito Directo</label>
            </div>
          </div>

          <div v-if="formVenta.tipo_venta === 'CONTADO'" class="row g-3 animate-fade">
            <div class="col-md-4">
              <label class="small fw-bold text-muted">Monto Total</label>
              <input type="text" class="form-control bg-light" :value="monedaPropiedad + ' ' + montoTotal" disabled>
            </div>
            <div class="col-md-4">
              <label class="small fw-bold text-muted">Descuento Especial ({{ monedaPropiedad }})</label>
              <input type="number" step="0.01" class="form-control" v-model="formVenta.descuento" min="0" :max="montoTotal">
            </div>
            <div class="col-md-4">
              <label class="small fw-bold" :class="montoLiquido < 0 ? 'text-danger' : 'text-success'">Monto Final a Pagar</label>
              <!-- Punto 2: color rojo si el descuento genera valor negativo -->
              <input type="text" class="form-control fw-bold"
                :class="montoLiquido < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'"
                :value="monedaPropiedad + ' ' + montoLiquido" disabled>
              <div v-if="montoLiquido < 0" class="text-danger small mt-1">
                <i class="bi bi-exclamation-triangle-fill me-1"></i>El descuento supera el monto total.
              </div>
            </div>
          </div>

          <div v-if="formVenta.tipo_venta === 'CREDITO'" class="animate-fade">
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <label class="small fw-bold text-muted">Valor Total ({{ monedaPropiedad }})</label>
                <input type="text" class="form-control bg-light" :value="monedaPropiedad + ' ' + montoTotal" disabled>
              </div>
              <div class="col-md-3">
                <label class="small fw-bold text-primary">Cuota Inicial ({{ monedaPropiedad }})</label>
                <input type="number" step="0.01" class="form-control border-primary" v-model="formVenta.cuota_inicial" min="0" :max="montoTotal">
              </div>
              <div class="col-md-3">
                <label class="small fw-bold text-danger">Saldo a Financiar</label>
                <input type="text" class="form-control bg-danger bg-opacity-10 text-danger fw-bold" :value="monedaPropiedad + ' ' + saldoCredito" disabled>
              </div>
              <div class="col-md-3">
                <label class="small fw-bold text-muted">Inicio de Pagos</label>
                <input type="date" class="form-control" v-model="formVenta.fecha_inicio_pago">
              </div>
            </div>
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="small fw-bold text-muted">Plazo (Meses)</label>
                <input type="number" class="form-control" v-model="formVenta.numero_cuotas" min="1">
              </div>
              <div class="col-md-6">
                <label class="small fw-bold text-muted">Tasa de Interés Anual (%)</label>
                <input type="number" step="0.01" class="form-control" v-model="formVenta.tasa_interes" min="0">
              </div>
            </div>

            <div v-if="planPagosPreview.length > 0" class="mt-4 border rounded overflow-hidden">
              <div class="bg-dark text-white p-2 text-center fw-bold small">PREVISUALIZACIÓN PLAN DE PAGOS (Ref. Sistema Francés)</div>
              <div style="max-height: 200px; overflow-y: auto;">
                <table class="table table-hover mb-0 text-center" style="font-size: 0.8rem;">
                  <thead>
                    <tr><th>Nro</th><th>Cuota Mensual</th><th>Capital</th><th>Interés</th><th>Saldo Restante</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in planPagosPreview" :key="c.nro">
                      <td>{{ c.nro }}</td>
                      <td class="fw-bold text-primary">{{ monedaPropiedad }} {{ c.cuota }}</td>
                      <td>{{ monedaPropiedad }} {{ c.capital }}</td>
                      <td class="text-danger">{{ monedaPropiedad }} {{ c.interes }}</td>
                      <td>{{ monedaPropiedad }} {{ c.saldo }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <div class="card-footer bg-white p-4 border-top d-flex justify-content-between">
          <button v-if="step > 1" class="btn btn-light px-4 shadow-sm" @click="step--">Atrás</button>
          <div v-else></div>
          <button v-if="step < 3" class="btn btn-primary px-5 shadow" style="background-color: var(--primary-color); border:none;" @click="siguientePaso">
            Siguiente <i class="bi bi-arrow-right ms-2"></i>
          </button>
          <!-- Punto 2: deshabilitar también si descuento supera monto en CONTADO -->
          <button v-if="step === 3" class="btn btn-success px-5 shadow-lg fw-bold" @click="registrarVenta"
            :disabled="guardando
              || (formVenta.tipo_venta === 'CREDITO' && saldoCredito <= 0)
              || (formVenta.tipo_venta === 'CONTADO' && montoLiquido < 0)">
            <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
            {{ guardando ? 'Procesando...' : 'Confirmar Venta' }} <i class="bi bi-check-circle ms-2"></i>
          </button>
        </div>
      </div>
    </div>
  </div>

  <ClienteModal @cliente-creado="alCrearCliente" />
</template>

<style scoped>
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.step-indicator {
  width: 120px; text-align: center; font-size: 0.85rem; font-weight: bold; color: #adb5bd;
  transition: color 0.3s;
}
.step-indicator.active { color: var(--primary-color); }

.step-line {
  height: 4px; width: 60px; background-color: #e9ecef; margin: 8px 10px 0; border-radius: 2px;
  transition: background-color 0.3s;
}
.step-line.active { background-color: var(--primary-color); }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }
</style>
