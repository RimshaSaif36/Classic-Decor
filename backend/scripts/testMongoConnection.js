require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || '';

async function testConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('MongoDB Connection Test');
  console.log('='.repeat(60));

  if (!MONGODB_URI) {
    console.error('\n❌ MONGODB_URI not set in .env file');
    console.log('\n📝 Please create a .env file with:');
    console.log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
    console.log('\n💡 Get your MongoDB URI from: https://www.mongodb.com/cloud/atlas');
    process.exit(1);
  }

  console.log('\n📍 Attempting to connect to MongoDB...');
  console.log('   URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('\n✅ Successfully connected to MongoDB!');
    
    // Get connection details
    const db = mongoose.connection;
    console.log('\n📊 Connection Details:');
    console.log('   - Host:', db.host);
    console.log('   - Port:', db.port);
    console.log('   - Database:', db.name);
    
    // List collections
    const collections = await db.db.listCollections().toArray();
    console.log(`\n📦 Collections (${collections.length}):`);
    collections.forEach((col, i) => {
      console.log(`   ${i + 1}. ${col.name}`);
    });

    // Get collection stats
    if (collections.length > 0) {
      console.log('\n📈 Collection Statistics:');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}: ${count} documents`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MongoDB is ready for use!');
    console.log('='.repeat(60));

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('\n⚠️  Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure MongoDB is running');
      console.log('   - For MongoDB Atlas: Check your IP whitelist');
      console.log('   - For Local MongoDB: Run `mongod` first');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Tip: Check your username and password in MONGODB_URI');
    }

    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Tip: Check your cluster name and connection string');
    }

    console.log('\n📝 Troubleshooting steps:');
    console.log('   1. Verify MONGODB_URI in .env file');
    console.log('   2. Check MongoDB is running');
    console.log('   3. Verify username/password');
    console.log('   4. Check IP whitelist (if using Atlas)');
    console.log('   5. Check internet connection');

    process.exit(1);
  }
}

testConnection();
