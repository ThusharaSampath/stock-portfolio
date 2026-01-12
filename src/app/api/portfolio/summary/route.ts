import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';
import { calculatePortfolioState } from '@/lib/portfolio-engine';
import { Transaction, MarketData } from '@/lib/types';

export const dynamic = 'force-dynamic'; // Disable caching for fresh data

export async function GET(request: NextRequest) {
    try {
        // 1. Get User ID from query param (Headless auth)
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
        }

        // 2. Fetch User Transactions
        const transactionsRef = collection(db, 'users', uid, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);

        const transactions: Transaction[] = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                type: data.type,
                symbol: data.symbol,
                qty: data.qty,
                price: data.price,
                fee: data.fee,
                netAmount: data.netAmount,
                notes: data.notes
            } as Transaction;
        });

        // 3. Fetch User Settings (for Base Net Invested Override)
        const settingsRef = doc(db, 'users', uid, 'settings', 'default'); // Assuming singleton document 'default' or similar
        // Note: User spec says "users/{uid}/settings". Firestore collections contain docs, not fields directly? 
        // Or did user mean "users/{uid}" doc has "settings" field?
        // Spec: "B. users/{uid}/settings. Stores baseBankTransfer (float)..."
        // Usually implies a subcollection 'settings' or a document named 'settings' in the user doc..
        // Let's assume `users/{uid}/settings/general` or just `users/{uid}` field?
        // "users/{uid}/settings" looks like a collection path. 
        // If it's a collection, we need a doc. Let's assume a doc named 'config'.
        // Or maybe "users/{uid}/settings" IS a document path? No, "users/{uid}" is a doc. "users/{uid}/settings" is a subcollection.
        // I'll try to fetch doc `users/{uid}/settings/config`.
        let baseBankTransfer = undefined;
        // Actually, maybe the user meant `users/{uid}` doc has a `settings` map?
        // Re-reading: "Define the following collections: ... B. users/{uid}/settings".
        // This implies `settings` is a collection. I'll read all docs in it or a known ID.
        // Let's assume there's a document `users/{uid}/settings/general` that has `baseBankTransfer`.

        const settingsDoc = await getDoc(doc(db, 'users', uid, 'settings', 'general'));
        if (settingsDoc.exists()) {
            baseBankTransfer = settingsDoc.data().baseBankTransfer;
        }

        // 4. Fetch Market Data
        const marketDataDoc = await getDoc(doc(db, 'market_data', 'latest'));
        let marketPrices: MarketData = {};
        if (marketDataDoc.exists()) {
            marketPrices = marketDataDoc.data() as MarketData;
        }

        // 5. Calculate State
        const portfolioSummary = calculatePortfolioState(transactions, marketPrices, baseBankTransfer);

        // 6. Return JSON
        return NextResponse.json(portfolioSummary);

    } catch (error: any) {
        console.error('Error calculating portfolio:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
