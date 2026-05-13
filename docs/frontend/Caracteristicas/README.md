# Documentación Frontend: Módulo Características

## 📝 Descripción
Catálogo global de amenidades, servicios y atributos que pueden poseer las propiedades.

## 🖼️ Interfaz y Secciones
- **Filtro por Categoría**: Selector rápido para ver solo "Servicios", "Interna" o "Entorno".
- **Iconografía**: Uso de iconos específicos de Bootstrap Icons según el tipo de característica para una identificación visual rápida.
- **Listado y CRUD**: Gestión estándar de nombre y categoría con estados activos/inactivos.

## 🔌 Integración API (Backend)
- `GET /caracteristicas`: Listado con soporte para filtro por `tipo`.
- `POST /caracteristicas`: Registro.
- `PUT /caracteristicas/{id}`: Edición.
- `DELETE /caracteristicas/{id}`: Eliminación lógica.

## ⚙️ Reglas de Negocio
- Los tipos están predefinidos: 'Servicios', 'Interna', 'Entorno'.
- Se utiliza un mapeo de iconos en el frontend para mantener la consistencia visual en todas las vistas donde se listan características.
