// In-memory OTP storage for Next.js API routes
export const otpStore = new Map<string, { code: string; expiresAt: number; fullName?: string }>();
