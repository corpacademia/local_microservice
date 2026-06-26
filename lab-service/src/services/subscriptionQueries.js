module.exports = {
   CREATE_PLAN : `INSERT INTO plans (
    tier,stylekey, name, description, monthly_price, annual_monthly_price,
    annual_discount, trial_days, is_popular, is_active, features
  ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    CREATE_LICENSE_KEY:`INSERT INTO license_keys(license_key,org_id,org_name,plan_tier,plan_name,billing_cycle,status,issued_at,expires_at,features,usage,created_at,plan_id) VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()+($8 * INTERVAL '1 day'),$9,$10,NOW(),$11) RETURNING *`,

  GET_ALL_PLANS:`SELECT * FROM plans`,
  GET_ALL_KEYS:`SELECT * FROM license_keys`,
  GET_PLAN:`SELECT * FROM plans WHERE id=$1`,
  GET_LICENSE_KEY:`SELECT * FROM license_keys WHERE org_id=$1 AND status=$2 LIMIT 1`,
  GET_PAYMENT_DATA:`SELECT * FROM payments WHERE labid=$1 AND org_id=$2`,

  UPDATE_ACTIVE_KEY:`UPDATE license_keys set plan_tier=$1,plan_name=$2,billing_cycle=$3,issued_at=NOW(),expires_at=($4 * INTERVAL '1 day'),features=$5,plan_id=$6,license_key=$7 WHERE org_id=$8 AND status='active' RETURNING *`,
  UPDATE_PLAN:`UPDATE plans SET tier=$1,stylekey=$2, name=$3, description=$4, monthly_price=$5, annual_monthly_price=$6,
    annual_discount=$7, trial_days=$8, is_popular=$9, is_active=$10, features= $11 WHERE id=$12 RETURNING *
  `,
  UPDATE_CATALOGUES_PLAN: `
  UPDATE license_keys
  SET usage = jsonb_set(
    usage,
    ARRAY[$1],
    to_jsonb(COALESCE((usage->>$1)::int, 0) + $2),
    true
  )
  WHERE id = $3
  RETURNING *;
  `,
  UPDATE_KEY:`UPDATE license_keys set features=$1 WHERE id=$2 RETURNING *`,
  ACTIVATE_KEY:`UPDATE license_keys set activated=$1 WHERE license_key=$2 RETURNING *`,

  DELETE_PLAN:`DELETE FROM PLANS WHERE ID=$1 RETURNING *`,
  DELETE_KEY:`DELETE FROM license_keys WHERE id=$1 RETURNING *`
}