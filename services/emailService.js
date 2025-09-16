import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.initializeService();
  }

  initializeService() {
    const service = (process.env.EMAIL_SERVICE || 'sendgrid').toLowerCase();
    
    if (service === 'sendgrid') {
      this.initializeSendGrid();
    } else if (service === 'sendmail') {
      this.initializeSendmail();
    } else if (service === 'dev') {
      this.initializeDev();
    } else if (service === 'mailersend') {
      this.initializeMailerSend();
    } else if (service === 'ethereal') {
      this.initializeEthereal();
    } else {
      this.initializeSMTP();
    }
  }

  initializeSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
      console.warn('[EmailService] Missing SendGrid API key. Falling back to dev mode.');
      this.initializeDev();
      return;
    }
    
    sgMail.setApiKey(apiKey);
    this.emailProvider = 'sendgrid';
    this.emailReady = true;
    console.log('✅ Email service initialized with SendGrid');
  }

  initializeDev() {
    this.transporter = nodemailer.createTransport({ jsonTransport: true });
    this.emailProvider = 'dev';
    this.emailReady = true;
    console.log('📧 Email service initialized in DEV mode (emails will be logged, not sent)');
  }

  async initializeEthereal() {
    try {
      // Create a test account with Ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      console.log('🌐 Ethereal Email Test Account credentials:');
      console.log('User:', testAccount.user);
      console.log('Password:', testAccount.pass);
      console.log('------------------------------------');

      // Create a reusable transporter object using the Ethereal SMTP transport
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });

      this.emailProvider = 'ethereal';
      this.emailReady = true;
      console.log('✅ Email service initialized with Ethereal Email for testing');
    } catch (error) {
      console.error('[EmailService] Failed to initialize Ethereal email. Falling back to dev mode.');
      console.error(error);
      this.initializeDev();
    }
  }

  initializeSendmail() {
    const sendmailPath = process.env.SENDMAIL_PATH || '/usr/sbin/sendmail';
    const newline = process.env.SENDMAIL_NEWLINE || 'unix'; // 'unix' or 'windows'
    
    try {
      this.transporter = nodemailer.createTransport({
        sendmail: true,
        newline: newline,
        path: sendmailPath
      });
      this.emailProvider = 'sendmail';
      this.emailReady = true;
      console.log(`📧 Email service initialized with sendmail: ${sendmailPath}`);
    } catch (error) {
      console.warn('[EmailService] Failed to initialize sendmail. Falling back to dev mode.');
      console.error(error);
      this.initializeDev();
    }
  }

  initializeMailerSend() {
    const apiKey = process.env.MAILERSEND_API_KEY;
    
    if (!apiKey || apiKey === 'your_mailersend_api_key_here') {
      console.warn('[EmailService] Missing MailerSend API key. Falling back to dev mode.');
      console.warn('[EmailService] Please set MAILERSEND_API_KEY in your .env file');
      console.warn('[EmailService] Get your API key from https://app.mailersend.com/');
      this.initializeDev();
      return;
    }
    
    try {
      this.mailerSend = new MailerSend({
        apiKey: apiKey,
      });
      this.emailProvider = 'mailersend';
      this.emailReady = true;
      console.log('✅ Email service initialized with MailerSend');
    } catch (error) {
      console.warn('[EmailService] Failed to initialize MailerSend. Falling back to dev mode.');
      console.error(error);
      this.initializeDev();
    }
  }

  initializeSMTP() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[EmailService] Missing SMTP configuration. Falling back to dev mode.');
      this.initializeDev();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    this.emailProvider = 'smtp';
    this.emailReady = true;
    console.log(`📧 Email service initialized with SMTP: ${host}:${port}`);
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (this.emailProvider === 'sendgrid') {
        return await this.sendWithSendGrid({ to, subject, html, text });
      } else if (this.emailProvider === 'mailersend') {
        return await this.sendWithMailerSend({ to, subject, html, text });
      } else {
        return await this.sendWithSMTP({ to, subject, html, text });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, messageId: null, error: error.message };
    }
  }

  async sendWithSendGrid({ to, subject, html, text }) {
    const msg = {
      to,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@example.com',
        name: process.env.FROM_NAME || 'Apparcus'
      },
      subject,
      html,
      text: text || this.stripHtml(html),
    };

    const [response] = await sgMail.send(msg);
    
    console.log(`✅ Email sent successfully via SendGrid to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📨 Message ID: ${response.headers['x-message-id']}`);
    
    return { 
      success: true, 
      messageId: response.headers['x-message-id'], 
      error: null 
    };
  }

  async sendWithMailerSend({ to, subject, html, text }) {
    const sentFrom = new Sender(
      process.env.FROM_EMAIL || 'noreply@example.com',
      process.env.FROM_NAME || 'Apparcus'
    );

    const recipients = [new Recipient(to, to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setHtml(html)
      .setText(text || this.stripHtml(html));

    const response = await this.mailerSend.email.send(emailParams);
    
    console.log(`✅ Email sent successfully via MailerSend to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📨 Message ID: ${response.body.message_id || 'N/A'}`);
    
    return { 
      success: true, 
      messageId: response.body.message_id || null, 
      error: null 
    };
  }

  async sendWithSMTP({ to, subject, html, text }) {
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Apparcus'} <${process.env.FROM_EMAIL || 'noreply@example.com'}>`,
      to,
      subject,
      html,
      text: text || this.stripHtml(html),
    };

    const result = await this.transporter.sendMail(mailOptions);
    
    console.log(`📧 Email sent successfully via ${this.emailProvider.toUpperCase()} to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    if (result?.messageId) {
      console.log(`📨 Message ID: ${result.messageId}`);
    }
    
    // For Ethereal email, show preview URL
    if (this.emailProvider === 'ethereal') {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      if (previewUrl) {
        console.log('🔍 Preview URL: %s', previewUrl);
        console.log('👆 Click the URL above to preview the email in your browser');
      }
    }
    
    return { 
      success: true, 
      messageId: result.messageId, 
      error: null,
      previewUrl: this.emailProvider === 'ethereal' ? nodemailer.getTestMessageUrl(result) : null
    };
  }

  // Helper method to strip HTML tags for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Welcome email template
  async sendWelcomeEmail(userEmail, firstName) {
    const subject = 'Welcome to Apparcus!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <img src="${process.env.FRONTEND_URL}/apparcus-logo.png" alt="Apparcus Logo" style="height: 60px; width: auto; margin-bottom: 20px; filter: brightness(0) invert(1);">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Apparcus!</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your account has been created successfully</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName}!</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #666; line-height: 1.6;">
              Thank you for joining Apparcus! Your account has been created successfully and you can now start using our digital finance platform.
            </p>
            <p style="color: #666; line-height: 1.6;">
              With Apparcus, you can manage your finances, create support requests, and connect with others in our community.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
            Welcome to the Apparcus family!
          </p>
        </div>
      </div>
    `;

    const text = `Welcome to Apparcus! Hi ${firstName}, thank you for joining Apparcus! Your account has been created successfully and you can now start using our digital finance platform. Go to Dashboard: ${process.env.FRONTEND_URL}/dashboard`;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    });
  }

  // Password reset email template (light implementation)
  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const subject = 'Reset your Apparcus password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${firstName},</h2>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <p style="text-align:center;">
          <a href="${resetLink}" style="background:#667eea;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    const text = `Hi ${firstName}, reset your password here: ${resetLink}`;
    return this.sendEmail({ to: userEmail, subject, html, text });
  }


}

export default new EmailService();

