// test-enhanced-sidebar.tsx - Quick test file to verify enhanced sidebar functionality
import React from 'react'
import { CursorLikeSidebar } from './components/cursor-like-sidebar'

// Mock data for testing
const mockVulnerabilities = [
  {
    id: 1,
    type: 'SQL Injection',
    risk: 'Critical',
    riskLevel: 'critical' as const,
    file: 'app/api/users.ts',
    line: 42,
    message: 'Potential SQL injection vulnerability detected',
    suggestion: 'Use parameterized queries',
    timestamp: new Date(),
    cweId: 'CWE-89'
  }
]

const mockLastChange = {
  filePath: 'app/api/users.ts',
  oldContent: 'const query = `SELECT * FROM users WHERE id = ${id}`'
}

// Test component
export function TestEnhancedSidebar() {
  const handleCodeApply = (filePath: string, newContent: string) => {
    console.log('Applied code to:', filePath)
    console.log('New content:', newContent)
  }

  const handleRevertLastChange = () => {
    console.log('Reverting last change for:', mockLastChange.filePath)
  }

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <p>Main content area</p>
      </div>
      <CursorLikeSidebar
        vulnerabilities={mockVulnerabilities}
        selectedFile="app/api/users.ts"
        fileContent="const query = `SELECT * FROM users WHERE id = ${id}`"
        isScanning={false}
        onCodeApply={handleCodeApply}
        onRevertLastChange={handleRevertLastChange}
        lastChange={mockLastChange}
        allFiles={{
          'app/api/users.ts': 'const query = `SELECT * FROM users WHERE id = ${id}`',
          'app/components/UserList.tsx': 'export function UserList() { return <div>Users</div> }'
        }}
      />
    </div>
  )
}

/*
Enhanced features to test:
1. ✅ DiffView component - shows code differences
2. ✅ Revert button - appears when lastChange is provided  
3. ✅ Clear chat button - clears chat history
4. ✅ Toast notifications - for copy, apply, errors
5. ✅ Improved code block rendering with diff view
*/
