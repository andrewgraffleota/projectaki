// Live Timetable Chatbot
class LiveTimetableChatbot {
    constructor() {
        this.apiBaseUrl = '/api'; // Same domain
        this.isOpen = false;
        this.isLoading = false;
        this.useLLM = true;
        this.systemPrompt = 'You are a helpful assistant for Whitireia and WelTec timetables and IT enquiries. Answer concisely and accurately.';
        this.timetableContext = 'Students should use the Programmes tab, select Student Group(s), and Weeks, then View Timetable. Campuses: PC (Petone Construction J-Block), PE (Petone), PW (Porirua), TA (Te Auaha).';
        this.selectedModel = 'deepseek-r1:8b';
        
        this.createChatbotHTML();
        this.initializeEventListeners();
        
        console.log('🤖 Live Timetable Chatbot initialized');
    }

    createChatbotHTML() {
        const chatbotHTML = `
        <div class="chatbot-widget" id="chatbotWidget">
            <button class="chatbot-toggle" id="chatbotToggle">
                <span id="toggleIcon">💬</span>
                <div class="notification-badge" id="notificationBadge" style="display: none;">!</div>
            </button>

            <div class="chatbot-container" id="chatbotContainer">
                <div class="chat-header">
                    <div class="chat-header-content">
                        <div class="avatar">🏫</div>
                        <div>
                            <h3>ĀKI — Virtual Assistant</h3>
                            <p><span class="status-indicator"></span>Connected to <span id="modelStatus">DeepSeek (local)</span></p>
                            <p style="margin:4px 0 0; font-size:11px; opacity:0.85;">Whitireia & WelTec</p>
                        </div>
                    </div>
                    <div>
                        <button class="expand-btn" title="Expand">⤢</button>
                        <button class="close-btn">✕</button>
                    </div>
                </div>

                <div class="chat-messages" id="chatMessages">
                    <div class="message bot">
                        <div class="avatar">🤖</div>
                        <div class="message-content">
                            <div><strong>Kia ora!</strong> I’m ĀKI. Ask me anything about IT or timetables.</div>
                        </div>
                    </div>
                </div>

                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <input type="text" class="chat-input" id="chatInput" placeholder="Ask anything about IT or timetables...">
                        <button class="send-btn" id="sendBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .chatbot-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .chatbot-toggle {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #1b2550 0%, #0f1a3a 100%);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                transition: all 0.3s ease;
                animation: pulse 3s infinite;
            }

            @keyframes pulse {
                0% { box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 0 rgba(27, 37, 80, 0.6); }
                70% { box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 12px rgba(27, 37, 80, 0); }
                100% { box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 0 rgba(27, 37, 80, 0); }
            }

            .chatbot-container {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 400px;
                height: 600px;
                background: #0f1530;
                border-radius: 16px;
                box-shadow: 0 25px 70px rgba(0,0,0,0.6);
                display: none;
                flex-direction: column;
                overflow: hidden;
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.4s ease;
            }

            .chatbot-container.active {
                display: flex;
                transform: translateY(0);
                opacity: 1;
            }

            .chat-header {
                background: linear-gradient(135deg, #1b2550 0%, #0f1a3a 100%);
                color: white;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 4px solid #0d47a1;
            }

            .chat-header-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }

            .chat-header h3 {
                margin: 0;
                font-size: 16px;
            }

            .chat-header p {
                margin: 0;
                font-size: 12px;
                opacity: 0.9;
            }

            .status-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: #4caf50;
                border-radius: 50%;
                margin-right: 5px;
                animation: blink 2s infinite;
            }

            .close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
            }

            .expand-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                margin-right: 8px;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #0b1020;
            }

            .message {
                margin-bottom: 16px;
                animation: fadeInUp 0.3s ease-out;
            }

            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .message.bot {
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }

            .message.user {
                display: flex;
                justify-content: flex-end;
            }

            .message .avatar {
                background: linear-gradient(135deg, #1b2550 0%, #0f1a3a 100%);
                color: white;
                flex-shrink: 0;
            }

            .message-content {
                background: #141c3f;
                padding: 12px 16px;
                border-radius: 16px;
                max-width: 80%;
                font-size: 14px;
                line-height: 1.5;
                color: #e6e9f0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            .message.user .message-content {
                background: #1b2550;
                color: #e6e9f0;
                border: 1px solid #2a3e8f;
            }

            .quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .quick-action-btn {
                background: rgba(159, 176, 227, 0.12);
                border: 1px solid rgba(159, 176, 227, 0.25);
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 12px;
                color: #c3cff6;
                cursor: pointer;
                transition: all 0.2s;
            }

            .quick-action-btn:hover {
                background: rgba(159, 176, 227, 0.2);
            }

            .chat-input-container {
                padding: 16px;
                background: #0f1530;
                border-top: 1px solid #212a55;
            }

            .chat-settings {
                margin-bottom: 10px;
                background: #f3f6fb;
                border: 1px solid #e0e7f5;
                border-radius: 8px;
                padding: 8px 12px;
            }
            .chat-settings summary {
                cursor: pointer;
                color: #1e3c72;
                font-weight: 600;
            }
            .settings-row {
                display: flex;
                gap: 8px;
                align-items: center;
                margin: 8px 0;
            }
            .settings-textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 8px;
                border: 1px solid #ccd6eb;
                border-radius: 6px;
                margin: 6px 0 10px;
                font-size: 13px;
                background: #fff;
                resize: vertical;
            }
            .settings-label { font-size: 12px; color: #2a5298; }

            .chat-input-wrapper {
                display: flex;
                gap: 8px;
                align-items: center;
                background: #141c3f;
                border-radius: 24px;
                padding: 6px;
            }

            .chat-input {
                flex: 1;
                border: none;
                padding: 10px 16px;
                border-radius: 24px;
                font-size: 14px;
                outline: none;
                background: transparent;
                color: #e6e9f0;
            }

            .send-btn {
                background: linear-gradient(135deg, #1b2550 0%, #0f1a3a 100%);
                color: white;
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .notification-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ff4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }

            .timetable-result {
                background: #182246;
                border-left: 4px solid #2a3e8f;
                padding: 12px;
                margin: 8px 0;
                border-radius: 0 8px 8px 0;
                font-size: 13px;
                color: #d5dcf4;
            }

            .error-message {
                background: #2b1e24;
                color: #ff8a80;
                padding: 10px;
                border-radius: 6px;
                margin: 8px 0;
            }

            @media (max-width: 768px) {
                .chatbot-container {
                    width: calc(100vw - 20px);
                    height: calc(100vh - 20px);
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                }
            }

            /* Fullscreen toggle */
            .chatbot-container.full {
                position: fixed;
                bottom: 10px;
                right: 10px;
                left: 10px;
                top: 10px;
                width: auto;
                height: auto;
            }

            /* Day theme overrides */
            body.theme-day .chatbot-container { background: #ffffff; }
            body.theme-day .chat-header { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); color: #0b1020; border-bottom-color: #90caf9; }
            body.theme-day .message .avatar { background: linear-gradient(135deg, #64b5f6 0%, #1e88e5 100%); }
            body.theme-day .chat-messages { background: #f5f7fb; }
            body.theme-day .message-content { background: #ffffff; color: #0b1020; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            body.theme-day .message.user .message-content { background: #e3f2fd; color: #0b1020; border-color: #90caf9; }
            body.theme-day .chat-input-container { background: #ffffff; border-top-color: #e0e0e0; }
            body.theme-day .chat-input-wrapper { background: #f1f5ff; }
            body.theme-day .chat-input { color: #0b1020; }
            body.theme-day .send-btn { background: linear-gradient(135deg, #64b5f6 0%, #1e88e5 100%); }
            body.theme-day .quick-action-btn { background: rgba(30, 136, 229, 0.08); border-color: rgba(30, 136, 229, 0.2); color: #1565c0; }
            body.theme-day .quick-action-btn:hover { background: rgba(30, 136, 229, 0.16); }
            body.theme-day .timetable-result { background: #e8f1ff; border-left-color: #1e88e5; color: #0b1020; }
            body.theme-day .error-message { background: #ffebee; color: #c62828; }
        </style>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    initializeEventListeners() {
        const toggle = document.getElementById('chatbotToggle');
        const closeBtn = document.querySelector('.close-btn');
        const expandBtn = document.querySelector('.expand-btn');
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');
        // settings now managed on main page; we only read from localStorage

        toggle.addEventListener('click', () => this.toggleChatbot());
        closeBtn.addEventListener('click', () => this.toggleChatbot());
        sendBtn.addEventListener('click', () => this.sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        expandBtn.addEventListener('click', () => {
            const container = document.getElementById('chatbotContainer');
            container.classList.toggle('full');
        });

        // initialize settings by loading from local storage
        this.loadSettings();
        
        // update model status display
        this.updateModelStatus();

        // Show notification after delay
        setTimeout(() => {
            if (!this.isOpen) {
                document.getElementById('notificationBadge').style.display = 'flex';
            }
        }, 3000);
    }

    openSettings() {
        const settings = document.getElementById('chatSettings');
        if (settings && !settings.open) settings.open = true;
    }

    persistSettings() {
        try {
            localStorage.setItem('chatbot.useLLM', JSON.stringify(this.useLLM));
            localStorage.setItem('chatbot.systemPrompt', this.systemPrompt || '');
            localStorage.setItem('chatbot.timetableContext', this.timetableContext || '');
            localStorage.setItem('chatbot.selectedModel', this.selectedModel || '');
        } catch (_) { /* ignore */ }
    }

    loadSettings() {
        try {
            const useLLM = localStorage.getItem('chatbot.useLLM');
            const systemPrompt = localStorage.getItem('chatbot.systemPrompt');
            const timetableContext = localStorage.getItem('chatbot.timetableContext');
            const selectedModel = localStorage.getItem('chatbot.selectedModel');
            if (useLLM !== null) this.useLLM = JSON.parse(useLLM);
            if (systemPrompt) this.systemPrompt = systemPrompt;
            if (timetableContext) this.timetableContext = timetableContext;
            if (selectedModel) this.selectedModel = selectedModel;
        } catch (_) { /* ignore */ }
    }

    updateModelStatus() {
        const modelStatus = document.getElementById('modelStatus');
        if (modelStatus) {
            let displayName = 'DeepSeek (local)';
            if (this.selectedModel === 'llama3.2:latest') {
                displayName = 'Illama 3.2 (local)';
            } else if (this.selectedModel === 'gemma3:4b') {
                displayName = 'Gemma 3 4B (local)';
            } else if (this.selectedModel === 'phi3:3.8b') {
                displayName = 'Phi3 3.8B (local)';
            }
            modelStatus.textContent = displayName;
        }
    }

    toggleChatbot() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('chatbotContainer');
        const icon = document.getElementById('toggleIcon');
        const badge = document.getElementById('notificationBadge');

        if (this.isOpen) {
            container.classList.add('active');
            icon.textContent = '✕';
            badge.style.display = 'none';
            setTimeout(() => document.getElementById('chatInput').focus(), 300);
        } else {
            container.classList.remove('active');
            icon.textContent = '💬';
        }
    }

    addMessage(content, isUser = false, quickActions = []) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

        if (isUser) {
            messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
        } else {
            const actionsHTML = quickActions.length > 0 ? 
                `<div class="quick-actions">
                    ${quickActions.map(action => 
                        `<button class="quick-action-btn" onclick="chatbot.sendQuickMessage('${action}')">${action}</button>`
                    ).join('')}
                </div>` : '';

            messageDiv.innerHTML = `
                <div class="avatar">🤖</div>
                <div class="message-content">
                    <div>${content}</div>
                    ${actionsHTML}
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async performLiveSearch(searchTerm) {
        this.addMessage(`Searching for: ${searchTerm}`, true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/search/${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.success && data.results.length > 0) {
                let resultHTML = `🔍 <strong>Found ${data.results.length} result(s):</strong><br><br>`;
                
                data.results.forEach((result, index) => {
                    resultHTML += `<div class="timetable-result">
                        <strong>${result.programme_code}</strong> - ${result.programme_name}<br>
                        📅 ${result.day} ${result.time}<br>
                        📍 ${result.room} | 👨‍🏫 ${result.lecturer}<br>
                        🏢 ${result.campus} Campus
                    </div>`;
                });
                
                this.addMessage(resultHTML, false, ['Get room info', 'New search', 'Contact support']);
            } else {
                this.addMessage(`No results found for "${searchTerm}". Try searching for specific programme names or codes.`, false, ['Try "nursing"', 'Try "IT"', 'Browse all']);
            }
        } catch (error) {
            this.addMessage('Sorry, I encountered an error searching the timetable. Please check your connection.', false);
        }
    }

    async getRoomInfo(roomCode) {
        this.addMessage(`Looking up room: ${roomCode}`, true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/room/${roomCode}`);
            const data = await response.json();

            if (data.success) {
                const room = data.room;
                const roomHTML = `📍 <strong>Room Information:</strong><br><br>
                <div class="timetable-result">
                    <strong>${room.code}</strong> - ${room.name}<br>
                    🏢 Building: ${room.building}<br>
                    🏫 Campus: ${room.campus}<br>
                    👥 Capacity: ${room.capacity} students
                </div>`;
                
                this.addMessage(roomHTML, false, ['Get directions', 'Find nearby rooms', 'Check availability']);
            } else {
                this.addMessage(`Room "${roomCode}" not found. Please check the room code.`, false, ['Try PE101', 'Try PW-A12', 'Room list']);
            }
        } catch (error) {
            this.addMessage('Sorry, I encountered an error looking up the room information.', false);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;

        input.value = '';
        this.addMessage(message, true);

        // Simple keyword matching for demo
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('programme')) {
            const searchMatch = message.match(/search\s+(.*?)$/i) || message.match(/find\s+(.*?)$/i);
            const searchTerm = searchMatch ? searchMatch[1] : 'nursing';
            await this.performLiveSearch(searchTerm);
        } else if (lowerMessage.includes('room') || /\b(PE|PW|WH|WT)\d+\b/i.test(message)) {
            const roomMatch = message.match(/\b(PE|PW|WH|WT)\d+[A-Z]?\b/i);
            const roomCode = roomMatch ? roomMatch[0] : 'PE101';
            await this.getRoomInfo(roomCode);
        } else {
            // No suggestions; forward directly to the model if enabled
            // If LLM is enabled, forward the message to the model
            if (this.useLLM) {
                const thinkingId = this.addThinking();
                try {
                    const reply = await this.callLLM(message);
                    this.replaceThinking(thinkingId, reply || '');
                } catch (err) {
                    this.replaceThinking(thinkingId, 'Sorry, I could not get an AI response right now.');
                }
            }
        }
    }

    addThinking() {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        const id = 'thinking-' + Date.now();
        messageDiv.id = id;
        messageDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="message-content">Thinking…</div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    replaceThinking(id, content) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="message-content">${this.escapeHtml(content).replace(/\n/g, '<br>')}</div>
        `;
    }

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }

    async callLLM(message) {
        const body = {
            message,
            systemPrompt: this.systemPrompt,
            timetableContext: this.timetableContext,
            history: []
        };
        // model selection is currently backend-driven; optionally pass via header
        try {
            const res = await fetch(`${this.apiBaseUrl}/llm/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Ollama-Model': this.selectedModel },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data?.success) return data.reply;
            throw new Error(data?.error || 'LLM failed');
        } catch (e) {
            throw e;
        }
    }

    sendQuickMessage(message) {
        // Minimal quick handler: just echo to LLM path
        this.addMessage(message, true);
        if (this.useLLM) {
            const id = this.addThinking();
            this.callLLM(message)
                .then(reply => this.replaceThinking(id, reply || ''))
                .catch(() => this.replaceThinking(id, 'Sorry, I could not get an AI response right now.'));
        }
    }
}

// Initialize chatbot when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatbot = new LiveTimetableChatbot();
    });
} else {
    window.chatbot = new LiveTimetableChatbot();
}