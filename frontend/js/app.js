// Chat Application JavaScript
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentGroup = 1; // Default to Fun Friday Group
        this.isAnonymous = false;
        this.isTyping = false;
        this.typingTimeout = null;
        this.isLoggedIn = false;
        
        this.initializeElements();
        this.showLoginModal();
        this.bindEvents();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.anonymousToggle = document.getElementById('anonymousToggle');
        this.anonymousBanner = document.getElementById('anonymousBanner');
        this.anonymousStatus = document.getElementById('anonymousStatus');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Login modal elements
        this.loginModal = document.getElementById('loginModal');
        this.userNameInput = document.getElementById('userNameInput');
        this.joinAnonymousCheckbox = document.getElementById('joinAnonymous');
        this.joinBtn = document.getElementById('joinBtn');
        this.nameError = document.getElementById('nameError');
        
        // Header elements
        this.groupStatus = document.querySelector('.group-status');
    }

    initializeSocket() {
        if (!this.isLoggedIn) return;
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.hideConnectionStatus();
            this.socket.emit('join-group', this.currentGroup);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showConnectionStatus('Reconnecting...');
        });

        this.socket.on('new-message', (messageData) => {
            this.addMessage(messageData);
        });

        this.socket.on('user-typing', (data) => {
            this.handleTypingIndicator(data);
        });

        this.socket.on('message-error', (error) => {
            console.error('Message error:', error);
            this.showError('Failed to send message');
        });
    }

    bindEvents() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            } else {
                this.handleTyping();
            }
        });

        // Anonymous mode toggle
        this.anonymousToggle.addEventListener('click', () => {
            this.toggleAnonymousMode();
        });

        // Stop typing when input loses focus
        this.messageInput.addEventListener('blur', () => {
            this.stopTyping();
        });

        // Login modal events
        this.userNameInput.addEventListener('input', () => {
            this.validateNameInput();
        });

        this.userNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.joinBtn.disabled) {
                this.joinChat();
            }
        });

        this.joinAnonymousCheckbox.addEventListener('change', () => {
            this.updateJoinAsAnonymous();
        });

        this.joinBtn.addEventListener('click', () => {
            this.joinChat();
        });

        // Update time every minute
        setInterval(() => {
            this.updateTime();
        }, 60000);
    }

    showLoginModal() {
        this.loginModal.classList.remove('hidden');
        this.userNameInput.focus();
    }

    hideLoginModal() {
        this.loginModal.classList.add('hidden');
    }

    validateNameInput() {
        const name = this.userNameInput.value.trim();
        this.nameError.textContent = '';
        
        if (name.length === 0) {
            this.joinBtn.disabled = true;
            return false;
        }
        
        if (name.length > 50) {
            this.nameError.textContent = 'Name must be 50 characters or less';
            this.joinBtn.disabled = true;
            return false;
        }
        
        this.joinBtn.disabled = false;
        return true;
    }

    updateJoinAsAnonymous() {
        const isChecked = this.joinAnonymousCheckbox.checked;
        if (isChecked) {
            this.userNameInput.placeholder = 'Enter your name (will appear as Anonymous)';
        } else {
            this.userNameInput.placeholder = 'Enter your name...';
        }
    }

    async joinChat() {
        if (!this.validateNameInput()) {
            return;
        }

        const displayName = this.userNameInput.value.trim();
        const joinAsAnonymous = this.joinAnonymousCheckbox.checked;

        try {
            this.joinBtn.disabled = true;
            this.joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';

            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    displayName: displayName,
                    isAnonymous: joinAsAnonymous
                })
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.isAnonymous = joinAsAnonymous;
                this.isLoggedIn = true;
                
                console.log('Current user:', this.currentUser);
                
                // Initialize socket connection
                this.initializeSocket();
                
                // Hide login modal
                this.hideLoginModal();
                
                // Update UI
                this.updateUserInterface();
                
                // Load existing messages
                await this.loadMessages();
                
            } else {
                const error = await response.json();
                this.nameError.textContent = error.error || 'Failed to join chat';
            }
            
        } catch (error) {
            console.error('Error joining chat:', error);
            this.nameError.textContent = 'Failed to join chat. Please try again.';
        } finally {
            this.joinBtn.disabled = false;
            this.joinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Chat';
        }
    }

    updateUserInterface() {
        // Update group status to show current user
        if (this.currentUser) {
            const currentName = this.isAnonymous ? 'Anonymous' : this.currentUser.display_name;
            this.groupStatus.innerHTML = `You're chatting as: <span class="current-user-indicator">${currentName}</span>`;
        }

        // Update anonymous toggle state
        if (this.isAnonymous) {
            this.anonymousToggle.classList.add('active');
            this.anonymousBanner.classList.remove('hidden');
            this.anonymousStatus.classList.remove('hidden');
        }
    }

    async loadInitialData() {
        // This method is now called after successful login
        try {
            await this.loadMessages();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load chat data');
        }
    }

    async loadMessages() {
        try {
            const response = await fetch(`/api/groups/${this.currentGroup}/messages`);
            if (response.ok) {
                const messages = await response.json();
                this.chatMessages.innerHTML = '';
                messages.forEach(message => this.addMessage(message, false));
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.currentUser) {
            return;
        }

        // Stop typing indicator
        this.stopTyping();

        // Send message via socket
        this.socket.emit('send-message', {
            groupId: this.currentGroup,
            userId: this.currentUser.userId,
            message: message,
            isAnonymous: this.isAnonymous
        });

        // Clear input
        this.messageInput.value = '';
        this.sendBtn.disabled = false;
    }

    addMessage(messageData, animate = true) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // Check if it's own message
        const isOwnMessage = this.currentUser && messageData.user_id === this.currentUser.userId;
        if (isOwnMessage) {
            messageElement.classList.add('own');
        }

        // Check for special styling (highlighted or red bubble)
        if (messageData.message_text.includes('Excited For this Event')) {
            messageElement.classList.add('highlighted');
        }
        if (messageData.message_text.includes('Guysss 🔥') || 
            messageData.message_text.includes('not attending this event')) {
            messageElement.classList.add('red-bubble');
        }

        const time = this.formatTime(new Date(messageData.created_at));
        
        // Determine display name based on anonymous status
        let displayName;
        if (messageData.is_anonymous) {
            displayName = 'Anonymous';
        } else {
            displayName = messageData.display_name;
        }
        
        // For own messages, use current anonymous state if different from stored state
        if (isOwnMessage) {
            displayName = this.isAnonymous ? 'Anonymous' : this.currentUser.display_name;
        }
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                ${this.getAvatarContent(displayName)}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${displayName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-bubble">
                    ${this.escapeHtml(messageData.message_text)}
                </div>
            </div>
        `;

        if (animate) {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateY(20px)';
        }

        this.chatMessages.appendChild(messageElement);

        if (animate) {
            requestAnimationFrame(() => {
                messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageElement.style.opacity = '1';
                messageElement.style.transform = 'translateY(0)';
            });
        }

        this.scrollToBottom();
    }

    getAvatarContent(displayName) {
        if (displayName === 'Anonymous') {
            return '<i class="fas fa-user-secret"></i>';
        }
        return displayName.charAt(0).toUpperCase();
    }

    handleTyping() {
        if (!this.isTyping && this.currentUser) {
            this.isTyping = true;
            this.socket.emit('typing', {
                groupId: this.currentGroup,
                userId: this.currentUser.userId,
                isTyping: true,
                displayName: this.isAnonymous ? 'Anonymous' : this.currentUser.display_name
            });
        }

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set new timeout to stop typing indicator
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping && this.currentUser) {
            this.isTyping = false;
            this.socket.emit('typing', {
                groupId: this.currentGroup,
                userId: this.currentUser.userId,
                isTyping: false,
                displayName: this.isAnonymous ? 'Anonymous' : this.currentUser.display_name
            });
        }

        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    handleTypingIndicator(data) {
        if (data.userId === this.currentUser?.userId) {
            return; // Don't show typing indicator for own messages
        }

        if (data.isTyping) {
            this.typingIndicator.classList.remove('hidden');
            this.typingIndicator.querySelector('.typing-text').textContent = `${data.displayName} is typing...`;
            this.scrollToBottom();
        } else {
            this.typingIndicator.classList.add('hidden');
        }
    }

    toggleAnonymousMode() {
        if (!this.currentUser) return;
        
        this.isAnonymous = !this.isAnonymous;
        
        if (this.isAnonymous) {
            this.anonymousToggle.classList.add('active');
            this.anonymousBanner.classList.remove('hidden');
            this.anonymousStatus.classList.remove('hidden');
        } else {
            this.anonymousToggle.classList.remove('active');
            this.anonymousBanner.classList.add('hidden');
            this.anonymousStatus.classList.add('hidden');
        }

        // Update banner text
        const bannerText = this.isAnonymous ? 
            'Anonymously Chat group With Anonymous ON' : 
            'Anonymously Chat group With Anonymous OFF';
        this.anonymousBanner.querySelector('span').textContent = bannerText;

        // Update user interface
        this.updateUserInterface();
    }

    showConnectionStatus(message) {
        this.connectionStatus.querySelector('span').textContent = message;
        this.connectionStatus.classList.remove('hidden');
    }

    hideConnectionStatus() {
        this.connectionStatus.classList.add('hidden');
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper toast system
        console.error(message);
        this.showConnectionStatus(message);
        setTimeout(() => {
            this.hideConnectionStatus();
        }, 3000);
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    formatTime(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }

    updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: false 
        });
        document.querySelector('.time').textContent = timeStr;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Utility functions for message formatting
function formatMessage(text) {
    // Add emoji support and basic formatting
    return text
        .replace(/:\)/g, '😊')
        .replace(/:\(/g, '😞')
        .replace(/:D/g, '😃')
        .replace(/🔥/g, '🔥'); // Keep fire emoji as is
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});

// Handle window focus/blur for typing indicators
window.addEventListener('focus', () => {
    if (window.chatApp) {
        window.chatApp.stopTyping();
    }
});

window.addEventListener('beforeunload', () => {
    if (window.chatApp) {
        window.chatApp.stopTyping();
    }
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}