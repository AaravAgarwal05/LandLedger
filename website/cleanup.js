const mongoose = require('mongoose');

async function cleanLeftovers() {
  await mongoose.connect('mongodb://localhost:27017/landledger');
  const Listing = mongoose.model('Listing', new mongoose.Schema({ tokenId: String, status: String }, { strict: false }));
  
  const result = await Listing.deleteMany({ tokenId: "2" });
  console.log('Deleted listings for tokenId 2:', result.deletedCount);
  await mongoose.disconnect();
}

cleanLeftovers().catch(console.error);
