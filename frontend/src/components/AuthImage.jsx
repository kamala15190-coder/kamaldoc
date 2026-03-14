import { useState, useEffect } from 'react';
import api from '../api';

export default function AuthImage({ src, alt, className, onError, ...props }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url = null;

    if (!src) return;

    setBlobUrl(null);
    setError(false);

    api.get(src, { responseType: 'blob' })
      .then(res => {
        if (!cancelled) {
          url = URL.createObjectURL(res.data);
          setBlobUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          onError?.();
        }
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  if (error) return null;

  if (!blobUrl) {
    return <div className={className} style={{ background: '#f1f5f9' }} />;
  }

  return <img src={blobUrl} alt={alt} className={className} {...props} />;
}
