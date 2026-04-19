import { useContext } from 'react';
import { ConfirmDialogContext } from '../contexts/ConfirmDialogContext';

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmDialogProvider>');
  return ctx.confirm;
}
