/**
 * AI Tab Assistant - Side Panel Script
 * 
 * Main chat interface for the AI Tab Assistant extension.
 * Handles file upload, typing effect animations, conversation history,
 * and chat management features.
 * 
 * @copyright 2025 Volar Agency (https://thevolar.com)
 * @license MIT
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 */

// Global error handler for extension context issues
window.addEventListener('error', (event) => {
  if (event.message?.includes('Extension context invalidated')) {
    handleContextInvalidated();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Extension context invalidated')) {
    handleContextInvalidated();
  }
});

// Handle extension context invalidation
function handleContextInvalidated() {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #0a0a0f;
      color: #f0f0f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <div style="
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 18px;">Extension Updated</h2>
      <p style="margin: 0 0 20px; color: #a0a0b0; font-size: 14px;">Please refresh to continue</p>
      <button onclick="location.reload()" style="
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
      ">Refresh Panel</button>
    </div>
  `;
}

// Wrap chrome.runtime.sendMessage with error handling
async function safeSendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error.message?.includes('Extension context invalidated') || 
        error.message?.includes('Cannot read properties of undefined')) {
      handleContextInvalidated();
      throw error;
    }
    throw error;
  }
}

// Elements
const elements = {
  tabIndicator: document.getElementById('tabIndicator'),
  tabFavicon: document.getElementById('tabFavicon'),
  tabTitle: document.getElementById('tabTitle'),
  tabUrl: document.getElementById('tabUrl'),
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  savedChatsBtn: document.getElementById('savedChatsBtn'),
  chatsDropdown: document.getElementById('chatsDropdown'),
  chatsList: document.getElementById('chatsList'),
  messages: document.getElementById('messages'),
  welcome: document.getElementById('welcome'),
  suggestions: document.getElementById('suggestions'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  fileInput: document.getElementById('fileInput'),
  filePreview: document.getElementById('filePreview'),
  filePreviewName: document.getElementById('filePreviewName'),
  filePreviewSize: document.getElementById('filePreviewSize'),
  filePreviewRemove: document.getElementById('filePreviewRemove')
};

// State
let conversationHistory = [];
let isLoading = false;
let hasApiKey = false;
let currentFile = null;
let currentChatId = null;
let savedChats = [];

/**
 * Initialize panel
 */
async function init() {
  try {
    // Check for API key
    const settings = await safeSendMessage({ action: 'getSettings' });
    hasApiKey = !!settings?.apiKey;

    if (!hasApiKey) {
      showNoApiKeyWarning();
    }

    // Get current tab data
    const tabData = await safeSendMessage({ action: 'getTabData' });
    updateTabDisplay(tabData);

    // Load saved chats
    await loadSavedChats();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Init failed:', error);
    if (error.message?.includes('Extension context invalidated')) {
      handleContextInvalidated();
    }
  }
}

/**
 * Show no API key warning
 */
function showNoApiKeyWarning() {
  elements.welcome.innerHTML = `
    <div class="no-api-key">
      <p>⚠️ OpenAI API key not configured</p>
      <button id="setupApiKey">Set up API Key</button>
    </div>
  `;
  
  document.getElementById('setupApiKey')?.addEventListener('click', openSettings);
}

/**
 * Update tab display
 */
function updateTabDisplay(data) {
  if (!data || !data.tabId) {
    elements.tabIndicator.classList.add('inactive');
    elements.tabTitle.textContent = 'No tab selected';
    elements.tabUrl.textContent = '-';
    return;
  }

  elements.tabIndicator.classList.remove('inactive');
  elements.tabTitle.textContent = data.title || 'Untitled';
  elements.tabUrl.textContent = truncateUrl(data.url) || '-';

  // Update favicon
  if (data.favicon) {
    elements.tabFavicon.innerHTML = `<img src="${data.favicon}" alt="">`;
  } else {
    elements.tabFavicon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    `;
  }
}

/**
 * Truncate URL for display
 */
function truncateUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    let display = parsed.hostname + parsed.pathname;
    if (display.length > 40) {
      display = display.substring(0, 37) + '...';
    }
    return display;
  } catch {
    return url.substring(0, 40);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Settings button
  elements.settingsBtn.addEventListener('click', openSettings);

  // Refresh button
  elements.refreshBtn.addEventListener('click', refreshTabContent);

  // New chat button
  elements.newChatBtn.addEventListener('click', startNewChat);

  // Saved chats button
  elements.savedChatsBtn.addEventListener('click', toggleChatsDropdown);

  // Send button
  elements.sendBtn.addEventListener('click', sendMessage);

  // File upload
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.filePreviewRemove.addEventListener('click', removeFile);

  // Input field
  elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  elements.messageInput.addEventListener('input', () => {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 100) + 'px';
  });

  // Suggestion buttons
  elements.suggestions?.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-btn')) {
      elements.messageInput.value = e.target.textContent;
      sendMessage();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      elements.chatsDropdown.classList.remove('visible');
    }
  });

  // Listen for tab updates from background
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'tabUpdated') {
        updateTabDisplay(message.data);
      }
    });
  } catch (error) {
    console.error('Failed to add message listener:', error);
    handleContextInvalidated();
  }
}

/**
 * Open settings page
 */
function openSettings() {
  safeSendMessage({ action: 'openSettings' });
}

/**
 * Refresh tab content
 */
async function refreshTabContent() {
  elements.refreshBtn.classList.add('loading');
  
  try {
    const result = await safeSendMessage({ action: 'refreshTab' });
    if (result.success) {
      updateTabDisplay(result.data);
    }
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    elements.refreshBtn.classList.remove('loading');
  }
}

/**
 * Handle file selection
 */
async function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Size limit: 10MB
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Maximum size is 10MB.');
    return;
  }

  try {
    const content = await readFileContent(file);
    currentFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      content: content
    };

    // Update preview
    elements.filePreviewName.textContent = file.name;
    elements.filePreviewSize.textContent = formatFileSize(file.size);
    elements.filePreview.classList.add('visible');
  } catch (error) {
    console.error('Failed to read file:', error);
    alert('Failed to read file: ' + error.message);
  }

  // Clear input so same file can be selected again
  elements.fileInput.value = '';
}

/**
 * Read file content
 */
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read as text for text files, or as data URL for others
    if (file.type.startsWith('text/') || 
        file.name.match(/\.(txt|md|json|csv|xml|html|js|ts|py|java|cpp|c|h|css|scss|yaml|yml|log)$/i)) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Remove attached file
 */
function removeFile() {
  currentFile = null;
  elements.filePreview.classList.remove('visible');
}

/**
 * Send message to AI
 */
async function sendMessage() {
  const message = elements.messageInput.value.trim();
  
  if ((!message && !currentFile) || isLoading) return;

  // Check API key
  if (!hasApiKey) {
    const settings = await safeSendMessage({ action: 'getSettings' });
    hasApiKey = !!settings.apiKey;
    
    if (!hasApiKey) {
      addMessage('error', 'Please configure your OpenAI API key in settings first.');
      return;
    }
  }

  // Hide welcome screen
  if (elements.welcome) {
    elements.welcome.style.display = 'none';
  }

  // Build user message with file
  let userContent = message;
  let displayMessage = message;
  
  if (currentFile) {
    displayMessage = message || `Analyze this file: ${currentFile.name}`;
    userContent = `${message ? message + '\n\n' : ''}[ATTACHED FILE: ${currentFile.name}]\n\`\`\`\n${currentFile.content.slice(0, 50000)}\n\`\`\``;
  }

  // Add user message to UI
  addMessage('user', displayMessage, currentFile?.name);
  
  // Clear input and file
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';
  const attachedFile = currentFile;
  removeFile();

  // Create assistant message placeholder for typing effect
  const assistantMsgId = 'msg-' + Date.now();
  addMessagePlaceholder(assistantMsgId);

  // Show typing state
  isLoading = true;
  elements.sendBtn.disabled = true;

  try {
    // Send to background for AI processing
    const result = await safeSendMessage({
      action: 'chat',
      userMessage: userContent,
      history: conversationHistory
    });

    if (result.success) {
      // Add to conversation history
      conversationHistory.push({ role: 'user', content: userContent });
      conversationHistory.push({ role: 'assistant', content: result.response });

      // Keep history manageable (last 20 messages)
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }

      // Type out response
      await typeMessage(assistantMsgId, result.response);

      // Auto-save chat
      await saveCurrentChat();
    } else {
      removeMessagePlaceholder(assistantMsgId);
      addMessage('error', result.error || 'Failed to get response');
    }
  } catch (error) {
    removeMessagePlaceholder(assistantMsgId);
    addMessage('error', error.message || 'An error occurred');
  } finally {
    isLoading = false;
    elements.sendBtn.disabled = false;
    elements.messageInput.focus();
  }
}

/**
 * Add message to chat
 */
