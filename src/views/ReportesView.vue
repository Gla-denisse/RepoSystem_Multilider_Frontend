<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReporteVentasCobros        from './reportes/ReporteVentasCobros.vue'
import ReporteCarteraMora          from './reportes/ReporteCarteraMora.vue'
import ReporteComisiones           from './reportes/ReporteComisiones.vue'
import ReporteDesempenoAsesores    from './reportes/ReporteDesempenoAsesores.vue'
import ReporteInventarioPropiedades from './reportes/ReporteInventarioPropiedades.vue'

const route  = useRoute()
const router = useRouter()

const REPORTES = [
  {
    key:   'ventas-cobros',
    label: 'Ventas y Cobros',
    icon:  'bi-graph-up-arrow',
    color: '#22c55e',
    component: ReporteVentasCobros,
    disponible: true,
  },
  {
    key:   'cartera-mora',
    label: 'Cartera y Mora',
    icon:  'bi-exclamation-triangle',
    color: '#ef4444',
    component: ReporteCarteraMora,
    disponible: true,
  },
  {
    key:   'comisiones',
    label: 'Comisiones',
    icon:  'bi-cash-coin',
    color: '#f59e0b',
    component: ReporteComisiones,
    disponible: true,
  },
  {
    key:   'desempeno-asesores',
    label: 'Desempeño Asesores',
    icon:  'bi-person-badge',
    color: '#3b82f6',
    component: ReporteDesempenoAsesores,
    disponible: true,
  },
  {
    key:   'inventario',
    label: 'Inventario Propiedades',
    icon:  'bi-houses',
    color: '#06b6d4',
    component: ReporteInventarioPropiedades,
    disponible: true,
  },
]

const reporteActivo = ref(route.query.r || 'ventas-cobros')

const reporteSeleccionado = computed(() =>
  REPORTES.find(r => r.key === reporteActivo.value) ?? REPORTES[0]
)

const componenteActivo = computed(() => reporteSeleccionado.value.component)

function seleccionar(key) {
  if (!REPORTES.find(r => r.key === key)?.disponible) return
  reporteActivo.value = key
  router.replace({ query: { r: key } })
}

watch(() => route.query.r, (val) => {
  if (val) reporteActivo.value = val
})
</script>

<template>
  <div class="reportes-wrapper d-flex gap-0">

    <!-- Sidebar de navegación -->
    <aside class="reportes-sidebar me-4" style="display:none;">
      <div class="sidebar-title text-uppercase fw-bold small opacity-50 mb-3 px-2">
        <i class="bi bi-file-earmark-bar-graph me-2"></i> Reportes
      </div>

      <ul class="list-unstyled m-0">
        <li v-for="r in REPORTES" :key="r.key" class="mb-1">
          <button
            class="reporte-btn w-100 d-flex align-items-center gap-3 px-3 py-2 rounded-3 border-0 text-start"
            :class="{ active: reporteActivo === r.key, disabled: !r.disponible }"
            @click="seleccionar(r.key)"
          >
            <span class="reporte-icon d-flex align-items-center justify-content-center rounded-2" :style="{ background: r.color + '20', color: r.color }">
              <i :class="'bi ' + r.icon"></i>
            </span>
            <span class="reporte-label flex-grow-1">{{ r.label }}</span>
            <span v-if="!r.disponible" class="badge rounded-pill" style="font-size:0.6rem;background:#e5e7eb;color:#9ca3af;">Próximamente</span>
          </button>
        </li>
      </ul>
    </aside>

    <!-- Área de contenido -->
    <main class="reportes-content flex-grow-1 min-w-0">
      <component :is="componenteActivo" v-if="componenteActivo" />

      <div v-else class="d-flex flex-column align-items-center justify-content-center text-center py-5 text-muted" style="min-height:300px;">
        <i class="bi bi-tools fs-1 mb-3 opacity-25"></i>
        <h5 class="fw-semibold">Reporte en desarrollo</h5>
        <p class="small">Este reporte estará disponible próximamente.</p>
      </div>
    </main>

  </div>
</template>

<style scoped>
.reportes-wrapper {
  align-items: flex-start;
}

.reportes-sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--bg-sidebar, #fff);
  border-radius: 12px;
  padding: 16px 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border: 1px solid var(--border-color, #e5e7eb);
  position: sticky;
  top: 80px;
}

.sidebar-title {
  letter-spacing: .04em;
  color: var(--text-main, #374151);
  font-size: 0.72rem;
}

.reporte-btn {
  background: transparent;
  color: var(--text-main, #374151);
  cursor: pointer;
  transition: background .15s, color .15s;
  font-size: 0.875rem;
  font-weight: 500;
}

.reporte-btn:hover:not(.disabled) {
  background: var(--border-color, #f3f4f6);
}

.reporte-btn.active {
  background: #eff6ff;
  color: #1d4ed8;
}

.reporte-btn.active .reporte-icon {
  box-shadow: 0 0 0 2px #bfdbfe;
}

.reporte-btn.disabled {
  cursor: default;
  opacity: .55;
}

.reporte-icon {
  width: 32px;
  height: 32px;
  font-size: 0.95rem;
  flex-shrink: 0;
  transition: box-shadow .15s;
}

.reporte-label {
  line-height: 1.2;
}

.reportes-content {
  overflow: hidden;
}

@media (max-width: 768px) {
  .reportes-wrapper { flex-direction: column; }
  .reportes-sidebar { width: 100%; min-width: unset; position: static; }
}
</style>
