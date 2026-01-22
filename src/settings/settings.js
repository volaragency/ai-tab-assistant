/**
 * AI Tab Assistant - Settings Script
 * 
 * Configuration page for the AI Tab Assistant extension.
 * Dynamically fetches available models from OpenAI API and allows
 * users to configure API key, model selection, and custom instructions.
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

const DEFAULT_SYSTEM_PROMPT = `You are a highly capable AI assistant analyzing the user's current browser tab. You have COMPLETE access to all page content provided below - this includes ALL text, data, tables, numbers, and information visible on the page.

CRITICAL INSTRUCTIONS:
1. ALWAYS analyze the ACTUAL DATA provided in the page content - never give generic advice
2. Reference SPECIFIC numbers, keywords, metrics, and data points from the page
3. If you see tables, extract and analyze the actual values
4. Quote specific text from the page when relevant
5. If asked about data that IS in the page content, provide detailed analysis WITH the actual data
6. Only say "information not available" if you genuinely cannot find it in the provided content

You are seeing the SAME content the user sees. Analyze it thoroughly.`;

// Preferred models in order (for sorting)
const MODEL_PRIORITY = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-preview'
];

const elements = {
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
  maxTokens: document.getElementById('maxTokens'),
  systemPrompt: document.getElementById('systemPrompt'),
  saveBtn: document.getElementById('saveBtn'),
  fetchModelsBtn: document.getElementById('fetchModelsBtn'),
  status: document.getElementById('status'),
  toggleApiKey: document.getElementById('toggleApiKey'),
  modelCount: document.getElementById('modelCount'),
  modelDetails: document.getElementById('modelDetails')
};

let availableModels = [];

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await chrome.storage.local.get({
    apiKey: '',
    model: '',
    maxTokens: 2000,
    systemPrompt: '',
    cachedModels: []
  });

  elements.apiKey.value = settings.apiKey;
  elements.maxTokens.value = settings.maxTokens;
  elements.systemPrompt.value = settings.systemPrompt;
  elements.systemPrompt.placeholder = DEFAULT_SYSTEM_PROMPT;

  // If we have cached models, populate the dropdown
  if (settings.cachedModels && settings.cachedModels.length > 0) {
    availableModels = settings.cachedModels;
    populateModelDropdown(settings.model);
  } else if (settings.apiKey) {
    // Auto-fetch models if we have an API key
    fetchModels();
  }
}

/**
 * Fetch available models from OpenAI API
 */
async function fetchModels() {
  const apiKey = elements.apiKey.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. Should start with "sk-"', 'error');
    return;
  }

  elements.fetchModelsBtn.classList.add('loading');
  elements.fetchModelsBtn.disabled = true;
  elements.modelCount.textContent = 'Fetching models...';
  elements.modelCount.className = 'model-count';

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to only chat models (gpt-* and o1-*)
    const chatModels = data.data
      .filter(model => {
        const id = model.id.toLowerCase();
        return (
          (id.includes('gpt-4') || id.includes('gpt-3.5') || id.startsWith('o1')) &&
          !id.includes('instruct') &&
          !id.includes('vision') &&
          !id.includes('realtime') &&
          !id.includes('audio') &&
          !id.includes('embedding') &&
          !id.includes('whisper') &&
          !id.includes('tts') &&
          !id.includes('dall-e') &&
          !id.includes('davinci') &&
          !id.includes('babbage') &&
          !id.includes('curie') &&
          !id.includes('ada')
        );
      })
      .map(model => ({
        id: model.id,
        created: model.created,
        owned_by: model.owned_by
      }))
      .sort((a, b) => {
        // Sort by priority first
        const aPriority = MODEL_PRIORITY.findIndex(p => a.id.startsWith(p));
        const bPriority = MODEL_PRIORITY.findIndex(p => b.id.startsWith(p));
        
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        }
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        
        // Then by date (newest first)
        return b.created - a.created;
      });

    availableModels = chatModels;
    
    // Cache models
    await chrome.storage.local.set({ cachedModels: chatModels });

    // Get current saved model
    const settings = await chrome.storage.local.get({ model: '' });
    populateModelDropdown(settings.model);

    elements.modelCount.textContent = `✓ Found ${chatModels.length} chat models`;
    elements.modelCount.className = 'model-count';

  } catch (error) {
    console.error('Failed to fetch models:', error);
    elements.modelCount.textContent = `✗ ${error.message}`;
    elements.modelCount.className = 'model-count error';
    showStatus('Failed to fetch models: ' + error.message, 'error');
  } finally {
    elements.fetchModelsBtn.classList.remove('loading');
    elements.fetchModelsBtn.disabled = false;
  }
}

