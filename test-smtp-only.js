import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testSMTPOnly() {
  console.log('🔧 Testing SMTP Configuration Only');
  console.log('================================');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`Secure: ${process.env.SMTP_SECURE}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`From: ${process.env.FROM_EMAIL}`);
  console.log('================================\n');

  // Create SMTP transporter directly
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  console.log('📧 Testing SMTP connection...');
  
  try {
    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Send test email
    console.log('📤 Sending test email...');
    const result = await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: 'johnkennedy3313@gmail.com',
      subject: 'SMTP Test - Apparcus',
      html: `
        <h2>🎉 SMTP Test Successful!</h2>
        <p>This email was sent directly using Gmail SMTP configuration.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> ${process.env.FROM_NAME}</p>
        <p><strong>Host:</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</p>
      `,
      text: `SMTP Test successful! Time: ${new Date().toLocaleString()}`
    });

    console.log('✅ Email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
    
  } catch (error) {
    console.error('❌ SMTP Test failed:');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code || 'Unknown'}`);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('   - Gmail account has 2FA enabled');
      console.log('   - Using App Password (not regular password)');
      console.log('   - App Password format: xxxx xxxx xxxx xxxx');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Connection failed. Please check:');
      console.log('   - Internet connection');
      console.log('   - Firewall/antivirus blocking port 465');
      console.log('   - Corporate network restrictions');
    }
  }
}

testSMTPOnly().catch(console.error);
