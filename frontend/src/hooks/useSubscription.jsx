import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuth } from './useAuth';
import api from '../api';

const SubscriptionContext = createContext({});

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/subscription/status');
      setSubscription(data);
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setSubscription({ plan: 'free', limits: {}, usage: {} });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan = subscription?.plan || 'free';
  const limits = subscription?.limits || {};
  const usage = subscription?.usage || {};
  const isPro = plan === 'pro';
  const isBasic = plan === 'basic';
  const isFree = plan === 'free';
  const isPaid = isPro || isBasic;

  const value = {
    subscription,
    plan,
    limits,
    usage,
    isPro,
    isBasic,
    isFree,
    isPaid,
    loading,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
