import { defineStore } from 'pinia'
import api from '@/api/axios'

export const useCompanyStore = defineStore('company', {
  state: () => ({
    company: null,
    featuredProperties: [],
    latestProperties: [],
    advisors: [],
    loading: false,
    error: null
  }),
  
  getters: {
    primaryColor: (state) => state.company?.color_primario || '#1e40af',
    secondaryColor: (state) => state.company?.color_secundario || '#1e293b',
  },

  actions: {
    async fetchLandingData() {
      this.loading = true
      try {
        const response = await api.get('/landing')
        const data = response.data
        
        this.company = data.empresa
        this.featuredProperties = data.propiedades_destacadas
        this.latestProperties = data.ultimas_propiedades
        this.advisors = data.asesores
        
        this.applyBranding()
      } catch (err) {
        this.error = 'No se pudo cargar la información de la landing.'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async updateCompanyData(formData) {
      this.loading = true
      try {
        const response = await api.post('/empresa', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        this.company = response.data.data
        this.applyBranding()
        return response.data
      } catch (err) {
        console.error(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    applyBranding() {
      if (this.company) {
        document.documentElement.style.setProperty('--landing-primary', this.company.color_primario)
        document.documentElement.style.setProperty('--landing-secondary', this.company.color_secundario || '#1e293b')
      }
    }
  }
})
