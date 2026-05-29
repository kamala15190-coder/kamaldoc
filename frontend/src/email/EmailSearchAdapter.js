/**
 * EmailSearchAdapter
 * Normalizes search results from all providers into a unified format
 * and provides utility functions for the search UI integration.
 */

import { searchAllAccounts, getConnectedAccounts } from './EmailConnectorService';

/**
 * Unified email search result format.
 * @typedef {Object} EmailSearchResult
 * @property {string} id - Unique ID (provider_email_rawId)
 * @property {string} accountId - Account reference
 * @property {'gmail'|'outlook'|'gmx'|'icloud'|'yahoo'} provider
 * @property {string} subject
 * @property {{ name: string, email: string }} sender
 * @property {Date} date
 * @property {string} preview - First ~150 chars of body
 * @property {boolean} hasAttachments
 * @property {Array<{ id: string, name: string, mimeType: string, size: number }>} attachments
 * @property {string} rawId - Provider-specific message ID
 * @property {'email'} resultType - Always 'email' to distinguish from document results
 */

/**
 * Search all connected email accounts and return normalized results.
 * @param {string} query - Search query
 * @param {Object} options - { maxResults }
 * @returns {Promise<{ results: EmailSearchResult[], errors: Array, hasAccounts: boolean }>}
 */
export async function searchEmails(query, options = {}) {
  const accounts = await getConnectedAccounts();
  if (accounts.length === 0) {
    return { results: [], errors: [], hasAccounts: false };
  }

  if (!query || query.trim().length < 2) {
    return { results: [], errors: [], hasAccounts: true };
  }

  const { results, errors } = await searchAllAccounts(query, options);

  // Tag each result as 'email' type for the unified search list
  const tagged = results.map(r => ({
    ...r,
    resultType: 'email',
  }));

  return { results: tagged, errors, hasAccounts: true };
}

/**
 * Merge document results and email results into a single sorted list.
 * Documents appear first by default, then emails, both sorted by date.
 */
export function mergeResults(documents, emailResults, filter = 'all') {
  if (filter === 'documents') return documents.map(d => ({ ...d, resultType: 'document' }));
  if (filter === 'emails') return emailResults;

  const docResults = documents.map(d => ({
    ...d,
    resultType: 'document',
    date: d.datum ? new Date(d.datum) : new Date(0),
  }));

  const merged = [...docResults, ...emailResults];
  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file extension icon hint based on mime type or filename.
 */
export function getAttachmentType(attachment) {
  const name = (attachment.name || '').toLowerCase();
  const mime = (attachment.mimeType || '').toLowerCase();

  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  if (name.match(/\.(docx?|odt)$/) || mime.includes('word')) return 'doc';
  if (name.match(/\.(xlsx?|ods)$/) || mime.includes('spreadsheet') || mime.includes('excel')) return 'xls';
  if (name.match(/\.(jpe?g|png|gif|webp|svg)$/) || mime.startsWith('image/')) return 'image';
  return 'file';
}
