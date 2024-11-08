import { NextResponse } from 'next/server';
import { VerificationService } from '@/lib/verificationService';
import { AdminResponse } from '@/lib/types';

export async function GET(request: Request) {
  try {
    // 验证管理员密钥
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json<AdminResponse>({ 
        success: false, 
        message: '未授权访问' 
      }, { status: 401 });
    }

    const codes = await VerificationService.getAllCodes();
    return NextResponse.json<AdminResponse>({ 
      success: true, 
      codes 
    });
  } catch (error) {
    console.error('获取验证码列表失败:', error);
    return NextResponse.json<AdminResponse>({ 
      success: false, 
      message: '获取验证码列表失败' 
    }, { status: 500 });
  }
}