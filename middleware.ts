import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    // 继续处理请求
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // 返回友好的错误响应
    return NextResponse.json(
      { success: false, message: '服务器处理请求时发生错误' },
      { status: 500 }
    )
  }
}

export const config = {
  matcher: '/api/:path*',
} 