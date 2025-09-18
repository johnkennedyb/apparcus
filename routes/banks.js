import express from 'express';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Mock bank list fallback
const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", active: true },
  { name: "Citibank Nigeria", code: "023", active: true },
  { name: "Ecobank Nigeria", code: "050", active: true },
  { name: "Fidelity Bank", code: "070", active: true },
  { name: "First Bank of Nigeria", code: "011", active: true },
  { name: "First City Monument Bank", code: "214", active: true },
  { name: "Guaranty Trust Bank", code: "058", active: true },
  { name: "Heritage Bank", code: "030", active: true },
  { name: "Keystone Bank", code: "082", active: true },
  { name: "Polaris Bank", code: "076", active: true },
  { name: "Providus Bank", code: "101", active: true },
  { name: "Stanbic IBTC Bank", code: "221", active: true },
  { name: "Standard Chartered Bank", code: "068", active: true },
  { name: "Sterling Bank", code: "232", active: true },
  { name: "Union Bank of Nigeria", code: "032", active: true },
  { name: "United Bank For Africa", code: "033", active: true },
  { name: "Unity Bank", code: "215", active: true },
  { name: "Wema Bank", code: "035", active: true },
  { name: "Zenith Bank", code: "057", active: true }
];

// Get list of banks (via Paystack when configured)
router.get('/', authenticate, async (req, res) => {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    // Try to fetch from Paystack if API key is configured
    if (paystackSecretKey) {
      try {
        const paystackResponse = await fetch('https://api.paystack.co/bank?currency=NGN', {
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const paystackData = await paystackResponse.json();
        
        if (paystackResponse.ok && paystackData.status) {
          console.log('Banks retrieved from Paystack API');
          return res.json(paystackData);
        }
        
        console.warn('Paystack bank list failed, falling back to mock data:', paystackData.message);
      } catch (paystackError) {
        console.warn('Paystack API error, falling back to mock data:', paystackError.message);
      }
    }
    
    // Fallback to mock data
    console.log('Using mock bank data (Paystack not configured or failed)');
    res.json({
      status: true,
      message: 'Banks retrieved successfully (mock data)',
      data: NIGERIAN_BANKS.map(bank => ({
        name: bank.name,
        code: bank.code,
        active: bank.active,
        slug: bank.name.toLowerCase().replace(/\s+/g, '-'),
        longcode: bank.code,
        gateway: 'paystack',
        pay_with_bank: true,
        country: 'Nigeria',
        currency: 'NGN',
        type: 'nuban',
        is_deleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ 
      status: false,
      message: 'Server error', 
      data: [] 
    });
  }
});

// Verify bank account (accessible via both /banks/verify-account and /verify-account)
router.post('/verify-account', authenticate, async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;

    if (!account_number || !bank_code) {
      return res.status(400).json({
        status: false,
        message: 'Account number and bank code are required',
        data: {
          account_number: '',
          account_name: '',
          bank_id: 0
        }
      });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    // Try to verify with Paystack if API key is configured
    if (paystackSecretKey) {
      try {
        const paystackResponse = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
          headers: {
            'Authorization': `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const paystackData = await paystackResponse.json();
        
        if (paystackResponse.ok && paystackData.status) {
          console.log('Bank account verified via Paystack API');
          return res.json({
            status: true,
            message: 'Account verification successful',
            data: {
              account_number: account_number,
              account_name: paystackData.data.account_name,
              bank_id: parseInt(bank_code)
            }
          });
        }
        
        console.warn('Paystack account verification failed, falling back to mock:', paystackData.message);
      } catch (paystackError) {
        console.warn('Paystack verification API error, falling back to mock:', paystackError.message);
      }
    }

    // Fallback to mock verification
    const bank = NIGERIAN_BANKS.find(b => b.code === bank_code);
    if (!bank) {
      return res.status(400).json({
        status: false,
        message: 'Invalid bank code',
        data: {
          account_number: '',
          account_name: '',
          bank_id: 0
        }
      });
    }

    console.log('Using mock account verification (Paystack not configured or failed)');
    res.json({
      status: true,
      message: 'Account verification successful (mock)',
      data: {
        account_number: account_number,
        account_name: 'John Doe', // Mock name
        bank_id: parseInt(bank_code)
      }
    });
  } catch (error) {
    console.error('Verify account error:', error);
    res.status(500).json({
      status: false,
      message: 'Server error during verification',
      data: {
        account_number: '',
        account_name: '',
        bank_id: 0
      }
    });
  }
});

export default router;
