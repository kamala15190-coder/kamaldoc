import axios from 'axios';
import { API_BASE_URL } from './config';
import { supabase } from './supabaseClient';
import { REPLY_LANGUAGES } from './languages';

const api = axios.create({
  baseURL: API_BASE_URL + '/api',
});

// Interceptor: Authorization Header mit Supabase JWT Token hinzufÃ¼gen
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export async function uploadDocument(file, docType = 'standard') {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, { params: { doc_type: docType } });
  return data;
}

/**
 * Mehrere Dateien sequenziell hochladen.
 * onProgress(index, total, filename, status) wird pro Datei aufgerufen.
 * Fehler pro Datei werden isoliert – eine fehlgeschlagene Datei bricht nicht den Rest ab.
 */
export async function uploadDocuments(files, docType = 'standard', onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name, 'uploading');
    try {
      const result = await uploadDocument(file, docType);
      results.push({ success: true, ...result, dateiname: file.name });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const error = typeof detail === 'string' ? detail : detail?.message || err.message || 'Upload fehlgeschlagen';
      results.push({ success: false, dateiname: file.name, error, raw: err });
    }
    onProgress?.(i + 1, files.length, file.name, results[i].success ? 'done' : 'error');
  }
  return results;
}

export async function getDocuments(params = {}) {
  const { data } = await api.get('/documents', { params });
  return data;
}

export async function getExpenses(params = {}) {
  const { data } = await api.get('/expenses', { params });
  return data;
}

export async function getExpenseCategories() {
  const { data } = await api.get('/expenses/categories');
  return data;
}

export async function getExpenseItems(params = {}) {
  const { data } = await api.get('/expenses/items', { params });
  return data;
}

export async function getExpenseSummary(params = {}) {
  const { data } = await api.get('/expenses/summary', { params });
  return data;
}

export async function explainDocument(id, targetLanguage = 'de') {
  const { data } = await api.post(`/documents/${id}/explain`, null, { params: { target_language: targetLanguage } });
  return data;
}

export async function simplifyDocument(id) {
  const { data } = await api.post(`/documents/${id}/simplify`);
  return data;
}

export async function translateDocument(id, targetLanguage) {
  const { data } = await api.post(`/documents/${id}/translate`, null, { params: { target_language: targetLanguage } });
  return data;
}

export async function getLegalAssessment(id, language = 'de') {
  const { data } = await api.post(`/documents/${id}/legal-assessment`, null, { params: { language } });
  return data;
}

export async function getContestableElements(id, language = 'de') {
  const { data } = await api.post(`/documents/${id}/contestable-elements`, null, { params: { language } });
  return data;
}

export async function generateObjection(id, selectedElements, targetLanguage = 'de') {
  const lang = REPLY_LANGUAGES.find(l => l.code === targetLanguage);
  const langName = lang ? lang.label : 'Deutsch';
  const { data } = await api.post(`/documents/${id}/generate-objection`, { selected_elements: selectedElements, target_language: langName });
  return data;
}

export async function getBehoerdenResults(id) {
  const { data } = await api.get(`/documents/${id}/behoerden-results`);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/account');
  return data;
}

