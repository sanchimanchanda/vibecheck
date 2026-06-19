import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// OpenRouter API helper
async function callOpenRouter(model: string, messages: any[], req: NextRequest) {
  const referer = req.headers.get('referer') || process.env.SITE_URL || 'http://localhost'
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': 'VibeCheck'
    },
    body: JSON.stringify({
      model,
      messages
    })
  })
  
  if (!response.ok) {
    let errorText = ''
    try { errorText = await response.text() } catch {}
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter: empty response')
  return content
}

// DeepSeek official API helper (fallback if OpenRouter key is missing)
async function callDeepSeek(modelName: string, messages: any[]) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured')
  }
  // Map OpenRouter deepseek model slugs to official DeepSeek models
  const mapped = modelName.includes('deepseek-r1') ? 'deepseek-reasoner' : 'deepseek-chat'
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: mapped,
      messages
    })
  })
  if (!resp.ok) {
    let errorText = ''
    try { errorText = await resp.text() } catch {}
    throw new Error(`DeepSeek API error: ${resp.status} ${errorText}`)
  }
  const data = await resp.json()
  const msg = data?.choices?.[0]?.message
  if (!msg) throw new Error('DeepSeek: empty response')
  // Some DeepSeek responses include reasoning_content separate from content
  const reasoning = msg.reasoning_content ? `Reasoning:\n${msg.reasoning_content}\n\n` : ''
  return `${reasoning}${msg.content || ''}`
}

interface VulnerabilityMessage {
  id: number
  type: string
  risk: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  message: string
  suggestion: string
  timestamp: Date
  cweId?: string
}

