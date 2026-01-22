/**
 * AI Tab Assistant - Background Service Worker
 * 
 * Deep content extraction engine that captures everything visible on page,
 * including Shadow DOM, Web Components, and dynamically rendered content.
 * Handles communication between side panel and OpenAI API.
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

// Track current active tab content
let currentTabData = {
  tabId: null,
  url: '',
  title: '',
  favicon: '',
  content: '',
  lastUpdated: null
};

/**
 * Get settings from storage
 */
async function getSettings() {
  const result = await chrome.storage.local.get({
    apiKey: '',
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    systemPrompt: `You are a highly capable AI assistant analyzing the user's current browser tab. You have COMPLETE access to all page content provided below - this includes ALL text, data, tables, numbers, and information visible on the page.

CRITICAL INSTRUCTIONS:
1. ALWAYS analyze the ACTUAL DATA provided in the page content - never give generic advice
2. Reference SPECIFIC numbers, keywords, metrics, and data points from the page
3. If you see tables, extract and analyze the actual values
4. Quote specific text from the page when relevant
5. If asked about data that IS in the page content, provide detailed analysis WITH the actual data
6. Only say "information not available" if you genuinely cannot find it in the provided content

You are seeing the SAME content the user sees. Analyze it thoroughly.`
  });
  return result;
}

/**
 * DEEP content extraction - captures everything visible
 * Handles Shadow DOM, Web Components, SPAs like Google Search Console
 */
