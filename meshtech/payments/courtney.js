const axios = require('axios');

async function verifyTransactionApi(transactionId) {
  const apiKey = process.env.COURTNEY_API_KEY;
  if (!apiKey) {
    throw new Error("COURTNEY_API_KEY is not configured in environment variables.");
  }

  try {
    const response = await axios.get(`https://courtneytech.xyz/api/verify/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.error('[COURTNEY API] Verification failed:', error.message);
    throw new Error("Could not verify transaction with Courtney Tech API.");
  }
}

module.exports = {
  verifyTransactionApi
};
