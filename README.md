# VibeCheck - AI-Powered Vulnerability Scanner 🛡️

> **AI-powered security assistant with integrated Gemini chatbot, exactly like Cursor IDE**

![VibeCheck Demo](https://via.placeholder.com/800x400/000000/ffffff?text=VibeCheck+-+AI+Security+Assistant)

## ✅ **Issues Fixed & Features Implemented**

### 🚨 **Security Fix: CWE-489 Vulnerability**
- **Fixed Flask debug=True vulnerability** in production
- Now uses environment variables for secure configuration
- No hardcoded debug flags or sensitive information

### 🤖 **AI Security Assistant Sidebar** 
- **Cursor IDE-style interface** with professional dark theme
- **Powered by Google Gemini** (1.5 Flash, 1.5 Pro, 2.0 Flash, 2.0 Pro)
- **Context-aware conversations** about vulnerabilities and security
- **Smart quota handling** with automatic model fallback
- **Real-time chat** with typing indicators and error recovery

### 🔧 **Setup Complete**
- **API Key Integrated**: Set your own Gemini API key in `.env.local`
- **Environment configured**: `.env.local` ready
- **Hydration issues fixed**: No more SSR/client mismatches
- **Build ready**: Clean compilation with all dependencies

## 🚀 **Quick Start**

### 1. Start the Application
```bash
# Terminal 1: Start Next.js (port 3000/3001)
npm run dev

# Terminal 2: Start Python scanner service (port 5000)
python scanner_service.py --debug
```

### 2. Use the AI Assistant
1. **Open a folder** using "Open Folder" button
2. **Run security scan** with "Analyze" button  
3. **Chat with AI** about vulnerabilities in the right sidebar
4. **Click vulnerabilities** to ask specific questions
5. **Switch models** using the top dropdown for different response styles

## 🎯 **Key Features**

### **Smart Vulnerability Analysis**
- **Click-to-ask**: Click any vulnerability to automatically generate relevant questions
- **Context awareness**: AI understands your selected files and code
- **CWE explanations**: Get detailed explanations of security classifications
- **Fix recommendations**: Receive specific, actionable fix suggestions

### **Professional UI Design** 
- **Cursor IDE aesthetic**: Dark theme with smooth animations
- **Responsive design**: Works on different screen sizes
- **Real-time interactions**: Typing indicators, hover states, error handling
- **Professional styling**: Clean, minimal design focused on productivity

### **Robust AI Integration**
- **Multiple models**: Gemini 1.5 Flash (fast), 1.5 Pro (balanced), 2.0+ (advanced)
- **Smart quota handling**: Automatic fallback when API limits hit
- **Error recovery**: Graceful handling of API issues with user feedback
- **Optimized requests**: Reduced token usage for cost efficiency

## 🛡️ **Supported Security Issues**

- **SQL Injection** (CWE-89)
- **Cross-Site Scripting** (XSS) (CWE-79)  
- **Command Injection** (CWE-78)
- **Path Traversal** (CWE-22)
- **Hardcoded Credentials** (CWE-798)
- **Weak Cryptography** (CWE-327)
- **XML External Entities** (XXE) (CWE-611)
- **CSRF Protection Issues** (CWE-352)
- **Information Disclosure** (CWE-200)
- **And 50+ more vulnerability types**

## 🔧 **Technical Stack**

### **Frontend**
- **Next.js 14** with TypeScript and App Router
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **Radix UI** for accessible components
- **Monaco Editor** for code viewing/editing

### **AI Integration**
- **Google Gemini API** with multiple model support
- **Context-aware prompting** for security-focused responses
- **Smart token management** and quota handling
- **Environment-based API key configuration**

### **Backend**
- **Flask** with Semgrep for vulnerability scanning
- **Multi-language support** (JavaScript, Python, Java, PHP, Go, etc.)
- **Real-time file processing** with secure path handling
- **Production-ready configuration** with proper error handling

## 🎨 **UI Highlights**

### **Sidebar Design (Cursor-inspired)**
- **Split layout**: Vulnerabilities list + Chat interface
- **Smart filtering**: Show vulnerabilities for selected files
- **Interactive cards**: Click to ask AI about specific issues
- **Professional icons**: Severity indicators and action buttons
- **Smooth scrolling**: Optimized for large lists

### **Chat Interface**
- **Message threading**: Clear conversation history
- **Typing indicators**: Real-time feedback
- **Error handling**: Graceful degradation with helpful messages
- **Code highlighting**: Syntax highlighting in responses
- **Timestamp tracking**: Full conversation history

## 📊 **Model Comparison**

| Model | Speed | Accuracy | Cost | Best For |
|-------|-------|----------|------|----------|
| **Gemini 1.5 Flash** ⭐ | Very Fast | Good | Low | General queries, quick explanations |
| **Gemini 1.5 Pro** | Medium | High | Medium | Detailed analysis, complex questions |
| **Gemini 2.0 Flash (exp)** | Fast | Very High | Medium | Latest features, experimental |
| **Gemini 2.0 Pro (exp)** | Slow | Highest | High | Complex analysis, research tasks |

## 🔒 **Security Notes**

### **Production Ready**
- ✅ **No debug flags** in production
- ✅ **Environment variables** for sensitive data
- ✅ **Input validation** and sanitization
- ✅ **Secure file handling** with path restrictions
- ✅ **API key protection** (never logged or exposed)

### **Privacy**
- **Local processing**: File contents only sent to AI when explicitly asked
- **No data storage**: Conversations not permanently stored
- **User control**: Full control over what data is shared with AI
- **Secure transmission**: All API calls use HTTPS

## 🐛 **Troubleshooting**

### **API Issues**
```
❌ "API quota exceeded" 
✅ Switch to Gemini 1.5 Flash model or wait 30 seconds
```

```
❌ "Invalid API key"
✅ Check .env.local file has correct GEMINI_API_KEY
```

```
❌ Chat not responding
✅ Ensure Next.js dev server is running on port 3000/3001
```

### **Scan Issues**
```
❌ "No vulnerabilities found" in obviously vulnerable code
✅ Check Python scanner service is running on port 5000
```

```
❌ "Failed to scan directory"
✅ Ensure Semgrep is installed: pip install semgrep
```

## 📈 **Future Enhancements**

- [ ] **Multi-AI support** (Claude, GPT-4, CodeT5)
- [ ] **Custom vulnerability rules** with user-defined patterns
- [ ] **Team collaboration** with shared scans and findings
- [ ] **CI/CD integration** for automated security checks
- [ ] **Advanced reporting** with PDF/JSON export
- [ ] **Historical tracking** of vulnerability trends

---

## 💬 **Example Conversations**

### **General Security Question**
```
User: "What are the most common web application vulnerabilities?"

AI: "The most common web application vulnerabilities include:

1. **SQL Injection (CWE-89)** - Attackers manipulate database queries
2. **Cross-Site Scripting (XSS) (CWE-79)** - Malicious scripts executed in browsers
3. **Cross-Site Request Forgery (CSRF)** - Unauthorized actions on behalf of users
4. **Insecure Authentication** - Weak login/session management
5. **Security Misconfigurations** - Default passwords, open ports, etc.

Would you like me to explain any of these in detail or show you how to prevent them in your specific codebase?"
```

### **Specific Vulnerability Question**
```
User: [Clicks on SQL Injection vulnerability in file.php:42]

AI: "I see you have a SQL injection vulnerability in file.php at line 42. This appears to be caused by directly concatenating user input into a SQL query.

**The Issue:**
```php
$query = "SELECT * FROM users WHERE id = " . $_GET['id'];
```

**Why it's dangerous:**
An attacker could input `1 OR 1=1--` to bypass authentication or `1; DROP TABLE users;--` to delete data.

**The Fix:**
Use prepared statements:
```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_GET['id']]);
```

Would you like me to explain how prepared statements work or help you fix other similar issues in your codebase?"
```

---

**🎉 Your AI-powered security assistant is ready! Open a folder, run a scan, and start chatting about security.**