async function extractPageContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // ============ HELPER FUNCTIONS ============
        
        /**
         * Check if element is visible
         */
        const isVisible = (el) => {
          if (!el) return false;
          try {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
          } catch (e) {
            return true; // Assume visible if can't check
          }
        };

        /**
         * Recursively traverse Shadow DOM and collect all text
         */
        const traverseShadowDOM = (root, depth = 0) => {
          if (depth > 10) return ''; // Prevent infinite loops
          let text = '';
          
          const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
          );

          let node;
          while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) {
              const content = node.textContent?.trim();
              if (content && content.length > 0) {
                text += content + ' ';
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for shadow root
              if (node.shadowRoot) {
                text += traverseShadowDOM(node.shadowRoot, depth + 1);
              }
              // Check for slots
              if (node.tagName === 'SLOT') {
                const assigned = node.assignedNodes();
                assigned.forEach(n => {
                  if (n.nodeType === Node.TEXT_NODE) {
                    text += n.textContent?.trim() + ' ';
                  } else if (n.nodeType === Node.ELEMENT_NODE) {
                    text += n.innerText + ' ';
                    if (n.shadowRoot) {
                      text += traverseShadowDOM(n.shadowRoot, depth + 1);
                    }
                  }
                });
              }
            }
          }
          
          return text;
        };

        /**
         * Get ALL shadow roots in document
         */
        const getAllShadowRoots = (root = document.body) => {
          const shadowRoots = [];
          try {
            const elements = root.querySelectorAll('*');
            
            elements.forEach(el => {
              if (el.shadowRoot) {
                shadowRoots.push(el.shadowRoot);
                // Recursively find nested shadow roots
                shadowRoots.push(...getAllShadowRoots(el.shadowRoot));
              }
            });
          } catch (e) {}
          
          return shadowRoots;
        };

        /**
         * Get computed text content including pseudo-elements
         */
        const getFullText = (el) => {
          if (!el) return '';
          try {
            let text = '';
            
            // Get element text
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              text = el.value || el.placeholder || '';
            } else if (el.tagName === 'SELECT') {
              const selected = el.options?.[el.selectedIndex];
              text = selected ? selected.text : '';
            } else {
              text = el.innerText || el.textContent || '';
            }
            
            return text.trim();
          } catch (e) {
            return '';
          }
        };

        /**
         * Extract ALL data from tables (including Shadow DOM and SPA tables)
         */
        const extractTables = () => {
          const tables = [];
          
          /**
           * Process a table element
           */
          const processTable = (table, source = 'regular') => {
            const tableData = {
              source,
              caption: '',
              headers: [],
              rows: []
            };
            
            try {
              tableData.caption = table.caption?.textContent?.trim() || 
                                  table.getAttribute('aria-label') || '';
              
              // Get headers from various sources
              const headerCells = table.querySelectorAll('thead th, thead td, th, [role="columnheader"]');
              headerCells.forEach(th => {
                const text = th.innerText?.trim() || th.textContent?.trim() || '';
                if (text && !tableData.headers.includes(text)) {
                  tableData.headers.push(text);
                }
              });
              
              // Get rows
              const rows = table.querySelectorAll('tbody tr, tr, [role="row"]');
              rows.forEach((row, idx) => {
                const cells = row.querySelectorAll('td, th, [role="cell"], [role="gridcell"]');
                const rowData = [];
                
                cells.forEach(cell => {
                  let cellText = cell.innerText?.trim() || cell.textContent?.trim() || '';
                  // Check for nested elements with data
                  const dataEl = cell.querySelector('[data-value], [data-text], .value, .cell-value');
                  if (dataEl) {
                    cellText = dataEl.innerText?.trim() || dataEl.getAttribute('data-value') || cellText;
                  }
                  rowData.push(cellText);
                });
                
                if (rowData.some(d => d && d.length > 0)) {
                  tableData.rows.push(rowData);
                }
              });
            } catch (e) {}
            
            return tableData;
          };
          
          // 1. Regular HTML tables
          document.querySelectorAll('table').forEach(table => {
            const data = processTable(table, 'table');
            if (data.rows.length > 0 || data.headers.length > 0) {
              tables.push(data);
            }
          });
          
          // 2. Tables in Shadow DOM
          const shadowRoots = getAllShadowRoots(document.body);
          shadowRoots.forEach(shadowRoot => {
            shadowRoot.querySelectorAll('table, [role="table"], [role="grid"]').forEach(table => {
              const data = processTable(table, 'shadow-dom');
              if (data.rows.length > 0 || data.headers.length > 0) {
                tables.push(data);
              }
            });
          });
          
          // 3. Grid/list structures that act like tables (Material UI, Angular, etc.)
          const gridSelectors = [
            '[role="grid"]',
            '[role="table"]',
            '[role="treegrid"]',
            '.mat-table',
            '.mdc-data-table',
            '.ag-root',
            '.data-table',
            '[class*="table"]',
            '[class*="grid"]',
            '[class*="DataTable"]'
          ];
          
          document.querySelectorAll(gridSelectors.join(', ')).forEach(grid => {
            if (grid.tagName === 'TABLE') return;
            
            const gridData = {
              source: 'grid-' + (grid.className || grid.tagName),
              headers: [],
              rows: []
            };
            
            // Look for header row
            const headerRow = grid.querySelector('[role="row"]:first-child, .header-row, .table-header, thead, [class*="header"]');
            if (headerRow) {
              headerRow.querySelectorAll('[role="columnheader"], [role="gridcell"], .header-cell, th, td, [class*="column"]').forEach(h => {
                const text = h.innerText?.trim() || h.textContent?.trim() || '';
                if (text) gridData.headers.push(text);
              });
            }
            
            // Get all rows
            grid.querySelectorAll('[role="row"], .data-row, .table-row, tr, [class*="row"]').forEach((row, idx) => {
              // Skip header row
              if (row === headerRow) return;
              if (row.querySelector('[role="columnheader"]')) return;
              
              const cells = row.querySelectorAll('[role="gridcell"], [role="cell"], .cell, td, [class*="cell"]');
              const rowData = [];
              
              cells.forEach(cell => {
                rowData.push(cell.innerText?.trim() || cell.textContent?.trim() || '');
              });
              
              if (rowData.some(d => d && d.length > 0)) {
                gridData.rows.push(rowData);
              }
            });
            
            if (gridData.rows.length > 0) {
              tables.push(gridData);
            }
          });
          
          // 4. Google Search Console specific extraction
          if (window.location.hostname.includes('search.google.com')) {
            try {
              // GSC uses custom elements and shadow DOM heavily
              const gscTables = document.querySelectorAll('c-wiz table, [jsname] table');
              gscTables.forEach(table => {
                const data = processTable(table, 'gsc-table');
                if (data.rows.length > 0) {
                  tables.push(data);
                }
              });
              
              // Also try to get data from spans and divs that look like cells
              const gscRows = document.querySelectorAll('[jsname] [role="row"], [jscontroller] [role="row"]');
              if (gscRows.length > 0) {
                const gscData = {
                  source: 'gsc-custom',
                  headers: [],
                  rows: []
                };
                
                gscRows.forEach((row, idx) => {
                  const cells = row.querySelectorAll('[role="cell"], [role="gridcell"], span, div');
                  const rowData = [];
                  const seen = new Set();
                  
                  cells.forEach(cell => {
                    const text = cell.innerText?.trim();
                    if (text && !seen.has(text) && text.length < 500) {
                      seen.add(text);
                      rowData.push(text);
                    }
                  });
                  
                  if (rowData.length > 0) {
                    // First row might be headers
                    if (idx === 0 && gscData.headers.length === 0) {
                      gscData.headers = rowData;
                    } else {
                      gscData.rows.push(rowData);
                    }
                  }
                });
                
                if (gscData.rows.length > 0) {
                  tables.push(gscData);
                }
              }
            } catch (e) {}
          }
          
          return tables;
        };

        /**
         * Extract all visible metrics/KPIs (common in dashboards)
         */
        const extractMetrics = () => {
          const metrics = [];
          
          // Common metric selectors
          const metricSelectors = [
            '[class*="metric"]',
            '[class*="kpi"]',
            '[class*="stat"]',
            '[class*="score"]',
            '[class*="value"]',
            '[class*="count"]',
            '[class*="total"]',
            '[class*="number"]',
            '[data-metric]',
            '[data-value]',
            '[data-stat]',
            '.card-value',
            '.summary-value',
            '.dashboard-metric'
          ];
          
          document.querySelectorAll(metricSelectors.join(', ')).forEach(el => {
            if (!isVisible(el)) return;
            
            const text = getFullText(el);
            // Get label from parent, sibling, or aria-label
            let label = el.getAttribute('aria-label') || 
                       el.getAttribute('data-label') ||
                       el.closest('[aria-label]')?.getAttribute('aria-label') ||
                       el.previousElementSibling?.textContent?.trim() ||
                       el.parentElement?.querySelector('label, .label, [class*="label"], [class*="title"]')?.textContent?.trim() ||
                       '';
            
            if (text && (text.match(/\d/) || text.length < 100)) {
              metrics.push({ label: label.slice(0, 100), value: text.slice(0, 200) });
            }
          });
          
          return metrics;
        };

        /**
         * Extract data from charts (where accessible)
         */
        const extractChartData = () => {
          const chartData = [];
          
          // SVG charts often have data in elements
          document.querySelectorAll('svg').forEach((svg, idx) => {
            if (!isVisible(svg)) return;
            
            const chartInfo = {
              index: idx,
              title: svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || '',
              data: []
            };
            
            // Look for data in various SVG elements
            svg.querySelectorAll('[data-value], [data-x], [data-y], title, text').forEach(el => {
              const text = el.textContent?.trim();
              const dataValue = el.getAttribute('data-value') || el.getAttribute('data-x') || el.getAttribute('data-y');
              if (text || dataValue) {
                chartInfo.data.push(dataValue || text);
              }
            });
            
            // Look for tooltips or labels
            svg.querySelectorAll('.label, .tick text, .axis text, .legend text').forEach(el => {
              const text = el.textContent?.trim();
              if (text) chartInfo.data.push(text);
            });
            
            if (chartInfo.data.length > 0) {
              chartData.push(chartInfo);
            }
          });
          
          // Canvas charts - try to get associated data
          document.querySelectorAll('canvas').forEach((canvas, idx) => {
            const label = canvas.getAttribute('aria-label') || 
                         canvas.closest('[aria-label]')?.getAttribute('aria-label') || 
                         '';
            if (label) {
              chartData.push({ index: idx, type: 'canvas', title: label, data: [] });
            }
          });
          
          return chartData;
        };

        /**
         * Extract forms and their current values
         */
        const extractForms = () => {
          const forms = [];
          
          document.querySelectorAll('form, [role="form"]').forEach((form, idx) => {
            if (!isVisible(form)) return;
            
            const formData = {
              index: idx,
              action: form.action || '',
              fields: []
            };
            
            form.querySelectorAll('input, select, textarea').forEach(field => {
              const label = field.getAttribute('aria-label') ||
                           field.placeholder ||
                           field.name ||
                           document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim() ||
                           field.closest('label')?.textContent?.trim()?.replace(field.value, '').trim() ||
                           '';
              
              let value = '';
              if (field.type === 'password') {
                value = '[hidden]';
              } else if (field.type === 'checkbox' || field.type === 'radio') {
                value = field.checked ? 'checked' : 'unchecked';
              } else if (field.tagName === 'SELECT') {
                value = field.options[field.selectedIndex]?.text || '';
              } else {
                value = field.value || '';
              }
              
              formData.fields.push({
                type: field.type || field.tagName.toLowerCase(),
                label: label.slice(0, 100),
                value: value.slice(0, 500)
              });
            });
            
            if (formData.fields.length > 0) {
              forms.push(formData);
            }
          });
          
          return forms;
        };

        /**
         * Extract all links
         */
        const extractLinks = () => {
          const links = [];
          try {
            document.querySelectorAll('a[href]').forEach(a => {
              if (!isVisible(a)) return;
              const text = getFullText(a).slice(0, 200);
              const href = a.href;
              if (text && href && !href.startsWith('javascript:')) {
                links.push({ text, href });
              }
            });
          } catch (e) {}
          return links.slice(0, 150);
        };

        /**
         * Extract all lists
         */
        const extractLists = () => {
          const lists = [];
          try {
            document.querySelectorAll('ul, ol, [role="list"]').forEach((list, idx) => {
              if (!isVisible(list)) return;
              
              const items = [];
              list.querySelectorAll('li, [role="listitem"]').forEach(item => {
                const text = getFullText(item);
                if (text && text.length < 500) {
                  items.push(text);
                }
              });
              
              if (items.length > 0) {
                lists.push({ index: idx, items: items.slice(0, 50) });
              }
            });
          } catch (e) {}
          return lists.slice(0, 20);
        };

        /**
         * Extract main content text with better structure - including Shadow DOM
         */
        const extractMainContent = () => {
          let allText = '';
          
          // 1. Get regular DOM text
          const clone = document.body.cloneNode(true);
          const removeSelectors = [
            'script', 'style', 'noscript', 'iframe',
            '[aria-hidden="true"]', '[hidden]'
          ];
          
          removeSelectors.forEach(sel => {
            try {
              clone.querySelectorAll(sel).forEach(el => el.remove());
            } catch (e) {}
          });
          
          allText += clone.innerText || clone.textContent || '';
          
          // 2. Traverse all Shadow DOMs
          const shadowRoots = getAllShadowRoots(document.body);
          shadowRoots.forEach(shadowRoot => {
            allText += '\n' + traverseShadowDOM(shadowRoot);
          });
          
          // 3. Get text from iframes (same-origin only)
          try {
            document.querySelectorAll('iframe').forEach(iframe => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc && iframeDoc.body) {
                  allText += '\n[IFRAME CONTENT]\n' + (iframeDoc.body.innerText || '');
                }
              } catch (e) {
                // Cross-origin iframe, skip
              }
            });
          } catch (e) {}
          
          // 4. Get text from canvas elements (if they have fallback content)
          document.querySelectorAll('canvas').forEach(canvas => {
            const fallback = canvas.textContent?.trim();
            if (fallback) {
              allText += '\n' + fallback;
            }
          });
          
          // Clean up
          allText = allText
            .replace(/\t+/g, ' ')
            .replace(/ +/g, ' ')
            .replace(/\n{4,}/g, '\n\n\n')
            .trim();
          
          return allText;
        };

        /**
         * Extract ALL visible text from page using multiple methods
         */
        const extractAllVisibleText = () => {
          const textParts = [];
          
          // Method 1: Selection API - captures exactly what user sees
          try {
            const range = document.createRange();
            range.selectNodeContents(document.body);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            const selectedText = selection.toString();
            selection.removeAllRanges();
            if (selectedText.trim()) {
              textParts.push('[VISIBLE TEXT VIA SELECTION]');
              textParts.push(selectedText);
            }
          } catch (e) {}
          
          // Method 2: Computed text from all elements
          try {
            const allElements = document.body.querySelectorAll('*');
            const seenText = new Set();
            
            allElements.forEach(el => {
              // Skip invisible elements
              if (!isVisible(el)) return;
              
              // Get direct text content (not from children)
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent?.trim())
                .filter(t => t && t.length > 0)
                .join(' ');
              
              if (directText && !seenText.has(directText)) {
                seenText.add(directText);
              }
              
              // Also check for value attributes (inputs, etc.)
              if (el.value && typeof el.value === 'string' && el.value.trim()) {
                const val = el.value.trim();
                if (!seenText.has(val)) {
                  seenText.add(`[INPUT: ${val}]`);
                }
              }
              
              // Check shadow root
              if (el.shadowRoot) {
                const shadowText = traverseShadowDOM(el.shadowRoot);
                if (shadowText.trim() && !seenText.has(shadowText.trim())) {
                  seenText.add(shadowText.trim());
                }
              }
            });
            
            if (seenText.size > 0) {
              textParts.push('[ELEMENT TEXT]');
              textParts.push(Array.from(seenText).join('\n'));
            }
          } catch (e) {}
          
          return textParts.join('\n\n');
        };

        /**
         * Get page structure (headings)
         */
        const extractHeadings = () => {
          const headings = [];
          document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]').forEach(h => {
            if (!isVisible(h)) return;
            const level = h.tagName.match(/H(\d)/)?.[1] || h.getAttribute('aria-level') || '?';
            const text = getFullText(h);
            if (text && text.length < 300) {
              headings.push(`H${level}: ${text}`);
            }
          });
          return headings.slice(0, 50);
        };

        /**
         * Extract all data attributes that might contain useful info
         */
        const extractDataAttributes = () => {
          const data = [];
          document.querySelectorAll('[data-value], [data-text], [data-content], [data-metric], [data-label]').forEach(el => {
            if (!isVisible(el)) return;
            
            const attrs = {};
            Array.from(el.attributes).forEach(attr => {
              if (attr.name.startsWith('data-') && attr.value) {
                attrs[attr.name] = attr.value.slice(0, 200);
              }
            });
            
            if (Object.keys(attrs).length > 0) {
              data.push({
                text: getFullText(el).slice(0, 100),
                attributes: attrs
              });
            }
          });
          return data.slice(0, 100);
        };

        // ============ EXECUTE EXTRACTION ============
        
        // Start with basic page info
        const extracted = {
          url: window.location.href,
          title: document.title,
          metaDescription: document.querySelector('meta[name="description"]')?.content || '',
          timestamp: Date.now(),
          headings: extractHeadings(),
          tables: [],
          metrics: [],
          chartData: [],
          forms: [],
          links: [],
          lists: [],
          dataAttributes: [],
          mainContent: '',
          allVisibleText: '',
          selectedText: window.getSelection()?.toString() || ''
        };
        
        // Extract tables (most important for data analysis)
        try {
          extracted.tables = extractTables();
        } catch (e) {
          console.error('Table extraction failed:', e);
        }
        
        // Extract metrics
        try {
          extracted.metrics = extractMetrics();
        } catch (e) {}
        
        // Extract charts
        try {
          extracted.chartData = extractChartData();
        } catch (e) {}
        
        // Extract forms
        try {
          extracted.forms = extractForms();
        } catch (e) {}
        
        // Extract links
        try {
          extracted.links = extractLinks();
        } catch (e) {}
        
        // Extract lists
        try {
          extracted.lists = extractLists();
        } catch (e) {}
        
        // Extract data attributes
        try {
          extracted.dataAttributes = extractDataAttributes();
        } catch (e) {}
        
        // Extract main content (including Shadow DOM)
        try {
          extracted.mainContent = extractMainContent();
        } catch (e) {
          console.error('Main content extraction failed:', e);
        }
        
        // Extract ALL visible text as backup
        try {
          extracted.allVisibleText = extractAllVisibleText();
        } catch (e) {
          console.error('Visible text extraction failed:', e);
        }
        
        return extracted;
      },
      world: 'MAIN' // Execute in main world for better access
    });

    if (results && results[0]?.result) {
      return results[0].result;
    }
    return null;
  } catch (error) {
    console.error('Content extraction failed:', error);
    return null;
  }
}

