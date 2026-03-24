import axios from 'axios';
import { BASE_URL } from './apiPaths';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Add request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Keep this handler side-effect free from throws: a thrown interceptor
        // masks the real failure (often seen as reading 'status' of undefined).
        try {
            const status = error?.response?.status;
            if (status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else if (status === 500) {
                console.error('Server error:', error.response?.data);
            } else if (status === 404) {
                console.error('Resource not found:', error.response?.data);
            } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
                console.error('Network error:', error?.message);
            } else if (status != null) {
                console.error('Request failed:', status, error.response?.data);
            } else {
                console.error('Request error:', error?.message ?? error);
            }
        } catch (interceptorErr) {
            console.error('Axios interceptor error:', interceptorErr);
        }
        return Promise.reject(error);
    }
);

export default api;