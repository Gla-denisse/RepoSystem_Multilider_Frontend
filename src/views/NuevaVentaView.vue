<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import Swal from 'sweetalert2'
import LiveSearchSelect from '../components/LiveSearchSelect.vue'
import ClienteModal from '../components/ClienteModal.vue'

const router = useRouter()
const step = ref(1) // Paso actual (1: Cliente, 2: Propiedad, 3: Contrato)
const guardando = ref(false)

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
  monto_comision: 0,
  
  // Contado
  descuento: 0,
  
  // Crédito
  cuota_inicial: 0,
  numero_cuotas: 12,
  tasa_interes: 10, // 10% anual
  fecha_inicio_pago: ''
})

// Objetos completos seleccionados para mostrar Info Cards
const clienteObj = computed(() => clientes.value.find(c => c.id === clienteSeleccionadoId.value))
const propiedadObj = computed(() => propiedades.value.find(p => p.id === propiedadSeleccionadaId.value))

// ==========================================
// 1. CARGA INICIAL
// ==========================================
onMounted(async () => {
  try {
    // Para simplificar, cargamos catálogos (En prod usar paginación/búsqueda remota)
    const [resCli, resProp, resAse] = await Promise.all([
      api.get('/clientes?per_page=1000'),
      api.get('/propiedades?per_page=1000'),
      api.get('/asesores?per_page=100')
    ])
    clientes.value = resCli.data.data.filter(c => c.estado == 1)
    
    // 🌟 SOLO PROPIEDADES DISPONIBLES
    propiedades.value = resProp.data.data.filter(p => p.estado === 'Disponible' && p.activo)
    
    asesores.value = resAse.data.data
    // Autoseleccionar un asesor por defecto si existe
    if(asesores.value.length > 0) formVenta.value.asesor_id = asesores.value[0].id

  } catch (error) {
    Swal.fire('Error', 'No se pudieron cargar los catálogos.', 'error')
  }
})

// ==========================================
// 2. LÓGICA FINANCIERA (AMORTIZACIÓN EN VIVO)
// ==========================================

// Cálculos automáticos para variables dependientes
const montoTotal = computed(() => propiedadObj.value ? parseFloat(propiedadObj.value.precio_venta) : 0)
const montoLiquido = computed(() => montoTotal.value - formVenta.value.descuento)
const saldoCredito = computed(() => montoTotal.value - formVenta.value.cuota_inicial)

