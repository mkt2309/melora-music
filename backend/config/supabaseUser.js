const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.');
}

const createUserClient = (accessToken) => {
    return createClient(supabaseUrl, supabasePublishableKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

module.exports = createUserClient;
