// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/axios'
import apiSecurity from '../api/axiosSecurity'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('auth_user')) || null)
  const router = useRouter()

  const setAuth = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    apiSecurity.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  // JWT es stateless: solo limpiamos localStorage, sin llamada al servidor
  const logout = async () => {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    delete api.defaults.headers.common['Authorization']
    delete apiSecurity.defaults.headers.common['Authorization']
    router.push({ name: 'login' })
  }

  // El microservicio .NET devuelve rolesPermisos[].nombreRol
  const isCliente = computed(() => {
    const asignaciones = user.value?.rolesPermisos || []
    return asignaciones.some(item => item.nombreRol === 'Cliente')
  })

  // El microservicio .NET devuelve rolesPermisos[].nombrePermiso
  const hasPermission = (nombrePermiso) => {
    if (!user.value) return false
    const asignaciones = user.value.rolesPermisos || []
    return asignaciones.some(item => item.nombrePermiso === nombrePermiso)
  }

  const updateUser = (updatedUser) => {
    user.value = updatedUser
    localStorage.setItem('auth_user', JSON.stringify(updatedUser))
  }

  return { token, user, isCliente, setAuth, logout, hasPermission, updateUser }
})