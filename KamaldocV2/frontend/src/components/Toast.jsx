import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastCtx = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const timer = useRef();

  const show = useCallback((msg) => {
    setText(msg);
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 1800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className={`toast ${open ? 'show' : ''}`} aria-live="polite">{text}</div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
