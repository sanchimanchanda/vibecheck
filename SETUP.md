# VibeCheck - AI-Powered Vulnerability Scanner with Integrated Chatbot

## 🔧 Setup Instructions

### 1. Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

3. Update `.env.local` with your API key:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   FLASK_DEBUG=False
   ```

### 2. Install Dependencies

```bash
npm install
pip install -r requirements.txt
```

### 3. Start Services

#### Development Mode
```bash
# Terminal 1: Start Next.js frontend
npm run dev

# Terminal 2: Start Python vulnerability scanner service  
python scanner_service.py --debug

# Or use the convenience script:
./start_services.sh
```

#### Production Mode
```bash
python scanner_service.py --host 0.0.0.0 --port 5000
```

## 🚀 Features

### ✅ Fixed Security Issues
- **CWE-489**: Removed Flask debug=True vulnerability in production
- Flask debug mode now uses environment variables for secure configuration

### 🤖 AI Security Assistant Sidebar
- **Powered by Gemini 2.0 Pro (exp-02-05)** - Latest experimental model
- **Context-aware conversations** about vulnerabilities and security
- **Interactive vulnerability analysis** - click any issue to ask questions
- **Real-time chat interface** similar to Cursor IDE
- **Smart vulnerability explanations** with fix suggestions
- **Multi-model support** (Gemini 2.0 Pro, Flash, 1.5 Pro)

### 🛡️ Security Features
- **Multi-language vulnerability detection** (JavaScript, Python, Java, PHP, etc.)
- **Real-time scanning** using Semgrep integration
- **CWE classification** and risk assessment
- **Auto-fix suggestions** powered by AI
- **Secure file handling** with path validation
- **Production-ready security** configuration

## 🎯 How to Use

### 1. Open a Project
- Click "Open Folder" button
- Select your project directory
- The tool will build a file tree and detect technologies

### 2. Run Security Analysis
- Click "Analyze" button to start vulnerability scan
- View results in the right sidebar with risk levels

### 3. Chat with AI Assistant
- **Click any vulnerability** in the sidebar to ask specific questions
- **Type questions** about security, vulnerabilities, or best practices
- **Get personalized recommendations** based on your code context
- **Ask for explanations** of CWE classifications and security concepts

### 4. Auto-Fix Issues
- Use the "Fix" button on vulnerabilities for AI-powered auto-fixes
- Review and apply suggested changes to your code

## 🎨 UI Design

The sidebar is designed to match Cursor IDE's aesthetic:
- **Dark theme** with subtle animations
- **Context-aware chat** that understands your selected files
- **Vulnerability cards** with severity indicators
- **Smooth interactions** and professional styling
- **Responsive design** that works on different screen sizes

## 🔍 Supported Vulnerability Types

- SQL Injection (CWE-89)
- Cross-Site Scripting (XSS) (CWE-79)
- Command Injection (CWE-78)
- Path Traversal (CWE-22)
- Hardcoded Credentials (CWE-798)
- Weak Cryptography (CWE-327)
- XML External Entities (XXE) (CWE-611)
- CSRF Protection Issues (CWE-352)
- Information Disclosure (CWE-200)
- And many more...

## 🌐 API Endpoints

### Frontend (Next.js)
- `GET /` - Main application interface
- `POST /api/chat` - AI chatbot conversation endpoint
- `POST /api/autofix` - AI-powered code fixing

### Backend (Flask)
- `GET /health` - Service health check
- `POST /scan` - Vulnerability scanning for uploaded files
- `POST /scan-directory` - Vulnerability scanning for local directories

## 🛠️ Technical Architecture

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Framer Motion
- **AI Integration**: Google Gemini 2.0 Pro via REST API
- **Backend**: Flask with Semgrep for vulnerability scanning
- **File Handling**: File System Access API for secure browser-based file access
- **Security**: Environment-based configuration, input validation, path sanitization

## 🚨 Important Security Notes

1. **Never commit API keys** - Always use environment variables
2. **Production deployment** - Ensure FLASK_DEBUG=False in production
3. **API key security** - Restrict API key usage and monitor quotas
4. **File permissions** - The app only reads files, never modifies without explicit user action

## 🔧 Troubleshooting

### API Key Issues
- Ensure your Gemini API key is valid and has appropriate quotas
- Check the API key is properly set in `.env.local`
- Verify the key has access to the Gemini 2.0 Pro model

### Scanning Issues
- Make sure Python dependencies are installed: `pip install -r requirements.txt`
- Verify Semgrep is accessible in your PATH
- Check that the scanner service is running on port 5000

### Browser Compatibility
- File System Access API requires Chrome 86+, Edge 86+, or Opera 72+
- For other browsers, consider using the upload functionality

## 📝 Future Enhancements

- [ ] Support for more AI models (Claude, GPT-4, etc.)
- [ ] Custom vulnerability rules and patterns
- [ ] Integration with CI/CD pipelines
- [ ] Team collaboration features
- [ ] Vulnerability tracking and history
- [ ] Export reports in multiple formats
