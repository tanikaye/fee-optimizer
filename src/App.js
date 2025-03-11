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
import Sandbox from "./Sandbox"; // Adjust path as needed
import { estimateERC20TransferGas, validateAndGetTokenInfo } from "./utils/erc20Utils";




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
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transactionType, setTransactionType] = useState("send_eth"); // Default to ETH transfer
  const [showRecipientInput, setShowRecipientInput] = useState(false); // For "I don't know" option
  const [selectedNFT, setSelectedNFT] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenAmount, setTokenAmount] = useState("");


  // **Add the provider instance here**
  const provider = new ethers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`
  );


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



  const calculateFee = async () => {
    if (
      !fees ||
      (transactionType === "mint_nft" && (!selectedNFT || !amount)) ||
      (transactionType === "transfer_erc20" && (!tokenAddress || !recipientAddress || !tokenAmount))
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      let gasEstimate;

      // Handle transaction types
      if (transactionType === "send_eth") {
        gasEstimate = 21000; // Simple ETH transfer
      } else if (transactionType === "transfer_erc20") {
        try {
          gasEstimate = await estimateERC20TransferGas(
            provider,
            tokenAddress,
            recipientAddress,
            tokenAmount
          );
        } catch (error) {
          console.error("Error estimating ERC-20 transfer gas:", error);
          alert("Failed to estimate ERC-20 transfer gas. Please check your inputs.");
          return;
        }
      } else if (transactionType === "swap_tokens") {
        alert("Token swap gas estimation is not yet available. Coming soon!");
        return;
      } else if (transactionType === "mint_nft") {
        const nftDetails = nftMinting[selectedNFT];
        if (!nftDetails) {
          alert("Invalid NFT selected.");
          return;
        }

        // Fetch contract details
        const { contractAddress, abi, functionName } = nftDetails;

        const contract = new ethers.Contract(contractAddress, abi, provider);
        console.log("contract: ", contract);

        const calculateFeeFunction = getFeeCalculationFunction(selectedNFT);

        if (!calculateFeeFunction) {
          alert(`No calculateFeeFunction defined for ${selectedNFT}.`);
          return;
        }

        // Dynamically calculate minting cost
        const totalCost = await calculateFeeFunction(contract, amount);

        // Prepare params for gas estimation
        const params = [amount]; // Ensure this matches your contract's minting function
        await estimateContractGasFee(contractAddress, abi, functionName, params, totalCost);
        return; // Exit after mint logic
      } else if (transactionType === "unknown") {
        if (!recipientAddress) {
          alert("Please enter a recipient address.");
          return;
        }
        const code = await provider.getCode(recipientAddress);
        if (code === "0x") {
          gasEstimate = 21000; // Wallet (EOA) detected
        } else {
          alert("Smart contract fee estimation is not yet available. Coming soon!");
          return;
        }
      }

      const gasPriceGwei =
        feeType === "low"
          ? fees.SafeGasPrice
          : feeType === "average"
          ? fees.ProposeGasPrice
          : fees.FastGasPrice;

      const gasPriceEth = Number(gasPriceGwei) / 1e9; // Convert Gwei to ETH
      const estimatedGasFeeEth = gasPriceEth * Number(gasEstimate); // Convert gasEstimate to number
      const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

      setCalculatedFee({
        eth: estimatedGasFeeEth.toFixed(8),
        gwei: Number(gasEstimate).toLocaleString(),
        usd: estimatedGasFeeUsd.toFixed(2),
      });
    } catch (error) {
      console.error("Error estimating gas:", error);
      alert("Failed to estimate gas. Please check your input.");
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

      const gasPriceEth = Number(gasPriceGwei) / 1e9; // Convert Gwei to ETH
      const estimatedGasFeeEth = gasPriceEth * Number(gasEstimate); // Convert gasEstimate to number
      const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

      setCalculatedFee({
        eth: estimatedGasFeeEth.toFixed(8),
        gwei: Number(gasEstimate).toLocaleString(),
        usd: estimatedGasFeeUsd.toFixed(2),
      });
    } catch (error) {
      console.error("Error estimating gas for smart contract interaction:", error);
      alert("Failed to estimate smart contract gas fee. Please check your input.");
    }
  };




  const saveAlertToFirestore = async () => {
    if (!alertThreshold || !alertType) {
      alert("Please set a valid fee threshold.");
      return;
    }

    try {
      const currentFee =
        alertType === "low"
          ? fees?.SafeGasPrice
          : alertType === "average"
          ? fees?.ProposeGasPrice
          : fees?.FastGasPrice;

      const feeInUsd = (currentFee / 1e9) * ethPrice;

      const thresholdMet =
        alertUnit === "gwei"
          ? Number(currentFee) < Number(alertThreshold)
          : Number(feeInUsd) < Number(alertThreshold);

      // Notify if the threshold is already met
      if (thresholdMet) {
        alert(
          `Gas fee for ${alertType.toUpperCase()} is already below ${
            alertUnit === "gwei" ? `${alertThreshold} Gwei` : `$${alertThreshold}`
          }. No alert was set.`
        );
        return; // Do not save the alert
      }

      // Save the alert to Firestore
      await addDoc(collection(db, "alerts"), {
        createdAt: Timestamp.now(),
        feeType: alertType,
        threshold: parseFloat(alertThreshold),
        thresholdType: alertUnit === "gwei" ? "Gwei" : "USD",
        userId: "testUser123",
      });

      alert("Alert successfully saved!");
      setActiveAlertThreshold(alertThreshold); // Update active threshold here
      setAlertSet(true); // Activate alert monitoring
      setAlertTriggered(false); // Reset alert trigger
    } catch (error) {
      console.error("Error saving alert:", error);
      alert("Failed to save the alert.");
    }
  };

  // Add token validation function
  const validateToken = async (address) => {
    try {
      const info = await validateAndGetTokenInfo(provider, address);
      if (info.isValid) {
        setTokenInfo(info);
      } else {
        setTokenInfo(null);
        alert(info.error);
      }
    } catch (error) {
      console.error("Error validating token:", error);
      setTokenInfo(null);
      alert("Failed to validate token address");
    }
  };




  return (
    <>
    <div>
      <header>
        <h1>Nivio</h1>
        <nav>
          <div className="about-container">
            <a href="#" className="about-link">About</a>
            <div className="about-tooltip">
              <p>
                Nivio helps users track Ethereum gas fees in real time, calculate transaction costs,
                and set alerts for when fees drop below a desired threshold.
                Stay ahead of the market and optimize your transactions effortlessly.
              </p>
            </div>
          </div>
        </nav>
      </header>
      <main>
        <h2>Optimize Your Transaction Fees</h2>
        <div>
          <h3>Enable Notifications</h3>
          <button onClick={requestNotificationPermission}>Enable Notifications</button>
        </div>
        {fees && ethPrice ? (
          <div>
            <p>
              Low Fee: {fees.SafeGasPrice} Gwei (
              {(fees.SafeGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.SafeGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <p>
              Average Fee: {fees.ProposeGasPrice} Gwei (
              {(fees.ProposeGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.ProposeGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <p>
              High Fee: {fees.FastGasPrice} Gwei (
              {(fees.FastGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.FastGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <div>
            <div className="tooltip-container">
              <h3>Calculate Gas Fee</h3>
              <div className="tooltip">
                This functionality allows you to estimate the gas fee required for an Ethereum transaction.
              </div>
            </div>


            <div>
              <h3>Select Transaction Type</h3>
              <select
                value={transactionType}
                onChange={(e) => {
                  setTransactionType(e.target.value);
                  setShowRecipientInput(e.target.value === "unknown");
                  // Reset token info when changing transaction type
                  if (e.target.value !== "transfer_erc20") {
                    setTokenInfo(null);
                    setTokenAddress("");
                    setTokenAmount("");
                  }
                }}
              >
                <option value="send_eth">Send ETH</option>
                <option value="transfer_erc20">Transfer ERC-20 Token</option>
                <option value="swap_tokens">Swap Tokens on Uniswap</option>
                <option value="mint_nft">Mint NFT</option>
                <option value="unknown">I don't know the transaction type</option>
              </select>

              {/* Conditionally render the NFT select */}
                {transactionType === "mint_nft" && (
                  <div>
                    <h3>Select NFT</h3>
                    <select
                      value={selectedNFT}
                      onChange={(e) => setSelectedNFT(e.target.value)}
                    >
                      <option value="">Select an NFT</option>
                      {Object.keys(nftMinting).map((key) => (
                        <option key={key} value={key}>
                          {nftMinting[key].name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Show recipient address input only if "I don't know" is selected */}
              {showRecipientInput && (
                <input
                  type="text"
                  placeholder="Enter Recipient Address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  style={{ width: "300px", marginBottom: "10px" }}
                />
              )}

              {/* Other inputs based on transaction type */}
              {transactionType === "mint_nft" && (
              <>
                {/* Input for Contract Address */}
                {/* <input
                  type="text"
                  placeholder="Enter Contract Address"
                  value={recipientAddress} // Or `contractAddress`
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  style={{ width: "300px", marginBottom: "10px" }}
                /> */}

                {/* Input for Parameters (e.g., amount) */}
                <input
                  type="number"
                  placeholder="Enter Number of NFTs to Mint"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: "300px", marginBottom: "10px" }}
                />
              </>
            )}

              {/* Add ERC-20 specific inputs */}
              {transactionType === "transfer_erc20" && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter ERC-20 Token Address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    onBlur={() => validateToken(tokenAddress)}
                    style={{ width: "300px", marginBottom: "10px" }}
                  />
                  {tokenInfo && (
                    <p>Token Symbol: {tokenInfo.symbol}</p>
                  )}
                  <input
                    type="text"
                    placeholder="Enter Recipient Address"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    style={{ width: "300px", marginBottom: "10px" }}
                  />
                  <input
                    type="number"
                    placeholder="Enter Token Amount"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    style={{ width: "300px", marginBottom: "10px" }}
                  />
                </div>
              )}

              {/* Gas fee level selection */}
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="average">Average</option>
                  <option value="high">High</option>
                </select>

                <button onClick={calculateFee}>Calculate Fee</button>

            </div>

              {calculatedFee && (
                <div>
                  <p>Estimated Gas Fee:</p>
                  <p><strong>{calculatedFee.eth} ETH</strong></p>
                  <p><strong>{calculatedFee.gwei} Gwei</strong></p>
                  <p><strong>${calculatedFee.usd} USD</strong></p>
                </div>
              )}
            </div>
            <div>
              <h3>Set Fee Alert</h3>
              <input
                type="number"
                placeholder={`Set Fee Threshold (${alertUnit.toUpperCase()})`}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                style={{ width: "200px" }}
              />
              <select value={alertUnit} onChange={(e) => setAlertUnit(e.target.value)}>
                <option value="gwei">Gwei</option>
                <option value="usd">USD</option>
              </select>
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                <option value="low">Low</option>
                <option value="average">Average</option>
                <option value="high">High</option>
              </select>
              <button onClick={saveAlertToFirestore}>Set Alert</button>
            </div>
          </div>
        ) : (
          <p>Loading fee data...</p>
        )}
      </main>
      <footer>
        <p>© 2024 Nivio. All Rights Reserved.</p>
      </footer>
    </div>
    <Sandbox />
    </>
  );
}

export default App;
