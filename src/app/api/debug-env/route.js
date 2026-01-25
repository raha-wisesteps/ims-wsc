import { NextResponse } from 'next/server';

export async function GET() {
    // Debug endpoint untuk melihat apakah env variables terbaca
    // HANYA UNTUK DEVELOPMENT - HAPUS DI PRODUCTION!

    const envCheck = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
        FINGERSPOT_CLOUD_ID: process.env.FINGERSPOT_CLOUD_ID ? '✓ Set' : '✗ Missing',
        FINGERSPOT_TOKEN: process.env.FINGERSPOT_TOKEN ? '✓ Set' : '✗ Missing',

        // Debug: lihat beberapa karakter pertama (JANGAN tampilkan full value!)
        FINGERSPOT_CLOUD_ID_PREVIEW: process.env.FINGERSPOT_CLOUD_ID
            ? `"${process.env.FINGERSPOT_CLOUD_ID.substring(0, 3)}..."`
            : 'undefined',
    };

    return NextResponse.json({
        message: 'Environment Variables Check',
        nodeEnv: process.env.NODE_ENV,
        check: envCheck
    });
}
