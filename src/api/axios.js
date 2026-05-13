import axios from 'axios';
import router from '@/router'; 

// Creamos una instancia de Axios con la URL base de tu API en Laravel
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`, // La ruta de tu backend
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    // withCredentials: true // Descomenta esto más adelante si usas Laravel Sanctum con cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Solo redirige al login si el 401 NO viene de la ruta de login
        // para evitar un loop infinito o interferencia con el manejo de errores
        const isLoginRequest = error.config?.url?.includes('/login');

        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            router.push({ name: 'login' });
        }

        return Promise.reject(error); // El error de Axios se preserva intacto
    }
);

const token = localStorage.getItem('auth_token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export default api;