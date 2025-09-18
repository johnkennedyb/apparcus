import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'apparcus', // You'll need to provide the correct cloud name
  api_key: '268257791245894',
  api_secret: 'ROm5579w6IkDwqLtJH4XkfftOyQ'
});

export default cloudinary;
