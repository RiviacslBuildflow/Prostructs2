// Main JavaScript functionality for ProStructs PWA

// DOM Elements
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const accordionItems = document.querySelectorAll('.accordion-item');
const installButton = document.getElementById('install-button');
const offlineNotification = document.getElementById('offline-notification');

// Mobile Menu Toggle
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Toggle hamburger animation
        const spans = mobileMenuBtn.querySelectorAll('span');
        spans.forEach(span => span.classList.toggle('active'));
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Accordion functionality for FAQ section
accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    
    header.addEventListener('click', () => {
        // Close all other accordion items
        accordionItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        
        // Toggle current item
        item.classList.toggle('active');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Adjust for header height
                behavior: 'smooth'
            });
        }
    });
});

// PWA Installation
let deferredPrompt;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    if (installButton) {
        installButton.classList.add('show');
    }
});

// Installation button click handler
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            // The deferred prompt isn't available
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We no longer need the prompt
        deferredPrompt = null;
        // Hide the install button
        installButton.classList.remove('show');
    });
}

// Listen for app installed event
window.addEventListener('appinstalled', () => {
    // Hide the install button
    if (installButton) {
        installButton.classList.remove('show');
    }
    // Log the installation
    console.log('PWA was installed');
});

// Offline/Online Status Management
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
        offlineNotification.classList.add('show');
    } else {
        offlineNotification.classList.remove('show');
    }
    
    // Update any offline indicators in the UI
    document.querySelectorAll('.offline-indicator').forEach(indicator => {
        if (isOnline) {
            indicator.classList.add('online');
            indicator.classList.remove('offline');
        } else {
            indicator.classList.add('offline');
            indicator.classList.remove('online');
        }
    });
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initial check
updateOnlineStatus();

// IndexedDB Setup for Offline Data Storage
class OfflineStorage {
    constructor() {
        this.dbName = 'prostructs_db';
        this.dbVersion = 1;
        this.db = null;
        
        this.init();
    }
    
    async init() {
        if (!window.indexedDB) {
            console.error('IndexedDB not supported');
            return;
        }
        
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB connected');
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for each data type
                if (!db.objectStoreNames.contains('clients')) {
                    db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('jobs')) {
                    db.createObjectStore('jobs', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('quotes')) {
                    db.createObjectStore('quotes', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('invoices')) {
                    db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                }
                
                console.log('IndexedDB setup complete');
            };
        } catch (error) {
            console.error('Error initializing IndexedDB:', error);
        }
    }
    
    // Add data to a store
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Get all items from a store
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Get a single item by ID
    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Update an item
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Delete an item
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Add an operation to the sync queue
    async addToSyncQueue(operation) {
        return this.add('sync_queue', {
            ...operation,
            timestamp: new Date().toISOString(),
            synced: false
        });
    }
}

// Initialize offline storage
const offlineStorage = new OfflineStorage();

// Example data for demonstration
const sampleData = {
    clients: [
        { id: 1, name: 'John Smith', email: 'john@example.com', phone: '555-1234', address: '123 Main St' },
        { id: 2, name: 'Jane Doe', email: 'jane@example.com', phone: '555-5678', address: '456 Oak Ave' }
    ],
    jobs: [
        { id: 1, clientId: 1, title: 'Kitchen Renovation', status: 'In Progress', dueDate: '2025-05-15' },
        { id: 2, clientId: 2, title: 'Bathroom Remodel', status: 'Scheduled', dueDate: '2025-06-01' }
    ]
};

// Load sample data when the app is first used
async function loadSampleData() {
    try {
        // Check if we've already loaded sample data
        const storedClients = await offlineStorage.getAll('clients');
        
        if (storedClients.length === 0) {
            // Add sample clients
            for (const client of sampleData.clients) {
                await offlineStorage.add('clients', client);
            }
            
            // Add sample jobs
            for (const job of sampleData.jobs) {
                await offlineStorage.add('jobs', job);
            }
            
            console.log('Sample data loaded successfully');
        }
    } catch (error) {
        console.error('Error loading sample data:', error);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for IndexedDB to initialize
    setTimeout(async () => {
        await loadSampleData();
    }, 1000);
});
