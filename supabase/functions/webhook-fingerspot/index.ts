import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Support CORS for debugging via Browser
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Log Raw Request
        const rawText = await req.text()
        console.log('[Webhook] Raw Body:', rawText)

        let body: any = {}
        try {
            body = JSON.parse(rawText)
        } catch (e) {
            console.error('[Webhook] JSON Parse Error:', e)
            return new Response('Invalid JSON', { status: 400 })
        }

        // 2. Identify Data
        // Fingerspot push usually has 'data' array, OR sometimes flattened fields?
        // We assume standard structure similar to get_attlog
        let logsToProcess: any[] = []

        if (Array.isArray(body)) {
            logsToProcess = body // If root is array
        } else if (Array.isArray(body.data)) {
            logsToProcess = body.data // Standard wrapper
        } else if (typeof body === 'object' && body.pin && (body.scan_date || body.scan)) {
            logsToProcess = [body] // Single Object
        }

        console.log(`[Webhook] Extracting ${logsToProcess.length} logs to process...`)

        if (logsToProcess.length === 0) {
            // Just log and return success (to avoid machine retrying indefinitely if it sends empty heartbeat)
            console.log('[Webhook] No specific attendance logs found in payload.')
            return new Response(JSON.stringify({ success: true, message: 'Received' }), {
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            })
        }

        // 3. Map Data
        const dataToInsert = logsToProcess.map((log: any) => ({
            pin: log.pin,
            scan_date: log.scan_date || log.scan,
            status_scan: log.status_scan !== undefined ? log.status_scan : log.status,
            verified: log.verify,
            work_code: log.work_code, // New Field
            photo_url: log.photo_url, // New Field
            raw_data: log // Save raw JSON for debugging/audit
        })).filter((d: any) => d.pin && d.scan_date) // Basic validation

        // 4. Upsert
        if (dataToInsert.length > 0) {
            const { error } = await supabase.from('attendance_logs').upsert(dataToInsert, {
                onConflict: 'pin, scan_date',
                ignoreDuplicates: true
            })

            if (error) {
                console.error('[Webhook] DB Error:', error)
                // If DB error (e.g. missing column), we might want to return 200 anyway to stop machine from jamming queue?
                // But better to throw 500 so we know something is wrong.
                // Actually, if we miss columns, user needs to run migration.
                throw error
            }
            console.log(`[Webhook] Successfully saved ${dataToInsert.length} records.`)
        }

        // 5. Response
        // Always return JSON success
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('[Webhook] Error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
