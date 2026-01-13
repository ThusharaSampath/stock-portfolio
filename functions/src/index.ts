/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Set max instances to control costs
setGlobalOptions({ maxInstances: 10 });

// Scheduled function to run every weekday at 15:30 (3:30 PM CST/IST)
// CSE Market Close is around 2:30 PM, this ensures data is ready.
// Cron: '30 15 * * 1-5' (Mon-Fri)
export const updateMarketData = onSchedule("every day 15:30", async (event) => {
    logger.info("Starting scheduled market data update...");

    const url = "https://www.cse.lk/api/tradeSummary";

    const headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "origin": "https://www.cse.lk",
        "referer": "https://www.cse.lk/",
        "user-agent": "Mozilla/5.0 (Firebase/NodeJS)"
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
            logger.warn("No data found in CSE API response.");
            return;
        }

        logger.info(`Received ${dataList.length} items. Updating Firestore...`);

        const marketData: Record<string, any> = {};
        const updatedAt = new Date().toISOString();

        dataList.forEach((stock: any) => {
            const finalPrice = (stock.price && stock.price > 0) ? stock.price : stock.closingPrice;
            if (stock.symbol) {
                marketData[stock.symbol] = finalPrice;
            }
        });

        marketData['updatedAt'] = updatedAt;

        await db.collection('market_data').doc('latest').set(marketData);
        logger.info("Successfully updated market_data/latest.");

    } catch (error) {
        logger.error("Critical Error updating prices:", error);
    }
});
