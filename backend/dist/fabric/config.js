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
exports.fabricConfig = void 0;
const path = __importStar(require("path"));
// Path to the test-network directory
const TEST_NETWORK_PATH = 'c:/Coding_Playground/Codes/BlockChain/AyurSure/blockchain/fabric-samples/test-network';
exports.fabricConfig = {
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
