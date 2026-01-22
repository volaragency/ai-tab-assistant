/**
 * AI Tab Assistant - Content Script
 * 
 * Injected into web pages for direct DOM interaction.
 * Provides text selection tracking and page content access.
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

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__aiTabAssistantInjected) return;
  window.__aiTabAssistantInjected = true;

  // Listen for messages from background/sidepanel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedText') {
      const selectedText = window.getSelection()?.toString() || '';
      sendResponse({ selectedText });
      return true;
    }

    if (message.action === 'highlightText') {
      // Future: highlight referenced text on page
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'scrollToElement') {
      // Future: scroll to specific element
      sendResponse({ success: true });
      return true;
    }
  });

  // Track text selection for context
  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection()?.toString()?.trim();
    if (selectedText && selectedText.length > 10) {
      chrome.runtime.sendMessage({
        action: 'textSelected',
        text: selectedText.substring(0, 500)
      }).catch(() => {
        // Side panel might not be open
      });
    }
  });

  console.log('AI Tab Assistant content script loaded');
})();
