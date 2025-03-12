import { ethers } from 'ethers';

// Common ERC20 tokens on Ethereum mainnet
export const COMMON_TOKENS = {
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18
  },
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    decimals: 18
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    decimals: 8
  },
  LINK: {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    decimals: 18
  },
  UNI: {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    decimals: 18
  },
  AAVE: {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    symbol: 'AAVE',
    decimals: 18
  },
  MATIC: {
    address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    symbol: 'MATIC',
    decimals: 18
  },
  CRV: {
    address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    symbol: 'CRV',
    decimals: 18
  },
  SNX: {
    address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    symbol: 'SNX',
    decimals: 18
  },
  COMP: {
    address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    symbol: 'COMP',
    decimals: 18
  },
  MKR: {
    address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    symbol: 'MKR',
    decimals: 18
  },
  SUSHI: {
    address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
    symbol: 'SUSHI',
    decimals: 18
  },
  YFI: {
    address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
    symbol: 'YFI',
    decimals: 18
  },
  FTM: {
    address: '0x4E15361FD6b4BB609Fa63C81A2be19d873717870',
    symbol: 'FTM',
    decimals: 18
  },
  APE: {
    address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    symbol: 'APE',
    decimals: 18
  },
  LDO: {
    address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    symbol: 'LDO',
    decimals: 18
  }
};

// Uniswap V2 Router address
const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

// Uniswap V3 Router address
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Uniswap V3 Quoter address
const UNISWAP_V3_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

// Uniswap V3 Factory address
const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactInput(bytes memory path, uint256 amountIn) external view returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)'
];

const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

async function checkDirectPool(provider, fromToken, toToken, fee) {
  try {
    const factory = new ethers.Contract(UNISWAP_V3_FACTORY, FACTORY_ABI, provider);
    const pool = await factory.getPool(fromToken.address, toToken.address, fee);
    return pool !== '0x0000000000000000000000000000000000000000';
  } catch (error) {
    console.error('Error checking direct pool:', error);
    return false;
  }
}

async function findBestRoute(provider, fromToken, toToken) {
  try {
    // Check for direct V3 pools first
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

    // Try V3 pools
    for (const fee of feeTiers) {
      try {
        const hasDirectPool = await checkDirectPool(provider, fromToken, toToken, fee);
        if (hasDirectPool) {
          return {
            type: 'v3-direct',
            fee,
            path: [fromToken.address, toToken.address],
            description: `Direct V3 swap through ${fee/10000}% fee pool`
          };
        }
      } catch (error) {
        console.error(`Error checking V3 pool with fee ${fee}:`, error);
        continue;
      }
    }

    // Try V2 routes
    const v2Router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, provider);

    // Try direct V2 pool
    try {
      const amounts = await v2Router.getAmountsOut(
        ethers.parseUnits('1', fromToken.decimals),
        [fromToken.address, toToken.address]
      );
      if (amounts && amounts.length > 0) {
        return {
          type: 'v2-direct',
          path: [fromToken.address, toToken.address],
          description: 'Direct V2 swap'
        };
      }
    } catch (error) {
      console.error('Direct V2 route not available:', error);
    }

    // Try WETH route
    try {
      const wethPath = [fromToken.address, COMMON_TOKENS.WETH.address, toToken.address];
      const amounts = await v2Router.getAmountsOut(
        ethers.parseUnits('1', fromToken.decimals),
        wethPath
      );
      if (amounts && amounts.length > 0) {
        return {
          type: 'v2-weth',
          path: wethPath,
          description: 'V2 swap routed through WETH'
        };
      }
    } catch (error) {
      console.error('WETH route not available:', error);
    }

    // Try USDC route
    try {
      const usdcPath = [fromToken.address, COMMON_TOKENS.USDC.address, toToken.address];
      const amounts = await v2Router.getAmountsOut(
        ethers.parseUnits('1', fromToken.decimals),
        usdcPath
      );
      if (amounts && amounts.length > 0) {
        return {
          type: 'v2-usdc',
          path: usdcPath,
          description: 'V2 swap routed through USDC'
        };
      }
    } catch (error) {
      console.error('USDC route not available:', error);
    }

    // If we get here, no route was found
    throw new Error(`No viable route found between ${fromToken.symbol} and ${toToken.symbol}`);
  } catch (error) {
    console.error('Route finding error:', error);
    throw new Error(`Route finding failed: ${error.message}`);
  }
}

export const estimateUniswapGas = async (provider, fromToken, toToken) => {
  try {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    if (!fromToken || !toToken) {
      throw new Error('Both fromToken and toToken must be specified');
    }

    if (fromToken.address === toToken.address) {
      throw new Error('Cannot swap token for itself');
    }

    // Find the best available route
    const route = await findBestRoute(provider, fromToken, toToken);
    if (!route) {
      throw new Error('No route found');
    }

    // Use 1 token as test amount
    const amountIn = ethers.parseUnits('1', fromToken.decimals);

    let gasEstimate;
    let routeDescription = route.description;

    if (route.type === 'v3-direct') {
      const quoter = new ethers.Contract(UNISWAP_V3_QUOTER, QUOTER_ABI, provider);
      try {
        const quote = await quoter.quoteExactInputSingle.staticCall(
          fromToken.address,
          toToken.address,
          route.fee,
          amountIn,
          0
        );
        gasEstimate = quote.gasEstimate;
      } catch (error) {
        console.error('V3 quote error:', error);
        // Fallback to typical V3 swap gas estimate if quote fails
        gasEstimate = 180000; // Base estimate for V3 swaps
      }
    } else {
      const router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, provider);
      try {
        gasEstimate = await router.estimateGas.swapExactTokensForTokens(
          amountIn,
          0,
          route.path,
          '0x0000000000000000000000000000000000000000',
          Math.floor(Date.now() / 1000) + 1200
        );
      } catch (error) {
        console.error('V2 estimation error:', error);
        // Fallback to typical V2 swap gas estimate if estimation fails
        gasEstimate = route.path.length === 2 ? 120000 : 180000; // Base estimate for V2 swaps
      }
    }

    if (!gasEstimate || gasEstimate.toString() === '0') {
      throw new Error('Invalid gas estimate received');
    }

    // Add gas for token approval if needed
    const baseEstimate = Number(gasEstimate);
    const withApproval = baseEstimate + 46000; // More accurate gas estimate for approve()

    return {
      estimatedGasUsed: baseEstimate,
      withApproval: withApproval,
      route: routeDescription,
      hops: route.path.length - 1,
      path: route.path.map(addr =>
        Object.values(COMMON_TOKENS).find(token => token.address.toLowerCase() === addr.toLowerCase())?.symbol || addr.slice(0, 6) + '...'
      ).join(' → ')
    };
  } catch (error) {
    console.error('Error in estimateUniswapGas:', error);
    throw new Error(`Gas estimation failed: ${error.message}`);
  }
};