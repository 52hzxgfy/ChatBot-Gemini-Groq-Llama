import { config } from 'dotenv';
import { VerificationCode } from '@/lib/types';
import path from 'path';
import fs from 'fs';

// 加载环境变量
config({ path: '.env.local' });

// 检查环境变量
if (!process.env.EDGE_CONFIG || !process.env.VERCEL_API_TOKEN) {
  console.error('错误: 未设置必要的环境变量');
  console.error('请确保 .env.local 文件中包含以下变量:');
  console.error('- EDGE_CONFIG');
  console.error('- VERCEL_API_TOKEN');
  process.exit(1);
}

function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function initializeCodes() {
  try {
    const codes: VerificationCode[] = [];
    const usedCodes = new Set<string>();

    // 生成150个验证码
    while (codes.length < 150) {
      const code = generateRandomCode();
      if (!usedCodes.has(code)) {
        usedCodes.add(code);
        codes.push({
          code,
          usageCount: 0,
          isValid: true
        });
      }
    }

    // 从环境变量中提取 Edge Config ID
    const edgeConfigId = process.env.EDGE_CONFIG?.match(/ecfg_[^?]+/)?.[0];
    
    if (!edgeConfigId) {
      throw new Error('Invalid Edge Config URL in environment variables');
    }

    // 使用 Vercel API 更新 Edge Config
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

    console.log(`成功生成 ${codes.length} 个验证码`);

    // 保存备份到本地文件
    const backupDir = path.join(process.cwd(), 'admin');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, 'verification-codes-backup.json');
    await fs.promises.writeFile(
      backupPath,
      JSON.stringify(codes, null, 2),
      'utf8'
    );

    console.log('备份文件保存在:', backupPath);
  } catch (error) {
    console.error('初始化验证码失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initializeCodes();