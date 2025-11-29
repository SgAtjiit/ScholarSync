import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { extractTextFromMaterials } from './utils/extractor.js';

dotenv.config();

async function debugExtraction() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find a user
        const user = await User.findOne();
        if (!user) {
            console.log('❌ No user found in database');
            return;
        }
        console.log(`📌 Using user: ${user.email || user._id}`);

        // Find assignments
        const assignments = await Assignment.find({ userId: user._id }).limit(5);
        console.log(`📋 Found ${assignments.length} assignments`);

        if (assignments.length === 0) {
            console.log('❌ No assignments found. Run a scan first.');
            return;
        }

        // Pick the first assignment
        const assignment = assignments[0];
        console.log(`\n🔍 Testing extraction for: "${assignment.title}"`);
        console.log(`📁 Materials count: ${assignment.materials?.length || 0}`);

        // Log materials structure
        if (assignment.materials && assignment.materials.length > 0) {
            console.log('\n📦 Materials structure:');
            assignment.materials.forEach((mat, idx) => {
                console.log(`\n--- Material ${idx + 1} ---`);
                console.log('Full object:', JSON.stringify(mat, null, 2));
            });
        } else {
            console.log('⚠️ No materials found in assignment');
        }

        // Check if extraction already happened
        if (assignment.extractedContent?.fullText) {
            console.log(`\n✅ Text already extracted: ${assignment.extractedContent.fullText.length} chars`);
            console.log(`Methods used: ${assignment.extractedContent.extractionMethod.join(', ')}`);
        } else {
            console.log('\n⚠️ No text has been extracted yet');
        }

        // Try to extract
        console.log('\n🔄 Attempting fresh extraction...');

        // Get access token
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: user.refreshToken });
        const { token: accessToken } = await oauth2Client.getAccessToken();
        console.log('✅ Got access token');

        // Extract
        const result = await extractTextFromMaterials(assignment.materials, accessToken);

        console.log('\n📊 Extraction Result:');
        console.log(`- Combined text length: ${result.combinedText.length} chars`);
        console.log(`- Methods used: ${result.methodsUsed.join(', ') || 'none'}`);

        if (result.combinedText.length > 0) {
            console.log('\n📄 Sample of extracted text (first 500 chars):');
            console.log('---');
            console.log(result.combinedText.substring(0, 500));
            console.log('---');
        } else {
            console.log('\n❌ No text was extracted!');
        }

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugExtraction();
