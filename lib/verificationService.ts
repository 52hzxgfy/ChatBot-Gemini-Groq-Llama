import { VerificationCode, VerificationResponse, VerificationStatus } from './types';
import { createClient } from '@vercel/edge-config';

export class VerificationService {
  private static readonly edgeConfig = createClient(process.env.EDGE_CONFIG!);

  private static async updateEdgeConfig(codes: VerificationCode[], verifiedCode?: string) {
    const edgeConfigId = process.env.EDGE_CONFIG?.match(/ecfg_[^?]+/)?.[0];
    
    if (!edgeConfigId) {
      throw new Error('Invalid Edge Config URL in environment variables');
    }

    // 更新验证码列表
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key: 'verification-codes',
            value: codes
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update Edge Config: ${JSON.stringify(errorData)}`);
    }

    // 如果需要更新验证状态，使用单独的请求
    if (verifiedCode) {
      const verifiedCodesResponse = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'upsert',
              key: 'verified-codes',
              value: [verifiedCode]  // 存储为数组
            }
          ]
        })
      });

      if (!verifiedCodesResponse.ok) {
        console.error('Failed to update verified codes status');
      }
    }
  }

  private static async getCodesFromEdgeConfig(): Promise<VerificationCode[]> {
    try {
      const codes = await this.edgeConfig.get('verification-codes');
      if (!codes || !Array.isArray(codes)) {
        return [];
      }
      return codes as unknown as VerificationCode[];
    } catch (error) {
      console.error('Error fetching codes:', error);
      throw error;
    }
  }

  static async verifyCode(code: string): Promise<VerificationResponse> {
    try {
      if (!process.env.EDGE_CONFIG || !process.env.VERCEL_API_TOKEN) {
        throw new Error('Edge Config 环境变量未设置');
      }

      const codes = await this.getCodesFromEdgeConfig();
      const codeData = codes.find(c => c.code === code);
      
      if (!codeData) {
        return { 
          success: false, 
          message: '验证码不存在',
          remainingUses: 0 
        };
      }

      if (!codeData.isValid) {
        return { 
          success: false, 
          message: '验证码已失效',
          remainingUses: 0 
        };
      }

      // 更新验证码状态
      codeData.usageCount += 1;
      codeData.isValid = false;  // 使用后失效
      
      // 确保更新 Edge Config
      try {
        await this.updateEdgeConfig(codes, code);
      } catch (updateError) {
        console.error('更新验证码状态失败:', updateError);
        // 即使更新失败，仍然允许验证通过
      }

      return { 
        success: true, 
        message: '验证成功',
        code: codeData.code,
        remainingUses: 0
      };
    } catch (error) {
      console.error('验证过程发生错误:', error);
      throw error;
    }
  }

  static async getAllCodes(): Promise<VerificationCode[]> {
    return this.getCodesFromEdgeConfig();
  }

  // 添加新方法来检查验证状态
  static async checkVerificationStatus(code: string): Promise<boolean> {
    try {
      const verifiedCodes = await this.edgeConfig.get<string[]>('verified-codes');
      return Array.isArray(verifiedCodes) && verifiedCodes.includes(code);
    } catch (error) {
      console.error('检查验证状态失败:', error);
      return false;
    }
  }
}
