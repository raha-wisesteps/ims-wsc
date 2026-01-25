import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const FINGERSPOT_TOKEN = Deno.env.get('FINGERSPOT_TOKEN')
    const FINGERSPOT_CLOUD_ID = Deno.env.get('FINGERSPOT_CLOUD_ID')

    if (!FINGERSPOT_TOKEN || !FINGERSPOT_CLOUD_ID) {
      throw new Error('Missing Fingerspot Secrets')
    }

    const reqBody = await req.json().catch(() => ({}))
    const { start_date, end_date, action } = reqBody

    console.log(`[Edge] Received Action: ${action}, Start: ${start_date}, End: ${end_date}`)

    // === ACTION: CHECK CONNECTION (Use get_attlog for checking) ===
    if (action === 'get_userinfo' || action === 'check_connection') {
      const today = new Date().toISOString().split('T')[0]
      console.log(`[Edge] Testing connection via get_attlog for ${today}...`)

      const pingRes = await fetch('https://developer.fingerspot.io/api/get_attlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FINGERSPOT_TOKEN}`
        },
        body: JSON.stringify({
          trans_id: Date.now().toString(),
          cloud_id: FINGERSPOT_CLOUD_ID,
          start_date: today,
          end_date: today
        })
      })
      const pingData = await pingRes.json()
      console.log('[Edge] Ping Response:', JSON.stringify(pingData))

      if (pingData.success === false) {
        return new Response(JSON.stringify({
          success: false,
          message: `Gagal koneksi: ${pingData.message || 'Unknown Error'}`,
          raw: pingData
        }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 })
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Koneksi ke Fingerspot Berhasil (Server Merespon).",
        data: pingData.data || []
      }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    // === ACTION: SYNC ATTENDANCE (BATCHING MODE) ===
    const today = new Date().toISOString().split('T')[0]
    const finalStartDateStr = start_date || today
    const finalEndDateStr = end_date || today

    console.log(`[Edge] Syncing Request: ${finalStartDateStr} - ${finalEndDateStr}`)

    // Parse Dates for Loop
    let cursorDate = new Date(finalStartDateStr)
    const endDateObj = new Date(finalEndDateStr)
    const allAttendanceData: any[] = []

    // Safety Break (avoid infinite loops)
    let safetyCounter = 0;

    // Loop through date range in 2-day chunks
    while (cursorDate <= endDateObj && safetyCounter < 60) {
      safetyCounter++;

      // Calculate Chunk End (Cursor + 1 day = 2 days total)
      // Example: Start Jan 1. Chunk End Jan 2. Range: Jan 1 - Jan 2 (2 Days).
      let chunkEndDate = new Date(cursorDate)
      chunkEndDate.setDate(cursorDate.getDate() + 1)

      // Cap at final end date
      if (chunkEndDate > endDateObj) {
        chunkEndDate = new Date(endDateObj)
      }

      const sStr = cursorDate.toISOString().split('T')[0]
      const eStr = chunkEndDate.toISOString().split('T')[0]

      console.log(`[Edge] Batch Fetching: ${sStr} to ${eStr}...`)

      try {
        const fingerspotRes = await fetch('https://developer.fingerspot.io/api/get_attlog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FINGERSPOT_TOKEN}`
          },
          body: JSON.stringify({
            trans_id: Date.now().toString(),
            cloud_id: FINGERSPOT_CLOUD_ID,
            start_date: sStr,
            end_date: eStr
          })
        })

        const attData = await fingerspotRes.json()

        if (attData.data && Array.isArray(attData.data)) {
          console.log(`[Edge] Batch Found: ${attData.data.length} records`)
          allAttendanceData.push(...attData.data)
        } else {
          // Keep going even if one batch fails (might be empty)
          console.error(`[Edge] Batch Info (${sStr}-${eStr}):`, attData.message)
        }
      } catch (err) {
        console.error(`[Edge] Network Error during batch (${sStr}-${eStr}):`, err)
      }

      // Move cursor to Next Day after Chunk End
      // If ChunkEnd was Jan 2, Next Start is Jan 3.
      cursorDate = new Date(chunkEndDate)
      cursorDate.setDate(cursorDate.getDate() + 1)
    }

    console.log(`[Edge] Total Records Collected: ${allAttendanceData.length}`)

    if (allAttendanceData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `Tidak ada data absensi untuk periode ${finalStartDateStr} s/d ${finalEndDateStr}.`
      }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    // MAP DATA
    const dataToInsert = allAttendanceData.map((log: any) => ({
      pin: log.pin,
      scan_date: log.scan_date || log.scan,
      status_scan: log.status_scan !== undefined ? log.status_scan : log.status,
      verified: log.verify,
    })).filter((d: any) => d.pin && d.scan_date)

    // UPSERT
    const { error } = await supabase.from('attendance_logs').upsert(dataToInsert, {
      onConflict: 'pin, scan_date',
      ignoreDuplicates: true
    })

    if (error) {
      console.error('[Edge] DB Error:', error)
      throw error
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Sukses menyimpan ${dataToInsert.length} data absensi.`
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('[Edge] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 500 })
  }
})
