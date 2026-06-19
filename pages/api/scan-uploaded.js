const SCANNER_SERVICE_URL = 'http://127.0.0.1:5000';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  try {
    console.log(`📤 Sending ${files.length} files to Flask scanner service...`);
    
    // Send files to Flask scanner service
    const response = await fetch(`${SCANNER_SERVICE_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Scanner service error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Scanner service failed');
    }

    console.log(`✅ Scanner service completed. Found ${result.vulnerabilities.length} vulnerabilities`);

    // Transform the result to match our frontend interface
    const transformedVulnerabilities = [];
    let id = 1;

    // Process the vulnerabilities array directly
    for (const vuln of result.vulnerabilities) {
      transformedVulnerabilities.push({
        id: id++,
        type: vuln.type,
        risk: vuln.type,
        riskLevel: vuln.severity.toLowerCase(),
        file: vuln.file_path,
        line: vuln.line_number,
        message: vuln.description,
        suggestion: vuln.recommendation,
        timestamp: new Date(),
        cweId: vuln.cwe_id
      });
    }

    res.status(200).json({
      success: true,
      summary: result.scan_summary,
      vulnerabilities: transformedVulnerabilities
    });

  } catch (error) {
    console.error('Scan error:', error);
    
    // Check if it's a connection error to the Flask service
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      return res.status(503).json({ 
        error: 'Scanner service unavailable', 
        message: 'Please make sure the scanner service is running on port 5000',
        hint: 'Run: python scanner_service.py'
      });
    }
    
    res.status(500).json({ 
      error: 'Scan failed', 
      message: error.message 
    });
  }
}

// Increase the body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};