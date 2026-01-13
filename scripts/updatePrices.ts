require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Initialize Firebase Client SDK
// Uses environment variables from .env.local
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if config is present
if (!firebaseConfig.apiKey) {
    console.error("Error: Firebase config missing. Ensure .env.local exists and contains NEXT_PUBLIC_FIREBASE_... variables.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateCSEPrices() {
    console.log("Fetching CSE market data...");

    const url = "https://www.cse.lk/api/tradeSummary";

    const headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "origin": "https://www.cse.lk",
        "referer": "https://www.cse.lk/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    const payload = {
        "headers": {
            "normalizedNames": {},
            "lazyUpdate": null
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const dataList = json.reqTradeSummery || [];

        if (dataList.length === 0) {
            console.log("No data found in CSE API response.");
            return;
        }

        console.log(`Received ${dataList.length} items. Processing...`);

        const marketData = {};
        const updatedAt = new Date().toISOString();

        dataList.forEach((stock) => {
            // Logic from user: 
            // stock.price is current price? If 0, fallback to closingPrice.
            const finalPrice = (stock.price && stock.price > 0) ? stock.price : stock.closingPrice;

            if (stock.symbol) {
                marketData[stock.symbol] = finalPrice;
            }
        });

        // Add metadata
        marketData['updatedAt'] = updatedAt;

        // Write to Firestore using Client SDK
        // Document: market_data/latest
        await setDoc(doc(db, 'market_data', 'latest'), marketData);

        console.log("Successfully updated market_data/latest.");
        console.log("Sample Data:", Object.entries(marketData).slice(0, 5));
        process.exit(0);

    } catch (error) {
        console.error("Critical Error updating prices:", error);
        process.exit(1);
    }
}

// Run the function
updateCSEPrices();
