import { createClient } from '@supabase/supabase-js'

import {
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public'

const anonKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(PUBLIC_SUPABASE_URL, anonKey)