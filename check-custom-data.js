const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apparcus');
    
    const SupportRequest = require('./models/SupportRequest.js').default;
    const SupportPayment = require('./models/SupportPayment.js').default;
    
    console.log('=== Support Requests with Custom Columns ===');
    const requests = await SupportRequest.find({ customColumns: { $exists: true, $ne: [] } }).limit(5);
    requests.forEach(req => {
      console.log(`ID: ${req._id}`);
      console.log(`Title: ${req.title}`);
      console.log(`Custom Columns: ${JSON.stringify(req.customColumns)}`);
      console.log('---');
    });
    
    console.log('\n=== Recent Payments with Custom Data ===');
    const payments = await SupportPayment.find({ customData: { $exists: true, $ne: {} } }).limit(5).sort({ createdAt: -1 });
    payments.forEach(payment => {
      console.log(`ID: ${payment._id}`);
      console.log(`Donor: ${payment.donorName}`);
      console.log(`Custom Data: ${JSON.stringify(payment.customData)}`);
      console.log('---');
    });
    
    console.log('\n=== All Support Requests (checking customColumns type) ===');
    const allRequests = await SupportRequest.find({}).limit(3);
    allRequests.forEach(req => {
      console.log(`ID: ${req._id}`);
      console.log(`Title: ${req.title}`);
      console.log(`Custom Columns Type: ${typeof req.customColumns}`);
      console.log(`Custom Columns Value: ${JSON.stringify(req.customColumns)}`);
      console.log(`Is Array: ${Array.isArray(req.customColumns)}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
