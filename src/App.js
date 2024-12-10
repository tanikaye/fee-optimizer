import React, { useState, useEffect } from 'react';
import { getGasFees } from './utils/etherscanApi';
import './App.css'; 

function App() {
    const [fees, setFees] = useState(null);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [selectedFeeType, setSelectedFeeType] = useState('');
    const [calculatedFee, setCalculatedFee] = useState(null);

    useEffect(() => {
        const fetchFees = async () => {
            const data = await getGasFees();
            setFees(data);
        };
        fetchFees();
    }, []);

    const handleCalculate = () => {
        if (!transactionAmount || !selectedFeeType || !fees) {
            alert('Please enter a transaction amount and select a fee type.');
            return;
        }

        const gasPriceGwei = {
            low: fees.SafeGasPrice,
            average: fees.ProposeGasPrice,
            high: fees.FastGasPrice,
        }[selectedFeeType];

        const gasPriceEth = gasPriceGwei / 1e9; // Convert Gwei to ETH
        const estimatedFee = gasPriceEth * 21000 * parseFloat(transactionAmount); // Assuming 21,000 gas units
        setCalculatedFee(estimatedFee.toFixed(8)); // Limit to 8 decimal places
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
                            <input
                                type="number"
                                placeholder="Transaction Amount (ETH)"
                                value={transactionAmount}
                                onChange={(e) => setTransactionAmount(e.target.value)}
                            />
                            <select
                                value={selectedFeeType}
                                onChange={(e) => setSelectedFeeType(e.target.value)}
                            >
                                <option value="">Select Fee Type</option>
                                <option value="low">Low</option>
                                <option value="average">Average</option>
                                <option value="high">High</option>
                            </select>
                            <button onClick={handleCalculate}>Calculate Fee</button>
                        </div>
                        {calculatedFee && (
                            <p>
                                Estimated Gas Fee: <strong>{calculatedFee} ETH</strong>
                            </p>
                        )}
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