interface ChatContext {
  selectedFile?: string
  fileContent?: string
  selectedLines?: { start: number; end: number; content: string }
  vulnerabilities: VulnerabilityMessage[]
  selectedVulnerability?: VulnerabilityMessage | null
  userMessage: string
  codebaseContext?: {
    totalFiles: number
    languages: string[]
    projectStructure: string
  }
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, model = 'gemini-2.0-pro-exp-02-05' }: {
      message: string
      context: ChatContext
      model?: string
    } = await req.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build system prompt for security context
    let systemPrompt = `You are an AI security assistant specializing in vulnerability analysis and code security, similar to Cursor's AI assistant but focused on security.

Your capabilities:
- Analyze security vulnerabilities and explain them clearly
- Provide specific, actionable fix recommendations with exact code
- Apply code changes directly when requested
- Explain security best practices and CWE classifications
- Suggest secure coding patterns for any programming language
- Understand full codebase context and relationships between files

Guidelines:
- Be concise but thorough in explanations
- Always provide exact code fixes that can be directly applied
- When showing code fixes, use markdown code blocks with the correct language
- Focus on the specific vulnerability context provided
- Use developer-friendly language with precise technical details
- Prioritize security while maintaining code functionality
- Reference relevant security standards (OWASP, CWE, etc.)
- When asked to fix code, provide complete, ready-to-use code replacements

Current context:`

    // Add file context if available
    if (context.selectedFile) {
      systemPrompt += `\nCurrently viewing file: ${context.selectedFile}`
    }

    // Add selected lines context if available
    if (context.selectedLines) {
      systemPrompt += `\nSelected lines ${context.selectedLines.start}-${context.selectedLines.end}:`
      systemPrompt += `\n\`\`\`\n${context.selectedLines.content}\n\`\`\``
    }

    // Add codebase context if available
    if (context.codebaseContext) {
      systemPrompt += `\nCodebase overview:`
      systemPrompt += `\n- Total files: ${context.codebaseContext.totalFiles}`
      systemPrompt += `\n- Languages detected: ${context.codebaseContext.languages.join(', ')}`
      systemPrompt += `\n- Project structure: ${context.codebaseContext.projectStructure}`
    }

    // Add vulnerability context
    if (context.vulnerabilities && context.vulnerabilities.length > 0) {
      systemPrompt += `\n\nVulnerabilities found in current context:`
      context.vulnerabilities.forEach((vuln, index) => {
        systemPrompt += `\n${index + 1}. ${vuln.type} (${vuln.riskLevel.toUpperCase()}) in ${vuln.file}:${vuln.line}`
        systemPrompt += `\n   Message: ${vuln.message}`
        systemPrompt += `\n   Suggestion: ${vuln.suggestion}`
        if (vuln.cweId) {
          systemPrompt += `\n   CWE: ${vuln.cweId}`
        }
      })
    }

    // Add specific vulnerability context if selected
    if (context.selectedVulnerability) {
      const vuln = context.selectedVulnerability
      systemPrompt += `\n\nFocus on this specific vulnerability:`
      systemPrompt += `\nType: ${vuln.type}`
      systemPrompt += `\nRisk Level: ${vuln.riskLevel.toUpperCase()}`
      systemPrompt += `\nLocation: ${vuln.file}:${vuln.line}`
      systemPrompt += `\nMessage: ${vuln.message}`
      systemPrompt += `\nSuggestion: ${vuln.suggestion}`
      if (vuln.cweId) {
        systemPrompt += `\nCWE: ${vuln.cweId}`
      }
    }

    // Add file content context (limited to prevent token overflow)
    if (context.fileContent) {
      const contentPreview = context.fileContent.length > 2000 
        ? context.fileContent.substring(0, 2000) + '...[truncated]'
        : context.fileContent
      systemPrompt += `\n\nFile content preview:\n\`\`\`\n${contentPreview}\n\`\`\``
    }

    systemPrompt += `\n\nUser question: ${message}`

    // Handle different model providers
    let modelName = model || 'gemini-1.5-flash'
    let text: string
    
    // Check API keys based on model type
    if (modelName.startsWith('openrouter/')) {
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json(
          { error: 'OpenRouter API key not configured' },
          { status: 500 }
        )
      }
    }
    
    console.log(`Using model: ${modelName}`)
    
    if (modelName.startsWith('openrouter/')) {
      // OpenRouter models
      const openRouterModel = modelName.replace('openrouter/', '')
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: systemPrompt }
      ]
      if (process.env.OPENROUTER_API_KEY) {
        text = await callOpenRouter(openRouterModel, messages, req)
        console.log(`Generated OpenRouter response: ${text.substring(0, 100)}...`)
      } else if (openRouterModel.startsWith('deepseek/')) {
        // Fallback to DeepSeek official API if configured
        text = await callDeepSeek(openRouterModel, messages)
        console.log(`Generated DeepSeek response: ${text.substring(0, 100)}...`)
      } else {
        return NextResponse.json(
          { error: 'OpenRouter API key not configured' },
          { status: 500 }
        )
      }
    } else {
      // Gemini models
      if (!modelName.startsWith('gemini-')) {
        modelName = 'gemini-1.5-flash'  // Use Flash model as default for better quota
      }
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'Gemini API key not configured' },
          { status: 500 }
        )
      }
      const genModel = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024, // Reduce token limit to save quota
        }
      })

      console.log('Sending prompt to Gemini...')
      const result = await genModel.generateContent(systemPrompt)
      const response = result.response
      text = response.text()
      console.log(`Generated Gemini response: ${text.substring(0, 100)}...`)
    }

    return NextResponse.json({
      response: text,
      model: modelName,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle specific API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY') || error.message.includes('OpenRouter API error: 401')) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 401 }
        )
      }
      if (error.message.includes('QUOTA') || error.message.includes('429') || error.message.includes('OpenRouter API error: 429')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please wait a moment and try again. The system will retry automatically.' },
          { status: 429 }
        )
      }
      if (error.message.includes('SAFETY')) {
        return NextResponse.json(
          { error: 'Content filtered by safety policies' },
          { status: 400 }
        )
      }
      if (error.message.includes('OpenRouter API error')) {
        return NextResponse.json(
          { error: 'OpenRouter API error. Please try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Chat API is running',
    models: [
      'gemini-2.0-pro-exp-02-05',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro'
    ],
    timestamp: new Date().toISOString()
  })
}
