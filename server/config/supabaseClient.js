import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Supabase credentials are not fully configured in your environment variables. Supabase storage will not work properly.");
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');

export const getBucketName = () => {
    return 'scholarsync-materials';
};

export const ensureBucketExists = async (bucketName) => {
    if (!supabaseUrl || !supabaseKey) return;
    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
            console.error("Error listing Supabase buckets:", listError.message);
            return;
        }
        const bucket = buckets ? buckets.find(b => b.name === bucketName) : null;
        if (!bucket) {
            console.log(`Supabase bucket '${bucketName}' not found. Attempting to create it...`)
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true
            });
            if (createError) {
                console.error(`Failed to create Supabase bucket '${bucketName}':`, createError.message);
            } else {
                console.log(`Supabase bucket '${bucketName}' created successfully.`);
            }
        } else if (!bucket.public) {
            console.log(`Supabase bucket '${bucketName}' is private. Updating to public...`);
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
                public: true
            });
            if (updateError) {
                console.error(`Failed to update Supabase bucket '${bucketName}' to public:`, updateError.message);
            } else {
                console.log(`Supabase bucket '${bucketName}' updated to public successfully.`);
            }
        }
    } catch (err) {
        console.error("ensureBucketExists unexpected error:", err);
    }
};

// Run check asynchronously on initialization
ensureBucketExists(getBucketName());

export default supabase;
