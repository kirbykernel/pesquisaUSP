const CACHE_NAME = 'pesquisa-app-v1';
const urlsToCache = [
  '/',
  '/participant/login',
  '/participant/app',
];

// Instalar service worker e fazer cache dos recursos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativar service worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições e servir do cache quando offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retornar resposta do cache
        if (response) {
          return response;
        }

        // Clonar requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Verificar se é uma resposta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar resposta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Se falhar, tentar retornar do cache
          return caches.match(event.request);
        });
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Sincronizando dados...');
  // A sincronização será feita pela aplicação
}

// Receber notificações push
self.addEventListener('push', (event) => {
  console.log('Push recebido:', event);
  
  const data = event.data ? event.data.json() : {
    title: 'Lembrete de Pesquisa',
    body: 'Não se esqueça de registrar seu bem-estar hoje!',
  };

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'daily-reminder',
    requireInteraction: false,
    data: {
      url: '/participant/app',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já houver uma janela aberta, focar nela
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/participant/app') && 'focus' in client) {
            return client.focus();
          }
        }
        // Caso contrário, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/participant/app');
        }
      })
  );
});

// Agendar notificação local (sem servidor)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, showTime } = event.data;
    const delay = showTime - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body: body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'daily-reminder',
          requireInteraction: false,
          data: {
            url: '/participant/app',
          },
        });
      }, delay);
    }
  }
});
