<p align="center">
  <img src="icons/icon128.png" alt="AI Tab Assistant Logo" width="128" height="128">
</p>

<h1 align="center">AI Tab Assistant</h1>

<p align="center">
  <strong>🤖 AI-powered Chrome extension that analyzes any webpage using OpenAI's GPT models</strong>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
  </a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/">
    <img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest V3">
  </a>
  <a href="https://www.google.com/chrome/">
    <img src="https://img.shields.io/badge/Chrome-114%2B-yellow.svg" alt="Chrome 114+">
  </a>
  <a href="https://platform.openai.com/">
    <img src="https://img.shields.io/badge/OpenAI-API-412991.svg" alt="OpenAI API">
  </a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#%EF%B8%8F-configuration">Configuration</a> •
  <a href="#-development">Development</a> •
  <a href="#-license">License</a>
</p>

---

## 📖 Overview

**AI Tab Assistant** is a powerful Chrome extension that brings AI-powered analysis directly to your browser. Simply open the side panel on any webpage, and ask questions about the content you're viewing. The extension extracts all visible content—including tables, forms, dynamic data, and even Shadow DOM elements—and sends it to OpenAI's GPT models for intelligent analysis.

Perfect for:
- 📊 **Data Analysis** - Analyze tables, charts, and metrics on dashboards
- 📝 **Content Research** - Summarize articles, extract key points
- 🔍 **SEO Analysis** - Review Search Console data, analyze keywords
- 💻 **Code Review** - Understand code on GitHub, Stack Overflow
- 📄 **Document Analysis** - Upload and analyze files alongside page content

---

## ✨ Features

### 🔍 Deep Content Extraction
- Captures **everything visible** on any webpage
- Penetrates **Shadow DOM** and Web Components
- Extracts tables, forms, metrics, and dynamic content
- Works with SPAs (React, Angular, Vue) and complex dashboards
- Special handling for Google Search Console, analytics platforms

### 💬 Intelligent Chat Interface
- Natural conversation about page content
- **Real-time typing animation** with formatted markdown
- Maintains conversation context
- Suggests relevant questions to ask

### 📎 File Upload Support
- Upload documents to analyze alongside page content
- Supports: `.txt`, `.md`, `.json`, `.csv`, `.xml`, `.html`, `.js`, `.py`, `.pdf`, and more
- Compare uploaded data with webpage content

### 💾 Chat Management
- **Auto-save** conversations
- Load and continue previous chats
- Start fresh with one click
- Delete old conversations

### 🎨 Dynamic Model Selection
- Automatically fetches **all available models** from your OpenAI account
- Supports GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-3.5, O1 models
- Easy switching between models

### 🔒 Privacy-First Design
- API key stored **locally** in Chrome
- **No data** sent to third-party servers
- No tracking or analytics
- Direct communication with OpenAI API only

---

## 🚀 Installation

Since this extension is not yet available on the Chrome Web Store, you'll need to install it manually as an "unpacked extension."

### Prerequisites

- **Google Chrome** version 114 or higher
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Step-by-Step Installation

#### 1. Download the Extension

**Option A: Clone the Repository**
```bash
git clone https://github.com/volaragency/ai-tab-assistant.git
cd ai-tab-assistant
```

**Option B: Download ZIP**
1. Click the green **Code** button above
2. Select **Download ZIP**
3. Extract the ZIP file to a folder on your computer

#### 2. Load in Chrome

1. Open **Google Chrome**

2. Type `chrome://extensions/` in the address bar and press Enter

3. Enable **Developer mode** by clicking the toggle in the top-right corner

4. Click the **Load unpacked** button
   
5. Navigate to and select the `ai-tab-assistant` folder (the folder containing `manifest.json`)

6. The extension should now appear in your extensions list with the Volar Agency icon

7. You should see the **AI Tab Assistant** icon in your Chrome toolbar

> **Note:** If you don't see the icon, click the **puzzle piece** 🧩 icon in the toolbar and pin AI Tab Assistant.

#### 3. Configure Your API Key

1. **Click** the AI Tab Assistant icon in your toolbar
2. The **side panel** will open on the right side of your browser
3. Click the **⚙️ gear icon** in the top-right corner of the panel
4. A new settings tab will open
5. Enter your **OpenAI API Key** (starts with `sk-`)
6. Click the **Load Models** button
7. Select your preferred model from the dropdown (recommended: `gpt-4o-mini`)
8. Click **Save Settings**
9. Close the settings tab and return to browsing

#### 4. Verify Installation

