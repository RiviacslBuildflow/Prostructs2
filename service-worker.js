// Service Worker for ProStructs PWA
const CACHE_NAME = 'prostructs-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/script.js',
  '/manifest.json',
  '/images/logo.svg',
  '/images/app-preview.svg',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  '/images/icons/calendar.svg',
  '/images/icons/document.svg',
  '/images/icons/people.svg',
  '/images/icons/offline.svg'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('[Service Worker] Error during cache.addAll():', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure the SW is in control immediately
  event.waitUntil(self.clients.claim());
  
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle API requests differently (network first, then offline handling)
  if (event.request.url.includes('/api/')) {
    handleApiRequest(event);
    return;
  }
  
  // For non-API requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If found in cache, return the cached response
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // If valid response, clone it and store in cache
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
            
            // If the request is for a page (HTML), show the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // For other resources, return a simple error response
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle API requests with network-first strategy
function handleApiRequest(event) {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        return response;
      })
      .catch(error => {
        console.log('[Service Worker] API fetch failed:', error);
        
        // Return a JSON error response for API requests
        return new Response(JSON.stringify({
          error: 'You are offline',
          message: 'The app is currently offline. Your changes will be synced when you reconnect.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
  );
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync event:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Function to sync data when back online
async function syncData() {
  try {
    // Open IndexedDB
    const dbPromise = indexedDB.open('prostructs_db', 1);
    
    dbPromise.onsuccess = async function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      // Get all items in sync queue
      const items = await store.getAll();
      
      // Process each item
      for (const item of items) {
        try {
          // Attempt to sync with server
          const response = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item.data)
          });
          
          if (response.ok) {
            // If successful, remove from sync queue
            store.delete(item.id);
            console.log('[Service Worker] Successfully synced item:', item.id);
          }
        } catch (error) {
          console.error('[Service Worker] Error syncing item:', item.id, error);
          // Keep in queue for next sync attempt
        }
      }
    };
    
    dbPromise.onerror = function(event) {
      console.error('[Service Worker] IndexedDB error during sync:', event.target.error);
    };
    
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    throw error; // Ensures sync will be retried
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {
    title: 'ProStructs Update',
    body: 'Something new happened in your ProStructs app.',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-72x72.png',
    data: {
      url: '/'
    }
  };
  
  // Try to parse data from the push event
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  // Get the URL from the notification data or use default
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';
  
  // Open or focus the relevant page
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
