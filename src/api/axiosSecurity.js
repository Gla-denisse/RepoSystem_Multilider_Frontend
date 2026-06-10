import axios from 'axios'
import router from '@/router'

const apiSecurity = axios.create({
    baseURL: `${import.meta.env.VITE_SECURITY_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})

apiSecurity.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

apiSecurity.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login')

        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            router.push({ name: 'login' })
        }

        return Promise.reject(error)
    }
)

export default apiSecurity
