import axios from 'axios';

const API_KEY = '1P8T2YJA7FYGANC28D9EM99MMCB2BPPMXS'; // Your actual API key
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

export const getGasFees = async () => {
  try {
    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        module: 'gastracker',
        action: 'gasoracle',
        apikey: API_KEY,
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


