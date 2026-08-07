const pool = require('../db/dbConfig');

// Helper: look up number_hours_day from the appropriate table for a given lab type
async function getHoursPerDay(lab_id, user_id, lab_type) {
  try {
    // Proxmox cluster purchased
    if (lab_type === 'proxmox-cluster') {
      const r = await pool.query(
        `SELECT number_hours_day FROM proxmox_cluster_purchased WHERE labid=$1 AND user_id=$2 LIMIT 1`,
        [lab_id, user_id]
      );
      if (r.rows[0]?.number_hours_day) return parseInt(r.rows[0].number_hours_day);
    }

    // Proxmox single VM purchased
    if (lab_type === 'singlevm-proxmox') {
      const r = await pool.query(
        `SELECT number_hours_day FROM singlevmproxmox_purchased_labs WHERE labid=$1 AND user_id=$2 LIMIT 1`,
        [lab_id, user_id]
      );
      if (r.rows[0]?.number_hours_day) return parseInt(r.rows[0].number_hours_day);
    }

    // Datacenter single VM (column added via ALTER TABLE in labTables.js)
    try {
      const r = await pool.query(
        `SELECT number_hours_day FROM singlevmdatacenter_lab WHERE lab_id=$1 LIMIT 1`,
        [lab_id]
      );
      if (r.rows[0]?.number_hours_day) return parseInt(r.rows[0].number_hours_day);
    } catch (_) { /* column may not exist on older deployments */ }

    // AWS single VM – hoursPerDay stored in lab_configurations JSONB
    const r2 = await pool.query(
      `SELECT config_details->>'hoursPerDay' AS hours_per_day
       FROM lab_configurations WHERE lab_id=$1 LIMIT 1`,
      [lab_id]
    );
    if (r2.rows[0]?.hours_per_day) return parseInt(r2.rows[0].hours_per_day);

    return null; // no limit configured
  } catch (e) {
    console.error('getHoursPerDay error:', e.message);
    return null;
  }
}

