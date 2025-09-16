import emailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function sendTestEmail() {
  console.log('📧 Sending test email via sendmail to johnkennedy3313@gmail.com...');
  
  const targetEmail = 'johnkennedy3313@gmail.com';
  
  const result = await emailService.sendEmail({
    to: targetEmail,
    subject: 'Test Email from Apparcus - Sendmail Implementation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Sendmail Test Successful!</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your Apparcus sendmail configuration is working</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Hello from Apparcus!</h2>
          <p style="color: #666; line-height: 1.6;">
            This email confirms that your sendmail integration is working correctly. The email was sent using:
          </p>
          <ul style="color: #666;">
            <li><strong>Email Service:</strong> ${process.env.EMAIL_SERVICE}</li>
            <li><strong>Sendmail Path:</strong> ${process.env.SENDMAIL_PATH}</li>
            <li><strong>From Address:</strong> ${process.env.FROM_NAME} &lt;${process.env.FROM_EMAIL}&gt;</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <div style="margin-top: 30px; text-align: center;">
            <p style="background: #e8f5e8; color: #2d5a2d; padding: 15px; border-radius: 6px; margin: 0;">
              🎉 Sendmail is now ready for use in your Swift App Dreams project!
            </p>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #888; font-size: 12px;">
          <p>This email was sent as a test of the sendmail implementation.</p>
        </div>
      </div>
    `,
    text: `Hello from Apparcus! This email confirms that your sendmail integration is working correctly. Email service: ${process.env.EMAIL_SERVICE}, sent on ${new Date().toLocaleString()}.`
  });

  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Sent to: ${targetEmail}`);
    console.log(`📅 Sent at: ${new Date().toLocaleString()}`);
  } else {
    console.error('❌ Email sending failed:');
    console.error(result.error);
  }
}

// Send the email
sendTestEmail().catch(console.error);
