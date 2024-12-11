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

    if (response.data.status === '1') {
      return response.data.result;
    } else {
      throw new Error('Failed to fetch gas fees.');
    }
  } catch (error) {
    console.error('Error fetching gas fees:', error);
    return null;
  }
};


