import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'apparcus',
  api_key: process.env.CLOUDINARY_API_KEY || '268257791245894',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'ROm5579w6IkDwqLtJH4XkfftOyQ'
});

export default cloudinary;
