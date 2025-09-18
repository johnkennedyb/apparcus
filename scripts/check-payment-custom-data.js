import mongoose from 'mongoose';
import SupportPayment from '../models/SupportPayment.js';
import SupportRequest from '../models/SupportRequest.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPaymentCustomData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apparcus');
    console.log('Connected to MongoDB');

    // Get all completed payments
    const payments = await SupportPayment.find({ paymentStatus: 'completed' })
      .populate('supportRequestId', 'title customColumns')
      .sort({ createdAt: -1 });

    console.log(`\nFound ${payments.length} completed payments:\n`);

    payments.forEach((payment, index) => {
      console.log(`Payment ${index + 1}:`);
      console.log(`  Donor: ${payment.donorName}`);
      console.log(`  Email: ${payment.donorEmail}`);
      console.log(`  Amount: ₦${payment.amount}`);
      console.log(`  Support Request: ${payment.supportRequestId?.title || 'N/A'}`);
      console.log(`  Custom Columns in Request: ${JSON.stringify(payment.supportRequestId?.customColumns || [])}`);
      console.log(`  Custom Data: ${JSON.stringify(payment.customData || {})}`);
      console.log(`  Has Custom Data: ${!!payment.customData && Object.keys(payment.customData).length > 0}`);
      console.log(`  Created: ${payment.createdAt}`);
      console.log('---');
    });

    // Check support requests with custom columns
    const supportRequests = await SupportRequest.find({ 
      customColumns: { $exists: true, $ne: [] } 
    });

    console.log(`\nSupport requests with custom columns: ${supportRequests.length}`);
    supportRequests.forEach((req, index) => {
      console.log(`Request ${index + 1}: ${req.title}`);
      console.log(`  Custom Columns: ${JSON.stringify(req.customColumns)}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkPaymentCustomData();
