import emailService from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Testing Sendmail Configuration...');
console.log(`Platform: ${process.platform}`);
console.log(`Email Service: ${process.env.EMAIL_SERVICE}`);
console.log(`Sendmail Path: ${process.env.SENDMAIL_PATH}`);

// Quick test to see if sendmail initializes properly
setTimeout(async () => {
  console.log(`✅ Email Provider: ${emailService.emailProvider}`);
  console.log(`✅ Email Ready: ${emailService.emailReady}`);
  
  if (emailService.emailReady) {
    console.log('📧 Sending email to johnkennedy3313@gmail.com...');
    
    const result = await emailService.sendEmail({
      to: 'johnkennedy3313@gmail.com',
      subject: 'Sendmail Test - Success!',
      html: `
        <h2>🎉 Sendmail is Working!</h2>
        <p>This email was sent using sendmail functionality via ${emailService.emailProvider}.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Platform:</strong> ${process.platform}</p>
      `,
      text: 'Sendmail test successful!'
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Email failed:', result.error);
    }
  } else {
    console.log('❌ Email service not ready');
  }
}, 100);
