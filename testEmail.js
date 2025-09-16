import emailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testApparcusEmail() {
  console.log('🧪 Testing Apparcus Email Configuration');
  console.log('=====================================');
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`From Email: ${process.env.FROM_EMAIL}`);
  console.log(`From Name: ${process.env.FROM_NAME}`);
  console.log('=====================================\n');

  // Test basic email sending
  console.log('📧 Sending test email...');
  
  const testEmail = 'test-recipient@example.com'; // Change this to your test email
  const result = await emailService.sendEmail({
    to: testEmail,
    subject: 'Test Email from Apparcus Server',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Success!</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Email configuration is working correctly</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Apparcus Email Test</h2>
          <p style="color: #666; line-height: 1.6;">
            This email confirms that your Nodemailer configuration for Apparcus is working correctly with:
          </p>
          <ul style="color: #666;">
            <li><strong>SMTP Server:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>Security:</strong> STARTTLS</li>
            <li><strong>From:</strong> ${process.env.FROM_NAME} &lt;${process.env.FROM_EMAIL}&gt;</li>
          </ul>
          <div style="margin-top: 30px; text-align: center;">
            <p style="background: #e8f5e8; color: #2d5a2d; padding: 15px; border-radius: 6px; margin: 0;">
              🎉 Your email service is ready to use!
            </p>
          </div>
        </div>
      </div>
    `,
    text: 'Success! This email confirms that the Nodemailer configuration for Apparcus is working correctly.'
  });

  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Sent to: ${testEmail}`);
  } else {
    console.error('❌ Test email failed:');
    console.error(result.error);
  }

  // Test welcome email template
  console.log('\n📧 Testing welcome email template...');
  const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
  
  if (welcomeResult.success) {
    console.log('✅ Welcome email template works!');
  } else {
    console.error('❌ Welcome email failed:', welcomeResult.error);
  }

  console.log('\n🎯 Email service testing complete!');
}

// Run the test
testApparcusEmail().catch(console.error);
