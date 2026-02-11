"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContract = getContract;
exports.submitTransaction = submitTransaction;
exports.evaluateTransaction = evaluateTransaction;
const grpc = __importStar(require("@grpc/grpc-js"));
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./config");
let contract;
async function newGrpcConnection() {
    const tlsRootCert = await fs_1.promises.readFile(config_1.fabricConfig.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(config_1.fabricConfig.peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': config_1.fabricConfig.peerHostAlias,
    });
}
async function newIdentity() {
    const credentials = await fs_1.promises.readFile(config_1.fabricConfig.certPath);
    return { mspId: config_1.fabricConfig.mspId, credentials };
}
async function newSigner() {
    const files = await fs_1.promises.readdir(config_1.fabricConfig.keyDirectoryPath);
    const keyPath = path.resolve(config_1.fabricConfig.keyDirectoryPath, files[0]);
    const privateKeyPem = await fs_1.promises.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return fabric_gateway_1.signers.newPrivateKeySigner(privateKey);
}
async function getContract() {
    if (contract)
        return contract;
    const client = await newGrpcConnection();
    const gateway = (0, fabric_gateway_1.connect)({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });
    const network = gateway.getNetwork(config_1.fabricConfig.channelName);
    contract = network.getContract(config_1.fabricConfig.chaincodeName);
    console.log(`Connected to Fabric network: ${config_1.fabricConfig.channelName} -> ${config_1.fabricConfig.chaincodeName}`);
    return contract;
}
async function submitTransaction(transactionName, ...args) {
    try {
        const contract = await getContract();
        // 1. Create a proposal
        const proposal = contract.newProposal(transactionName, { arguments: args });
        // 2. Get the Transaction ID (this is the real ID on the blockchain)
        const txId = proposal.getTransactionId();
        // 3. Endorse the proposal
        const transaction = await proposal.endorse();
        // 4. Get the result (payload)
        const resultBytes = transaction.getResult();
        const resultJson = new TextDecoder().decode(resultBytes);
        // 5. Submit (commit) the transaction to the orderer
        await transaction.submit();
        return { result: resultJson, txId };
    }
    catch (error) {
        console.error(`Failed to submit transaction ${transactionName}:`);
        console.error('Error Message:', error.message);
        if (error.details) {
            console.error('Error Details:', error.details);
        }
        if (error.transactionId) {
            console.error('Transaction ID:', error.transactionId);
        }
        // Log the full error object for inspection
        console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        throw new Error(`Fabric Error: ${error.message}`);
    }
}
async function evaluateTransaction(transactionName, ...args) {
    try {
        const contract = await getContract();
        const resultBytes = await contract.evaluateTransaction(transactionName, ...args);
        const resultJson = new TextDecoder().decode(resultBytes);
        return resultJson;
    }
    catch (error) {
        console.error(`Failed to evaluate transaction ${transactionName}:`, error);
        throw new Error(`Fabric Error: ${error.message}`);
    }
}
