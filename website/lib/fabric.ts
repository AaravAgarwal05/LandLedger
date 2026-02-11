/**
 * Fabric Client Utility
 * 
 * This module acts as a client for the standalone 'backend' microservice.
 * It replaces the direct SDK integration to avoid webpack build issues in Next.js.
 */

const GATEWAY_BASE_URL = 'http://localhost:3001';

/**
 * Submits a transaction to the Fabric Gateway Service (Invokes chaincode)
 * @param transactionName Name of the transaction (e.g., 'RegisterLand')
 * @param args Arguments for the transaction
 * @returns Object containing the result payload and transaction ID
 */
export async function submitTransaction(transactionName: string, ...args: string[]): Promise<{ result: string; txId: string }> {
    try {
        console.log(`🌐 Calling Fabric Gateway (Submit): ${transactionName}`);
        
        const response = await fetch(`${GATEWAY_BASE_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transactionName,
                args,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown gateway error');
        }

        return {
            result: data.result,
            txId: data.txId
        };

    } catch (error: any) {
        console.error(`❌ Fabric Gateway Error (${transactionName}):`, error.message);
        throw error;
    }
}

/**
 * Evaluates a transaction on the Fabric Gateway Service (Queries chaincode)
 * @param transactionName Name of the transaction (e.g., 'ReadLand')
 * @param args Arguments for the transaction
 * @returns The result payload as a string
 */
export async function evaluateTransaction(transactionName: string, ...args: string[]): Promise<string> {
    try {
        console.log(`🌐 Calling Fabric Gateway (Evaluate): ${transactionName}`);
        
        const response = await fetch(`${GATEWAY_BASE_URL}/evaluate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transactionName,
                args,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown gateway error');
        }

        return data.result;

    } catch (error: any) {
        console.error(`❌ Fabric Gateway Error (${transactionName}):`, error.message);
        throw error;
    }
}
