import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar se notificações são suportadas
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // useCallback garante referência estável — evita re-disparar useEffects dependentes
  const requestPermission = useCallback(async (silent = false) => {
    if (!isSupported) {
      // Não exibir toast de erro para o participante quando o navegador não suporta —
      // é um estado esperado e não há ação que o usuário possa tomar.
      if (!silent) {
        console.info('[Notifications] Notificações não suportadas neste navegador.');
      }
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else if (result === 'denied') {
        if (!silent) {
          toast.error('Permissão de notificações negada');
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      if (!silent) {
        toast.error('Erro ao ativar notificações');
      }
      return false;
    }
  }, [isSupported]);

  const scheduleDailyNotification = (hour: number, minute: number) => {
    if (permission !== 'granted') {
      toast.error('Permissão de notificações necessária');
      return;
    }

    // Calcular próximo horário de notificação
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // Se o horário já passou hoje, agendar para amanhã
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Salvar configuração no localStorage
    localStorage.setItem('notificationTime', JSON.stringify({ hour, minute }));

    // Enviar mensagem ao service worker para agendar
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: 'Lembrete de Pesquisa',
        body: 'Não se esqueça de registrar seu bem-estar hoje! 😊',
        showTime: scheduledTime.getTime(),
      });
    }

    toast.success(`Lembrete diário configurado para ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  };

  const showTestNotification = () => {
    if (permission !== 'granted') {
      toast.error('Permissão de notificações necessária');
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: 'Teste de Notificação',
        body: 'Esta é uma notificação de teste! 🔔',
        showTime: Date.now() + 2000, // 2 segundos
      });
      toast.success('Notificação de teste será exibida em 2 segundos');
    }
  };

  const cancelNotifications = () => {
    localStorage.removeItem('notificationTime');
    toast.success('Lembretes cancelados');
  };

  return {
    isSupported,
    permission,
    requestPermission,
    scheduleDailyNotification,
    showTestNotification,
    cancelNotifications,
  };
}
