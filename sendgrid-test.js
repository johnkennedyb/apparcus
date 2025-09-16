import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

async function testSendGrid() {
  try {
    // You need to get a real API key from https://app.sendgrid.com/settings/api_keys
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
      console.log('🔑 To use SendGrid:');
      console.log('1. Go to https://app.sendgrid.com/settings/api_keys');
      console.log('2. Create an API key');
      console.log('3. Replace "your_sendgrid_api_key_here" in .env file with your real API key');
      console.log('4. Run this script again');
      return;
    }

    sgMail.setApiKey(apiKey);

    const msg = {
      to: 'johnkennedy3313@gmail.com',
      from: 'agbouchennadavid@gmail.com', // Use your verified sender
      subject: 'Email Verification - SendGrid Test',
      text: 'Please click on the following link to verify your email address: http://localhost:5000/verify?token=test-token-12345',
      html: `
        <p>Hello!</p>
        <p>Please click on the link below to verify your email address.</p>
        <a href="http://localhost:5000/verify?token=test-token-12345" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify Email</a>
      `,
    };

    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully via SendGrid!');
    console.log('Message ID:', response[0].headers['x-message-id']);
    
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
  }
}

testSendGrid();