// Generar tabla de previsualización (Sistema Francés)
const planPagosPreview = computed(() => {
  if (formVenta.value.tipo_venta !== 'CREDITO' || saldoCredito.value <= 0 || formVenta.value.numero_cuotas < 1) return []

  const meses = parseInt(formVenta.value.numero_cuotas)
  const tasaAnual = parseFloat(formVenta.value.tasa_interes)
  const P = saldoCredito.value
  const i = (tasaAnual / 100) / 12 // Tasa mensual

  let cuotaFija = i > 0 ? P * (i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1) : P / meses
  
  let saldo = P
  let cuotas = []

  for (let mes = 1; mes <= meses; mes++) {
    let interes = saldo * i
    let capital = cuotaFija - interes
    
    if (mes === meses) { // Ajuste última cuota
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
// 3. ACCIONES Y VALIDACIONES
// ==========================================
const alCrearCliente = (nuevoCliente) => {
  clientes.value.push(nuevoCliente)
  clienteSeleccionadoId.value = nuevoCliente.id // Autoseleccionamos
}

const siguientePaso = () => {
  if (step.value === 1 && !clienteSeleccionadoId.value) return Swal.fire('Atención', 'Debe seleccionar un cliente.', 'warning')
  if (step.value === 2 && !propiedadSeleccionadaId.value) return Swal.fire('Atención', 'Debe seleccionar una propiedad.', 'warning')
  
  if (step.value === 2) {
    // Autollenar la fecha de inicio de pago (1 mes después de hoy por defecto)
    let fechaPago = new Date();
    fechaPago.setMonth(fechaPago.getMonth() + 1);
    formVenta.value.fecha_inicio_pago = fechaPago.toISOString().substr(0, 10);
  }
  step.value++
}

const registrarVenta = async () => {
  guardando.value = true
  
  const payload = {
    asesor_id: formVenta.value.asesor_id,
    cliente_id: clienteSeleccionadoId.value,
    propiedad_id: propiedadSeleccionadaId.value,
    fecha: formVenta.value.fecha,
    monto_total: montoTotal.value,
    monto_comision: formVenta.value.monto_comision,
    tipo_venta: formVenta.value.tipo_venta,
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

// Función para limpiar todo y volver al inicio
const resetAsistente = () => {
  step.value = 1
  clienteSeleccionadoId.value = null
  propiedadSeleccionadaId.value = null
  
  // Reiniciamos el formulario a sus valores por defecto
  formVenta.value = {
    asesor_id: asesores.value.length > 0 ? asesores.value[0].id : '',
    fecha: new Date().toISOString().substr(0, 10),
    tipo_venta: 'CONTADO',
    monto_comision: 0,
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
        
        <div v-show="step === 1" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-person-check me-2"></i>Selección del Comprador</h5>
          
          <div class="d-flex gap-3 mb-4">
            <div class="flex-grow-1">
              <label class="form-label small fw-bold text-muted">Buscar Cliente Registrado</label>
              <LiveSearchSelect 
                v-model="clienteSeleccionadoId"
                :options="clientes" displayKey="nombre_completo" subKey="ci" valueKey="id"
                placeholder="Busca por Nombre o CI..."
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

        <div v-show="step === 2" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-house-door me-2"></i>Propiedad a Vender</h5>
          
          <div class="mb-4">
            <label class="form-label small fw-bold text-muted">Seleccionar Propiedad Disponible</label>
            <LiveSearchSelect 
              v-model="propiedadSeleccionadaId"
              :options="propiedades" displayKey="codigo" subKey="tipo" valueKey="id"
              placeholder="Busca por Código de Propiedad..."
            />
          </div>

          <div v-if="propiedadObj" class="alert bg-light border p-4 rounded-3">
            <div class="row">
              <div class="col-md-6 border-end">
                <h3 class="fw-bold text-success mb-0">Bs. {{ propiedadObj.precio_venta }}</h3>
                <div class="text-muted small mb-3">Valor Oficial de Venta</div>
                <div class="fw-bold">{{ propiedadObj.tipo }} - {{ propiedadObj.codigo }}</div>
                <div class="small text-muted">Superficie: {{ propiedadObj.superficie_m2 }} m²</div>
              </div>
              <div class="col-md-6 ps-4">
                <div class="small fw-bold text-muted mb-1">Ubicación</div>
                <div>Lote: {{ propiedadObj.nro_lote || '-' }}</div>
                <div class="small mt-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i> {{ propiedadObj.direccion || 'Sin dirección específica' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="step === 3" class="p-5 animate-fade">
          <h5 class="fw-bold mb-4 text-primary"><i class="bi bi-file-earmark-text me-2"></i>Términos Comerciales</h5>
          
          <div class="row bg-light border rounded p-3 mb-4 g-3">
            <div class="col-md-6">
              <label class="small fw-bold text-muted">Fecha del Contrato</label>
              <input type="date" class="form-control border-0" v-model="formVenta.fecha">
            </div>
            <div class="col-md-6">
              <label class="small fw-bold text-muted">Asesor Responsable</label>
              <select class="form-select border-0" v-model="formVenta.asesor_id">
                <option v-for="a in asesores" :key="a.id" :value="a.id">{{ a.nombre_completo }}</option>
              </select>
            </div>
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
              <input type="text" class="form-control bg-light" :value="'Bs. ' + montoTotal" disabled>
            </div>
            <div class="col-md-4">
              <label class="small fw-bold text-muted">Descuento Especial (Bs)</label>
              <input type="number" step="0.01" class="form-control" v-model="formVenta.descuento">
            </div>
            <div class="col-md-4">
              <label class="small fw-bold text-success">Monto Final a Pagar</label>
              <input type="text" class="form-control bg-success bg-opacity-10 text-success fw-bold" :value="'Bs. ' + montoLiquido" disabled>
            </div>
          </div>

          <div v-if="formVenta.tipo_venta === 'CREDITO'" class="animate-fade">
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <label class="small fw-bold text-muted">Valor Total (Bs)</label>
                <input type="text" class="form-control bg-light" :value="montoTotal" disabled>
              </div>
              <div class="col-md-3">
                <label class="small fw-bold text-primary">Cuota Inicial (Bs)</label>
                <input type="number" step="0.01" class="form-control border-primary" v-model="formVenta.cuota_inicial">
              </div>
              <div class="col-md-3">
                <label class="small fw-bold text-danger">Saldo a Financiar</label>
                <input type="text" class="form-control bg-danger bg-opacity-10 text-danger fw-bold" :value="saldoCredito" disabled>
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
                <table class="table table-sm table-hover mb-0 text-center" style="font-size: 0.8rem;">
                  <thead class="table-light sticky-top">
                    <tr><th>Nro</th><th>Cuota Mensual</th><th>Capital</th><th>Interés</th><th>Saldo Restante</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in planPagosPreview" :key="c.nro">
                      <td>{{ c.nro }}</td>
                      <td class="fw-bold text-primary">Bs. {{ c.cuota }}</td>
                      <td>Bs. {{ c.capital }}</td>
                      <td class="text-danger">Bs. {{ c.interes }}</td>
                      <td>Bs. {{ c.saldo }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <div class="card-footer bg-white p-4 border-top d-flex justify-content-between">
          <button v-if="step > 1" class="btn btn-light px-4 shadow-sm" @click="step--">Atrás</button>
          <div v-else></div> <button v-if="step < 3" class="btn btn-primary px-5 shadow" style="background-color: var(--primary-color); border:none;" @click="siguientePaso">Siguiente <i class="bi bi-arrow-right ms-2"></i></button>
          <button v-if="step === 3" class="btn btn-success px-5 shadow-lg fw-bold" @click="registrarVenta" :disabled="guardando || (formVenta.tipo_venta === 'CREDITO' && saldoCredito <= 0)">
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
/* Animaciones y Estilos del Stepper */
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

/* Scrollbar para la tabla de amortización */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }

[data-theme="dark"] .bg-light { background-color: #2a2a2a !important; border-color: #444 !important; }
[data-theme="dark"] .form-control, [data-theme="dark"] .form-select { background-color: #333; border-color: #444; color: white; }
[data-theme="dark"] .table-light { background-color: #333 !important; color: white; }
</style>