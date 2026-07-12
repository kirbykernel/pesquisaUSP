import { useState, useEffect } from 'react';

/**
 * Detecta se o dispositivo está online.
 * A aplicação exige conexão para funcionar — este hook serve apenas
 * para exibir o aviso de "sem conexão" e bloquear o envio de respostas.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
