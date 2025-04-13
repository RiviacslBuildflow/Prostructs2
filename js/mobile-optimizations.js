// Additional mobile optimizations for Samsung S24
document.addEventListener('DOMContentLoaded', function() {
    // Check if device is Samsung S24 or similar mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);
    
    // Add mobile-specific class to body for additional styling
    if (isMobile) {
        document.body.classList.add('mobile-device');
        
        if (isSamsungBrowser) {
            document.body.classList.add('samsung-browser');
        }
    }
    
    // Add vibration feedback for touch interactions on supported devices
    const touchElements = document.querySelectorAll('.btn, .accordion-header, .nav-links a, .feature-card');
    
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            // Provide subtle haptic feedback if supported
            if ('vibrate' in navigator) {
                navigator.vibrate(5); // Very subtle 5ms vibration
            }
        });
    });
    
    // Add offline status indicator in header
    const header = document.querySelector('header .container');
    
    if (header) {
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'connection-status';
        statusIndicator.innerHTML = `
            <span class="status-indicator ${navigator.onLine ? 'online' : 'offline'}"></span>
            <span class="status-text">${navigator.onLine ? 'Online' : 'Offline'}</span>
        `;
        
        header.appendChild(statusIndicator);
        
        // Update status when online/offline status changes
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
        
        function updateConnectionStatus() {
            const indicator = document.querySelector('.status-indicator');
            const text = document.querySelector('.status-text');
            
            if (navigator.onLine) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
                text.textContent = 'Online';
            } else {
                indicator.classList.remove('online');
                indicator.classList.add('offline');
                text.textContent = 'Offline';
            }
        }
    }
    
    // Add pull-to-refresh functionality for mobile
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        // Check if user pulled down at the top of the page
        if (window.scrollY === 0 && touchEndY > touchStartY && (touchEndY - touchStartY) > 100) {
            // Show refresh indicator
            const refreshIndicator = document.createElement('div');
            refreshIndicator.className = 'refresh-indicator';
            refreshIndicator.textContent = 'Refreshing...';
            document.body.appendChild(refreshIndicator);
            
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }
    
    // Add double-tap to zoom for images on Samsung devices
    const images = document.querySelectorAll('.feature-icon img, .hero-image img');
    
    images.forEach(img => {
        let lastTap = 0;
        
        img.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                
                // Toggle zoom class
                this.classList.toggle('zoomed');
            }
            
            lastTap = currentTime;
        });
    });
    
    // Add swipe navigation for mobile
    let touchStartX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        // If swipe distance is significant
        if (Math.abs(diff) > 100) {
            // Right to left swipe (next section)
            if (diff > 0) {
                navigateToNextSection();
            } 
            // Left to right swipe (previous section)
            else {
                navigateToPreviousSection();
            }
        }
    }, false);
    
    function navigateToNextSection() {
        const sections = document.querySelectorAll('section');
        const currentSection = getCurrentSection(sections);
        
        if (currentSection < sections.length - 1) {
            sections[currentSection + 1].scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    function navigateToPreviousSection() {
        const sections = document.querySelectorAll('section');
        const currentSection = getCurrentSection(sections);
        
        if (currentSection > 0) {
            sections[currentSection - 1].scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    function getCurrentSection(sections) {
        const scrollPosition = window.scrollY + window.innerHeight / 3;
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                return i;
            }
        }
        
        return 0;
    }
    
    // Add Samsung-specific install prompt enhancement
    if (isSamsungBrowser) {
        const installButton = document.getElementById('install-button');
        
        if (installButton) {
            // Make install button more prominent on Samsung devices
            installButton.classList.add('samsung-install-btn');
            
            // Add Samsung-specific installation instructions
            const installNote = document.querySelector('.install-note');
            if (installNote) {
                installNote.innerHTML += '<br>For Samsung devices: Tap the menu button (three dots) and select "Add page to" then "Home screen"';
            }
        }
    }
});
