import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name:'dw7w2at8k', // You'll need to provide the correct cloud name
  api_key: '268257791245894',
  api_secret: 'Zw3fw4RaORLS4f9HldknHfqb7yE'
});

export default cloudinary;
