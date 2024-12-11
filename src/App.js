import React, { useState, useEffect } from "react";
import { getGasFees } from "./utils/etherscanApi";
import "./App.css";

function App() {
  const [fees, setFees] = useState(null);
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState("average");
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertType, setAlertType] = useState("low");
  const [alertTriggered, setAlertTriggered] = useState(false);

  useEffect(() => {
    // Function to fetch gas fees
    const fetchFees = async () => {
      const data = await getGasFees();
      setFees(data);

      // Check if the alert should be triggered
      if (alertThreshold && alertType) {
        const currentFee =
          alertType === "low"
            ? data.SafeGasPrice
            : alertType === "average"
            ? data.ProposeGasPrice
            : data.FastGasPrice;

        if (currentFee < alertThreshold && !alertTriggered) {
          alert(`Gas fee for ${alertType.toUpperCase()} is now below ${alertThreshold} Gwei!`);
          setAlertTriggered(true); // Prevent multiple alerts
        }
      }
    };

    // Initial fetch and periodic refresh every 30 seconds
    fetchFees();
    const interval = setInterval(fetchFees, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, [alertThreshold, alertType, alertTriggered]);

  const calculateFee = () => {
    if (!fees || !amount) {
      alert("Please enter a valid transaction amount.");
      return;
    }

    const gasPriceGwei =
      feeType === "low"
        ? fees.SafeGasPrice
        : feeType === "average"
        ? fees.ProposeGasPrice
        : fees.FastGasPrice;

    const gasPriceEth = gasPriceGwei / 1e9; // Convert Gwei to ETH
    const estimatedGasFee = gasPriceEth * amount; // Gas fee in ETH
    setCalculatedFee(estimatedGasFee.toFixed(8));
  };

  return (
    <div>
      <header>
        <h1>Fee Optimizer</h1>
        <nav>
          <a href="#">Track Fees</a> | <a href="#">Optimize</a> | <a href="#">About</a>
        </nav>
      </header>
      <main>
        <h2>Optimize Your Transaction Fees</h2>
        {fees ? (
          <div>
            <p>Low Fee: {fees.SafeGasPrice} Gwei</p>
            <p>Average Fee: {fees.ProposeGasPrice} Gwei</p>
            <p>High Fee: {fees.FastGasPrice} Gwei</p>
            <div>
              <h3>Calculate Gas Fee</h3>
              <input
                type="number"
                placeholder="Transaction Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                <option value="low">Low</option>
                <option value="average">Average</option>
                <option value="high">High</option>
              </select>
              <button onClick={calculateFee}>Calculate Fee</button>
              {calculatedFee && <p>Estimated Gas Fee: {calculatedFee} ETH</p>}
            </div>
            <div>
              <h3>Set Fee Alert</h3>
              <input
                type="number"
                placeholder="Set Fee Threshold (Gwei)"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                style={{ width: '170px' }}
              />
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                <option value="low">Low</option>
                <option value="average">Average</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => {
                  if (alertThreshold) {
                    setAlertTriggered(false); // Reset alert trigger
                    alert(`Alert set for ${alertType.toUpperCase()} fees below ${alertThreshold} Gwei.`);
                  } else {
                    alert("Please set a valid fee threshold.");
                  }
                }}
              >
                Set Alert
              </button>
            </div>
          </div>
        ) : (
          <p>Loading fee data...</p>
        )}
      </main>
      <footer>
        <p>© 2024 Fee Optimizer. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;
