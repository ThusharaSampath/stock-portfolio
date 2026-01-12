const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
// Note: This requires a service account key file named 'service-account.json' in the project root
// or GOOGLE_APPLICATION_CREDENTIALS env var.
if (!admin.apps.length) {
    try {
        // Attempt to load from service-account.json if it exists
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.warn("Warning: 'service-account.json' not found or invalid. Using default application credentials or mock mode.");
        admin.initializeApp(); // Attempt default credentials (e.g. if enabled in GCP)
    }
}

const db = getFirestore();

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

        const marketData: Record<string, any> = {};
        const updatedAt = new Date().toISOString();

        dataList.forEach((stock: any) => {
            // Logic from user: 
            // stock.price is current price? If 0, fallback to closingPrice.
            const finalPrice = (stock.price && stock.price > 0) ? stock.price : stock.closingPrice;

            if (stock.symbol) {
                marketData[stock.symbol] = finalPrice;
            }
        });

        // Add metadata
        marketData['updatedAt'] = updatedAt;

        // Write to Firestore
        // Document: market_data/latest
        await db.collection('market_data').doc('latest').set(marketData);

        console.log("Successfully updated market_data/latest.");
        console.log("Sample Data:", Object.entries(marketData).slice(0, 5));

    } catch (error) {
        console.error("Critical Error updating prices:", error);
    }
}

// Run the function
updateCSEPrices();
