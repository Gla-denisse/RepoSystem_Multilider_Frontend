# Contexto de API Backend: Módulo "Zonas"

## 1. Stack Tecnológico del Proyecto
* **Backend:** Laravel (API RESTful)
* **Frontend:** Vue.js (Composition API, `<script setup>`)
* **Estilos de UI:** Bootstrap 5 (Estrictamente prohibido el uso de Tailwind CSS)
* **Peticiones HTTP:** Axios (configurado habitualmente como `api` o `axios`)

## 2. Estructura de Datos (Modelo `Zona`)
La tabla `zonas` en la base de datos almacena las urbanizaciones o barrios, los cuales pertenecen obligatoriamente a una ciudad.

| Campo        | Tipo de Dato | Reglas de Validación (Backend)    | Notas                                      |
| ------------ | ------------ | --------------------------------- | ------------------------------------------ |
| `id`         | Integer      | Auto-incremental                  | Clave primaria                             |
| `ciudad_id`  | Integer      | `required\|exists:ciudades,id`    | Clave foránea. Elimina en cascada (Cascade)|
| `nombre`     | String       | `required\|string\|max:255`       | Nombre de la zona (Ej: Satélite Norte)     |
| `created_at` | Timestamp    | Automático                        | Fecha de creación                          |
| `updated_at` | Timestamp    | Automático                        | Fecha de actualización                     |
| `estado`     | Boolean      | `nullable\|boolean`               | Estado para eliminación lógica (1=Activo, 0=Inactivo). Por defecto es true. |

**Relaciones de Eloquent:**
* `ciudad()`: Relación `belongsTo` con el modelo `Ciudad`. El backend siempre retorna este objeto anidado en las consultas principales.
* `propiedades()`: Relación `hasMany` con `Propiedad` (Uso futuro).

## 3. Endpoints de la API RESTful
Todas las rutas están bajo el prefijo estándar de API de Laravel (ej. `/api/zonas`).

### A. Listar Zonas (Con Paginación, Búsqueda y Filtros)
* **Ruta:** `GET /zonas`
* **Parámetros de consulta (Query Params):**
  * `?page={numero}` (Opcional: Número de página).
  * `?per_page={cantidad}` (Opcional: Cantidad de registros, por defecto 10).
  * `?search={texto}` (Opcional: Busca coincidencias en el nombre de la zona o de la ciudad).
  * `?ciudad_id={id}` (Opcional: Filtra las zonas que pertenecen únicamente a una ciudad específica).
* **Descripción:** Retorna un objeto JSON paginado. Las zonas incluyen el objeto `ciudad` anidado.
* **Respuesta de Éxito (200):** 
    ```json
    {
      "current_page": 1,
      "data": [
        { 
          "id": 1, 
          "ciudad_id": 5, 
          "estado": true,
          "nombre": "Satélite Norte",
          "ciudad": {
            "id": 5,
            "nombre": "Warnes",
            "departamento": "Santa Cruz"
          }
        }
      ],
      "first_page_url": "...",
      "last_page": 3,
      "per_page": 10,
      "total": 30
    }
    ```

### B. Mostrar una Zona específica
* **Ruta:** `GET /zonas/{id}`
* **Descripción:** Retorna una zona específica con su relación `ciudad` cargada.
* **Respuesta de Éxito (200):** 
    ```json
    { "id": 1, "ciudad_id": 5, "nombre": "Satélite Norte", "estado": true, "ciudad": { ... } }
    ```

### C. Crear Zona
* **Ruta:** `POST /zonas`
* **Cuerpo de la Petición (Payload):** 
    ```json
    { "ciudad_id": 5, "nombre": "String" }
    ```
* **Respuesta de Éxito (201):** 
    ```json
    { "message": "Zona registrada exitosamente", "data": { "id": 1, "ciudad_id": 5, "nombre": "...", "ciudad": { ... } } }
    ```
* **Respuesta de Error (422):** Errores de validación de Laravel (ej. si `ciudad_id` no existe).

### D. Actualizar Zona
* **Ruta:** `PUT /zonas/{id}`
* **Cuerpo de la Petición (Payload):** 
    ```json
    { "ciudad_id": 5, "nombre": "String", "estado": true }
    ```
* **Respuesta de Éxito (200):** 
    ```json
    { "message": "Zona actualizada", "data": { ... } }
    ```

### E. Eliminar Zona
* **Ruta:** `DELETE /zonas/{id}`
* **Respuesta de Éxito (200):** 
    ```json
    { "message": "Zona eliminada correctamente" }
    ```

## 4. Instrucciones para la IA (Generación de Código Frontend)
Al generar componentes de Vue.js para este módulo, por favor obedece las siguientes reglas:
1. Utiliza `<script setup>` de Vue 3 y referencias reactivas (`ref`).
2. **Formularios:** Como las Zonas dependen de las Ciudades, el formulario de registro/edición debe incluir un `<select>` que liste las ciudades disponibles cargadas desde el endpoint `GET /ciudades`. Su modelo (v-model) debe estar atado a `ciudad_id`.
3. **Paginación:** Al leer el listado del endpoint `GET /zonas`, extrae el arreglo de la propiedad `respuesta.data.data`. Provee la UI para cambiar de página.
4. **Buscador:** Provee un input de texto para buscar zonas y ejecutar la petición con el parámetro `search`.
5. El diseño visual y los modales deben estar construidos exclusivamente con clases y componentes nativos de **Bootstrap 5**.
6. En la tabla de visualización, muestra el nombre de la ciudad correspondiente accediendo al objeto anidado (ej. `zona.ciudad.nombre`).
7. **Manejo del Estado:** El campo `estado` (booleano) indica si la zona está activa. Debe mostrarse en la tabla de datos usando un `<span class="badge">` nativo de Bootstrap. Incluye también un botón de acción en la tabla para "Activar/Desactivar" (toggle de estado) llamando al endpoint correspondiente o cambiando su valor visual si se edita.