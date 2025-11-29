import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import dotenv from 'dotenv';

dotenv.config();

async function deleteAssignments() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Delete all assignments
        const result = await Assignment.deleteMany({});
        console.log(`🗑️  Deleted ${result.deletedCount} assignments`);

        console.log('\n✅ Done! Now you can:');
        console.log('1. Click "Scan Classroom" in the app to fetch assignments with the new schema');
        console.log('2. Try extracting text from an assignment with PDF attachments');

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

deleteAssignments();
