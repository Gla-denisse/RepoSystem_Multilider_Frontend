# Documentación Frontend: Módulo Zonas

## 📝 Descripción
Gestión de sectores, barrios o urbanizaciones vinculadas a una ciudad específica.

## 🖼️ Interfaz y Secciones
- **Listado Principal**: Muestra la zona y su ciudad correspondiente (anidada).
- **LiveSearch Integration**: Usa el componente `LiveSearchSelect` para elegir la ciudad de forma eficiente.
- **Acceso Rápido a Ciudades**: El formulario de zona incluye un botón "Nueva Ciudad" que abre un modal secundario, permitiendo crear una ciudad y seleccionarla al instante sin abandonar la creación de la zona.
- **Gestión de Estado**: Similar a ciudades, con toggle lógico y badges visuales.

## 🔌 Integración API (Backend)
- `GET /zonas`: Listado con relación `ciudad` cargada. Soporta filtros `search` y `ciudad_id`.
- `POST /zonas`: Registro vinculando `ciudad_id`.
- `PUT /zonas/{id}`: Actualización.
- `DELETE /zonas/{id}`: Toggle de estado operativo.

## ⚙️ Reglas de Negocio
- Al crear una ciudad desde el modal rápido, el frontend captura el ID retornado por el backend y actualiza automáticamente el modelo de la zona en curso.
- Se debe mostrar siempre `zona.ciudad.nombre` y `zona.ciudad.departamento` en los detalles.
