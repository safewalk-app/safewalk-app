/**
 * PATCH for cron-check-deadlines Edge Function
 * Adds heartbeat monitoring, idempotence checks, and better error handling
 * 
 * Apply this patch to cron-check-deadlines/index.ts
 */

// Add this function to log cron execution
async function logCronHeartbeat(
  supabase: any,
  functionName: string,
  status: string,
  processed: number,
  sent: number,
  failed: number,
  errorMessage?: string
): Promise<void> {
  try {
    // Check if heartbeat exists for today
    const { data: existing } = await supabase
      .from("cron_heartbeat")
      .select("id")
      .eq("function_name", functionName)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing heartbeat
      await supabase
        .from("cron_heartbeat")
        .update({
          last_run_at: new Date().toISOString(),
          status,
          processed,
          sent,
          failed,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
    } else {
      // Create new heartbeat
      await supabase.from("cron_heartbeat").insert({
        function_name: functionName,
        last_run_at: new Date().toISOString(),
        status,
        processed,
        sent,
        failed,
        error_message: errorMessage,
      });
    }
  } catch (error) {
    console.error("Failed to log cron heartbeat:", error);
    // Don't throw - heartbeat failure shouldn't block cron
  }
}

// Add this function to check cron health
async function checkCronHealth(supabase: any, functionName: string): Promise<{
  healthy: boolean;
  lastRun?: Date;
  minutesSinceLastRun?: number;
}> {
  try {
    const { data: heartbeat } = await supabase
      .from("cron_heartbeat")
      .select("last_run_at")
      .eq("function_name", functionName)
      .order("last_run_at", { ascending: false })
      .limit(1);

    if (!heartbeat || heartbeat.length === 0) {
      return { healthy: false };
    }

    const lastRun = new Date(heartbeat[0].last_run_at);
    const minutesSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60);

    // Cron is healthy if it ran within the last 5 minutes
    const healthy = minutesSinceLastRun <= 5;

    return {
      healthy,
      lastRun,
      minutesSinceLastRun,
    };
  } catch (error) {
    console.error("Failed to check cron health:", error);
    return { healthy: false };
  }
}

// Add this to the main handler to log heartbeat:
/*
  // Log cron execution
  await logCronHeartbeat(
    supabase,
    "cron-check-deadlines",
    "success",
    trips.length,
    sentCount,
    failedCount
  );
*/

// Add this for error handling:
/*
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron check deadlines error:", errorMessage);

    // Log failed cron execution
    await logCronHeartbeat(
      supabase,
      "cron-check-deadlines",
      "failed",
      0,
      0,
      0,
      errorMessage
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: "EXCEPTION",
        processed: 0,
        sent: 0,
        failed: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
*/

// Add this idempotence check in the trip processing loop:
/*
  for (const trip of trips) {
    try {
      // Check if alert was already sent (idempotence)
      if (trip.alert_sent_at !== null) {
        console.warn(`Trip ${trip.trip_id}: Alert already sent at ${trip.alert_sent_at}`);
        continue;
      }

      // ... rest of processing
    }
  }
*/

export { logCronHeartbeat, checkCronHealth };
