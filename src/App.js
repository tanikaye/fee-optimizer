import React, { useState, useEffect } from "react";
import { getGasFees } from "./utils/etherscanApi";
import { fetchEthPrice } from "./utils/coinGeckoApi";
import "./App.css";
import { db } from "./firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { messaging } from "./firebaseConfig"; // Import messaging
import { getToken, onMessage } from "firebase/messaging";
import { ethers } from "ethers";
import { nftMinting } from './utils/transactionMappings/nftMinting';
import { getFeeCalculationFunction } from './utils/nftFeeCalculations/feeIndex';
import { fetchAndCalculate } from './utils/openSeaApi';
import nftOptions from './utils/transactionMappings/nftOptions'; // Adjust the path based on your file structure
import { COMMON_TOKENS, estimateUniswapGas } from './utils/uniswapUtils';




const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission:", Notification.permission); // Log the permission status
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BNfSZB0krbJ0csxW8C2cxdP1BGqV1kT7ltxqK_VYcD3sYnGQniXDGI6RqtLBph-Qm4IdMQaG1KYdVEKM9ZAuHVE", // Replace with your actual VAPID key
      });
      console.log("Notification permission granted.");
      console.log("FCM Token:", token);
      alert("Notification permission granted. Token received!");
      // Save this token to Firestore or send it to your server for later use
    } else {
      console.error("Notification permission denied");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

const fetchAbi = async (contractAddress) => {
  try {
    const response = await fetch(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.REACT_APP_ETHERSCAN_API_KEY}`
    );
    console.log("testing etherscan api key: ", response)
    const data = await response.json();
    if (data.status !== "1") {
      throw new Error("Failed to fetch ABI");
    }
    return JSON.parse(data.result);
  } catch (error) {
    console.error("Error fetching ABI:", error);
    alert("Failed to fetch ABI. Check the contract address.");
    return null;
  }
};


function App() {
  const [fees, setFees] = useState(null);
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState("average");
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState("");
  const [activeAlertThreshold, setActiveAlertThreshold] = useState("");
  const [alertType, setAlertType] = useState("low");
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [alertUnit, setAlertUnit] = useState("gwei");
  const [alertSet, setAlertSet] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transactionType, setTransactionType] = useState("send_eth"); // Default to ETH transfer
  const [showRecipientInput, setShowRecipientInput] = useState(false); // For "I don't know" option
  const [selectedNFT, setSelectedNFT] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [fromToken, setFromToken] = useState(COMMON_TOKENS.WETH);
  const [toToken, setToToken] = useState(COMMON_TOKENS.USDC);
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDetails, setSwapDetails] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);


  // **Add the provider instance here**
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const initProvider = async () => {
      try {
        if (!process.env.REACT_APP_INFURA_API_KEY) {
          console.error('Infura API key not found');
          return;
        }
        const newProvider = new ethers.JsonRpcProvider(
          `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`
        );
        // Test the provider
        await newProvider.getNetwork();
        setProvider(newProvider);
      } catch (error) {
        console.error('Failed to initialize provider:', error);
      }
    };

    initProvider();
  }, []);

  // Fetch and update ETH price
  useEffect(() => {
    const updateEthPrice = async () => {
      const price = await fetchEthPrice(); // Fetch ETH price
      setEthPrice(price); // Set ETH price in state
      console.log("checking real ethereum price: ", price, ethPrice);
    };

    updateEthPrice();

    // Refresh ETH price periodically
    const interval = setInterval(updateEthPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval); // Cleanup
  }, []);

  console.log("checking ethPrice: ", ethPrice);


  // Fetch gas fees and monitor alerts
  useEffect(() => {
    const fetchFees = async () => {
      const data = await getGasFees();
      // This is the price of a unit of gas (kind of like how a liter of gasoline is $3.50, for example)
      setFees(data);

      if (alertSet && activeAlertThreshold && alertType) {
        const currentFee =
          alertType === "low"
            ? data.SafeGasPrice
            : alertType === "average"
            ? data.ProposeGasPrice
            : data.FastGasPrice;

        const feeInUsd = (currentFee / 1e9) * ethPrice;

        const thresholdMet =
          alertUnit === "gwei"
            ? Number(currentFee) < Number(activeAlertThreshold)
            : Number(feeInUsd) < Number(activeAlertThreshold);

        if (thresholdMet && !alertTriggered) {
          alert(
            `Gas fee for ${alertType.toUpperCase()} is now below ${
              alertUnit === "gwei" ? `${activeAlertThreshold} Gwei` : `$${activeAlertThreshold}`
            }!`
          );
          setAlertTriggered(true); // Prevent repeated alerts
        }
      }
    };

    fetchFees();
    const interval = setInterval(fetchFees, 7000); // Refresh every 7 seconds
    return () => clearInterval(interval);
  }, [activeAlertThreshold, alertType, alertTriggered, alertUnit, ethPrice, alertSet]);



  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
    });
    return unsubscribe; // Cleanup the listener on unmount
  }, []);

  useEffect(() => {
    // Check if notifications are already enabled
    const checkNotificationPermission = async () => {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    };
    checkNotificationPermission();
  }, []);

  const calculateFee = async () => {
    if (!fees) {
      alert("Please wait for gas prices to load.");
      return;
    }

    if (!provider) {
      alert("Please wait for network connection to initialize.");
      return;
    }

    try {
      let gasEstimate;

      // Handle transaction types
      switch (transactionType) {
        case "send_eth":
          gasEstimate = 21000; // Standard ETH transfer
          break;
        case "transfer_erc20":
          gasEstimate = 65000; // ERC20 transfer average
          break;
        case "swap_tokens":
          if (fromToken.symbol === toToken.symbol) {
            alert("Please select different tokens for swapping.");
            return;
          }
          try {
            // Get actual gas estimate from Uniswap
            const swapEstimate = await estimateUniswapGas(provider, fromToken, toToken);
            if (!swapEstimate) {
              throw new Error("Failed to estimate swap gas");
            }
            gasEstimate = swapEstimate.estimatedGasUsed;

            // Calculate fees with the gas estimate
            const gasPriceGwei = feeType === "low" ? Number(fees.SafeGasPrice) :
                               feeType === "average" ? Number(fees.ProposeGasPrice) :
                               Number(fees.FastGasPrice);

            const gasPriceEth = gasPriceGwei / 1e9;
            const estimatedGasFeeEth = gasPriceEth * gasEstimate;
            const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

            // Set the calculated fee with swap details
            setCalculatedFee({
              type: 'fixed',
              eth: estimatedGasFeeEth.toFixed(8),
              gasUnits: gasEstimate,
              gasPrice: gasPriceGwei,
              usd: estimatedGasFeeUsd.toFixed(2),
              path: swapEstimate.path,
              route: swapEstimate.route,
              withApproval: swapEstimate.withApproval,
              estimatedGasUsed: swapEstimate.estimatedGasUsed
            });
            return;
          } catch (error) {
            console.error("Swap estimation error:", error);
            alert(`Failed to estimate swap: ${error.message}`);
            return;
          }
        case "mint_nft":
          const nftDetails = nftMinting[selectedNFT];
          if (!nftDetails) {
            alert("Invalid NFT selected.");
            return;
          }
          const { contractAddress, abi, functionName } = nftDetails;
          const params = [amount];
          await estimateContractGasFee(contractAddress, abi, functionName, params);
          return;
        case "unknown":
          if (!recipientAddress) {
            alert("Please enter a recipient address.");
            return;
          }
          try {
            const code = await provider.getCode(recipientAddress);
            if (code === "0x") {
              gasEstimate = 21000; // Wallet (EOA) detected
            } else {
              alert("Smart contract fee estimation is not yet available. Coming soon!");
              return;
            }
          } catch (error) {
            alert("Invalid address. Please check the address and try again.");
            return;
          }
          break;
        default:
          alert("Please select a valid transaction type");
          return;
      }

      // Calculate fees for non-swap transactions
      const gasPriceGwei =
        feeType === "low" ? Number(fees.SafeGasPrice) :
        feeType === "average" ? Number(fees.ProposeGasPrice) :
        Number(fees.FastGasPrice);

      const gasPriceEth = gasPriceGwei / 1e9;
      const estimatedGasFeeEth = gasPriceEth * gasEstimate;
      const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

      setCalculatedFee({
        type: 'fixed',
        eth: estimatedGasFeeEth.toFixed(8),
        gasUnits: gasEstimate,
        gasPrice: gasPriceGwei,
        usd: estimatedGasFeeUsd.toFixed(2)
      });
    } catch (error) {
      console.error("Error calculating fee:", error);
      alert(`Failed to calculate fee: ${error.message}`);
    }
  };

  // const handleFetchAndCalculate = () => {
  //   if (!contractAddress || !tokenId) {
  //     alert("Please enter both Contract Address and Token ID.");
  //     return;
  //   }
  //   fetchAndCalculate(contractAddress, tokenId);
  // };




  const estimateContractGasFee = async (contractAddress, abi, functionName, params) => {
    console.log("contractAddress: ", contractAddress)
    console.log("abi: ", abi)
    console.log("functionName: ", functionName)
    console.log("params: ", params)
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const data = contract.interface.encodeFunctionData(functionName, params);

      const gasEstimate = await provider.estimateGas({
        to: contractAddress,
        data,
      });

      const gasPriceGwei =
        feeType === "low"
          ? fees.SafeGasPrice
          : feeType === "average"
          ? fees.ProposeGasPrice
          : fees.FastGasPrice;

      const gasPriceEth = gasPriceGwei / 1e9; // Convert Gwei to ETH
      const estimatedGasFeeEth = gasPriceEth * gasEstimate;
      const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

      setCalculatedFee({
        eth: estimatedGasFeeEth.toFixed(8),
        gasUnits: gasEstimate,
        gasPrice: gasPriceGwei,
        usd: estimatedGasFeeUsd.toFixed(2),
      });
    } catch (error) {
      console.error("Error estimating gas for smart contract interaction:", error);
      alert("Failed to estimate smart contract gas fee. Please check your input.");
    }
  };




  const saveAlertToFirestore = async () => {
    if (!alertThreshold) {
      alert("Please enter a target price");
      return;
    }

    if (!fees) {
      alert("Loading gas prices...");
      return;
    }

    try {
      const currentFee =
        alertType === "low" ? Number(fees.SafeGasPrice) :
        alertType === "average" ? Number(fees.ProposeGasPrice) :
        Number(fees.FastGasPrice);

      // Validate threshold
      if (Number(alertThreshold) >= currentFee) {
        alert("Alert threshold must be lower than current gas price");
        return;
      }

      // Save alert to Firestore
      await addDoc(collection(db, "alerts"), {
        createdAt: Timestamp.now(),
        feeType: alertType,
        threshold: Number(alertThreshold),
        userId: "testUser123"
      });

      setActiveAlertThreshold(alertThreshold);
      setAlertSet(true);
      setAlertTriggered(false);
      alert("Alert set successfully!");
    } catch (error) {
      console.error("Error saving alert:", error);
      alert("Failed to set alert. Please try again.");
    }
  };






  return (
    <>
      <header>
        <nav>
          <div className="header-left">
            <h1>Nivio</h1>
            <div className="header-description">
              Real-time Ethereum gas fee tracker and calculator
            </div>
          </div>
          <a href="#" className="about-link" onClick={(e) => {
            e.preventDefault();
            setShowAboutModal(true);
          }}>About</a>
        </nav>
      </header>

      {/* About Modal */}
      <div className={`modal-backdrop ${showAboutModal ? 'active' : ''}`} onClick={() => setShowAboutModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowAboutModal(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="modal-header">
            <h2 className="modal-title">About Nivio</h2>
          </div>
          <div className="modal-body">
            <p>
              Nivio is your advanced Ethereum gas fee optimization tool, designed to help you save money and make informed decisions about your blockchain transactions.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <h4>Real-Time Gas Tracking</h4>
                <p>Monitor Ethereum gas fees in real-time with automatic updates every 7 seconds.</p>
              </div>

              <div className="feature-item">
                <h4>Smart Fee Calculator</h4>
                <p>Calculate precise transaction fees for different types of operations including ETH transfers, token swaps, and NFT minting.</p>
              </div>

              <div className="feature-item">
                <h4>Price Alerts</h4>
                <p>Set custom alerts to notify you when gas fees drop below your target price.</p>
              </div>

              <div className="feature-item">
                <h4>Multi-Transaction Support</h4>
                <p>Support for various transaction types including ETH transfers, ERC-20 tokens, NFTs, and smart contract interactions.</p>
              </div>
            </div>

            <p>
              Built with modern web technologies and real-time data feeds from the Ethereum network, Nivio helps you optimize your transaction timing and costs.
            </p>
          </div>
        </div>
      </div>

      <main>
        <h2><span>Gas Fee Calculator</span></h2>

        {!notificationsEnabled && (
          <button
            className="notification-button"
            onClick={requestNotificationPermission}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor"/>
            </svg>
            <span>Enable Notifications</span>
          </button>
        )}

        {/* Gas Fees Display Card with Price Alerts */}
        {fees ? (
          <div className="card">
            <div className="gas-prices-section">
              <h3>Live Gas Prices</h3>
              <div className="gas-info">
                <p>
                  <span>Low Priority</span>
                  <span>{Number(fees.SafeGasPrice).toFixed(2)} Gwei</span>
                </p>
                <p>
                  <span>Medium Priority</span>
                  <span>{Number(fees.ProposeGasPrice).toFixed(2)} Gwei</span>
                </p>
                <p>
                  <span>High Priority</span>
                  <span>{Number(fees.FastGasPrice).toFixed(2)} Gwei</span>
                </p>
              </div>
            </div>

            <div className="price-alerts-section">
              <h3>Price Alerts</h3>
              <div className="alert-section">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter target price in Gwei"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                />
                <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                  <option value="low">Low Priority</option>
                  <option value="average">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <button onClick={saveAlertToFirestore}>
                  {alertSet ? "Update Alert" : "Create Alert"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="loading"></div>
          </div>
        )}

        {/* Transaction Calculator Card */}
        <div className="card">
          <h3>Calculate Transaction Fee</h3>
          <select
            value={transactionType}
            onChange={(e) => {
              setTransactionType(e.target.value);
              setCalculatedFee(null);
              setSwapDetails(null);
              setShowRecipientInput(e.target.value === "unknown");
            }}
          >
            <option value="send_eth">Send ETH</option>
            <option value="transfer_erc20">Transfer ERC-20 Token</option>
            <option value="swap_tokens">Swap Tokens (Uniswap)</option>
            <option value="mint_nft">Mint NFT</option>
            <option value="unknown">I don't know (enter contract address)</option>
          </select>

          {transactionType === "swap_tokens" && (
            <div className="swap-section">
              <div className="token-select">
                <label>From Token:</label>
                <select
                  value={fromToken.symbol}
                  onChange={(e) => {
                    setFromToken(COMMON_TOKENS[e.target.value]);
                    setCalculatedFee(null);
                  }}
                >
                  {Object.entries(COMMON_TOKENS).map(([symbol, token]) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="token-select">
                <label>To Token:</label>
                <select
                  value={toToken.symbol}
                  onChange={(e) => {
                    setToToken(COMMON_TOKENS[e.target.value]);
                    setCalculatedFee(null);
                  }}
                >
                  {Object.entries(COMMON_TOKENS).map(([symbol, token]) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {transactionType === "mint_nft" && (
            <select
              value={selectedNFT}
              onChange={(e) => {
                setSelectedNFT(e.target.value);
                setCalculatedFee(null);
              }}
            >
              <option value="">Select NFT Collection</option>
              {Object.keys(nftMinting).map((nft) => (
                <option key={nft} value={nft}>
                  {nft}
                </option>
              ))}
            </select>
          )}

          {transactionType === "mint_nft" && (
            <input
              type="number"
              min="1"
              placeholder="Number of NFTs to mint"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setCalculatedFee(null);
              }}
            />
          )}

          {showRecipientInput && (
            <input
              type="text"
              placeholder="Enter contract/wallet address"
              value={recipientAddress}
              onChange={(e) => {
                setRecipientAddress(e.target.value);
                setCalculatedFee(null);
              }}
            />
          )}

          <select
            value={feeType}
            onChange={(e) => {
              setFeeType(e.target.value);
              setCalculatedFee(null);
            }}
          >
            <option value="low">Low Priority</option>
            <option value="average">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <div className="gas-units">
            {transactionType === "swap_tokens" && calculatedFee ? (
              <div className="swap-details">
                <h4>Swap Route Details</h4>
                <p className="route-path">{calculatedFee.path}</p>
                <p className="route-description">{calculatedFee.route}</p>
                <p className="gas-estimate">
                  Base Gas: {Number(calculatedFee.estimatedGasUsed).toLocaleString()} units
                  {calculatedFee.withApproval && (
                    <span className="approval-note">
                      <br />+ {Number(calculatedFee.withApproval - calculatedFee.estimatedGasUsed).toLocaleString()} units for token approval
                    </span>
                  )}
                </p>
              </div>
            ) : transactionType === "send_eth" ? (
              "21,000 gas units"
            ) : transactionType === "transfer_erc20" ? (
              "65,000 gas units"
            ) : (
              "Select options and click Calculate"
            )}
          </div>

          <button onClick={calculateFee}>Calculate Fee</button>

          {calculatedFee && (
            <div className="swap-route-details">
              {transactionType === "swap_tokens" && (
                <>
                  <h4 className="route-path">Swap Route</h4>
                  <p className="route-description">{calculatedFee.path}</p>
                  <p className="route-description">{calculatedFee.route}</p>
                </>
              )}

              <div className="gas-units">
                <span>Base Gas Units</span>
                <span>{Number(calculatedFee.gasUnits).toLocaleString()}</span>
              </div>

              {calculatedFee.withApproval && (
                <div className="gas-units">
                  <span>Token Approval</span>
                  <span>+{Number(calculatedFee.withApproval - calculatedFee.gasUnits).toLocaleString()}</span>
                </div>
              )}

              <div className="gas-calculation">
                {Number(calculatedFee.gasUnits).toLocaleString()} × {Number(calculatedFee.gasPrice).toFixed(2)} Gwei
              </div>

              <div className="fee-breakdown">
                <div className="fee-item">
                  <span className="fee-label">Gas Fee</span>
                  <div>
                    <div className="fee-amount">{(Number(calculatedFee.eth) * 1e9).toFixed(2)} Gwei</div>
                    <div className="eth-amount">({Number(calculatedFee.eth).toFixed(6)} ETH)</div>
                  </div>
                </div>

                {calculatedFee.withApproval && (
                  <div className="fee-item">
                    <span className="fee-label">Approval Fee</span>
                    <div>
                      <div className="fee-amount">
                        {(Number(calculatedFee.withApproval * calculatedFee.gasPrice / 1e9 - calculatedFee.eth) * 1e9).toFixed(2)} Gwei
                      </div>
                      <div className="eth-amount">
                        ({Number(calculatedFee.withApproval * calculatedFee.gasPrice / 1e9 - calculatedFee.eth).toFixed(6)} ETH)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="total-fee">
                <span className="total-label">Total Fee</span>
                <span className="total-amount">${Number(calculatedFee.usd).toFixed(2)}</span>
                <span className="total-eth">{Number(calculatedFee.eth).toFixed(6)} ETH</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
