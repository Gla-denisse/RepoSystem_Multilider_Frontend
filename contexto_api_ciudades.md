# Contexto de API Backend: Módulo "Ciudades"

## 1. Stack Tecnológico del Proyecto
* **Backend:** Laravel (API RESTful)
* **Frontend:** Vue.js (Composition API, `<script setup>`)
* **Estilos de UI:** Bootstrap 5 (Estrictamente prohibido el uso de Tailwind CSS)
* **Peticiones HTTP:** Axios (configurado habitualmente como `api` o `axios`)

## 2. Estructura de Datos (Modelo `Ciudad`)
La tabla `ciudades` en la base de datos tiene la siguiente estructura:

| Campo          | Tipo de Dato | Reglas de Validación (Backend) | Notas                                      |
| -------------- | ------------ | ------------------------------ | ------------------------------------------ |
| `id`           | Integer      | Auto-incremental               | Clave primaria                             |
| `nombre`       | String       | `required\|string\|max:255`    | Nombre de la ciudad (Ej: Montero)          |
| `departamento` | String       | `required\|string\|max:255`    | Nombre del departamento (Ej: Santa Cruz)   |
| `created_at`   | Timestamp    | Automático                     | Fecha de creación                          |
| `updated_at`   | Timestamp    | Automático                     | Fecha de actualización                     |
| `estado`       | Boolean      | `nullable\|boolean`            | Estado para eliminación lógica (1=Activo, 0=Inactivo). Por defecto es true. |

**Relaciones:**
* Una Ciudad tiene muchas Zonas (`hasMany`). El endpoint actual no retorna las zonas anidadas por defecto.

## 3. Endpoints de la API RESTful
Todas las rutas están bajo el prefijo estándar de API de Laravel (ej. `/api/ciudades`).

### A. Listar Ciudades (Con Paginación)
* **Ruta:** `GET /ciudades`
* **Parámetros de consulta (Query Params):** `?page={numero}&per_page={cantidad}` (Ambos opcionales. `per_page` por defecto es 10).
* **Descripción:** Retorna un objeto JSON paginado con las ciudades registradas.
* **Respuesta de Éxito (200):** 
    ```json
    {
      "current_page": 1,
      "data": [
        { "id": 1, "nombre": "Montero", "departamento": "Santa Cruz", "estado": true },
        { "id": 2, "nombre": "Warnes", "departamento": "Santa Cruz", "estado": true }
      ],
      "first_page_url": "...",
      "last_page": 5,
      "per_page": 10,
      "total": 50
    }
    ```

### B. Mostrar una Ciudad
* **Ruta:** `GET /ciudades/{id}`
* **Descripción:** Retorna un objeto JSON con los datos de una ciudad específica.
* **Respuesta de Éxito (200):** 
    ```json
    { "id": 1, "nombre": "Montero", "departamento": "Santa Cruz", "estado": true }
    ```

### C. Crear Ciudad
* **Ruta:** `POST /ciudades`
* **Cuerpo de la Petición (Payload):** 
    ```json
    { "nombre": "String", "departamento": "String", "estado": true }
    ```
* **Respuesta de Éxito (201):** 
    
```json
    { "message": "Ciudad creada exitosamente", "data": { ... } }
    ```
* **Respuesta de Error (422):** Errores de validación de Laravel.

### D. Actualizar Ciudad
* **Ruta:** `PUT /ciudades/{id}`
* **Cuerpo de la Petición (Payload):** 
    ```json
    { "nombre": "String", "departamento": "String" }
    
```
* **Respuesta de Éxito (200):** 
    ```json
    { "message": "Ciudad actualizada", "data": { ... } }
    ```

### E. Eliminar Ciudad
* **Ruta:** `DELETE /ciudades/{id}`
* **Respuesta de Éxito (200):** 
    ```json
    { "message": "Ciudad eliminada correctamente" }
    ```

## 4. Instrucciones para la IA (Generación de Código Frontend)
Al generar componentes de Vue.js para este módulo, por favor obedece las siguientes reglas:
1. Utiliza `<script setup>` de Vue 3.
2. Utiliza referencias reactivas (`ref`) para el estado del formulario, la lista de datos y la gestión de paginación (ej. `currentPage`, `totalPages`).
3. Al leer el listado del endpoint `GET /ciudades`, recuerda extraer el arreglo de la propiedad `respuesta.data.data` debido a la paginación.
4. El diseño visual y los modales deben estar construidos exclusivamente con clases y componentes nativos de **Bootstrap 5**.
5. Incluye manejo básico de errores para las peticiones HTTP (ej. bloques `try/catch` y alertas o mensajes en la UI).
6. **Manejo del Estado:** El campo `estado` (booleano) debe representarse visualmente en la tabla mediante un Badge (ej. "Activo" en verde, "Inactivo" en gris/rojo). En los formularios (si aplica), debe manejarse con un switch o toggle de Bootstrap (`form-check form-switch`).