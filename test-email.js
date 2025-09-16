import http from 'http';

async function testVerificationEmail() {
  try {
    console.log('Testing verification email with Ethereal...');
    
    const postData = JSON.stringify({
      email: 'johnkennedy3313@gmail.com',
      token: 'test-verification-token-12345'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/email/send-verification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Response:', result);
          
          if (res.statusCode === 200) {
            console.log('✅ Verification email sent successfully!');
            if (result.previewUrl) {
              console.log('🔍 Preview URL:', result.previewUrl);
              console.log('👆 Click the URL above to preview the email in your browser');
            }
          } else {
            console.log('❌ Email test failed');
          }
        } catch (e) {
          console.log('Response (raw):', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testVerificationEmail();
