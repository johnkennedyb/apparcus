import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SupportRequest from '../models/SupportRequest.js';
import SupportPayment from '../models/SupportPayment.js';
import Project from '../models/Project.js';

dotenv.config();

async function syncProjectFunding() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all completed support payments that are linked to projects
    const completedPayments = await SupportPayment.find({
      paymentStatus: 'completed'
    }).populate({
      path: 'supportRequestId',
      populate: {
        path: 'projectId',
        model: 'Project'
      }
    });

    console.log(`Found ${completedPayments.length} completed payments`);

    // Group payments by project
    const projectPayments = {};
    
    for (const payment of completedPayments) {
      if (payment.supportRequestId && payment.supportRequestId.projectId) {
        const projectId = payment.supportRequestId.projectId._id.toString();
        if (!projectPayments[projectId]) {
          projectPayments[projectId] = {
            project: payment.supportRequestId.projectId,
            totalAmount: 0,
            payments: []
          };
        }
        projectPayments[projectId].totalAmount += payment.amount;
        projectPayments[projectId].payments.push(payment);
      }
    }

    console.log(`Found payments for ${Object.keys(projectPayments).length} projects`);

    // Update each project's current funding
    for (const [projectId, data] of Object.entries(projectPayments)) {
      const project = await Project.findById(projectId);
      if (project) {
        const oldFunding = project.currentFunding || 0;
        
        // Calculate what the funding should be based on completed payments
        const calculatedFunding = data.totalAmount;
        
        if (oldFunding !== calculatedFunding) {
          project.currentFunding = calculatedFunding;
          
          // Check if project should be marked as completed
          if (project.currentFunding >= project.fundingGoal && project.status === 'active') {
            project.status = 'completed';
            console.log(`✅ Project "${project.name}" marked as completed (funding goal reached)`);
          }
          
          await project.save();
          console.log(`✅ Updated project "${project.name}": ${oldFunding} → ${calculatedFunding} (${data.payments.length} payments)`);
        } else {
          console.log(`✓ Project "${project.name}" already has correct funding: ${calculatedFunding}`);
        }
      }
    }

    console.log('\n🎉 Project funding sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing project funding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the sync
syncProjectFunding();