1. Navigate to any webpage (e.g., https://example.com)
2. Click the AI Tab Assistant icon
3. You should see:
   - A **green indicator** showing the page is being analyzed
   - The page title and URL displayed
   - A chat input at the bottom
4. Type "Summarize this page" and press Enter
5. If you receive a response, the extension is working correctly!

---

## 📖 Usage

### Basic Usage

1. **Navigate** to any webpage you want to analyze
2. **Click** the AI Tab Assistant icon to open the side panel
3. **Wait** for the green indicator (shows content is extracted)
4. **Ask** questions about the page in the chat input
5. **Receive** intelligent, context-aware responses

### Example Questions

| Page Type | Example Questions |
|-----------|-------------------|
| **News Article** | "Summarize this article in 3 bullet points" |
| **Search Console** | "Analyze the top keywords by impressions" |
| **Product Page** | "What are the key features and pricing?" |
| **Code/GitHub** | "Explain what this code does" |
| **Documentation** | "How do I implement authentication?" |
| **Data Dashboard** | "What are the top performing metrics?" |

### Uploading Files

1. Click the **📎 paperclip icon** next to the input
2. Select a file from your computer
3. The file appears in a preview above the input
4. Ask questions about both the file AND the current page
5. Click **✕** to remove the file before sending

**Supported file types:**
- Text: `.txt`, `.md`, `.log`
- Code: `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.css`, `.scss`
- Data: `.json`, `.csv`, `.xml`, `.yaml`, `.yml`
- Documents: `.html`, `.pdf`, `.doc`, `.docx`

### Managing Conversations

| Action | How To |
|--------|--------|
| **New Chat** | Click the **+** button in the header |
| **View Saved Chats** | Click the **💬** chat icon |
| **Load a Chat** | Click on any saved chat in the dropdown |
| **Delete a Chat** | Hover over chat → Click **🗑️** trash icon |

### Refreshing Content

If the AI says it can't see content or the page content seems outdated:
1. Click the **↻ refresh button** next to the page title
2. Wait 2-3 seconds for dynamic content to load
3. Try your question again

---

## ⚙️ Configuration

### Settings Page

Access settings by clicking the **⚙️ gear icon** in the side panel header.

| Setting | Description | Recommended |
|---------|-------------|-------------|
| **API Key** | Your OpenAI API key (required) | Get from [OpenAI](https://platform.openai.com/api-keys) |
| **Model** | GPT model to use for responses | `gpt-4o-mini` |
| **Max Tokens** | Maximum response length (100-16000) | `2000-4000` |
| **Custom Instructions** | Additional instructions for the AI | Optional |

### Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| `gpt-4o-mini` | ⚡ Fast | ★★★★☆ | 💲 Low | Daily use, most queries |
| `gpt-4o` | ⚡ Fast | ★★★★★ | 💲💲 Medium | Complex analysis |
| `gpt-4-turbo` | 🐢 Slower | ★★★★★ | 💲💲💲 High | Detailed research |
| `gpt-3.5-turbo` | ⚡⚡ Fastest | ★★★☆☆ | 💲 Lowest | Simple queries |
| `o1-mini` | 🐢 Slower | ★★★★★ | 💲💲 Medium | Reasoning tasks |

### Estimated Costs Per Query

| Model | Typical Cost |
|-------|--------------|
| gpt-4o-mini | $0.0002 - $0.002 |
| gpt-4o | $0.005 - $0.05 |
| gpt-4-turbo | $0.01 - $0.10 |
| gpt-3.5-turbo | $0.0001 - $0.001 |

*Actual costs depend on page content length and response length*

---

## 🛠️ Development

### Project Structure

```
ai-tab-assistant/
├── manifest.json              # Chrome extension configuration
├── LICENSE                    # MIT License
├── README.md                  # Documentation (this file)
│
├── icons/
│   ├── icon16.png            # 16x16 toolbar icon
│   ├── icon48.png            # 48x48 extension management icon
│   ├── icon128.png           # 128x128 store/detail icon
│   └── volar-logo.svg        # Volar Agency logo
│
└── src/
    ├── background/
    │   └── service-worker.js  # Background script
    │                          # - Content extraction engine
    │                          # - OpenAI API communication
    │                          # - Tab monitoring
    │                          # - Message routing
    │
    ├── sidepanel/
    │   ├── panel.html         # Side panel UI
    │   │                      # - Chat interface
    │   │                      # - Active tab display
    │   │                      # - Styling
    │   │
    │   └── panel.js           # Side panel logic
    │                          # - Chat management
    │                          # - Typing animations
    │                          # - File upload handling
    │                          # - Conversation history
    │
    ├── settings/
    │   ├── settings.html      # Settings page UI
    │   │
    │   └── settings.js        # Settings logic
    │                          # - API key management
    │                          # - Dynamic model fetching
    │                          # - Preference storage
    │
    └── content/
        └── content.js         # Content script
                               # - Injected into pages
                               # - Text selection tracking
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Manifest V3** | Latest Chrome extension architecture |
| **Chrome Side Panel API** | Persistent panel interface |
| **Chrome Storage API** | Local settings & chat storage |
| **Chrome Scripting API** | Content extraction injection |
| **OpenAI Chat Completions API** | GPT model access |

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/YourUsername/ai-tab-assistant.git
cd ai-tab-assistant

# 2. Load in Chrome
#    - Go to chrome://extensions/
#    - Enable Developer Mode
#    - Click "Load unpacked"
#    - Select the ai-tab-assistant folder

# 3. Make changes to source files

# 4. Reload the extension
#    - Go to chrome://extensions/
#    - Click the refresh icon on AI Tab Assistant
#    - Or press Ctrl+R on the extensions page

# 5. Test your changes
```

### Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push** to your fork
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

### Code Style

- Use ES6+ JavaScript features
- Follow existing code patterns
- Add comments for complex logic
- Include copyright headers in new files

---

## 🐛 Troubleshooting

<details>
<summary><strong>❌ "Extension context invalidated" error</strong></summary>

**Cause:** The extension was reloaded while the side panel was open.

**Solution:** 
- Click the "Refresh Panel" button that appears
- Or close and reopen the side panel
</details>

<details>
<summary><strong>❌ AI says "page content is empty" or can't see the page</strong></summary>

**Cause:** Some pages load content dynamically after initial page load.

**Solution:**
1. Click the ↻ refresh button in the side panel header
2. Wait 2-3 seconds for content to fully load
3. Try your question again
</details>

<details>
<summary><strong>❌ Model dropdown shows white/unreadable text</strong></summary>

**Cause:** CSS styling issue in earlier versions.

**Solution:** Pull the latest version of the extension.
</details>

<details>
<summary><strong>❌ "Load Models" button doesn't work</strong></summary>

**Possible causes:**
- Invalid API key format (must start with `sk-`)
- API key doesn't have chat model access
- Network/firewall blocking OpenAI API

**Solution:** 
1. Verify your API key at [platform.openai.com](https://platform.openai.com/api-keys)
2. Ensure you have API credits available
3. Check your network connection
</details>

<details>
<summary><strong>❌ Extension icon doesn't appear in toolbar</strong></summary>

**Solution:**
1. Go to `chrome://extensions/`
2. Ensure AI Tab Assistant is enabled (toggle is blue)
3. Click the puzzle piece 🧩 icon in the toolbar
4. Click the pin 📌 icon next to AI Tab Assistant
</details>

<details>
<summary><strong>❌ Side panel won't open</strong></summary>

**Possible causes:**
- Chrome version too old (need 114+)
- Extension not properly loaded

**Solution:**
1. Check Chrome version: Menu → Help → About Google Chrome
2. Update Chrome if needed
3. Reload the extension in chrome://extensions/
</details>

---

## 📋 Permissions Explained

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | Read content of the currently active tab |
| `tabs` | Monitor tab switches to update content |
| `storage` | Store API key, settings, and chat history locally |
| `scripting` | Inject content extraction script into pages |
| `sidePanel` | Display the chat interface as a side panel |

| Host Permission | Why It's Needed |
|-----------------|-----------------|
| `<all_urls>` | Extract content from any website you visit |
| `api.openai.com` | Send requests to OpenAI's API |

---

## 🗺️ Roadmap

### Planned Features

- [ ] 🏪 Chrome Web Store publication
- [ ] 🤖 Support for Claude (Anthropic) API
- [ ] 🦙 Support for local LLMs (Ollama, LM Studio)
- [ ] 📤 Export chat history (JSON, Markdown)
- [ ] ⌨️ Keyboard shortcuts
- [ ] 🖱️ Right-click context menu integration
- [ ] 🌍 Multiple language support
- [ ] 📜 Custom extraction rules per website
- [ ] 🔗 Share chat conversations
- [ ] 📊 Usage statistics and cost tracking

### Version History

- **v1.0.0** - Initial release
  - Deep content extraction with Shadow DOM support
  - Chat interface with typing animations
  - File upload support
  - Chat history management
  - Dynamic model selection

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Volar Agency (https://thevolar.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👨‍💻 Author

<p align="center">
  <a href="https://thevolar.com">
    <img src="icons/volar-logo.svg" alt="Volar Agency" width="60" height="60">
  </a>
</p>

<p align="center">
  <strong><a href="https://thevolar.com">Volar Agency</a></strong><br>
  Digital Solutions & Web Development
</p>

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the incredible GPT API
- [Chrome Extensions Team](https://developer.chrome.com/docs/extensions/) for the Side Panel API
- All contributors and early testers

---

## ⭐ Support

If you find this extension useful, please consider:

- ⭐ **Starring** this repository
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 🔀 **Contributing** code improvements

---

<p align="center">
  Made with ❤️ by <a href="https://thevolar.com">Volar Agency</a>
</p>

<p align="center">
  <a href="#ai-tab-assistant">⬆️ Back to Top</a>
</p>