export async function registerPushToken(token, platform = 'android') {
  const { data } = await api.post('/push-token', { token, platform });
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

export async function generateReply(id, targetLanguage, hints, replyType) {
  const params = targetLanguage ? { target_language: targetLanguage } : {};
  const body = {};
  if (hints) body.hints = hints;
  if (replyType && replyType !== 'allgemein') body.reply_type = replyType;
  const { data } = await api.post(`/documents/${id}/reply`, Object.keys(body).length > 0 ? body : null, { params });
  return data;
}

export async function getReplies(id) {
  const { data } = await api.get(`/documents/${id}/replies`);
  return data;
}


// --- Todos ---

export async function getTodos(docId) {
  const { data } = await api.get(`/documents/${docId}/todos`);
  return data;
}

export async function createTodo(docId, text) {
  const { data } = await api.post(`/documents/${docId}/todos`, { text });
  return data;
}

export async function updateTodo(todoId, done) {
  const { data } = await api.patch(`/todos/${todoId}`, { done });
  return data;
}

export async function deleteTodo(todoId) {
  const { data } = await api.delete(`/todos/${todoId}`);
  return data;
}

export async function getOpenTodos() {
  const { data } = await api.get('/todos/open');
  return data;
}

export async function translateDocumentVolltext(docId, targetLanguage) {
  const { data } = await api.post(`/documents/${docId}/translate-volltext`, { target_language: targetLanguage });
  return data;
}

export async function getDocumentTranslations(docId) {
  const { data } = await api.get(`/documents/${docId}/translations`);
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

// --- Subscription ---

export async function getSubscriptionStatus() {
  const { data } = await api.get('/subscription/status');
  return data;
}

export async function createCheckout(plan) {
  const isAndroid = window.Capacitor?.isNativePlatform?.() || false;
  const { data } = await api.post('/subscription/create-checkout', { plan, source: isAndroid ? 'android' : 'web' });
  return data;
}

export async function cancelSubscription() {
  const { data } = await api.post('/subscription/cancel');
  return data;
}

export async function downgradeSubscription(targetPlan) {
  const { data } = await api.post('/subscription/downgrade', { target_plan: targetPlan });
  return data;
}

export async function reactivateSubscription() {
  const { data } = await api.post('/subscription/reactivate');
  return data;
}

export async function getSubscriptionUsage() {
  const { data } = await api.get('/subscription/usage');
  return data;
}

// --- Support Tickets ---

export async function submitSupportTicket({ priority, email, message }) {
  const { data } = await api.post('/support/ticket', { priority, email, message });
  return data;
}

export async function createTicket({ subject, message, priority, file }) {
  const formData = new FormData();
  formData.append('subject', subject || '');
  formData.append('message', message);
  formData.append('priority', priority);
  if (file) formData.append('file', file);
  const { data } = await api.post('/tickets', formData);
  return data;
}

export async function getTickets() {
  const { data } = await api.get('/tickets');
  return data;
}

export async function getTicketUnreadCount() {
  const { data } = await api.get('/tickets/unread-count');
  return data;
}

export async function getTicket(ticketId) {
  const { data } = await api.get(`/tickets/${ticketId}`);
  return data;
}

export async function addTicketMessage(ticketId, message, file) {
  const formData = new FormData();
  formData.append('message', message || '');
  if (file) formData.append('file', file);
  const { data } = await api.post(`/tickets/${ticketId}/messages`, formData);
  return data;
}

export async function acceptTicket(ticketId) {
  const { data } = await api.post(`/tickets/${ticketId}/accept`);
  return data;
}

// --- Admin Tickets ---

export async function adminGetTickets() {
  const { data } = await api.get('/admin/tickets');
  return data;
}

export async function adminGetTicket(ticketId) {
  const { data } = await api.get(`/admin/tickets/${ticketId}`);
  return data;
}

export async function adminCloseTicket(ticketId, solution, status = 'bearbeitet') {
  const { data } = await api.post(`/admin/tickets/${ticketId}/close`, { solution, status });
  return data;
}

export async function adminAddTicketMessage(ticketId, message) {
  const { data } = await api.post(`/admin/tickets/${ticketId}/message`, { message });
  return data;
}

export async function adminDeleteTicket(ticketId) {
  const { data } = await api.delete(`/admin/tickets/${ticketId}`);
  return data;
}

// --- Ticket file (authenticated blob fetch) ---

export async function fetchTicketFileUrl(fileUrl) {
  // Strip leading /api prefix: axios baseURL already includes /api,
  // so /api/tickets/files/... would become /api/api/tickets/files/...
  const url = fileUrl.startsWith('/api/') ? fileUrl.slice(4)
    : fileUrl.startsWith('/') ? fileUrl
    : `/tickets/files/${fileUrl}`;
  const resp = await api.get(url, { responseType: 'blob' });
  return URL.createObjectURL(resp.data);
}

// --- Admin ---

export async function checkAdmin() {
  const { data } = await api.get('/admin/check');
  return data;
}

export async function getAdminList() {
  const { data } = await api.get('/admin/list');
  return data;
}

export async function addAdmin(email) {
  const { data } = await api.post('/admin/add', { email });
  return data;
}

export async function removeAdmin(userId) {
  const { data } = await api.delete('/admin/remove', { data: { user_id: userId } });
  return data;
}

export async function getSupportEmail() {
  const { data } = await api.get('/admin/support-email');
  return data;
}

export async function updateSupportEmail(email) {
  const { data } = await api.post('/admin/support-email', { email });
  return data;
}

export async function adminSearchUser(email) {
  const { data } = await api.get('/admin/search-user', { params: { email } });
  return data;
}

export async function adminChangePlan(email, newPlan, expiresAt) {
  const payload = { email, new_plan: newPlan };
  // expires_at: ISO date string YYYY-MM-DD, or null for unlimited
  if (expiresAt && newPlan !== 'free') payload.expires_at = expiresAt;
  const { data } = await api.post('/admin/change-plan', payload);
  return data;
}

export async function adminGetFinanceOverview() {
  const { data } = await api.get('/admin/finance-overview');
  return data;
}

// --- Feature Flags ---

export async function getFeatureFlags() {
  const { data } = await api.get('/feature-flags');
  return data;
}

export async function adminGetFeatureFlags() {
  const { data } = await api.get('/admin/feature-flags');
  return data;
}

export async function adminSetFeatureFlag(key, enabled) {
  const { data } = await api.post(`/admin/feature-flags/${key}`, { enabled });
  return data;
}

export async function getIntroStatus() {
  const { data } = await api.get('/intro-status');
  return data;
}

export async function markIntroComplete() {
  const { data } = await api.post('/intro-complete');
  return data;
}

export function getThumbnailUrl(id) {
  return `${API_BASE_URL}/api/documents/${id}/thumbnail`;
}

export function getFileUrl(id) {
  return `${API_BASE_URL}/api/documents/${id}/file`;
}

export async function downloadFile(id, filename) {
  // Native: öffne Datei im System-Browser (Blob-Download funktioniert nicht in WebView)
  if (window.Capacitor?.isNativePlatform?.()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      await Browser.open({ url: `${API_BASE_URL}/api/documents/${id}/file?token=${token}` });
      return;
    } catch (_) { /* fallback to web method */ }
  }
  const { data } = await api.get(`/documents/${id}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default api;
