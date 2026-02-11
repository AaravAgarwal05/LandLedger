"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const gateway_1 = require("./fabric/gateway");
const connection_1 = __importDefault(require("./db/connection"));
const relayer_1 = require("./bridge/relayer");
const listener_1 = require("./bridge/listener");
const processor_1 = require("./bridge/processor");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        const result = await (0, gateway_1.submitTransaction)(transactionName, ...args);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
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
        const result = await (0, gateway_1.evaluateTransaction)(transactionName, ...args);
        res.json({
            success: true,
            result
        });
    }
    catch (error) {
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
        await (0, connection_1.default)();
        // Initialize Relayer
        const relayer = new relayer_1.Relayer();
        await relayer.initialize();
        console.log(`Relayer address: ${relayer.getRelayerAddress()}`);
        const balance = await relayer.getWalletBalance();
        console.log(`Relayer balance: ${balance} ETH`);
        // Start Listener
        const listener = new listener_1.Listener();
        await listener.start();
        // Start Processor
        const processor = new processor_1.Processor(relayer);
        await processor.start(30000); // Poll every 30 seconds
        // Start Express server
        app.listen(PORT, () => {
            console.log(`✅ Backend service running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