/**
 * Format extracted content for AI context - comprehensive version
 */
function formatContentForAI(data) {
  if (!data) return 'Unable to extract page content.';

  let context = `════════════════════════════════════════════════════════════════
                    COMPLETE PAGE DATA EXTRACTION
════════════════════════════════════════════════════════════════

📍 URL: ${data.url}
📄 TITLE: ${data.title}
📝 DESCRIPTION: ${data.metaDescription || 'N/A'}

`;

  // Selected text (highest priority)
  if (data.selectedText) {
    context += `════════════════ SELECTED TEXT ════════════════
${data.selectedText}

`;
  }

  // Page structure
  if (data.headings?.length > 0) {
    context += `════════════════ PAGE STRUCTURE ════════════════
${data.headings.join('\n')}

`;
  }

  // TABLES - Critical for data analysis
  if (data.tables?.length > 0) {
    context += `════════════════ TABLES & DATA GRIDS ════════════════
`;
    data.tables.forEach((table, i) => {
      context += `\n--- TABLE ${i + 1} ${table.caption ? `(${table.caption})` : ''} ---\n`;
      
      if (table.headers?.length > 0) {
        context += `HEADERS: ${table.headers.join(' | ')}\n`;
        context += '-'.repeat(50) + '\n';
      }
      
      table.rows?.forEach((row, rowIdx) => {
        context += `ROW ${rowIdx + 1}: ${row.join(' | ')}\n`;
      });
    });
    context += '\n';
  }

  // Metrics/KPIs
  if (data.metrics?.length > 0) {
    context += `════════════════ METRICS & KPIs ════════════════
`;
    data.metrics.forEach(m => {
      context += `• ${m.label || 'Metric'}: ${m.value}\n`;
    });
    context += '\n';
  }

  // Charts
  if (data.chartData?.length > 0) {
    context += `════════════════ CHART DATA ════════════════
`;
    data.chartData.forEach((chart, i) => {
      context += `Chart ${i + 1}: ${chart.title || 'Untitled'}\n`;
      if (chart.data?.length > 0) {
        context += `  Data: ${chart.data.slice(0, 50).join(', ')}\n`;
      }
    });
    context += '\n';
  }

  // Data attributes
  if (data.dataAttributes?.length > 0) {
    context += `════════════════ DATA ATTRIBUTES ════════════════
`;
    data.dataAttributes.forEach(d => {
      const attrs = Object.entries(d.attributes).map(([k, v]) => `${k}="${v}"`).join(', ');
      context += `• ${d.text || 'Element'}: ${attrs}\n`;
    });
    context += '\n';
  }

  // Forms
  if (data.forms?.length > 0) {
    context += `════════════════ FORMS ════════════════
`;
    data.forms.forEach((form, i) => {
      context += `Form ${i + 1}:\n`;
      form.fields?.forEach(f => {
        context += `  • [${f.type}] ${f.label}: ${f.value}\n`;
      });
    });
    context += '\n';
  }

  // Lists
  if (data.lists?.length > 0) {
    context += `════════════════ LISTS ════════════════
`;
    data.lists.forEach((list, i) => {
      context += `List ${i + 1}:\n`;
      list.items?.forEach((item, j) => {
        context += `  ${j + 1}. ${item}\n`;
      });
    });
    context += '\n';
  }

  // Main content
  context += `════════════════ MAIN PAGE CONTENT ════════════════
${data.mainContent?.slice(0, 60000) || 'No content extracted'}

`;

  // All visible text (backup extraction method)
  if (data.allVisibleText && data.allVisibleText.length > 100) {
    context += `════════════════ ALL VISIBLE TEXT (BACKUP) ════════════════
${data.allVisibleText?.slice(0, 40000) || ''}

`;
  }

  // Links
  if (data.links?.length > 0) {
    context += `════════════════ LINKS (${data.links.length} total) ════════════════
${data.links.slice(0, 50).map(l => `• "${l.text}" → ${l.href}`).join('\n')}
`;
  }

  return context;
}

