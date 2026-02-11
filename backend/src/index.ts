import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { submitTransaction, evaluateTransaction } from './fabric/gateway';
import connectDB from './db/connection';
import { Relayer } from './bridge/relayer';
import { Listener } from './bridge/listener';
import { Processor } from './bridge/processor';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

// Submit Transaction Endpoint
app.post('/submit', async (req, res) => {
    try {
        const { transactionName, args } = req.body;

        if (!transactionName) {
            return res.status(400).json({ error: 'transactionName is required' });
        }

        if (!Array.isArray(args)) {
            return res.status(400).json({ error: 'args must be an array of strings' });
        }

        console.log(`Received request: ${transactionName}`, args);

        const result = await submitTransaction(transactionName, ...args);
        
        res.json({
            success: true,
            ...result
        });

    } catch (error: any) {
        console.error('Transaction failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Evaluate Transaction Endpoint (Query)
app.post('/evaluate', async (req, res) => {
    try {
        const { transactionName, args } = req.body;

        if (!transactionName) {
            return res.status(400).json({ error: 'transactionName is required' });
        }

        if (!Array.isArray(args)) {
            return res.status(400).json({ error: 'args must be an array of strings' });
        }

        console.log(`Received query: ${transactionName}`, args);

        const result = await evaluateTransaction(transactionName, ...args);
        
        res.json({
            success: true,
            result
        });

    } catch (error: any) {
        console.error('Evaluation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize and start the server
async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize Relayer
        const relayer = new Relayer();
        await relayer.initialize();
        console.log(`Relayer address: ${relayer.getRelayerAddress()}`);
        const balance = await relayer.getWalletBalance();
        console.log(`Relayer balance: ${balance} ETH`);

        // Start Listener
        const listener = new Listener();
        await listener.start();

        // Start Processor
        const processor = new Processor(relayer);
        await processor.start(30000); // Poll every 30 seconds

        // Start Express server
        app.listen(PORT, () => {
            console.log(`✅ Backend service running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
