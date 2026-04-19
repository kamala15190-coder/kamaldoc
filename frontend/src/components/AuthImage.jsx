import { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function AuthImage({ src, alt, className, onError, ...props }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    let url = null;

    if (!src) return;

    setBlobUrl(null); // eslint-disable-line react-hooks/set-state-in-effect
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
          onErrorRef.current?.();
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