function addMessage(type, content, fileName = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';

  if (type === 'assistant' || type === 'error') {
    avatar.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>`;
  } else {
    avatar.textContent = 'U';
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // Add file indicator if present
  if (fileName) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'message-file';
    fileDiv.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      ${escapeHtml(fileName)}
    `;
    contentDiv.appendChild(fileDiv);
  }

  const textDiv = document.createElement('div');
  // For user messages, just escape HTML. For assistant/error, format markdown
  if (type === 'user') {
    textDiv.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');
  } else {
    textDiv.innerHTML = formatMessage(content);
  }
  contentDiv.appendChild(textDiv);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  elements.messages.appendChild(messageDiv);

  // Scroll to bottom
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Add message placeholder with loading spinner
 */
function addMessagePlaceholder(id) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant typing';
  messageDiv.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `
    <div class="message-loading">
      <div class="message-spinner"></div>
      <span>Thinking...</span>
    </div>
  `;

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  elements.messages.appendChild(messageDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Remove message placeholder
 */
function removeMessagePlaceholder(id) {
  const element = document.getElementById(id);
  if (element) element.remove();
}

/**
 * Type out message with formatting applied during typing
 */
async function typeMessage(id, content) {
  const element = document.getElementById(id);
  if (!element) return;

  const contentDiv = element.querySelector('.message-content');
  
  // Set up typing structure: bubble for text + footer with spinner
  contentDiv.innerHTML = `
    <div class="message-bubble"></div>
    <div class="typing-footer">
      <div class="message-spinner"></div>
    </div>
  `;
  
  const textBubble = contentDiv.querySelector('.message-bubble');
  const typingFooter = contentDiv.querySelector('.typing-footer');
  
  // Build up raw text and format incrementally
  let rawText = '';
  const chars = content.split('');
  let index = 0;
  const baseSpeed = 6; // Slightly faster
  
  return new Promise((resolve) => {
    function typeChar() {
      if (index < chars.length) {
        rawText += chars[index];
        index++;
        
        // Format the accumulated text and display it
        textBubble.innerHTML = formatMessageIncremental(rawText);
        
        // Scroll to keep content visible
        elements.messages.scrollTop = elements.messages.scrollHeight;
        
        // Variable speed based on character
        let delay = baseSpeed;
        const char = chars[index - 1];
        if (char === ' ') delay = baseSpeed / 2;
        else if ('.!?'.includes(char)) delay = baseSpeed * 3;
        else if (',;:'.includes(char)) delay = baseSpeed * 2;
        else if (char === '\n') delay = baseSpeed * 2;
        
        setTimeout(typeChar, delay);
      } else {
        // Done typing
        // Remove typing class and footer
        element.classList.remove('typing');
        typingFooter.remove();
        
        // Final format pass and put in standard message-content
        contentDiv.innerHTML = formatMessage(content);
        elements.messages.scrollTop = elements.messages.scrollHeight;
        resolve();
      }
    }
    
    typeChar();
  });
}

/**
 * Format message incrementally (handles partial markdown)
 */
function formatMessageIncremental(content) {
  // Escape HTML
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (only complete ones)
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code (only complete ones)
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (only complete ones)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic (only complete ones, but not inside incomplete bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Headers
  formatted = formatted.replace(/^### (.+)$/gm, '<strong style="font-size: 1.1em;">$1</strong>');
  formatted = formatted.replace(/^## (.+)$/gm, '<strong style="font-size: 1.2em;">$1</strong>');
  formatted = formatted.replace(/^# (.+)$/gm, '<strong style="font-size: 1.3em;">$1</strong>');

  // Bullet points
  formatted = formatted.replace(/^[-*] (.+)$/gm, '• $1');

  // Numbered lists
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '$1. $2');

  // Line breaks - convert \n to <br>
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Format message content (full markdown support)
 */
function formatMessage(content) {
  // Escape HTML
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Headers
  formatted = formatted.replace(/^### (.+)$/gm, '<strong style="font-size: 1.1em;">$1</strong>');
  formatted = formatted.replace(/^## (.+)$/gm, '<strong style="font-size: 1.2em;">$1</strong>');
  formatted = formatted.replace(/^# (.+)$/gm, '<strong style="font-size: 1.3em;">$1</strong>');

  // Bullet points
  formatted = formatted.replace(/^[-*] (.+)$/gm, '• $1');

  // Numbered lists (preserve numbers)
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '$1. $2');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Toggle chats dropdown
 */
function toggleChatsDropdown(e) {
  e.stopPropagation();
  elements.chatsDropdown.classList.toggle('visible');
}

/**
 * Load saved chats from storage
 */
async function loadSavedChats() {
  try {
    const result = await chrome.storage.local.get({ savedChats: [] });
    savedChats = result.savedChats || [];
    renderChatsList();
  } catch (error) {
    console.error('Failed to load chats:', error);
    if (error.message?.includes('Extension context invalidated')) {
      handleContextInvalidated();
    }
    savedChats = [];
    renderChatsList();
  }
}

/**
 * Render chats list
 */
function renderChatsList() {
  if (savedChats.length === 0) {
    elements.chatsList.innerHTML = '<div class="no-chats">No saved chats yet</div>';
    return;
  }

  elements.chatsList.innerHTML = savedChats
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(chat => `
      <div class="chat-item" data-id="${chat.id}">
        <div class="chat-item-info">
          <div class="chat-item-title">${escapeHtml(chat.title)}</div>
          <div class="chat-item-date">${formatDate(chat.updatedAt)}</div>
        </div>
        <button class="chat-item-delete" data-id="${chat.id}" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `).join('');

  // Add click handlers
  elements.chatsList.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.chat-item-delete')) {
        loadChat(item.dataset.id);
        elements.chatsDropdown.classList.remove('visible');
      }
    });
  });

  elements.chatsList.querySelectorAll('.chat-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(btn.dataset.id);
    });
  });
}

/**
 * Save current chat
 */
async function saveCurrentChat() {
  if (conversationHistory.length === 0) return;

  try {
    // Generate title from first user message
    const firstUserMsg = conversationHistory.find(m => m.role === 'user');
    const title = firstUserMsg?.content?.slice(0, 50) || 'New Chat';

    if (currentChatId) {
      // Update existing chat
      const chatIndex = savedChats.findIndex(c => c.id === currentChatId);
      if (chatIndex !== -1) {
        savedChats[chatIndex].messages = [...conversationHistory];
        savedChats[chatIndex].updatedAt = Date.now();
      }
    } else {
      // Create new chat
      currentChatId = 'chat-' + Date.now();
      savedChats.push({
        id: currentChatId,
        title: title.replace(/\[ATTACHED FILE:.*?\]/g, '').trim() || 'New Chat',
        messages: [...conversationHistory],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // Save to storage
    await chrome.storage.local.set({ savedChats });
    renderChatsList();
  } catch (error) {
    console.error('Failed to save chat:', error);
    if (error.message?.includes('Extension context invalidated')) {
      handleContextInvalidated();
    }
  }
}

/**
 * Load a saved chat
 */
async function loadChat(chatId) {
  const chat = savedChats.find(c => c.id === chatId);
  if (!chat) return;

  // Set current chat
  currentChatId = chatId;
  conversationHistory = [...chat.messages];

  // Clear messages and hide welcome
  elements.messages.innerHTML = '';
  if (elements.welcome) {
    elements.welcome.style.display = 'none';
  }

  // Render messages
  conversationHistory.forEach(msg => {
    addMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content);
  });
}

/**
 * Delete a saved chat
 */
async function deleteChat(chatId) {
  try {
    savedChats = savedChats.filter(c => c.id !== chatId);
    await chrome.storage.local.set({ savedChats });
    
    // If deleted current chat, start new
    if (currentChatId === chatId) {
      startNewChat();
    }
    
    renderChatsList();
  } catch (error) {
    console.error('Failed to delete chat:', error);
    if (error.message?.includes('Extension context invalidated')) {
      handleContextInvalidated();
    }
  }
}

/**
 * Start a new chat
 */
function startNewChat() {
  currentChatId = null;
  conversationHistory = [];
  
  // Clear messages
  elements.messages.innerHTML = '';
  
  // Show welcome
  if (!elements.welcome) {
    elements.messages.innerHTML = `
      <div class="welcome" id="welcome">
        <div class="welcome-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2>Ask about this page</h2>
        <p>I can see everything on your current tab. Upload files or ask questions!</p>
        <div class="suggestions" id="suggestions">
          <button class="suggestion-btn">Summarize this page</button>
          <button class="suggestion-btn">What are the main points?</button>
          <button class="suggestion-btn">Find specific information...</button>
        </div>
      </div>
    `;
    
    // Re-add suggestion handlers
    document.getElementById('suggestions')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-btn')) {
        elements.messageInput.value = e.target.textContent;
        sendMessage();
      }
    });
  } else {
    elements.welcome.style.display = 'block';
  }
}

/**
 * Format date for display
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
