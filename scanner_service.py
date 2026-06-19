#!/usr/bin/env python3
"""
Flask-based Vulnerability Scanner Service
Runs continuously and scans uploaded folders via REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import shutil
import json
from pathlib import Path
import threading
import time

import subprocess
import mimetypes

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication



@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'vulnerability-scanner',
        'timestamp': time.time()
    })

@app.route('/scan', methods=['POST'])
def scan_files():
    """Scan uploaded files for vulnerabilities using Semgrep"""
    try:
        data = request.get_json()
        
        if not data or 'files' not in data:
            return jsonify({
                'success': False,
                'error': 'Files data is required'
            }), 400
        
        files = data['files']
        if not isinstance(files, list) or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'Files must be a non-empty array'
            }), 400
        
        # Validate file count to prevent DoS
        if len(files) > 1000:  # Limit to 1000 files
            return jsonify({
                'success': False,
                'error': 'Too many files. Maximum 1000 files allowed.'
            }), 400
        
        # Create temporary directory for this scan
        temp_dir = tempfile.mkdtemp(prefix='vibecheck_scan_')
        
        try:
            # Write all files to temporary directory with path validation
            for file_data in files:
                if 'path' not in file_data or 'content' not in file_data:
                    continue
                
                # Validate file path to prevent path traversal
                file_path = file_data['path']
                if '..' in file_path or file_path.startswith('/') or '\\' in file_path:
                    continue  # Skip potentially malicious paths
                
                # Limit file size to prevent DoS
                if len(file_data['content']) > 1024 * 1024:  # 1MB limit
                    continue
                
                full_path = os.path.join(temp_dir, file_path)
                file_dir = os.path.dirname(full_path)
                
                # Ensure the path is within the temp directory
                if not os.path.abspath(full_path).startswith(os.path.abspath(temp_dir)):
                    continue
                
                # Create subdirectories if needed
                os.makedirs(file_dir, exist_ok=True)
                
                # Write file content
                with open(full_path, 'w', encoding='utf-8', errors='replace') as f:
                    f.write(file_data['content'])
            
            print(f"📁 Created temporary directory: {temp_dir}")
            print(f"📄 Written {len(files)} files for scanning")
            
            # Use Semgrep to scan the temporary directory
            semgrep_results = run_semgrep_scan(temp_dir)
            formatted = format_semgrep_results(semgrep_results, temp_dir)
            
            print(f"✅ Semgrep scan completed. Found {len(formatted)} vulnerabilities")
            
            return jsonify({
                'success': True,
                'scan_summary': {
                    'total_vulnerabilities': len(formatted),
                    'files_scanned': len(files),
                    'severity_breakdown': {
                        'critical': len([v for v in formatted if v['riskLevel'] == 'critical']),
                        'high': len([v for v in formatted if v['riskLevel'] == 'high']),
                        'medium': len([v for v in formatted if v['riskLevel'] == 'medium']),
                        'low': len([v for v in formatted if v['riskLevel'] == 'low']),
                    }
                },
                'vulnerabilities': formatted
            })
            
        finally:
            # Clean up temporary directory
            try:
                shutil.rmtree(temp_dir)
                print(f"🗑️  Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_error:
                print(f"⚠️  Failed to cleanup {temp_dir}: {cleanup_error}")
    
    except Exception as e:
        print(f"❌ Scan error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error occurred during scan'
        }), 500

def detect_languages_and_tech(directory):
    """
    Walks the directory and returns a set of detected languages/techs based on file extensions and config files.
    """
    exts = set()
    techs = set()
    for root, dirs, files in os.walk(directory):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext:
                exts.add(ext)
            # Detect by config files
            if file == 'package.json':
                techs.add('javascript')
            if file == 'requirements.txt' or file == 'pyproject.toml':
                techs.add('python')
            if file == 'composer.json':
                techs.add('php')
            if file == 'Gemfile':
                techs.add('ruby')
            if file == 'Dockerfile':
                techs.add('docker')
            if file == 'nginx.conf':
                techs.add('nginx')
            if file == 'httpd.conf' or file == 'apache2.conf':
                techs.add('apache')
            if file == 'go.mod':
                techs.add('go')
            if file == 'Cargo.toml':
                techs.add('rust')
            if file == 'pom.xml' or file == 'build.gradle':
                techs.add('java')
            if file == 'main.tf':
                techs.add('terraform')
            if file == 'kustomization.yaml' or file == 'deployment.yaml':
                techs.add('kubernetes')
    # Map extensions to languages
    ext_map = {
        '.js': 'javascript', '.jsx': 'javascript', '.ts': 'javascript', '.tsx': 'javascript',
        '.py': 'python', '.php': 'php', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
        '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
        '.h': 'cpp', '.cs': 'csharp', '.html': 'html', '.htm': 'html', '.sql': 'sql',
        '.tf': 'terraform', '.yml': 'yaml', '.yaml': 'yaml', '.json': 'json',
        '.sh': 'shell', '.bat': 'shell', '.ps1': 'shell', '.dockerfile': 'docker',
        '.conf': 'nginx', '.ini': 'ini', '.pl': 'perl', '.swift': 'swift', '.kt': 'kotlin',
    }
    for ext in exts:
        if ext in ext_map:
            techs.add(ext_map[ext])
    return techs

def run_semgrep_scan(directory):
    """
    Runs Semgrep on the given directory with only relevant security rules.
    """
    techs = detect_languages_and_tech(directory)
    print(f"🔎 Detected project techs: {techs}")
    # Always include auto, owasp, security-audit, and custom rules
    configs = ['auto', 'p/security-audit', 'p/owasp-top-ten', 'custom_rules.yml']
    # Map techs to Semgrep configs
    tech_to_config = {
        'php': 'p/php',
        'javascript': 'p/javascript',
        'python': 'p/python',
        'java': 'p/java',
        'csharp': 'p/csharp',
        'go': 'p/go',
        'ruby': 'p/ruby',
        'rust': 'p/rust',
        'cpp': 'p/cpp',
        'c': 'p/c',
        'terraform': 'p/terraform',
        'docker': 'p/docker',
        'kubernetes': 'p/kubernetes',
        'nginx': 'p/nginx',
        'apache': 'p/apache',
    }
    for tech in techs:
        if tech in tech_to_config:
            configs.append(tech_to_config[tech])
    # Add some special-purpose configs if relevant
    if 'php' in techs or 'python' in techs or 'javascript' in techs:
        configs += ['p/xss', 'p/sql-injection', 'p/command-injection', 'p/path-traversal', 'p/deserialization', 'p/crypto', 'p/secrets']
    print(f"⚡ Running Semgrep configs: {configs}")
    all_results = []
    for config in configs:
        try:
            print(f"🔍 Running Semgrep with config: {config}")
            result = subprocess.run(
                ['semgrep', '--config', config, '--json', directory],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode in (0, 1):
                try:
                    findings = json.loads(result.stdout)
                    if 'results' in findings:
                        all_results.extend(findings['results'])
                        print(f"✅ Found {len(findings['results'])} issues with {config}")
                except json.JSONDecodeError:
                    print(f"⚠️  Failed to parse JSON from {config}")
            else:
                print(f"⚠️  Config {config} failed with code {result.returncode}")
        except subprocess.TimeoutExpired:
            print(f"⏰ Config {config} timed out")
        except Exception as e:
            print(f"❌ Error with config {config}: {str(e)}")
    # Remove duplicates based on file path and line number
    unique_results = []
    seen = set()
    for result in all_results:
        key = (result.get('path', ''), result.get('start', {}).get('line', 0), result.get('check_id', ''))
        if key not in seen:
            seen.add(key)
            unique_results.append(result)
    print(f"🎯 Total unique vulnerabilities found: {len(unique_results)}")
    return unique_results

def format_semgrep_results(results, root_dir):
    """
    Formats Semgrep results into your app's vulnerability format.
    Uses relative paths from the scanned directory root.
    """
    # Vulnerability type mappings for better categorization
    vuln_types = {
        'xss': 'Cross-Site Scripting (XSS)',
        'sql-injection': 'SQL Injection',
        'command-injection': 'Command Injection',
        'path-traversal': 'Path Traversal',
        'deserialization': 'Insecure Deserialization',
        'crypto': 'Cryptographic Vulnerability',
        'secrets': 'Exposed Secret',
        'auth': 'Authentication Bypass',
        'injection': 'Code Injection',
        'xxe': 'XML External Entity (XXE)',
        'ssrf': 'Server-Side Request Forgery (SSRF)',
        'open-redirect': 'Open Redirect',
        'file-upload': 'Unsafe File Upload',
        'weak-random': 'Weak Random Number Generation',
        'hardcoded': 'Hardcoded Credentials',
        'debug': 'Debug Information Exposure',
        'error-handling': 'Information Disclosure',
        'input-validation': 'Input Validation Bypass',
        'output-encoding': 'Output Encoding Missing',
        'session': 'Session Management Issue'
    }
    
    # Risk level mappings
    risk_levels = {
        'ERROR': 'critical',
        'WARNING': 'high',
        'INFO': 'medium'
    }
    
    formatted = []
    for idx, finding in enumerate(results, 1):
        # Convert absolute path to relative path from the scanned directory
        rel_path = os.path.relpath(finding["path"], root_dir)
        
        # Extract vulnerability type from check_id
        check_id = finding.get("check_id", "").lower()
        vuln_type = "Security Vulnerability"
        for key, value in vuln_types.items():
            if key in check_id:
                vuln_type = value
                break
        
        # Get severity and map to risk level
        severity = finding.get("extra", {}).get("severity", "WARNING")
        risk_level = risk_levels.get(severity, "medium")
        
        # Get message and suggestion
        message = finding["extra"].get("message", finding.get("check_id", ""))
        suggestion = finding["extra"].get("metadata", {}).get("fix", "")
        
        # Generate better suggestions if none provided
        if not suggestion:
            if 'xss' in check_id:
                suggestion = "Sanitize user input using proper encoding functions (e.g., htmlspecialchars in PHP, encodeURIComponent in JavaScript)."
            elif 'sql-injection' in check_id:
                suggestion = "Use parameterized queries or prepared statements instead of string concatenation."
            elif 'command-injection' in check_id:
                suggestion = "Avoid using user input in system commands. Use built-in functions or validate input thoroughly."
            elif 'path-traversal' in check_id:
                suggestion = "Validate and sanitize file paths. Use path normalization and restrict access to allowed directories."
            elif 'deserialization' in check_id:
                suggestion = "Avoid deserializing untrusted data. Use JSON or XML parsers with proper validation."
            elif 'crypto' in check_id:
                suggestion = "Use cryptographically secure functions and avoid deprecated algorithms."
            elif 'secrets' in check_id:
                suggestion = "Remove hardcoded secrets from code. Use environment variables or secure secret management."
            else:
                suggestion = "Review the code for security best practices and implement proper input validation and output encoding."
        
        formatted.append({
            "id": idx,
            "type": vuln_type,
            "risk": severity.capitalize(),
            "riskLevel": risk_level,
            "file": rel_path,  # Use relative path
            "line": finding["start"]["line"],
            "message": message,
            "suggestion": suggestion,
            "timestamp": None,
            "cweId": finding["extra"].get("metadata", {}).get("cwe", None)
        })
    
    return formatted

@app.route('/scan-directory', methods=['POST'])
def scan_directory():
    """Scan a directory path using Semgrep"""
    try:
        data = request.get_json()
        if not data or 'directory_path' not in data:
            return jsonify({
                'success': False,
                'error': 'Directory path is required'
            }), 400

        directory_path = data['directory_path']
        
        # Validate directory path to prevent path traversal
        if '..' in directory_path or directory_path.startswith('/') or '\\' in directory_path:
            return jsonify({
                'success': False,
                'error': 'Invalid directory path'
            }), 400
        
        # Ensure the path is within allowed directories (current working directory)
        abs_path = os.path.abspath(directory_path)
        cwd = os.getcwd()
        if not abs_path.startswith(cwd):
            return jsonify({
                'success': False,
                'error': 'Directory path must be within current working directory'
            }), 400
        
        if not os.path.exists(directory_path):
            return jsonify({
                'success': False,
                'error': f'Directory does not exist: {directory_path}'
            }), 400

        print(f"🔍 Scanning directory with Semgrep: {directory_path}")

        semgrep_results = run_semgrep_scan(directory_path)
        formatted = format_semgrep_results(semgrep_results, directory_path)

        print(f"✅ Semgrep scan completed. Found {len(formatted)} vulnerabilities")

        return jsonify({
            'success': True,
            'scan_summary': {
                'total_vulnerabilities': len(formatted),
                'files_scanned': 'N/A (Semgrep)',
                'severity_breakdown': {
                    'critical': len([v for v in formatted if v['riskLevel'] == 'critical']),
                    'high': len([v for v in formatted if v['riskLevel'] == 'high']),
                    'medium': len([v for v in formatted if v['riskLevel'] == 'medium']),
                    'low': len([v for v in formatted if v['riskLevel'] == 'low']),
                }
            },
            'vulnerabilities': formatted
        })

    except Exception as e:
        print(f"❌ Semgrep scan error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error occurred during directory scan'
        }), 500

def run_scanner_service(host='127.0.0.1', port=5000, debug=False):
    """Run the Flask scanner service"""
    print("🚀 Starting Vulnerability Scanner Service...")
    print(f"🌐 Service will be available at: http://{host}:{port}")
    print("📡 Endpoints:")
    print(f"   GET  http://{host}:{port}/health - Health check")
    print(f"   POST http://{host}:{port}/scan - Scan uploaded files")
    print(f"   POST http://{host}:{port}/scan-directory - Scan directory path")
    print("🔄 Service will keep running until stopped...")
    
    # Use environment variable for debug setting in production
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true' if not debug else debug
    app.run(host=host, port=port, debug=debug_mode, threaded=True)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Vulnerability Scanner Service')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to (default: 5000)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    run_scanner_service(host=args.host, port=args.port, debug=args.debug)