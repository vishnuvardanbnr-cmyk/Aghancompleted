import nodemailer from "nodemailer";
import { db } from "./db";
import { smtpSettings } from "@shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function getSmtpConfig() {
  const [settings] = await db.select().from(smtpSettings).limit(1);
  if (!settings || !settings.enabled) return null;
  return settings;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config) return false;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}

export async function sendTestEmail(to: string, smtpConfig: any): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to,
      subject: "Aghan Promoters - SMTP Test",
      html: getTestEmailTemplate(),
    });

    return true;
  } catch (error) {
    console.error("Test email failed:", error);
    throw error;
  }
}

export async function sendRegistrationEmail(user: { fullName: string; email: string; username: string; referralCode: string }) {
  return sendEmail({
    to: user.email,
    subject: "Welcome to Aghan Promoters - Account Created",
    html: getRegistrationTemplate(user),
  });
}

export async function sendActivationEmail(user: { fullName: string; email: string; username: string }) {
  return sendEmail({
    to: user.email,
    subject: "Aghan Promoters - Account Activated Successfully",
    html: getActivationTemplate(user),
  });
}

export async function sendActivationInvoiceEmail(
  user: { fullName: string; email: string },
  invoice: { invoiceNumber: string; invoiceDate: any; description: string; subtotal: string; gstAmount: string; totalAmount: string; gstPercentage: string | null; boardType: string }
) {
  return sendEmail({
    to: user.email,
    subject: `Aghan Promoters - Invoice ${invoice.invoiceNumber}`,
    html: getInvoiceTemplate(user, invoice),
  });
}

export async function isSmtpEnabled(): Promise<boolean> {
  const config = await getSmtpConfig();
  return config !== null;
}

export async function sendPasswordOtpEmail(user: { fullName: string; email: string }, otp: string): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Aghan Promoters - Password Change OTP",
    html: getPasswordOtpTemplate(user, otp),
  });
}

function getPasswordOtpTemplate(user: { fullName: string }, otp: string): string {
  return emailWrapper(`
    <h2>Password Change Request</h2>
    <p>Hello <strong>${user.fullName}</strong>,</p>
    <p>You requested to change your password. Use the OTP below to verify your identity:</p>
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: #f0fdf4; border: 2px solid #059669; border-radius: 12px; padding: 16px 32px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #059669;">${otp}</span>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="color: #6b7280; font-size: 13px;">If you did not request this change, please ignore this email.</p>
  `);
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header p { color: #d1fae5; margin: 5px 0 0; font-size: 14px; }
    .body { padding: 30px 20px; color: #1f2937; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
    .btn { display: inline-block; padding: 12px 30px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 13px; }
    .value { font-weight: 600; font-size: 13px; }
    .highlight { color: #059669; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Aghan Promoters</h1>
      <p>EV 2-Wheeler Promotion & Booking Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Aghan Promoters. All rights reserved.</p>
      <p>EV 2-Wheeler Promotion & Booking Platform</p>
    </div>
  </div>
</body>
</html>`;
}

function getTestEmailTemplate(): string {
  return emailWrapper(`
    <h2 style="color: #059669;">SMTP Configuration Test</h2>
    <p>This is a test email to verify your SMTP settings are working correctly.</p>
    <div class="info-box">
      <p style="margin: 0; text-align: center;">Your email configuration is <span class="highlight">working properly</span>.</p>
    </div>
    <p style="color: #6b7280; font-size: 13px;">If you received this email, your SMTP settings have been configured successfully.</p>
  `);
}

function getRegistrationTemplate(user: { fullName: string; username: string; referralCode: string }): string {
  return emailWrapper(`
    <h2>Welcome, ${user.fullName}!</h2>
    <p>Your account has been successfully created on <strong>Aghan Promoters</strong>.</p>
    <div class="info-box">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Username</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 13px; text-align: right;">${user.username}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Referral Code</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 13px; text-align: right; color: #059669;">${user.referralCode}</td>
        </tr>
      </table>
    </div>
    <h3>Next Steps</h3>
    <p>To activate your account and start earning, you need to pay the joining fee of <strong>Rs.5,900</strong>. Once activated, you will be placed on the EV Board and can start building your team.</p>
    <div class="info-box" style="background: #eff6ff; border-color: #bfdbfe;">
      <p style="margin: 0; font-size: 13px;"><strong>How it works:</strong></p>
      <ol style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #374151;">
        <li>Join with Rs.5,900</li>
        <li>Complete the 6x Matrix on each board</li>
        <li>Earn a free EV vehicle worth Rs.1,00,000</li>
      </ol>
    </div>
    <p>Share your referral code <strong style="color: #059669;">${user.referralCode}</strong> with friends to grow your network!</p>
  `);
}

function getActivationTemplate(user: { fullName: string; username: string }): string {
  return emailWrapper(`
    <h2>Account Activated! 🎉</h2>
    <p>Congratulations <strong>${user.fullName}</strong>! Your account has been successfully activated.</p>
    <div class="info-box">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Status</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 13px; text-align: right; color: #059669;">Active</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Board</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 13px; text-align: right;">EV Board</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Amount Paid</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 13px; text-align: right;">Rs.5,900</td>
        </tr>
      </table>
    </div>
    <p>You have been placed on the <strong>EV Board</strong>. Start referring people to fill your 6x matrix and progress through the boards!</p>
    <p style="color: #6b7280; font-size: 13px;">Your booking invoice has been generated and is available in your wallet transaction history.</p>
  `);
}

function getInvoiceTemplate(
  user: { fullName: string },
  invoice: { invoiceNumber: string; invoiceDate: any; description: string; subtotal: string; gstAmount: string; totalAmount: string; gstPercentage: string | null; boardType: string }
): string {
  const formattedDate = new Date(invoice.invoiceDate || new Date()).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric"
  });

  return emailWrapper(`
    <h2>Invoice - ${invoice.invoiceNumber}</h2>
    <p>Dear <strong>${user.fullName}</strong>, here is your booking invoice.</p>
    
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 16px 0;">
      <div style="background: #f9fafb; padding: 16px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #6b7280; font-size: 13px;">Invoice Number</td>
            <td style="font-weight: 600; font-size: 13px; text-align: right;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 13px; padding-top: 8px;">Date</td>
            <td style="font-weight: 600; font-size: 13px; text-align: right; padding-top: 8px;">${formattedDate}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 16px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 8px 0; font-size: 13px;">${invoice.description}</td>
            <td></td>
          </tr>
          <tr style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Subtotal</td>
            <td style="padding: 8px 0; font-size: 13px; text-align: right;">Rs.${parseFloat(invoice.subtotal).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">GST (${invoice.gstPercentage}%)</td>
            <td style="padding: 8px 0; font-size: 13px; text-align: right;">Rs.${parseFloat(invoice.gstAmount).toLocaleString("en-IN")}</td>
          </tr>
          <tr style="border-top: 2px solid #059669;">
            <td style="padding: 12px 0; font-weight: 700; font-size: 15px;">Total</td>
            <td style="padding: 12px 0; font-weight: 700; font-size: 15px; text-align: right; color: #059669;">Rs.${parseFloat(invoice.totalAmount).toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f0fdf4; padding: 12px 16px; text-align: center;">
        <span style="color: #059669; font-weight: 600; font-size: 13px;">PAID</span>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 12px;">This is a computer-generated invoice and does not require a signature.</p>
  `);
}
