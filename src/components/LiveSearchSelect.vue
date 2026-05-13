<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null }, // El ID seleccionado (v-model)
  options: { type: Array, required: true },              // Lista de datos
  placeholder: { type: String, default: 'Buscar...' },
  displayKey: { type: String, default: 'nombre' },       // Campo principal a mostrar (Ej. nombre_completo)
  subKey: { type: String, default: '' },                 // Campo secundario a buscar/mostrar (Ej. ci)
  valueKey: { type: String, default: 'id' },             // Valor a emitir (Ej. id)
  hasError: { type: Boolean, default: false }            // Para pintar el borde rojo si hay error
})

const emit = defineEmits(['update:modelValue', 'search'])

const searchQuery = ref('')
const isOpen = ref(false)
const wrapperRef = ref(null)

// Sincronizar el texto del input con el valor seleccionado
const syncSearchText = () => {
  if (props.modelValue) {
    const selected = props.options.find(opt => opt[props.valueKey] === props.modelValue)
    searchQuery.value = selected ? selected[props.displayKey] : ''
  } else {
    searchQuery.value = ''
  }
}

// Escuchar cambios externos en las opciones o el v-model
watch(() => props.modelValue, syncSearchText)
watch(() => props.options, syncSearchText)

// Filtro en vivo
const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const lowerQuery = searchQuery.value.toLowerCase()
  return props.options.filter(opt => {
    const mainText = String(opt[props.displayKey] || '').toLowerCase()
    const subText = props.subKey ? String(opt[props.subKey] || '').toLowerCase() : ''
    return mainText.includes(lowerQuery) || subText.includes(lowerQuery)
  })
})

const selectOption = (opt) => {
  emit('update:modelValue', opt[props.valueKey])
  searchQuery.value = opt[props.displayKey]
  isOpen.value = false
}

const onInput = () => {
  isOpen.value = true
  emit('update:modelValue', null)
  emit('search', searchQuery.value)
}

// Cerrar el dropdown si se hace clic fuera del componente
const handleClickOutside = (e) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    isOpen.value = false
    syncSearchText() // Restaura el texto si no seleccionó nada nuevo
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="position-relative" ref="wrapperRef">
    
    <div class="input-group">
      <span class="input-group-text bg-white border-end-0" :class="{ 'border-danger text-danger': hasError }">
        <i class="bi bi-search" :class="isOpen ? 'text-primary' : 'text-muted'"></i>
      </span>
      <input 
        type="text" 
        class="form-control border-start-0 shadow-none px-0" 
        :class="{ 'border-danger': hasError }"
        v-model="searchQuery" 
        @input="onInput"
        @focus="isOpen = true"
        :placeholder="placeholder"
      >
      <span v-if="searchQuery" @click="emit('update:modelValue', null); searchQuery = ''; isOpen = true" 
            class="input-group-text bg-white border-start-0 cursor-pointer" :class="{ 'border-danger': hasError }">
        <i class="bi bi-x text-muted hover-danger"></i>
      </span>
      <span v-else class="input-group-text bg-white border-start-0" :class="{ 'border-danger': hasError }">
        <i class="bi bi-chevron-down text-muted" style="font-size: 0.8rem;"></i>
      </span>
    </div>

    <transition name="fade-down">
      <ul v-if="isOpen" class="dropdown-menu show w-100 p-1 shadow-lg border-0 position-absolute" style="max-height: 250px; overflow-y: auto; z-index: 1050; top: 100%; margin-top: 4px;">
        
        <li v-if="filteredOptions.length === 0" class="p-3 text-center text-muted small">
          No se encontraron resultados.
        </li>
        
        <li v-for="opt in filteredOptions" :key="opt[valueKey]" @click="selectOption(opt)">
          <a class="dropdown-item rounded px-3 py-2 d-flex flex-column custom-item" :class="{ 'active-item': modelValue === opt[valueKey] }" href="#">
            <span class="fw-medium text-truncate">{{ opt[displayKey] }}</span>
            <span v-if="subKey && opt[subKey]" class="small text-muted" style="font-size: 0.75rem;">
              <i class="bi bi-person-vcard me-1"></i>{{ opt[subKey] }}
            </span>
          </a>
        </li>
        
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.form-control:focus {
  background-color: transparent !important;
  border-color: #dee2e6 !important;
  box-shadow: none !important;
}
.cursor-pointer { cursor: pointer; }
.hover-danger:hover { color: #dc3545 !important; }

/* Estilos del Dropdown */
.custom-item { transition: all 0.15s ease; white-space: normal; }
.custom-item:hover { background-color: rgba(162, 139, 250, 0.1); color: var(--primary-color); }
.active-item { background-color: var(--primary-color) !important; color: white !important; }
.active-item .text-muted { color: rgba(255, 255, 255, 0.8) !important; }

/* Transición suave */
.fade-down-enter-active, .fade-down-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-10px); }

/* Scrollbar personalizado */
.dropdown-menu::-webkit-scrollbar { width: 6px; }
.dropdown-menu::-webkit-scrollbar-track { background: transparent; }
.dropdown-menu::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }

/* Modo Oscuro */
[data-theme="dark"] .input-group-text, [data-theme="dark"] .form-control { background-color: #2a2a2a !important; border-color: #444 !important; color: white; }
[data-theme="dark"] .dropdown-menu { background-color: #2a2a2a; border: 1px solid #444 !important; }
[data-theme="dark"] .dropdown-item { color: #eee; }
[data-theme="dark"] .dropdown-item:hover { background-color: #333; }
</style>