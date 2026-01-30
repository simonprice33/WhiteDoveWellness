import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/admin/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/admin/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Public API
export const publicApi = {
  getTherapies: () => api.get('/therapies?active_only=true'),
  getTherapy: (id) => api.get(`/therapies/${id}`),
  getPrices: (therapyId) => api.get(`/prices?active_only=true${therapyId ? `&therapy_id=${therapyId}` : ''}`),
  getAffiliations: () => api.get('/affiliations?active_only=true'),
  getPolicies: () => api.get('/policies?active_only=true'),
  getPolicy: (slug) => api.get(`/policies/slug/${slug}`),
  getSettings: () => api.get('/settings'),
  submitContact: (data) => api.post('/contact', data)
};

// Admin API
export const adminApi = {
  // Auth
  login: (username, password) => api.post('/admin/auth/login', { username, password }),
  refresh: (refreshToken) => api.post('/admin/auth/refresh', { refresh_token: refreshToken }),
  getMe: () => api.get('/admin/auth/me'),
  
  // Admin Users
  getUsers: () => api.get('/admin/users'),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Therapies
  getTherapies: () => api.get('/therapies'),
  createTherapy: (data) => api.post('/admin/therapies', data),
  updateTherapy: (id, data) => api.put(`/admin/therapies/${id}`, data),
  deleteTherapy: (id) => api.delete(`/admin/therapies/${id}`),
  
  // Prices
  getPrices: (therapyId) => api.get(`/prices${therapyId ? `?therapy_id=${therapyId}` : ''}`),
  createPrice: (data) => api.post('/admin/prices', data),
  updatePrice: (id, data) => api.put(`/admin/prices/${id}`, data),
  deletePrice: (id) => api.delete(`/admin/prices/${id}`),
  
  // Contacts
  getContacts: (unreadOnly) => api.get(`/admin/contacts${unreadOnly ? '?unread_only=true' : ''}`),
  getContact: (id) => api.get(`/admin/contacts/${id}`),
  markContactRead: (id) => api.put(`/admin/contacts/${id}/read`),
  updateContactNotes: (id, notes) => api.put(`/admin/contacts/${id}/notes`, { notes }),
  deleteContact: (id) => api.delete(`/admin/contacts/${id}`),
  
  // Affiliations
  getAffiliations: () => api.get('/affiliations'),
  createAffiliation: (data) => api.post('/admin/affiliations', data),
  updateAffiliation: (id, data) => api.put(`/admin/affiliations/${id}`, data),
  deleteAffiliation: (id) => api.delete(`/admin/affiliations/${id}`),
  
  // Policies
  getPolicies: () => api.get('/policies'),
  createPolicy: (data) => api.post('/admin/policies', data),
  updatePolicy: (id, data) => api.put(`/admin/policies/${id}`, data),
  deletePolicy: (id) => api.delete(`/admin/policies/${id}`),
  
  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  
  // Clients
  getClients: (search) => api.get(`/admin/clients${search ? `?search=${search}` : ''}`),
  getClient: (id) => api.get(`/admin/clients/${id}`),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
  
  // Client Notes
  getClientNotes: (clientId) => api.get(`/admin/clients/${clientId}/notes`),
  createClientNote: (clientId, data) => api.post(`/admin/clients/${clientId}/notes`, data),
  updateClientNote: (clientId, noteId, data) => api.put(`/admin/clients/${clientId}/notes/${noteId}`, data),
  deleteClientNote: (clientId, noteId) => api.delete(`/admin/clients/${clientId}/notes/${noteId}`)
};

export default api;
