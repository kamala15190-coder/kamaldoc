import axios from 'axios';
import { API_BASE_URL } from './config';
import { supabase } from './supabaseClient';

const api = axios.create({
  baseURL: API_BASE_URL + '/api',
});

// Interceptor: Authorization Header mit Supabase JWT Token hinzufügen
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData);
  return data;
}

export async function getDocuments(params = {}) {
  const { data } = await api.get('/documents', { params });
  return data;
}

export async function getDocument(id) {
  const { data } = await api.get(`/documents/${id}`);
  return data;
}

export async function updateDocument(id, update) {
  const { data } = await api.patch(`/documents/${id}`, update);
  return data;
}

export async function deleteDocument(id) {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
}

export async function generateReply(id, targetLanguage) {
  const params = targetLanguage ? { target_language: targetLanguage } : {};
  const { data } = await api.post(`/documents/${id}/reply`, null, { params });
  return data;
}

export async function getReplies(id) {
  const { data } = await api.get(`/documents/${id}/replies`);
  return data;
}

export async function getStatus() {
  const { data } = await api.get('/status');
  return data;
}

export async function getEinstellungen() {
  const { data } = await api.get('/einstellungen');
  return data;
}

export async function saveEinstellungen(settings) {
  const { data } = await api.put('/einstellungen', settings);
  return data;
}

export function getThumbnailUrl(id) {
  return `${API_BASE_URL}/api/documents/${id}/thumbnail`;
}

export function getFileUrl(id) {
  return `${API_BASE_URL}/api/documents/${id}/file`;
}

export default api;
