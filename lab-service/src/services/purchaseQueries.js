module.exports = {
    CREATE_SINGLEAWS_LAB_PURCHASE:`INSERT INTO lab_batch_purchased(lab_id,admin_id,org_id,org_name,configured_by,number_of_days,number_of_users,assigned_users,expiry_date,status)
                                  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    CREATE_EXTENSION_REQUEST:`INSERT INTO lab_extension_requests(purchased_id,lab_id,lab_title,org_id,org_name,admin_id,admin_name,additional_days,additional_users,reason,payment_id)
                                  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    CREATE_LICENSE_KEY:`INSERT INTO license_keys(license_key,org_id,org_name,plan_tier,plan_name,billing_cycle,status,issued_at,expires_at,features,usage,created_at,plan_id,payment_id) VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()+($8 * INTERVAL '1 day'),$9,$10,NOW(),$11,$12) RETURNING *`,

    GET_CATALOGUE_PURCHASE_DETAILS_FORADMIN:`SELECT * FROM lab_batch_purchased`,
    GET_CATALOGUE_PURCHASE_DETAILS_ORG:`SELECT * FROM lab_batch_purchased WHERE org_id=$1`,
    GET_EXTENSIONS_FOR_ADMIN:`SELECT 
    ler.*,
    lbp.number_of_days AS current_days,
    lbp.number_of_users AS current_users
    FROM lab_extension_requests ler
    LEFT JOIN lab_batch_purchased lbp
        ON ler.purchased_id = lbp.purchased_id
    ORDER BY ler.requested_at DESC`,
    GET_EXTENSION_FOR_ORG:`SELECT * FROM lab_extension_requests WHERE org_id=$1`,
    GET_USER_PURCHASED_SINGLEVM_DATACENTER_LABS:`SELECT * FROM singlevmdatacenter_purchased WHERE labid=$1`,
    GET_PURCHASED_LAB_QUANTITY:`SELECT *,(number_of_users - assigned_users) AS quantity FROM lab_batch_purchased  WHERE lab_id=$1 AND org_id=$2 AND status='active'`,
   
    CHECK_ACTIVE_PLAN:`SELECT * FROM license_keys WHERE org_id=$1 and status='active'`,
    CHECK_AVAILABILITY_CREDENTIALS:` SELECT id 
        FROM user_credential_groups 
        WHERE userassigned IS NULL 
            AND orgassigned IS NULL 
            AND labid = $1 `,
    INSERT_ORG_ASSIGNMENT:`INSERT INTO cloudsliceorgassignment(labid,orgid,admin_id,assigned_by,startdate,enddate,purchased,purchased_id) VALUES($1,$2,$3,$4,NOW(),NOW() + ($5 || ' days')::interval,$6,$7) RETURNING *`,
    INSERT_LAB_BATCH: `INSERT INTO lab_batch(lab_id, admin_id, org_id, configured_by,enddate,startdate,assigned_at,purchased,purchased_id) 
                       VALUES($1, $2, $3, $4,NOW() + ($5 || ' days')::interval,NOW(),NOW(),$6,$7) RETURNING *`,
    INSERT_SINGLEVMPROXMOX_ORG_ASSIGNMENT:`INSERT INTO singlevmproxmoxorgassignment (labid,orgid,startdate,enddate,assigned_by,user_id,vmname,purchased,purchased_id) VALUES($1,$2,NOW(),NOW() + ($3 || 'days')::interval,$4,$5,$6,$7,$8) RETURNING *`,
    UPDATE_ASSIGNED_USERS:`UPDATE lab_batch_purchased SET assigned_users = GREATEST(COALESCE(assigned_users,0)+$1,0) WHERE lab_id=$2 AND org_id=$3 RETURNING *`,
    UPDATE_CURRENT_DAYS_USERS:`UPDATE lab_batch_purchased SET number_of_days = GREATEST(COALESCE(number_of_days,0) + $1,0),number_of_users = GREATEST(COALESCE(number_of_users,0) + $2,0),expiry_date = expiry_date + ($1 || ' days')::interval WHERE purchased_id=$3`,
    UPDATE_EXPIRY_LAB:`UPDATE lab_batch  SET enddate = enddate + ($1 || 'days')::interval WHERE purchased_id=$2`,
    UPDATE_EXPIRY_LAB_CLOUDSLICE:`UPDATE cloudsliceorgassignment  SET enddate = enddate + ($1 || 'days')::interval WHERE purchased_id=$2`,
    UPDATE_EXPIRY_LAB_SINGLEVMPROXMOX:`UPDATE singlevmproxmoxorgassignment  SET enddate = enddate + ($1 || 'days')::interval WHERE purchased_id=$2`,
    UPDATE_EXPIRY_LAB_SINGLEVMDATACENTER:`UPDATE singlevmdatacenterorgassignment  SET enddate = enddate + ($1 || 'days')::interval WHERE purchased_id=$2`,
    UPDATE_EXPIRY_LAB_VMCLUSTERDATACENTER:`UPDATE vmclusterdatacenterorgassignment  SET enddate = enddate + ($1 || 'days')::interval WHERE purchased_id=$2`,
    UPDATE_EXTENSION_APPORREJ:`UPDATE lab_extension_requests SET status=$1,admin_note=$2 WHERE request_id=$3 RETURNING *`,
    UPDATE_ACTIVE_KEY:`UPDATE license_keys set plan_tier=$1,plan_name=$2,billing_cycle=$3,features=$4,plan_id=$5,license_key=$6,activated=false WHERE org_id=$7 AND status='active' RETURNING *`,
 

    CHECK_SINGLEVMDATACENTER_LAB_AVAILABILITY:` SELECT id
        FROM datacenter_lab_user_credentials
        WHERE labid = $1 AND orgassigned  is NULL and assigned_to is  NUll
        `,
}
    