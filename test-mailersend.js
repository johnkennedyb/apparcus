import emailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMailerSend() {
  console.log('🧪 Testing MailerSend integration...');
  console.log('📧 Email Provider:', emailService.emailProvider);
  console.log('✅ Email Ready:', emailService.emailReady);
  
  if (!emailService.emailReady) {
    console.error('❌ Email service is not ready');
    return;
  }

  try {
    const result = await emailService.sendEmail({
      to: 'johnkennedy3313@gmail.com', // Using your verified admin email
      subject: 'MailerSend Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">MailerSend Test</h1>
          <p>This is a test email sent via MailerSend from your Apparcus application.</p>
          <p>If you're seeing this, the integration is working correctly! 🎉</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Test Details:</h3>
            <ul>
              <li>Provider: MailerSend</li>
              <li>From: ${process.env.FROM_EMAIL}</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
            </ul>
          </div>
        </div>
      `,
      text: 'This is a test email sent via MailerSend from your Apparcus application. If you\'re seeing this, the integration is working correctly!'
    });

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📨 Message ID:', result.messageId);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

// Run the test
testMailerSend().catch(console.error);
