// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('auth_user')) || null)
  const router = useRouter()

  // Guardar datos tras un login exitoso
  const setAuth = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
    // Configurar Axios para que envíe el token automáticamente
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  // Cerrar sesión y limpiar
  const logout = async () => {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor")
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      delete api.defaults.headers.common['Authorization']
      router.push({ name: 'login' })
    }
  }

  const isCliente = computed(() => {
    const asignaciones = user.value?.roles_permisos || user.value?.rolesPermisos || []
    return asignaciones.some(item => {
      const rol = item.rol_permiso?.rol || item.rolPermiso?.rol
      return rol?.nombre === 'Cliente'
    })
  })

  const hasPermission = (nombrePermiso) => {
    if (!user.value) return false;
    
    // Extraemos las asignaciones (Laravel envía snake_case o camelCase según la versión)
    const asignaciones = user.value.roles_permisos || user.value.rolesPermisos || [];

    // Verificamos si en alguna de esas asignaciones está el nombre del permiso
    return asignaciones.some(item => {
      const permiso = item.rol_permiso?.permiso || item.rolPermiso?.permiso;
      return permiso?.nombre === nombrePermiso;
    });
  }

  const updateUser = (updatedUser) => {
    user.value = updatedUser
    localStorage.setItem('auth_user', JSON.stringify(updatedUser))
  }

  return { token, user, isCliente, setAuth, logout, hasPermission, updateUser }
})