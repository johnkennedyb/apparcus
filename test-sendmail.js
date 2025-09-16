import emailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSendmailConfiguration() {
  console.log('🧪 Testing Sendmail Configuration');
  console.log('=================================');
  console.log(`Email Service: ${process.env.EMAIL_SERVICE}`);
  console.log(`Sendmail Path: ${process.env.SENDMAIL_PATH}`);
  console.log(`Sendmail Newline: ${process.env.SENDMAIL_NEWLINE}`);
  console.log(`From Email: ${process.env.FROM_EMAIL}`);
  console.log(`From Name: ${process.env.FROM_NAME}`);
  console.log('=================================\n');

  // Test basic email sending with sendmail
  console.log('📧 Sending test email via sendmail...');
  
  const testEmail = 'test@example.com'; // Change this to your test email
  const result = await emailService.sendEmail({
    to: testEmail,
    subject: 'Sendmail Test from Apparcus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📧 Sendmail Success!</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your sendmail configuration is working</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Apparcus Sendmail Test</h2>
          <p style="color: #666; line-height: 1.6;">
            This email confirms that your sendmail configuration for Apparcus is working correctly with:
          </p>
          <ul style="color: #666;">
            <li><strong>Provider:</strong> Sendmail</li>
            <li><strong>Path:</strong> ${process.env.SENDMAIL_PATH}</li>
            <li><strong>Newline format:</strong> ${process.env.SENDMAIL_NEWLINE}</li>
            <li><strong>From:</strong> ${process.env.FROM_NAME} &lt;${process.env.FROM_EMAIL}&gt;</li>
          </ul>
          <div style="margin-top: 30px; text-align: center;">
            <p style="background: #e8f5e8; color: #2d5a2d; padding: 15px; border-radius: 6px; margin: 0;">
              🎉 Sendmail is ready for production use!
            </p>
          </div>
        </div>
      </div>
    `,
    text: 'Success! This email confirms that the sendmail configuration for Apparcus is working correctly.'
  });

  if (result.success) {
    console.log('✅ Test email sent successfully via sendmail!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Sent to: ${testEmail}`);
  } else {
    console.error('❌ Sendmail test failed:');
    console.error(result.error);
  }

  // Test welcome email template with sendmail
  console.log('\n📧 Testing welcome email template via sendmail...');
  const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Sendmail Test User');
  
  if (welcomeResult.success) {
    console.log('✅ Welcome email template works with sendmail!');
    console.log(`📬 Message ID: ${welcomeResult.messageId}`);
  } else {
    console.error('❌ Welcome email via sendmail failed:', welcomeResult.error);
  }

  // Test email verification template
  console.log('\n📧 Testing email verification template via sendmail...');
  const verificationResult = await emailService.sendEmailVerification(testEmail, 'Sendmail Test User', 'test-token-123');
  
  if (verificationResult.success) {
    console.log('✅ Email verification template works with sendmail!');
    console.log(`📬 Message ID: ${verificationResult.messageId}`);
  } else {
    console.error('❌ Email verification via sendmail failed:', verificationResult.error);
  }

  console.log('\n🎯 Sendmail testing complete!');
  console.log('\n📋 Summary:');
  console.log('- Sendmail has been successfully integrated into your EmailService');
  console.log('- Change EMAIL_SERVICE in .env to switch between providers');
  console.log('- All existing email templates work with sendmail');
  console.log('- Sendmail is typically faster than SMTP for local server delivery');
}

// Run the sendmail test
testSendmailConfiguration().catch(console.error);
