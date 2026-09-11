import nodemailer from 'nodemailer';

export interface SendOtpEmailParams {
  toEmail: string;
  otp: string;
  fullName?: string;
}

class EmailService {
  private getTransporter(): nodemailer.Transporter | null {
    const user =
      process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      process.env.SMTP_EMAIL;
    const pass =
      process.env.SMTP_PASS ||
      process.env.GMAIL_APP_PASSWORD ||
      process.env.EMAIL_PASS ||
      process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''), // strip any spaces from app password
      },
    });
  }

  async sendOtpEmail({ toEmail, otp, fullName }: SendOtpEmailParams): Promise<{ sent: boolean; message: string }> {
    const transporter = this.getTransporter();
    const cleanEmail = toEmail.toLowerCase().trim();
    const displayName = fullName?.trim() || cleanEmail.split('@')[0];

    if (!transporter) {
      console.log(`\n======================================================`);
      console.log(`📧 [EMAIL SERVICE - DEV / DEMO OTP]`);
      console.log(`To: ${cleanEmail}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Notice: Provide GMAIL_USER and GMAIL_APP_PASSWORD in .env for live inbox dispatch.`);
      console.log(`======================================================\n`);
      return {
        sent: false,
        message: 'OTP logged to server (SMTP pending configuration)',
      };
    }

    const senderEmail =
      process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      'support@seelibrary.io';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>seeLibrary Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">seeLibrary</h1>
              <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Library & Study Center Management</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">Login Verification Code</h2>
              <p style="color: #475569; margin: 0 0 24px 0; font-size: 14px; line-height: 1.5;">
                Hello <strong>${displayName}</strong>,<br>
                Use the following 6-digit One-Time Password (OTP) to securely sign in to your seeLibrary account:
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border-radius: 12px; border: 2px dashed #cbd5e1; padding: 20px 10px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4338ca;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Details & Expiration Notice -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="color: #92400e; margin: 0; font-size: 12px; font-weight: 600;">
                      ⏱ This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.5;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 11px;">
                © ${new Date().getFullYear()} seeLibrary SaaS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await transporter.sendMail({
        from: `"seeLibrary Security" <${senderEmail}>`,
        to: cleanEmail,
        subject: `${otp} is your seeLibrary verification code`,
        text: `Hello ${displayName}, your seeLibrary OTP is: ${otp}. It is valid for 5 minutes.`,
        html: htmlContent,
      });

      console.log(`[EMAIL SERVICE] OTP successfully sent to: ${cleanEmail}`);
      return { sent: true, message: 'OTP email delivered successfully' };
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Failed to send email via SMTP:`, err);
      return { sent: false, message: err?.message || 'Failed to dispatch email' };
    }
  }
}

export const emailService = new EmailService();
