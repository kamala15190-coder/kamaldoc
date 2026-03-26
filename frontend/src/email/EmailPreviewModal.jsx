/**
 * EmailPreviewModal
 * Full-screen modal showing email details: subject, sender, recipients, body, attachments.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Paperclip, Download, Loader2, FileText, Image, FileSpreadsheet, AlertCircle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEmailDetail, getAttachment } from './EmailConnectorService';
import { PROVIDER_INFO } from './EmailConnectorService';
import { formatFileSize, getAttachmentType } from './EmailSearchAdapter';

const ATTACH_ICONS = {
  pdf: FileText,
  doc: FileText,
  xls: FileSpreadsheet,
  image: Image,
  file: FileText,
};

export default function EmailPreviewModal({ emailResult, onClose }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingAtt, setDownloadingAtt] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!emailResult) return;
    setLoading(true);
    setError(null);

    getEmailDetail(emailResult.accountId, emailResult.rawId)
      .then(setDetail)
      .catch(err => setError(err.message || t('email.previewError')))
      .finally(() => setLoading(false));
  }, [emailResult, t]);

  const handleDownloadAttachment = async (att) => {
    setDownloadingAtt(att.id);
    try {
      const blob = await getAttachment(emailResult.accountId, emailResult.rawId, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Attachment download failed:', err);
    } finally {
      setDownloadingAtt(null);
    }
  };

  // Safely render HTML body in sandboxed iframe
  useEffect(() => {
    if (detail?.bodyType === 'html' && detail.body && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; color: #333; margin: 0; padding: 12px; word-wrap: break-word; }
              img { max-width: 100%; height: auto; }
              a { color: #6359FF; }
              pre, code { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>${detail.body}</body>
          </html>
        `);
        doc.close();
        // Auto-resize iframe height
        const resizeObserver = new ResizeObserver(() => {
          const h = doc.body?.scrollHeight;
          if (h) iframe.style.height = `${h + 20}px`;
        });
        resizeObserver.observe(doc.body);
        return () => resizeObserver.disconnect();
      }
    }
  }, [detail]);

  if (!emailResult) return null;

  const providerInfo = PROVIDER_INFO[emailResult.provider] || {};

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          maxWidth: 600, width: '100%', margin: '0 auto',
          marginTop: 'calc(var(--safe-area-top, 0px) + 12px)',
          background: 'var(--bg-primary)',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--border-glass)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: providerInfo.color ? `${providerInfo.color}18` : 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail style={{ width: 16, height: 16, color: providerInfo.color || 'var(--accent-solid)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('email.preview')}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, marginLeft: 8,
              padding: '1px 6px', borderRadius: 4,
              background: providerInfo.color ? `${providerInfo.color}18` : 'var(--accent-soft)',
              color: providerInfo.color || 'var(--accent-solid)',
            }}>
              {providerInfo.name}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--bg-glass)', border: 'none', cursor: 'pointer',
            }}
          >
            <X style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 style={{ width: 28, height: 28, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertCircle style={{ width: 36, height: 36, color: 'var(--danger)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
            </div>
          ) : detail ? (
            <>
              {/* Subject */}
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', lineHeight: 1.3 }}>
                {detail.subject || t('email.noSubject')}
              </h2>

              {/* Sender & Recipients */}
              <div style={{
                padding: 12, borderRadius: 12,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User style={{ width: 14, height: 14, color: 'var(--accent-solid)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {detail.sender?.name || detail.sender?.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {detail.sender?.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {detail.date ? new Date(detail.date).toLocaleDateString('de-DE', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    }) : ''}
                  </span>
                </div>

                {detail.to && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <strong>{t('email.to')}:</strong> {detail.to}
                  </div>
                )}
                {detail.cc && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    <strong>CC:</strong> {detail.cc}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Paperclip style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {t('email.attachments')} ({detail.attachments.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detail.attachments.map((att) => {
                      const attType = getAttachmentType(att);
                      const AttIcon = ATTACH_ICONS[attType] || FileText;
                      const isDownloading = downloadingAtt === att.id;
                      return (
                        <button
                          key={att.id}
                          onClick={() => handleDownloadAttachment(att)}
                          disabled={isDownloading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px', borderRadius: 8,
                            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                            cursor: 'pointer', fontSize: 11, color: 'var(--text-primary)',
                            opacity: isDownloading ? 0.6 : 1,
                          }}
                        >
                          {isDownloading ? (
                            <Loader2 style={{ width: 12, height: 12, animation: 'spin 0.8s linear infinite' }} />
                          ) : (
                            <AttIcon style={{ width: 12, height: 12, color: 'var(--accent-solid)' }} />
                          )}
                          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.name}
                          </span>
                          {att.size > 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                              {formatFileSize(att.size)}
                            </span>
                          )}
                          <Download style={{ width: 10, height: 10, color: 'var(--text-muted)' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Body */}
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--border-glass)',
                background: '#fff',
              }}>
                {detail.bodyType === 'html' ? (
                  <iframe
                    ref={iframeRef}
                    sandbox="allow-same-origin"
                    style={{
                      width: '100%', border: 'none', minHeight: 200,
                      background: '#fff',
                    }}
                    title="Email content"
                  />
                ) : (
                  <pre style={{
                    padding: 14, margin: 0, fontSize: 13,
                    lineHeight: 1.5, color: '#333',
                    whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  }}>
                    {detail.body}
                  </pre>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
