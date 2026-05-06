# Documentación Frontend: Módulo Usuarios

## 📝 Descripción
Módulo encargado de la gestión de personal del sistema, control de sus credenciales de acceso y asignación de permisos granulares por rol.

## 🖼️ Interfaz y Secciones
- **Listado Principal**: Tabla con avatares automáticos, nombre, correo y estado (Activo/Inactivo).
- **Modal de Gestión**: Formulario para crear o editar usuarios con validaciones de campos obligatorios.
- **Sección de Accesos (Inline)**: Vista alterna que se activa al pulsar "Accesos", ocultando el listado. Permite asignar permisos individuales agrupados por rol, con opción de "Seleccionar Todo" por grupo.

## 🔌 Integración API (Backend)
- `GET /usuarios`: Obtiene el listado de usuarios.
- `POST /usuarios`: Registra un nuevo usuario.
- `PUT /usuarios/{id}`: Actualiza datos de un usuario existente.
- `DELETE /usuarios/{id}`: Realiza una activación/desactivación lógica (Toggle Estado).
- `GET /usuarios/{id}/asignaciones`: Obtiene los IDs de permisos asignados al usuario.
- `POST /usuarios/{id}/asignaciones/sync`: Sincroniza la lista de permisos del usuario.

## ⚙️ Reglas de Negocio
- Los estados se manejan como booleanos o (1/0).
- La vista de accesos utiliza una variable temporal para guardar el nombre del usuario antes de cerrar el panel, asegurando que las notificaciones de SweetAlert2 sean personalizadas.
- Se utiliza `v-if` para alternar entre el listado y la configuración de permisos para evitar distracciones visuales.
