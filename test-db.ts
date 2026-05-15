
import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = 'mongodb+srv://thind_db_user:jU7Ptys9epv1eFY1@buildforce.xbbnlbx.mongodb.net/?appName=BuildForce';

async function check() {
    try {
        console.log('Connecting to:', mongoUri);
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected!');
        if (mongoose.connection.db) {
            console.log('Current database:', mongoose.connection.db.databaseName);
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Collections:', collections.map(c => c.name));
        } else {
            console.error('Database connection object is undefined');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

check();
