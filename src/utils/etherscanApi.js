import axios from 'axios';

const apiKey = process.env.REACT_APP_ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

export const getGasFees = async () => {
  try {
    console.log('API Key:', apiKey);

    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        module: 'gastracker',
        action: 'gasoracle',
        apikey: apiKey,
      },
    });

    console.log('Full Etherscan API Response:', JSON.stringify(response.data, null, 2));
    console.log('Response Status:', response.data.status);
    console.log('Response Message:', response.data.message);
    console.log('Response Result Type:', typeof response.data.result);
    console.log('Gas Fees Result:', response.data.result);

    if (response.data.status === '1') {
      const result = response.data.result;
      // Log each gas price value and its type
      console.log('SafeGasPrice:', result.SafeGasPrice, 'Type:', typeof result.SafeGasPrice);
      console.log('ProposeGasPrice:', result.ProposeGasPrice, 'Type:', typeof result.ProposeGasPrice);
      console.log('FastGasPrice:', result.FastGasPrice, 'Type:', typeof result.FastGasPrice);

      // Values are already in Gwei, just convert strings to numbers
      return {
        SafeGasPrice: Number(result.SafeGasPrice),
        ProposeGasPrice: Number(result.ProposeGasPrice),
        FastGasPrice: Number(result.FastGasPrice)
      };
    } else {
      console.error('Etherscan API Error:', response.data);
      throw new Error('Failed to fetch gas fees.');
    }
  } catch (error) {
    console.error('Error fetching gas fees:', error);
    return null;
  }
};


