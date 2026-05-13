# Documentación Frontend: Módulo Ciudades

## 📝 Descripción
Módulo para la administración de las ciudades donde opera la empresa. Es la base de la jerarquía geográfica del sistema.

## 🖼️ Interfaz y Secciones
- **Encabezado Dinámico**: Título a la izquierda, acciones (búsqueda y nuevo) a la derecha, siguiendo el diseño de Propiedades.
- **Buscador con Debounce**: Filtra por nombre o departamento con un retraso de 500ms para optimizar el servidor.
- **Listado Paginado**: Tabla que muestra ID, Nombre, Departamento y Estado.
- **Modal CRUD**: Ventana para crear/editar con Switch de estado para activación/desactivación.
- **Modal Detalles**: Vista rápida de la información de la ciudad.

## 🔌 Integración API (Backend)
- `GET /ciudades`: Listado paginado con soporte para parámetros `search` y `per_page`.
- `POST /ciudades`: Creación de registro.
- `PUT /ciudades/{id}`: Actualización de datos.
- `DELETE /ciudades/{id}`: Cambio de estado lógico (Toggle Activo/Inactivo).

## ⚙️ Reglas de Negocio
- La eliminación es siempre lógica, disparando una confirmación de SweetAlert2 con colores dinámicos según la acción (rojo para desactivar, azul/verde para activar).
- Sincronización visual inmediata del estado mediante Badges en la tabla.
