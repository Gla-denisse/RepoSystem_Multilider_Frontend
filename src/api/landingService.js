import api from './axios'

export const landingService = {
  getLandingData() {
    return api.get('/landing')
  },
  
  sendContactMessage(formData) {
    return api.post('/contacto', formData)
  }
}
