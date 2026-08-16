import axios from 'axios'
import router from '@/router'

const apiPropiedades = axios.create({
    baseURL: `${import.meta.env.VITE_PROPIEDADES_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})

apiPropiedades.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

apiPropiedades.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            router.push({ name: 'login' })
        }
        return Promise.reject(error)
    }
)

export default apiPropiedades
