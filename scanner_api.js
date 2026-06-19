const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ScannerAPI {
    constructor() {
        this.pythonPath = 'python3'; // or 'python' depending on system
        this.scannerPath = path.join(__dirname, 'vulnerability_scanner.py');
    }

    async scanDirectory(directoryPath) {
        return new Promise((resolve, reject) => {
            const args = [this.scannerPath, directoryPath, '--format', 'json'];
            const process = spawn(this.pythonPath, args);
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0 || code === 1) { // 0 = no vulns, 1 = vulns found
                    try {
                        // Extract JSON from stdout (might have other console output)
                        const lines = stdout.split('\n');
                        let jsonStart = -1;
                        
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].trim().startsWith('{')) {
                                jsonStart = i;
                                break;
                            }
                        }
                        
                        if (jsonStart !== -1) {
                            const jsonStr = lines.slice(jsonStart).join('\n');
                            const result = JSON.parse(jsonStr);
                            resolve(result);
                        } else {
                            resolve({
                                scan_summary: {
                                    total_vulnerabilities: 0,
                                    files_scanned: 0,
                                    severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
                                },
                                vulnerabilities: []
                            });
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse scanner output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Scanner failed with code ${code}: ${stderr}`));
                }
            });
            
            process.on('error', (error) => {
                reject(new Error(`Failed to start scanner: ${error.message}`));
            });
        });
    }
}

module.exports = ScannerAPI;