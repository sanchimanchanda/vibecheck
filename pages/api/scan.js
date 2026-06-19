import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  try {
    // Forward the request to the Flask backend service
    const response = await fetch('http://127.0.0.1:5000/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Backend service error');
    }

    const data = await response.json();
    
    res.status(200).json({
      success: data.success,
      summary: data.scan_summary,
      vulnerabilities: data.vulnerabilities
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      error: 'Scan failed', 
      message: error.message 
    });
  }
}