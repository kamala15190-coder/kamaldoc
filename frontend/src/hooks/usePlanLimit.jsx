/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';

const PlanLimitContext = createContext({});

export const PlanLimitProvider = ({ children }) => {
  const [modal, setModal] = useState({ open: false, message: '' });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const showLimitModal = useCallback((message) => {
    setModal({ open: true, message });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, message: '' });
  }, []);

  const handleApiError = useCallback((error) => {
    if (error?.response?.status === 403) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'object' ? detail?.message : (detail || t('upgradeModal.limitReached'));
      showLimitModal(message);
      return true;
    }
    return false;
  }, [showLimitModal, t]);

  return (
    <PlanLimitContext.Provider value={{ handleApiError, showLimitModal }}>
      {children}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px',
            padding: '24px', width: '100%', maxWidth: '320px',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <Zap style={{ width: 40, height: 40, marginBottom: 12, color: '#f59e0b' }} />
            <h3 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px', color: '#1f2937' }}>
              {modal.message}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              {t('upgradeModal.description')}
            </p>
            <button onClick={() => { closeModal(); navigate('/pricing'); }} style={{
              width: '100%', padding: '12px',
              backgroundColor: '#2563eb', color: 'white',
              borderRadius: '10px', border: 'none',
              fontWeight: '600', fontSize: '15px', cursor: 'pointer',
              marginBottom: '8px',
            }}>
              {t('upgradeModal.upgradeButton')}
            </button>
            <button onClick={closeModal} style={{
              width: '100%', padding: '10px',
              backgroundColor: 'transparent', color: '#6b7280',
              border: 'none', cursor: 'pointer', fontSize: '14px',
            }}>
              {t('upgradeModal.close')}
            </button>
          </div>
        </div>
      )}
    </PlanLimitContext.Provider>
  );
};

export const usePlanLimit = () => useContext(PlanLimitContext);
