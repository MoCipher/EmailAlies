import { VerificationCode } from '@/database/schema';

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, VerificationCode>();

// Lazy initialization of Resend client - only create when needed
let resendClient: any = null;

async function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    // Dynamic import to avoid build-time issues
    const { Resend } = await import('resend');
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export class VerificationManager {
  /**
   * Generate a 6-digit verification code
   */
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and store a verification code
   */
  static createCode(email: string, purpose: 'register' | 'login'): string {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const verificationCode: VerificationCode = {
      email,
      code,
      expiresAt,
      purpose,
    };

    // Store with email as key
    verificationCodes.set(email, verificationCode);

    return code;
  }

  /**
   * Verify a code and return the verification data
   */
  static verifyCode(email: string, code: string): VerificationCode | null {
    const storedCode = verificationCodes.get(email);

    if (!storedCode) {
      return null;
    }

    // Check if code matches and hasn't expired
    if (storedCode.code === code && storedCode.expiresAt > new Date()) {
      // Remove used code
      verificationCodes.delete(email);
      return storedCode;
    }

    return null;
  }

  /**
   * Clean up expired codes (should be called periodically)
   */
  static cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [email, code] of verificationCodes.entries()) {
      if (code.expiresAt <= now) {
        verificationCodes.delete(email);
      }
    }
  }

  /**
   * Send verification code via email using Resend
   */
  static async sendCode(email: string, code: string, purpose: 'register' | 'login'): Promise<boolean> {
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
  }
}