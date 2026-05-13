# Contexto de Diseño y UI: Sistema de Gestión

## 1. Stack de Estilos y Restricciones
* **Framework Principal:** Bootstrap 5.
* **Iconografía:** Bootstrap Icons (clases `bi bi-*`).
* **Regla Estricta:** Queda **ESTRICTAMENTE PROHIBIDO** generar código utilizando Tailwind CSS o cualquier otro framework de utilidades. Todo el diseño debe basarse en clases nativas de Bootstrap 5 y CSS puro mediante `<style scoped>` en Vue.

## 2. Paleta de Colores y Variables CSS
El sistema utiliza un tema claro por defecto con las siguientes variables CSS globales que deben ser respetadas o utilizadas en los componentes:
* `--primary-color`: Color principal de la marca (usado en botones principales y acentos).
* `--bg-card`: Color de fondo de las tarjetas (generalmente blanco o un gris muy claro).
* `--text-main`: Color principal para títulos y textos de alto contraste.

*Nota: Para aplicar estos colores en el HTML, a veces usamos clases utilitarias de Bootstrap como `text-primary`, `bg-light`, o aplicamos estilos directos llamando a las variables (ej. `style="color: var(--primary-color);"`).*

## 3. Patrones de Diseño (Componentes UI)

Para mantener la estética moderna, limpia y profesional del panel de administración, se deben seguir estos patrones estructurales:

### A. Contenedores y Tarjetas (Cards)
* Los contenedores principales usan `container-fluid py-4`.
* Las tarjetas no deben tener bordes ásperos y deben tener una sombra suave y bordes redondeados.
* **Patrón estándar:** `<div class="card border-0 shadow-sm card-custom">` (donde `.card-custom` se define en el `<style scoped>` con un `border-radius: 12px;` y `background-color: var(--bg-card);`).

### B. Encabezados de Pantalla
* Título principal: `<h2 class="h4 fw-bold text-primary mb-0">`.
* Subtítulo explicativo: `<p class="text-muted small mb-0">`.
* El botón de acción principal (Ej: "Nuevo") se alinea a la derecha usando `d-flex justify-content-between align-items-center`.

### C. Tablas de Datos
* Deben ser responsivas: `<div class="table-responsive">`.
* Estilo de la tabla: `<table class="table table-hover align-middle mb-0">`.
* Encabezado de tabla (Thead): Fondo claro (`bg-light`), fuente pequeña, color atenuado y mayúsculas (`text-muted small text-uppercase`).

### D. Formularios y Modales
* **Modales:** Se centran en pantalla (`modal-dialog-centered`). No tienen bordes (`border-0`) y usan sombras (`shadow`).
* **Inputs/Selects:** Deben perder el borde fuerte de enfoque usando la clase `shadow-none`. Para fondos de input usamos `bg-light border-0` o el estilo clásico según el contexto.
* **Etiquetas (Labels):** Fuente pequeña, en negrita y atenuada (`form-label small fw-bold text-muted mb-1`).

### E. Botones y Badges
* Botones principales: `<button class="btn btn-primary shadow-sm">`.
* Botones secundarios/acciones de tabla: Botones pequeños, bordeados o ligeros (`btn-sm btn-light border` o `btn-outline-primary`).
* Estados (Disponible, Activo, etc.): Uso de `<span class="badge">` con variaciones de opacidad (Ej: `bg-success bg-opacity-10 text-success border`).

## 4. Instrucciones para la IA (Generación de Templates)
1. Al generar el bloque `<template>` en Vue, asume que Bootstrap 5 está disponible globalmente.
2. Construye jerarquías visuales claras usando espaciados (`mb-3`, `p-4`, `g-2` para grids).
3. No uses estilos en línea (`style="..."`) a menos que sea estrictamente necesario para invocar una variable CSS global; prefiere siempre las clases de Bootstrap.
4. Asegúrate de incluir los bloques `<style scoped>` necesarios al final del componente para definir utilidades específicas como `.card-custom`, `.smaller { font-size: 0.75rem; }` o animaciones menores.