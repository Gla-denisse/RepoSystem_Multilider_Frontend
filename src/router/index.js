import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true } // El Dashboard es general, no requiere un permiso específico
    },
    {
      path: '/usuarios',
      name: 'Usuarios',
      component: () => import('../views/UsuariosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_usuarios' } // <-- Actualizado
    },
    {
      path: '/roles',
      name: 'Roles',
      component: () => import('../views/RolesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_roles' } // <-- Actualizado
    },
    {
      path: '/permisos',
      name: 'Permisos',
      component: () => import('../views/PermisosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_permisos' } // <-- Actualizado
    },
    {
      path: '/propietarios',
      name: 'Propietarios',
      component: () => import('../views/PropietariosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_propietarios' } // <-- Actualizado
    },
    {
      path: '/manzanos',
      name: 'Manzanos',
      component: () => import('../views/ManzanosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_manzanos' } // <-- Actualizado
    },
    {
      path: '/propiedades',
      name: 'Propiedades',
      component: () => import('../views/PropiedadesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_propiedades' } // <-- Actualizado
    },
  ]
})

// GUARDIA DE NAVEGACIÓN (El "Cadenero" de tu app)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = !!authStore.token

  // 1. Si requiere autenticación y NO está logueado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' })
  } 
  
  // 2. Si es una ruta para "invitados" (como el login) y YA está logueado
  if (to.meta.requiresGuest && isAuthenticated) {
    return next({ name: 'Dashboard' })
  } 

  // 3. SEGURIDAD DE PERMISOS: Verificamos si la ruta exige un permiso específico
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    alert("Acceso denegado: No tienes los permisos necesarios para ver este módulo.");
    // Lo regresamos a la página de donde venía o al Dashboard
    return next({ name: 'Dashboard' }) 
  }

  // Si pasa todas las validaciones, lo dejamos pasar
  next()
})

export default router