/**
 * Populate model dropdown with fetched models
 */
function populateModelDropdown(selectedModel) {
  elements.model.innerHTML = '';
  
  if (availableModels.length === 0) {
    elements.model.innerHTML = '<option value="">-- No models available --</option>';
    elements.model.disabled = true;
    return;
  }

  // Group models
  const groups = {
    'GPT-4o': [],
    'GPT-4 Turbo': [],
    'GPT-4': [],
    'GPT-3.5': [],
    'O1 (Reasoning)': [],
    'Other': []
  };

  availableModels.forEach(model => {
    const id = model.id;
    if (id.startsWith('gpt-4o')) {
      groups['GPT-4o'].push(model);
    } else if (id.includes('gpt-4-turbo') || id.includes('gpt-4-1106') || id.includes('gpt-4-0125')) {
      groups['GPT-4 Turbo'].push(model);
    } else if (id.startsWith('gpt-4')) {
      groups['GPT-4'].push(model);
    } else if (id.startsWith('gpt-3.5')) {
      groups['GPT-3.5'].push(model);
    } else if (id.startsWith('o1')) {
      groups['O1 (Reasoning)'].push(model);
    } else {
      groups['Other'].push(model);
    }
  });

  // Add optgroups
  for (const [groupName, models] of Object.entries(groups)) {
    if (models.length === 0) continue;

    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      if (model.id === selectedModel) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    });

    elements.model.appendChild(optgroup);
  }

  // If no model selected, default to gpt-4o-mini or first available
  if (!selectedModel && availableModels.length > 0) {
    const defaultModel = availableModels.find(m => m.id === 'gpt-4o-mini') || availableModels[0];
    elements.model.value = defaultModel.id;
  }

  elements.model.disabled = false;
  updateModelDetails();
}

/**
 * Update model details display
 */
function updateModelDetails() {
  const modelId = elements.model.value;
  const model = availableModels.find(m => m.id === modelId);
  
  if (!model) {
    elements.modelDetails.classList.remove('visible');
    return;
  }

  const date = new Date(model.created * 1000).toLocaleDateString();
  elements.modelDetails.innerHTML = `
    <strong>Model:</strong> ${model.id}<br>
    <strong>Created:</strong> ${date}<br>
    <strong>Owner:</strong> ${model.owned_by}
  `;
  elements.modelDetails.classList.add('visible');
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  const apiKey = elements.apiKey.value.trim();
  const model = elements.model.value;
  const maxTokens = parseInt(elements.maxTokens.value, 10) || 2000;
  const systemPrompt = elements.systemPrompt.value.trim();

  // Validate API key format
  if (apiKey && !apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. Should start with "sk-"', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!model) {
    showStatus('Please select a model (click "Load Models" first)', 'error');
    return;
  }

  // Validate max tokens
  if (maxTokens < 100 || maxTokens > 16000) {
    showStatus('Max tokens must be between 100 and 16000', 'error');
    return;
  }

  const settings = {
    apiKey,
    model,
    maxTokens,
    systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT
  };

  try {
    await chrome.storage.local.set(settings);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = 'status ' + type;
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      elements.status.className = 'status';
    }, 5000);
  }
}

/**
 * Toggle API key visibility
 */
function toggleApiKeyVisibility() {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
  
  elements.toggleApiKey.innerHTML = isPassword ? `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ` : `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;
}

// Event listeners
elements.saveBtn.addEventListener('click', saveSettings);
elements.fetchModelsBtn.addEventListener('click', fetchModels);
elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
elements.model.addEventListener('change', updateModelDetails);

// Save on Enter in API key field
elements.apiKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') fetchModels();
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);
