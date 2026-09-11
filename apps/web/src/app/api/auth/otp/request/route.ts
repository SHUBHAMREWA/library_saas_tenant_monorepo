import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';
import crypto from 'crypto';

// In-memory OTP store for Next.js API route
const otpStore = new Map<string, { code: string; expiresAt: number; fullName?: string }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // 1. Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore.set(cleanEmail, {
      code: rawOtp,
      expiresAt,
      fullName,
    });

    // 2. Dispatch via Email Service (Nodemailer / Gmail SMTP)
    await emailService.sendOtpEmail({
      toEmail: cleanEmail,
      otp: rawOtp,
      fullName,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      success: true,
      message: `OTP has been sent to ${cleanEmail}. Valid for 5 minutes.`,
      ...(isDev ? { testOtp: rawOtp } : {}),
    });
  } catch (error: any) {
    console.error('[API /api/auth/otp/request] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to request OTP' }, { status: 500 });
  }
}

export { otpStore };
