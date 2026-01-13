import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Re-use the client config from env vars (same as lib/firebase.ts logic but ensuring isolated scope if needed)
// Actually we can import from '@/lib/firebase' but that exports `db`.
// Let's use the same logic as the successful script to be sure.

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Ensure app is initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function POST() {
    try {
        console.log("Starting manual market data sync...");

        // 1. Fetch from CSE
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

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`CSE API Error: ${response.status}`);
        }

        const json = await response.json();
        const dataList = json.reqTradeSummery || [];

        if (dataList.length === 0) {
            return NextResponse.json({ message: "No data found in CSE API." }, { status: 200 });
        }

        // 2. Process Data
        const marketData: Record<string, any> = {};
        const updatedAt = new Date().toISOString();

        dataList.forEach((stock: any) => {
            const finalPrice = (stock.price && stock.price > 0) ? stock.price : stock.closingPrice;
            if (stock.symbol) {
                marketData[stock.symbol] = finalPrice;
            }
        });

        marketData['updatedAt'] = updatedAt;

        // 3. Write to Firestore
        await setDoc(doc(db, 'market_data', 'latest'), marketData);

        return NextResponse.json({
            success: true,
            count: dataList.length,
            updatedAt
        });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