// POST /startLabSession
// Called when user opens the VM session page.
// Records the session start and blocks if the daily limit is already exhausted.
const startLabSession = async (req, res) => {
  try {
    const { user_id, lab_id, lab_type, instance_id, node, hours_per_day } = req.body;

    if (!user_id || !lab_id) {
      return res.status(400).json({ success: false, message: 'user_id and lab_id are required' });
    }

    // Step 1: accumulate time from any orphaned active sessions before closing them.
    // This must happen first — otherwise their elapsed minutes are invisible to
    // lab_daily_usage and the remaining-time shown to the user is too high.
    const orphans = await pool.query(
      `UPDATE user_sessions SET isactive=false, endtime=NOW()
       WHERE user_id=$1 AND labid=$2 AND isactive=true
       RETURNING starttime, endtime`,
      [user_id, lab_id]
    );
    for (const row of orphans.rows) {
      const orphanMinutes = Math.max(1, Math.ceil((new Date(row.endtime) - new Date(row.starttime)) / 60000));
      await pool.query(
        `INSERT INTO lab_daily_usage (user_id, lab_id, usage_date, minutes_used)
         VALUES ($1, $2, CURRENT_DATE, $3)
         ON CONFLICT (user_id, lab_id, usage_date)
         DO UPDATE SET minutes_used = lab_daily_usage.minutes_used + EXCLUDED.minutes_used`,
        [user_id, lab_id, orphanMinutes]
      );
    }

    // Step 2: now read the accurate accumulated minutes (includes any orphan time above).
    const usageResult = await pool.query(
      `SELECT COALESCE(minutes_used, 0) AS minutes_used
       FROM lab_daily_usage
       WHERE user_id=$1 AND lab_id=$2 AND usage_date=CURRENT_DATE`,
      [user_id, lab_id]
    );
    const minutesUsedToday = parseInt(usageResult.rows[0]?.minutes_used || 0);

    // Use the value sent from the frontend if available (covers all lab types including
    // vm-cluster whose number_hours_day lives in a separate microservice DB).
    // Fall back to DB lookup for backwards-compatibility when the field isn't sent.
    const hoursPerDay = hours_per_day ? parseInt(hours_per_day) : await getHoursPerDay(lab_id, user_id, lab_type);
    const limitMinutes = hoursPerDay ? hoursPerDay * 60 : null;

    // Reject if limit already reached
    if (limitMinutes !== null && minutesUsedToday >= limitMinutes) {
      return res.status(403).json({
        success: false,
        limitReached: true,
        message: 'Daily usage limit reached. Please try again tomorrow.',
        minutesUsedToday,
        limitMinutes,
      });
    }

    // Insert new session record
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (labid, user_id, starttime, isactive, type, instance_id, node)
       VALUES ($1, $2, NOW(), true, $3, $4, $5)
       RETURNING id`,
      [lab_id, user_id, lab_type || 'unknown', instance_id || null, node || null]
    );

    return res.status(200).json({
      success: true,
      session_id: sessionResult.rows[0].id,
      minutesUsedToday,
      limitMinutes,
      hoursPerDay,
    });
  } catch (error) {
    console.error('startLabSession error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /stopLabSession
// Called when user leaves the VM session page (component unmount / page unload).
// Calculates elapsed minutes and accumulates them in lab_daily_usage.
const stopLabSession = async (req, res) => {
  try {
    const { session_id, user_id, lab_id } = req.body;

    if (!session_id || !user_id || !lab_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id, user_id, and lab_id are required',
      });
    }

    // Mark session ended and capture duration
    const sessionResult = await pool.query(
      `UPDATE user_sessions
       SET isactive=false, endtime=NOW()
       WHERE id=$1 AND user_id=$2 AND isactive=true
       RETURNING starttime, endtime`,
      [session_id, user_id]
    );

    if (!sessionResult.rows.length) {
      return res.status(200).json({ success: true, message: 'Session already ended', minutesUsed: 0 });
    }

    const { starttime, endtime } = sessionResult.rows[0];
    const minutesUsed = Math.max(1, Math.ceil((new Date(endtime) - new Date(starttime)) / 60000));

    // Accumulate into daily usage (upsert)
    await pool.query(
      `INSERT INTO lab_daily_usage (user_id, lab_id, usage_date, minutes_used)
       VALUES ($1, $2, CURRENT_DATE, $3)
       ON CONFLICT (user_id, lab_id, usage_date)
       DO UPDATE SET minutes_used = lab_daily_usage.minutes_used + EXCLUDED.minutes_used`,
      [user_id, lab_id, minutesUsed]
    );

    return res.status(200).json({ success: true, minutesUsed });
  } catch (error) {
    console.error('stopLabSession error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /getDailyUsage
// Returns how many minutes the user has used today and the configured limit.
const getDailyUsage = async (req, res) => {
  try {
    const { user_id, lab_id, lab_type } = req.body;

    if (!user_id || !lab_id) {
      return res.status(400).json({ success: false, message: 'user_id and lab_id are required' });
    }

    const usageResult = await pool.query(
      `SELECT COALESCE(minutes_used, 0) AS minutes_used
       FROM lab_daily_usage
       WHERE user_id=$1 AND lab_id=$2 AND usage_date=CURRENT_DATE
       ORDER BY recent_time DESC LIMIT 1`,
      [user_id, lab_id]
    );
    const committedMinutes = parseInt(usageResult.rows[0]?.minutes_used || 0);

    // Add elapsed time of the currently active session (not yet written to lab_daily_usage)
    const activeSession = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - starttime)) / 60 AS elapsed_minutes
       FROM user_sessions
       WHERE user_id=$1 AND labid=$2 AND isactive=true
       ORDER BY starttime DESC LIMIT 1`,
      [user_id, lab_id]
    );
    const activeMinutes = Math.ceil(parseFloat(activeSession.rows[0]?.elapsed_minutes || 0));
    const minutesUsedToday = committedMinutes + activeMinutes;

    const hoursPerDay = await getHoursPerDay(lab_id, user_id, lab_type);
    const limitMinutes = hoursPerDay ? hoursPerDay * 60 : null;
    const remainingMinutes = limitMinutes !== null ? Math.max(0, limitMinutes - minutesUsedToday) : null;

    return res.status(200).json({
      success: true,
      minutesUsedToday,
      hoursPerDay,
      limitMinutes,
      remainingMinutes,
    });
  } catch (error) {
    console.error('getDailyUsage error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /heartbeat
// Called every 30s by the frontend while the lab is running.
// Stamps last_heartbeat so the backend cron can detect abandoned sessions.
const heartbeatLabSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }
    await pool.query(
      `UPDATE user_sessions SET last_heartbeat = NOW() WHERE id = $1 AND isactive = true`,
      [session_id]
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('heartbeatLabSession error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { startLabSession, stopLabSession, getDailyUsage, heartbeatLabSession };
