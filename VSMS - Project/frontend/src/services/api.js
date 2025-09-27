import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('Outgoing request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Remove duplicate interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Log request details
    if (error.config) {
      console.error('Request details:', {
        method: error.config.method,
        url: error.config.url,
        data: error.config.data,
        headers: error.config.headers
      });
    }

    // Log response details
    if (error.response) {
      console.error('Response details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    if (error.response?.status === 401) {
      // Clear token and redirect to login
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;