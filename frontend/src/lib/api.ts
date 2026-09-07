import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('segip_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/tv') && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('segip_token');
      localStorage.removeItem('segip_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const ServiceAPI = {
  list: () => api.get('/services').then((res) => res.data),
  get: (id: string) => api.get(`/services/${id}`).then((res) => res.data),
  create: (data: any) => api.post('/services', data).then((res) => res.data),
  update: (id: string, data: any) => api.put(`/services/${id}`, data).then((res) => res.data),
  delete: (id: string) => api.delete(`/services/${id}`),
  toggle: (id: string) => api.patch(`/services/${id}/toggle`).then((res) => res.data),
  triggerProbe: (id: string) => api.post(`/services/${id}/probe`).then((res) => res.data),
  getHistory: (id: string, params?: { period?: string; from?: string; to?: string } | string) => {
    if (typeof params === 'string') {
      return api.get(`/checks/service/${id}/history?period=${params}`).then((res) => res.data);
    }
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return api.get(`/checks/service/${id}/history?${query.toString()}`).then((res) => res.data);
  },
};

export const StatsAPI = {
  getDashboard: () => api.get('/stats/dashboard').then((res) => res.data),
  getTv: () => api.get('/stats/tv').then((res) => res.data),
  analyzeWithOllama: (payload: { serviceId?: string; httpCode?: number; errorMessage?: string; bodySnippet?: string }) =>
    api.post('/stats/ai/analyze-incident', payload).then((res) => res.data),
  getDailyAiSummary: () => api.get('/stats/ai/daily-summary').then((res) => res.data),
};

export const GroupAPI = {
  list: () => api.get('/groups').then((res) => res.data),
  create: (data: any) => api.post('/groups', data).then((res) => res.data),
};

export const AlertAPI = {
  list: (resolved?: boolean) =>
    api.get(`/alerts${resolved !== undefined ? `?resolved=${resolved}` : ''}`).then((res) => res.data),
  acknowledge: (id: string) => api.patch(`/alerts/${id}/acknowledge`).then((res) => res.data),
};

export const ConfigAPI = {
  getNotifications: () => api.get('/config/notifications').then((res) => res.data),
  saveNotifications: (data: any) => api.put('/config/notifications', data).then((res) => res.data),
  testTelegram: (data: { botToken?: string; chatId?: string }) =>
    api.post('/config/notifications/test-telegram', data).then((res) => res.data),
  testEmail: (data: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
    testRecipient: string;
  }) => api.post('/config/notifications/test-email', data).then((res) => res.data),
  sendReport: (interval?: string) => api.post('/config/notifications/report', { interval }).then((res) => res.data),
};
