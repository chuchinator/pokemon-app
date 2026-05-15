import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = '') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type, visible: true });
    timerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2800,
    );
  }, []);

  return { toast, showToast };
}
