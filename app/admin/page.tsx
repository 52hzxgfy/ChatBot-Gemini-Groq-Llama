'use client'

import { useState, useEffect } from 'react'
import { VerificationCode } from '@/lib/types'

export default function AdminPage() {
  const [codes, setCodes] = useState<VerificationCode[]>([])
  const [adminToken, setAdminToken] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchCodes = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/admin/codes', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || '获取验证码失败')
      }
      
      setCodes(data.codes)
    } catch (error) {
      setError(error instanceof Error ? error.message : '获取验证码失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">验证码管理</h1>
        
        <div className="bg-white bg-opacity-90 rounded-lg p-6 mb-8">
          <div className="flex gap-4 mb-6">
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="输入管理员令牌"
              className="flex-1 border border-gray-300 rounded-md px-4 py-2"
            />
            <button
              onClick={fetchCodes}
              disabled={isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '加载中...' : '获取验证码'}
            </button>
          </div>

          {error && (
            <div className="text-red-500 mb-4 p-4 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {codes.map((code) => (
            <div
              key={code.code}
              className={`bg-white bg-opacity-90 p-4 rounded-lg border-2 ${
                code.isValid ? 'border-green-500' : 'border-red-500'
              }`}
            >
              <div className="font-mono text-xl mb-2">{code.code}</div>
              <div className={`text-sm ${code.isValid ? 'text-green-600' : 'text-red-600'}`}>
                状态: {code.isValid ? '可用' : '已使用'}
              </div>
              <div className="text-sm text-gray-600">
                使用次数: {code.usageCount}
              </div>
            </div>
          ))}
        </div>

        {codes.length > 0 && (
          <div className="mt-6 text-gray-600">
            总计: {codes.length} 个验证码
            <br />
            可用: {codes.filter(c => c.isValid).length} 个
            <br />
            已使用: {codes.filter(c => !c.isValid).length} 个
          </div>
        )}
      </div>
    </div>
  )
}