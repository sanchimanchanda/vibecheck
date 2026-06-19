import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment' });
    }

    const { model = 'gemini-2.0-pro-exp-02-05', filePath, fileContent, finding } = req.body || {};
    if (!filePath || typeof fileContent !== 'string' || !finding) {
      return res.status(400).json({ error: 'Missing required fields: filePath, fileContent, finding' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelClient = genAI.getGenerativeModel({ model });

    const system = `You are a senior application security engineer. Given a source file and a single vulnerability report, produce a minimal safe code edit that resolves the issue without changing behavior. Return ONLY a JSON object with keys: {\n  "summary": string,\n  "diff": string, // a unified diff OR the full fixed file in a field named fixedFile\n  "fixedFile": string // full contents if small; optional\n}. Do not include markdown fences.`;

    const prompt = [
      { role: 'user', parts: [{ text: system }] },
      { role: 'user', parts: [{ text: `File path: ${filePath}` }] },
      { role: 'user', parts: [{ text: `Finding: ${JSON.stringify(finding)}` }] },
      { role: 'user', parts: [{ text: `Source file (UTF-8):\n\n${fileContent}` }] },
    ];

    const result = await modelClient.generateContent({ contents: prompt });
    const text = (typeof result.response?.text === 'function') ? result.response.text() : (result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '');

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(502).json({ error: 'Model returned unexpected format', raw: text });
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch (e) {
        return res.status(502).json({ error: 'Failed to parse model output as JSON', raw: text });
      }
    }

    return res.status(200).json({ success: true, ...parsed });
  } catch (err) {
    console.error('Autofix error:', err);
    return res.status(500).json({ error: 'Autofix failed', message: err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};