/**
 * Update active tab data
 */
async function updateActiveTabData(tabId, retryCount = 0) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    // Skip chrome:// pages and other internal pages
    if (!tab.url || !tab.url.startsWith('http')) {
      currentTabData = {
        tabId,
        url: tab.url || '',
        title: tab.title || 'Internal Page',
        favicon: '',
        content: 'Cannot analyze internal browser pages.',
        lastUpdated: Date.now()
      };
      broadcastTabUpdate();
      return;
    }

    // Extract content
    const pageData = await extractPageContent(tabId);
    
    // Check if extraction was successful
    const hasContent = pageData && (
      (pageData.mainContent && pageData.mainContent.length > 50) ||
      (pageData.allVisibleText && pageData.allVisibleText.length > 50) ||
      (pageData.tables && pageData.tables.length > 0)
    );
    
    // If no content and haven't retried, wait and retry (for SPAs)
    if (!hasContent && retryCount < 2) {
      console.log(`No content found, retrying in 1.5s (attempt ${retryCount + 1})`);
      setTimeout(() => updateActiveTabData(tabId, retryCount + 1), 1500);
      return;
    }
    
    const formattedContent = formatContentForAI(pageData);

    currentTabData = {
      tabId,
      url: tab.url,
      title: tab.title || 'Untitled',
      favicon: tab.favIconUrl || '',
      content: formattedContent,
      rawData: pageData,
      lastUpdated: Date.now()
    };

    // Notify side panel of update
    broadcastTabUpdate();

  } catch (error) {
    console.error('Failed to update tab data:', error);
  }
}

