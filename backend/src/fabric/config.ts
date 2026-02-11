import * as path from 'path';

// Path to the test-network directory
const TEST_NETWORK_PATH = 'c:/Coding_Playground/Codes/BlockChain/LandLedger/blockchain/fabric-samples/test-network';

export const fabricConfig = {
    // Connection Profile
    connectionProfilePath: path.resolve(TEST_NETWORK_PATH, 'organizations/peerOrganizations/org1.example.com/connection-org1.json'),
    
    // Wallet / Identity
    mspId: 'Org1MSP',
    certPath: path.resolve(TEST_NETWORK_PATH, 'organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem'),
    keyDirectoryPath: path.resolve(TEST_NETWORK_PATH, 'organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore'),
    
    // TLS
    tlsCertPath: path.resolve(TEST_NETWORK_PATH, 'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
    peerEndpoint: 'localhost:7051',
    peerHostAlias: 'peer0.org1.example.com',
    
    // Channel & Chaincode
    channelName: 'landledger',
    chaincodeName: 'landcontract',
};
