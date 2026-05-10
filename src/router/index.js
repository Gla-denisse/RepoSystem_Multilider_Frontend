import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: () => import('../views/LandingView.vue'),
      meta: { layout: 'public' }
    },
    {
      path: '/propiedades-venta',
      name: 'PropiedadesLanding',
      component: () => import('../views/landing/PropiedadesLandingView.vue'),
      meta: { layout: 'public' }
    },
    {
      path: '/propiedades-venta/:id',
      name: 'PropiedadDetalle',
      component: () => import('../views/landing/PropiedadDetailView.vue'),
      meta: { layout: 'public' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true, layout: 'auth' }
    },
    {
      path: '/admin',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true, layout: 'admin' }
    },
    {
      path: '/empresa',
      name: 'Empresa',
      component: () => import('../views/EmpresaView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_empresa', layout: 'admin' }
    },

    {
      path: '/usuarios',
      name: 'Usuarios',
      component: () => import('../views/UsuariosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_usuarios', layout: 'admin' }
    },
    {
      path: '/ciudades',
      name: 'Ciudades',
      component: () => import('../views/CiudadesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_ciudades', layout: 'admin' }
    },
    {
      path: '/zonas',
      name: 'Zonas',
      component: () => import('../views/ZonasView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_zonas', layout: 'admin' }
    },
    {
      path: '/caracteristicas',
      name: 'Caracteristicas',
      component: () => import('../views/CaracteristicasView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_caracteristicas', layout: 'admin' }
    },
    {
      path: '/roles',
      name: 'Roles',
      component: () => import('../views/RolesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_roles', layout: 'admin' }
    },
    {
      path: '/permisos',
      name: 'Permisos',
      component: () => import('../views/PermisosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_permisos', layout: 'admin' }
    },
    {
      path: '/propietarios',
      name: 'Propietarios',
      component: () => import('../views/PropietariosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_propietarios', layout: 'admin' }
    },
    {
      path: '/propiedades',
      name: 'Propiedades',
      component: () => import('../views/PropiedadesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_propiedades', layout: 'admin' }
    },
    {
      path: '/asesores',
      name: 'Asesores',
      component: () => import('../views/AsesoresView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_asesores', layout: 'admin' }
    },
    {
      path: '/clientes',
      name: 'Clientes',
      component: () => import('../views/ClientesView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_clientes', layout: 'admin' }
    },
    {
      path: '/ventas/nueva',
      name: 'NuevaVenta',
      component: () => import('../views/NuevaVentaView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_ventas', layout: 'admin' }
    },
    {
      path: '/ventas/historial',
      name: 'HistorialVentas',
      component: () => import('../views/HistorialVentasView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_historial_ventas', layout: 'admin' }
    },
    {
      path: '/pagos',
      name: 'Pagos',
      component: () => import('../views/PagosView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_pagos', layout: 'admin' }
    },
    {
      path: '/pagos-credito',
      name: 'PagosCredito',
      component: () => import('../views/PagosCreditoView.vue'),
      meta: { requiresAuth: true, permission: 'acceso_pagos', layout: 'admin' }
    },
  ]
})

// GUARDIA DE NAVEGACIÓN
router.beforeEach((to) => {
  const authStore = useAuthStore()
  const isAuthenticated = !!authStore.token

  // 1. Si requiere autenticación y NO está logueado
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  } 
  
  // 2. Si es una ruta para "invitados" (como el login) y YA está logueado
  if (to.meta.requiresGuest && isAuthenticated) {
    return { name: 'Dashboard' }
  } 

  // 3. SEGURIDAD DE PERMISOS
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    alert("Acceso denegado: No tienes los permisos necesarios para ver este módulo.");
    return { name: 'Dashboard' } 
  }

  return true
})

export default router
