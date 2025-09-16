import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SupportRequest from './models/SupportRequest.js';
import SupportPayment from './models/SupportPayment.js';
import Project from './models/Project.js';
import User from './models/User.js';

dotenv.config();

async function testPaymentSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the specific support request from the URL you provided
    const supportRequestId = '68c9b1bbd04bc4efe6d4cdb2';
    
    console.log(`\n🔍 Looking for support request: ${supportRequestId}`);
    
    const supportRequest = await SupportRequest.findById(supportRequestId)
      .populate('requesterId', 'firstName lastName email')
      .populate('projectId', 'name fundingGoal currentFunding');

    if (!supportRequest) {
      console.log('❌ Support request not found');
      return;
    }

    console.log(`\n📋 Support Request Details:`);
    console.log(`   Title: ${supportRequest.title}`);
    console.log(`   Amount Needed: ₦${supportRequest.amountNeeded}`);
    console.log(`   Amount Raised: ₦${supportRequest.amountRaised}`);
    console.log(`   Status: ${supportRequest.status}`);
    
    if (supportRequest.projectId) {
      console.log(`\n🎯 Linked Project:`);
      console.log(`   Name: ${supportRequest.projectId.name}`);
      console.log(`   Funding Goal: ₦${supportRequest.projectId.fundingGoal}`);
      console.log(`   Current Funding: ₦${supportRequest.projectId.currentFunding}`);
    } else {
      console.log(`\n⚠️  No project linked to this support request`);
    }

    // Find all payments for this support request
    const payments = await SupportPayment.find({
      supportRequestId: supportRequestId
    }).sort({ createdAt: -1 });

    console.log(`\n💰 Payments (${payments.length} total):`);
    let totalCompleted = 0;
    let totalPending = 0;

    payments.forEach((payment, index) => {
      console.log(`   ${index + 1}. ₦${payment.amount} - ${payment.paymentStatus} - ${payment.donorName} (${payment.paystackReference})`);
      if (payment.paymentStatus === 'completed') {
        totalCompleted += payment.amount;
      } else if (payment.paymentStatus === 'pending') {
        totalPending += payment.amount;
      }
    });

    console.log(`\n📊 Payment Summary:`);
    console.log(`   Completed Payments: ₦${totalCompleted}`);
    console.log(`   Pending Payments: ₦${totalPending}`);
    console.log(`   Support Request Amount Raised: ₦${supportRequest.amountRaised}`);
    
    if (supportRequest.projectId) {
      console.log(`   Project Current Funding: ₦${supportRequest.projectId.currentFunding}`);
      
      // Check if there's a mismatch
      if (totalCompleted !== supportRequest.amountRaised) {
        console.log(`\n⚠️  MISMATCH: Completed payments (₦${totalCompleted}) != Support request raised (₦${supportRequest.amountRaised})`);
      }
      
      // For project funding, we need to check all support requests for this project
      const allProjectSupportRequests = await SupportRequest.find({
        projectId: supportRequest.projectId._id
      });
      
      let expectedProjectFunding = 0;
      for (const sr of allProjectSupportRequests) {
        expectedProjectFunding += sr.amountRaised || 0;
      }
      
      console.log(`   Expected Project Funding (from all support requests): ₦${expectedProjectFunding}`);
      
      if (expectedProjectFunding !== supportRequest.projectId.currentFunding) {
        console.log(`\n🔧 ISSUE FOUND: Project funding mismatch!`);
        console.log(`   Expected: ₦${expectedProjectFunding}`);
        console.log(`   Actual: ₦${supportRequest.projectId.currentFunding}`);
        console.log(`   Difference: ₦${expectedProjectFunding - supportRequest.projectId.currentFunding}`);
      } else {
        console.log(`\n✅ Project funding is correctly synced!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testPaymentSync();
