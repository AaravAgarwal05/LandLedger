export interface Land {
  id: string;
  surveyNo: string;
  area: string;
  address: string;
  owner: string;
  status: 'Registered' | 'Pending Mint' | 'Minted';
  docHash: string;
  createdAt: string;
}

export interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  price: string;
  currency: 'ETH' | 'USDT';
  attributes: { trait_type: string; value: string }[];
}

export const sampleLands: Land[] = [
  {
    id: 'L-1001',
    surveyNo: 'S-452/A',
    area: '1200 sq ft',
    address: '123 Blockchain Blvd, Crypto City',
    owner: '0x123...abc',
    status: 'Minted',
    docHash: 'QmHash123...',
    createdAt: '2023-10-15',
  },
  {
    id: 'L-1002',
    surveyNo: 'S-889/B',
    area: '2400 sq ft',
    address: '456 Decentralized Dr, Web3 Town',
    owner: '0x456...def',
    status: 'Pending Mint',
    docHash: 'QmHash456...',
    createdAt: '2023-10-20',
  },
  {
    id: 'L-1003',
    surveyNo: 'S-112/C',
    area: '5000 sq ft',
    address: '789 Token Terrace, NFT Valley',
    owner: '0x789...ghi',
    status: 'Registered',
    docHash: 'QmHash789...',
    createdAt: '2023-10-25',
  },
];

export const sampleNFTs: NFT[] = [
  {
    tokenId: '1',
    name: 'Prime Estate #1',
    description: 'A prime piece of digital land.',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    owner: '0x123...abc',
    price: '0.5',
    currency: 'ETH',
    attributes: [
      { trait_type: 'Area', value: '1200 sq ft' },
      { trait_type: 'Zone', value: 'Residential' },
    ],
  },
  {
    tokenId: '2',
    name: 'Commercial Hub #2',
    description: 'Located in the heart of the business district.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    owner: '0x456...def',
    price: '1.2',
    currency: 'ETH',
    attributes: [
      { trait_type: 'Area', value: '2400 sq ft' },
      { trait_type: 'Zone', value: 'Commercial' },
    ],
  },
  {
    tokenId: '3',
    name: 'Green Valley #3',
    description: 'Lush green surroundings.',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    owner: '0x789...ghi',
    price: '0.8',
    currency: 'ETH',
    attributes: [
      { trait_type: 'Area', value: '5000 sq ft' },
      { trait_type: 'Zone', value: 'Agricultural' },
    ],
  },
];
