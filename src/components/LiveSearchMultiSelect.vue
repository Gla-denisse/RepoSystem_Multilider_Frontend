<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue:  { type: Array,  default: () => [] },
  options:     { type: Array,  required: true },
  placeholder: { type: String, default: 'Buscar...' },
  displayKey:  { type: String, default: 'nombre' },
  subKey:      { type: String, default: '' },
  valueKey:    { type: String, default: 'id' },
  hasError:    { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const isOpen      = ref(false)
const wrapperRef  = ref(null)

const selectedItems = computed(() =>
  props.options.filter(opt => props.modelValue.includes(opt[props.valueKey]))
)

const filteredOptions = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return props.options
  return props.options.filter(opt => {
    const main = String(opt[props.displayKey] || '').toLowerCase()
    const sub  = props.subKey ? String(opt[props.subKey] || '').toLowerCase() : ''
    return main.includes(q) || sub.includes(q)
  })
})

const isSelected = (opt) => props.modelValue.includes(opt[props.valueKey])

const toggle = (opt) => {
  const val     = opt[props.valueKey]
  const current = [...props.modelValue]
  const idx     = current.indexOf(val)
  if (idx === -1) current.push(val)
  else current.splice(idx, 1)
  emit('update:modelValue', current)
}

const remove = (val) => {
  emit('update:modelValue', props.modelValue.filter(v => v !== val))
}

const handleClickOutside = (e) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

onMounted(()  => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="position-relative" ref="wrapperRef">

    <!-- Tags de seleccionados -->
    <div
      v-if="selectedItems.length"
      class="d-flex flex-wrap gap-1 mb-2"
    >
      <span
        v-for="item in selectedItems"
        :key="item[valueKey]"
        class="badge d-inline-flex align-items-center gap-1 fw-normal px-2 py-1"
        style="background: var(--primary-color, #1e40af); font-size: .78rem;"
      >
        {{ item[displayKey] }}
        <button
          type="button"
          class="btn-close btn-close-white ms-1"
          style="width:.55rem; height:.55rem; font-size:.55rem;"
          @click.stop="remove(item[valueKey])"
        ></button>
      </span>
    </div>

    <!-- Input de búsqueda / apertura del dropdown -->
    <div class="input-group" @click="isOpen = true">
      <span
        class="input-group-text bg-white border-end-0"
        :class="{ 'border-danger text-danger': hasError }"
      >
        <i class="bi bi-search" :class="isOpen ? 'text-primary' : 'text-muted'"></i>
      </span>
      <input
        type="text"
        class="form-control border-start-0 shadow-none px-0"
        :class="{ 'border-danger': hasError }"
        v-model="searchQuery"
        :placeholder="selectedItems.length ? 'Agregar otro...' : placeholder"
      >
      <span class="input-group-text bg-white border-start-0" :class="{ 'border-danger': hasError }">
        <i class="bi bi-chevron-down text-muted" style="font-size:.8rem"></i>
      </span>
    </div>

    <!-- Dropdown -->
    <transition name="fade-down">
      <ul
        v-if="isOpen"
        class="dropdown-menu show w-100 p-1 shadow-lg border-0 position-absolute"
        style="max-height:260px; overflow-y:auto; z-index:1050; top:100%; margin-top:4px;"
      >
        <li v-if="filteredOptions.length === 0" class="p-3 text-center text-muted small">
          No se encontraron resultados.
        </li>
        <li
          v-for="opt in filteredOptions"
          :key="opt[valueKey]"
          @click.stop="toggle(opt)"
        >
          <a
            class="dropdown-item rounded px-3 py-2 d-flex align-items-center gap-2 custom-item"
            :class="{ 'active-item': isSelected(opt) }"
            href="#"
            @click.prevent
          >
            <i
              class="bi flex-shrink-0"
              :class="isSelected(opt) ? 'bi-check-square-fill text-white' : 'bi-square text-muted'"
            ></i>
            <span class="d-flex flex-column min-w-0">
              <span class="fw-medium text-truncate">{{ opt[displayKey] }}</span>
              <span v-if="subKey && opt[subKey]" class="text-muted" style="font-size:.73rem;">
                {{ opt[subKey] }}
              </span>
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

.custom-item { transition: all .15s ease; white-space: normal; }
.custom-item:hover { background-color: rgba(162,139,250,.1); color: var(--primary-color); }
.active-item { background-color: var(--primary-color, #1e40af) !important; color: #fff !important; }
.active-item .text-muted { color: rgba(255,255,255,.75) !important; }

.fade-down-enter-active, .fade-down-leave-active { transition: opacity .2s, transform .2s; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-8px); }

.dropdown-menu::-webkit-scrollbar { width: 6px; }
.dropdown-menu::-webkit-scrollbar-track { background: transparent; }
.dropdown-menu::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }
</style>
