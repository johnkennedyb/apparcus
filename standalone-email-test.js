import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main function to set up Nodemailer and send verification email
 * This matches your example pattern exactly
 */
async function main() {
  try {
    console.log('Setting up real email delivery...');
    
    // Create a reusable transporter object using server144.web-hosting.com SMTP transport
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'server144.web-hosting.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465 with SSL, false for 587 with TLS
      auth: {
        user: process.env.SMTP_USER || 'agbouchennadavid@gmail.com',
        pass: process.env.SMTP_PASS || '7421 pluse 4',
      },
    });

    console.log('SMTP Configuration:');
    console.log('Host:', process.env.SMTP_HOST || 'server144.web-hosting.com');
    console.log('Port:', process.env.SMTP_PORT || 587);
    console.log('User:', process.env.SMTP_USER || 'agbouchennadavid@gmail.com');
    console.log('------------------------------------');

    /**
     * Function to send the verification email
     */
    async function sendVerificationEmail(userEmail, token) {
      const PORT = process.env.PORT || 5000;
      const verificationLink = `http://localhost:${PORT}/verify?token=${token}`;
      
      let info = await transporter.sendMail({
        from: '"Apparcus" <agbouchennadavid@gmail.com>', // sender address
        to: userEmail, // list of receivers
        subject: 'Please verify your email address', // Subject line
        text: `Please click on the following link to verify your email address: ${verificationLink}`, // plain text body
        html: `<p>Hello!</p><p>Please click on the link below to verify your email address.</p><a href="${verificationLink}">Verify Email</a>`, // html body
      });

      console.log('Message sent: %s', info.messageId);
      console.log('✅ Email sent successfully to:', userEmail);
      
      return info;
    }

    // Send test email
    const result = await sendVerificationEmail('johnkennedy3313@gmail.com', 'test-verification-token-12345');
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error(error);
  }
}

// Run the main function
main().catch(console.error);
