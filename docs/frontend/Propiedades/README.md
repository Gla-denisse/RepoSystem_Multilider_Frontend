# Documentación Frontend: Módulo Propiedades

## 📝 Descripción
Módulo central del sistema para la gestión de inventario inmobiliario (Lotes y Casas), sus características técnicas, ubicación y dueños.

## 🖼️ Interfaz y Secciones
- **Navegación por Estados (Sin Modales)**: La vista alterna dinámicamente entre `list`, `form`, `detail` y `characteristics` dentro del mismo componente.
- **Mapa Interactivo**: Integración con Google Maps API para marcar coordenadas exactas (latitud/longitud) con marcador arrastrable.
- **Lógica Condicional**:
    - Si el tipo es **Lote**: Se ocultan campos de construcción, habitaciones y baños.
    - Si el tipo es **Casa**: Se habilitan campos técnicos adicionales.
- **Asignación de Características**: Interfaz dedicada para buscar y marcar amenidades del catálogo global, organizadas por categoría.
- **Detalle Tipo Expediente**: Vista completa con ficha técnica, datos del dueño, colindancias, mapa y lista de amenidades asignadas.

## 🔌 Integración API (Backend)
- `GET /propiedades`: Listado con relaciones `propietario`, `zona.ciudad`, `ubicacion` y `caracteristicas`.
- `POST /propiedades`: Crea propiedad y vincula con `ubicacion_id`.
- `PUT /propiedades/{id}`: Actualiza datos técnicos.
- `POST /propiedades/{id}/caracteristicas/sync`: Sincroniza los IDs de características seleccionadas.
    - **Payload enviado (JSON):**
      ```json
      {
        "caracteristica_ids": [1, 5, 12, 18]
      }
      ```
    - **Nota:** El array contiene únicamente los IDs de las características que deben quedar vinculadas a la propiedad. El backend debe reemplazar las relaciones anteriores con esta nueva lista.
- `DELETE /propiedades/{id}`: Toggle de visibilidad en el catálogo (activo/inactivo).

## ⚙️ Reglas de Negocio
- La moneda puede ser USD o BOB.
- Un Watcher limpia automáticamente los datos de construcción si se cambia el tipo a 'Lote'.
- El sistema utiliza `LiveSearchSelect` para asegurar que las relaciones con Propietarios y Zonas sean con IDs válidos y mediante búsqueda predictiva.
