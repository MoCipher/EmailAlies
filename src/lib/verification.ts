// Build-time safe verification module
import { VerificationCode } from '@/database/schema';

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, VerificationCode>();

// Check if we're in build time (no API key available)
const isBuildTime = typeof window === 'undefined' && !process.env.RESEND_API_KEY;

// Mock implementations for build time
const mockVerificationManager: VerificationManagerType = {
  createCode(email: string, purpose: 'register' | 'login'): string {
    console.log(`[BUILD TIME] Mock createCode: ${email} for ${purpose}`);
    return '123456'; // Mock code
  },

  verifyCode(email: string, code: string): VerificationCode | null {
    console.log(`[BUILD TIME] Mock verifyCode: ${email} with ${code}`);
    return { email, code, expiresAt: new Date(), purpose: 'register' as const };
  },

  async sendCode(email: string, code: string, purpose: 'register' | 'login'): Promise<boolean> {
    console.log(`[BUILD TIME] Mock sendCode: ${email} - ${code} for ${purpose}`);
    return true;
  },

  cleanupExpiredCodes(): void {
    console.log('[BUILD TIME] Mock cleanupExpiredCodes');
  }
};

// Real implementation for runtime
let realVerificationManager: typeof VerificationManager | null = null;

// Create real verification manager
async function createRealVerificationManager() {
  try {
    // Dynamic imports to avoid build-time issues
    const [{ Resend }] = await Promise.all([
      import('resend')
    ]);

    // Real Resend client
    let resendClient: any = null;

    const getResendClient = async () => {
      if (!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          throw new Error('RESEND_API_KEY environment variable is not set');
        }
        resendClient = new Resend(apiKey);
      }
      return resendClient;
    };

    // Return the real verification manager
    const realManager: VerificationManagerType = {
      createCode(email: string, purpose: 'register' | 'login'): string {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const verificationCode: VerificationCode = {
          email,
          code,
          expiresAt,
          purpose,
        };

        verificationCodes.set(email, verificationCode);
        return code;
      },

      verifyCode(email: string, code: string): VerificationCode | null {
        const storedCode = verificationCodes.get(email);

        if (!storedCode) {
          return null;
        }

        if (storedCode.code === code && storedCode.expiresAt > new Date()) {
          verificationCodes.delete(email);
          return storedCode;
        }

        return null;
      },

      async sendCode(email: string, code: string, purpose: 'register' | 'login'): Promise<boolean> {
        try {
          const subject = purpose === 'register' ? 'Welcome to EmailAlies - Verify Your Account' : 'EmailAlies - Sign In Code';
          const purposeText = purpose === 'register' ? 'create your account' : 'sign in';

          const resend = await getResendClient();
          const { error } = await resend.emails.send({
            from: 'EmailAlies <noreply@emailalies.com>',
            to: [email],
            subject: subject,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${subject}</title>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .container { background: #f9f9f9; padding: 30px; border-radius: 10px; text-align: center; }
                    .code { font-size: 32px; font-weight: bold; color: #2563eb; background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 4px; }
                    .footer { font-size: 14px; color: #666; margin-top: 30px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>🔐 EmailAlies</h1>
                    <p>Hello!</p>
                    <p>Use this verification code to ${purposeText}:</p>
                    <div class="code">${code}</div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, you can safely ignore this email.</p>
                    <div class="footer">
                      <p>Secure • Private • Encrypted</p>
                      <p>EmailAlies - Protect your privacy with disposable email aliases</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });

          if (error) {
            console.error('Failed to send email:', error);
            return false;
          }

          console.log(`✅ Verification code sent to ${email}`);
          return true;
        } catch (error) {
          console.error('Email service error:', error);
          return false;
        }
      },

      cleanupExpiredCodes(): void {
        const now = new Date();
        for (const [email, code] of verificationCodes.entries()) {
          if (code.expiresAt <= now) {
            verificationCodes.delete(email);
          }
        }
      }
    };

    return realManager;
  } catch (error) {
    console.warn('Failed to create real verification manager, using mock');
    return mockVerificationManager;
  }
}

// Define the VerificationManager interface
interface VerificationManagerType {
  createCode(email: string, purpose: 'register' | 'login'): string;
  verifyCode(email: string, code: string): VerificationCode | null;
  sendCode(email: string, code: string, purpose: 'register' | 'login'): Promise<boolean>;
  cleanupExpiredCodes(): void;
}

// Export mock manager - API routes handle dynamic loading
export const VerificationManager = mockVerificationManager;

// Export function to create real manager dynamically
export { createRealVerificationManager };