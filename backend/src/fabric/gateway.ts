import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fabricConfig } from './config';

let contract: Contract | undefined;

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(fabricConfig.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(fabricConfig.peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': fabricConfig.peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    const credentials = await fs.readFile(fabricConfig.certPath);
    return { mspId: fabricConfig.mspId, credentials };
}

async function newSigner(): Promise<Signer> {
    const files = await fs.readdir(fabricConfig.keyDirectoryPath);
    const keyPath = path.resolve(fabricConfig.keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

export async function getContract(): Promise<Contract> {
    if (contract) return contract;

    const client = await newGrpcConnection();
    const gateway = connect({
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

    const network = gateway.getNetwork(fabricConfig.channelName);
    contract = network.getContract(fabricConfig.chaincodeName);
    
    console.log(`Connected to Fabric network: ${fabricConfig.channelName} -> ${fabricConfig.chaincodeName}`);
    return contract;
}

export async function submitTransaction(transactionName: string, ...args: string[]): Promise<{ result: string; txId: string }> {
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
    } catch (error: any) {
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

export async function evaluateTransaction(transactionName: string, ...args: string[]): Promise<string> {
    try {
        const contract = await getContract();
        const resultBytes = await contract.evaluateTransaction(transactionName, ...args);
        const resultJson = new TextDecoder().decode(resultBytes);
        return resultJson;
    } catch (error: any) {
        console.error(`Failed to evaluate transaction ${transactionName}:`, error);
        throw new Error(`Fabric Error: ${error.message}`);
    }
}