/**
 * Broadcast tab update to side panel
 */
function broadcastTabUpdate() {
  chrome.runtime.sendMessage({
    action: 'tabUpdated',
    data: {
      tabId: currentTabData.tabId,
      url: currentTabData.url,
      title: currentTabData.title,
      favicon: currentTabData.favicon,
      hasContent: currentTabData.content.length > 100,
      lastUpdated: currentTabData.lastUpdated
    }
  }).catch(() => {
    // Side panel might not be open - ignore
  });
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, settings) {
  if (!settings.apiKey) {
    throw new Error('API key not configured. Click the gear icon to add your OpenAI API key.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      max_tokens: settings.maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

/**
 * Handle chat message from side panel
 */
async function handleChatMessage(userMessage, conversationHistory) {
  const settings = await getSettings();
  
  // Build messages array
  const messages = [
    {
      role: 'system',
      content: `${settings.systemPrompt}

════════════════════════════════════════════════════════════════
                 CURRENT PAGE CONTENT BELOW
════════════════════════════════════════════════════════════════

${currentTabData.content}

════════════════════════════════════════════════════════════════
                 END OF PAGE CONTENT
════════════════════════════════════════════════════════════════`
    },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  return await callOpenAI(messages, settings);
}

// ============ EVENT LISTENERS ============

// Open side panel when extension icon clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Enable side panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateActiveTabData(activeInfo.tabId);
});

// Listen for tab updates (URL change, page load complete)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
    // Longer delay for SPAs like Google Search Console to fully render
    setTimeout(() => updateActiveTabData(tabId), 1500);
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) {
        await updateActiveTabData(tab.id);
      }
    } catch (error) {
      console.error('Window focus change error:', error);
    }
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabData') {
    sendResponse(currentTabData);
    return true;
  }

  if (message.action === 'refreshTab') {
    (async () => {
      if (currentTabData.tabId) {
        await updateActiveTabData(currentTabData.tabId);
        sendResponse({ success: true, data: currentTabData });
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    })();
    return true;
  }

  if (message.action === 'chat') {
    (async () => {
      try {
        const response = await handleChatMessage(message.userMessage, message.history || []);
        sendResponse({ success: true, response });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.action === 'openSettings') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
    sendResponse({ success: true });
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  // Set up side panel behavior
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  
  if (details.reason === 'install') {
    // Open settings on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
  }
});

console.log('AI Tab Assistant service worker initialized (deep extraction v2)');
