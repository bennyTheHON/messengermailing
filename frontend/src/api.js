import axios from 'axios';

// Base URL for API - use relative path for Nginx proxy
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add JWT token to requests
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

// Handle 401 errors (redirect to login)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username, password, twoFactorCode = null) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        if (twoFactorCode) {
            headers['X-2FA-Code'] = twoFactorCode;
        }

        return api.post('/auth/login', params, { headers });
    },
    logout: () => api.post('/auth/logout'),
    changePassword: (data) => api.post('/auth/change-password', data),
    getMe: () => api.get('/auth/me'),
    setup2FA: () => api.post('/auth/2fa/setup'),
    enable2FA: (code) => api.post('/auth/2fa/enable', { code }),
    disable2FA: (code) => api.post('/auth/2fa/disable', { code }),
};

// Accounts API
export const accountsAPI = {
    getAccounts: () => api.get('/accounts'),
    addAccount: (data) => api.post('/accounts', data),
    deleteAccount: (id) => api.delete(`/accounts/${id}`),
    sendTelegramCode: (data) => api.post('/accounts/telegram/send-code', data),
    loginTelegram: (data) => api.post('/accounts/telegram/login', data),
    getDialogs: (id) => api.get(`/accounts/${id}/dialogs`),
    testAccount: (id) => api.post(`/accounts/${id}/test`),
};

// Telegram API (Legacy/Global - might be deprecated soon)
export const telegramAPI = {
    sendCode: (phone) => api.post('/telegram/send-code', { phone }),
    login: (code, password) => api.post('/telegram/login', { code, password }),
    logout: () => api.post('/telegram/logout'),
    getStatus: () => api.get('/telegram/status'),
    getDialogs: () => api.get('/telegram/dialogs')
};

// Routing API (Advanced Rules)
export const routingAPI = {
    getRules: () => api.get('/routing/rules'),
    addRule: (rule) => api.post('/routing/rules', rule),
    updateRule: (id, rule) => api.put(`/routing/rules/${id}`, rule),
    deleteRule: (id) => api.delete(`/routing/rules/${id}`),

    // Legacy Sources (for backward compatibility if needed)
    getSources: () => api.get('/routing/sources'),
    addSource: (source) => api.post('/routing/sources', source),
    deleteSource: (id) => api.delete(`/routing/sources/${id}`),
    getEmails: () => api.get('/routing/emails'),
    addEmail: (email) => api.post('/routing/emails', { email }),
    deleteEmail: (id) => api.delete(`/routing/emails/${id}`),
};

// Schedule API
export const scheduleAPI = {
    getConfig: () => api.get('/schedule/config'),
    updateConfig: (config) => api.put('/schedule/config', config),
    sync: () => api.post('/schedule/sync'), // New endpoint to sync rules
    start: () => api.post('/schedule/start'),
    stop: () => api.post('/schedule/stop')
};

// Admin API
export const adminAPI = {
    getSettings: () => api.get('/admin/settings'),
    getStats: () => api.get('/admin/stats'),
    updateSettings: (settings) => api.put('/admin/settings', settings),
    uploadSSL: (fullchain, privkey) => {
        const formData = new FormData();
        formData.append('fullchain', fullchain);
        formData.append('privkey', privkey);
        return api.post('/admin/ssl/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    removeSSL: () => api.delete('/admin/ssl'),
    getSSLInfo: () => api.get('/admin/ssl/info'),
    downloadBackendLogs: () => api.get('/admin/logs/backend', { responseType: 'blob' }),
    downloadFrontendLogs: () => api.get('/admin/logs/frontend', { responseType: 'blob' })
};

// Logs API
export const logsAPI = {
    getLogs: () => api.get('/logs')
};

export default api;
