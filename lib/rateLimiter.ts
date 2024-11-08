interface RateLimit {
    count: number;
    firstRequest: number;
  }
  
  export class RateLimiter {
    private static limits: Map<string, RateLimit> = new Map();
    private static readonly MAX_REQUESTS = 5; // 最大请求次数
    private static readonly TIME_WINDOW = 60 * 1000; // 1分钟时间窗口
  
    static checkRateLimit(ip: string): boolean {
      const now = Date.now();
      const limit = this.limits.get(ip);
  
      if (!limit) {
        // 第一次请求
        this.limits.set(ip, { count: 1, firstRequest: now });
        return true;
      }
  
      if (now - limit.firstRequest > this.TIME_WINDOW) {
        // 重置计数器
        this.limits.set(ip, { count: 1, firstRequest: now });
        return true;
      }
  
      if (limit.count >= this.MAX_REQUESTS) {
        return false;
      }
  
      // 增加计数器
      limit.count += 1;
      this.limits.set(ip, limit);
      return true;
    }
  
    static getRemainingAttempts(ip: string): number {
      const limit = this.limits.get(ip);
      if (!limit) return this.MAX_REQUESTS;
      
      const now = Date.now();
      if (now - limit.firstRequest > this.TIME_WINDOW) {
        return this.MAX_REQUESTS;
      }
      
      return Math.max(0, this.MAX_REQUESTS - limit.count);
    }
  }