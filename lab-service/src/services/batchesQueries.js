
module.exports ={
    CREATE_BATCH :`INSERT INTO batches(name,description,created_by,startdate,enddate) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    CREATE_BATCH_USER:`INSERT INTO batch_users(batch_id,user_id) VALUES ($1,$2) RETURNING *`,
    CREATE_BATCH_LAB:`INSERT INTO batchlabs (lab_id,lab_name,start_date,end_date,remaining_days,trainer_id,trainer_name,updated_at,batch_id,assigned_by,type)
    VALUES ( $1, $2,$3,$4,EXTRACT(DAY FROM ($4::timestamp  - $3::timestamp)),$5,$6,NOW(),$7,$8,$9)RETURNING *`,
    INSERT_INTO_USERASSIGNMENT:`INSERT INTO vmclusterdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,group_creds_id,assigned_at,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,NOW(),$7,$8) RETURNING *`,

    GET_USER_NOTIFICATION_SETTINGS:`SELECT * FROM user_notification_settings WHERE user_id = $1`,
    INSERT_NOTIFICATION:`INSERT INTO notifications (type,title,message,priority,user_id,metadata) values($1,$2,$3,$4,$5,$6) RETURNING *`,

    GET_BATCHES_SUPERADMIN:`SELECT * FROM batches`,
    GET_BATCHES:`SELECT * FROM batches WHERE created_by=ANY($1)`,
    GET_ALL_BATCHES:`SELECT * FROM batches`,
    GET_BATCH:`SELECT * FROM batches WHERE id=$1`,
    GET_BATCHES_TRAINER:`SELECT * FROM batches WHERE id=ANY($1)`,
    GET_BATCH_USERS:`SELECT 
            bu.*,
            COALESCE(u.name, ou.name) AS name,
            COALESCE(u.email, ou.email) AS email,
            COALESCE(u.role, ou.role) AS role
            FROM batch_users bu
            LEFT JOIN users u 
            ON bu.user_id = u.id
            LEFT JOIN organization_users ou 
            ON bu.user_id = ou.id
            WHERE bu.batch_id = $1;
            `,
    GET_USERSOF_BATCH:`SELECT * FROM batch_users WHERE batch_id=$1`,
    GET_BATCH_LABS:`SELECT * FROM batchlabs where batch_id=$1`,
    GET_BATCHES_FOR_TRAINER:`SELECT * FROM batchlabs where trainer_id=ANY($1)`,
    GET_ALL_BATCH_LABS:`SELECT * FROM batchlabs`,
    // GET_ALL_LABS_FOR_BATCH: `
    // SELECT lab_id, title, user_id, NULL AS start_date,enddate AS end_date,'singlevm-aws' AS type
    // FROM createlab
    // WHERE user_id = $1
    
    // UNION
    
    // SELECT labid AS lab_id, title, createdby AS user_id,startdate AS start_date,enddate AS end_date,'cloudslice' AS type
    // FROM cloudslicelab
    // WHERE createdby = $1

    // UNION

    // SELECT labid AS lab_id,title,user_id,startdate AS start_date,enddate AS end_date,'singlevm-proxmox' AS type
    // FROM singlevmproxmox_lab WHERE user_id= $1

    // UNION
    // SELECT lab_id,title,user_id,startdate AS start_date,enddate AS end_date,'singlevm-datacenter' AS type
    // FROM singlevmdatacenter_lab WHERE user_id = $1
    // UNION
    // SELECT labid AS lab_id,title,user_id,startdate AS start_date,enddate AS end_date, 'vmcluster-datacenter' AS type
    // FROM vmclusterdatacenter_lab WHERe user_id = $1
    // `,
//     GET_ALL_LABS_FOR_BATCH: `
//   /* ---------- Single VM AWS ---------- */
//   SELECT
//     cl.lab_id,
//     cl.title,
//     cl.user_id,
//     NULL AS start_date,
//     cl.enddate AS end_date,
//     'singlevm-aws' AS type
//   FROM createlab cl
//   WHERE
//     cl.user_id = $1
//     OR cl.lab_id IN (
//       SELECT lab_id
//       FROM lab_batch
//       WHERE org_id = $2
//     )

//   UNION

//   /* ---------- Cloudslice ---------- */
//   SELECT
//     csl.labid AS lab_id,
//     csl.title,
//     csl.createdby AS user_id,
//     csl.startdate AS start_date,
//     csl.enddate AS end_date,
//     'cloudslice' AS type
//   FROM cloudslicelab csl
//   WHERE
//     csl.createdby = $1
//     OR csl.labid IN (
//       SELECT labid
//       FROM cloudsliceorgassignment
//       WHERE orgid = $2
//     )

//   UNION

//   /* ---------- Single VM Proxmox ---------- */
//   SELECT
//     sp.labid AS lab_id,
//     sp.title,
//     sp.user_id,
//     sp.startdate AS start_date,
//     sp.enddate AS end_date,
//     'singlevm-proxmox' AS type
//   FROM singlevmproxmox_lab sp
//   WHERE
//     sp.user_id = $1
//     OR sp.labid IN (
//       SELECT labid
//       FROM singlevmproxmoxorgassignment
//       WHERE orgid = $2
//     )

//   UNION

//   /* ---------- Single VM Datacenter ---------- */
//   SELECT
//     sd.lab_id,
//     sd.title,
//     sd.user_id,
//     sd.startdate AS start_date,
//     sd.enddate AS end_date,
//     'singlevm-datacenter' AS type
//   FROM singlevmdatacenter_lab sd
//   WHERE
//     sd.user_id = $1
//     OR sd.lab_id IN (
//       SELECT labid
//       FROM singlevmdatacenterorgassignment
//       WHERE orgid = $2
//     )

//   UNION

//   /* ---------- VM Cluster Datacenter ---------- */
//   SELECT
//     vc.labid AS lab_id,
//     vc.title,
//     vc.user_id,
//     vc.startdate AS start_date,
//     vc.enddate AS end_date,
//     'vmcluster-datacenter' AS type
//   FROM vmclusterdatacenter_lab vc
//   WHERE
//     vc.user_id = $1
//     OR vc.labid IN (
//       SELECT labid
//       FROM vmclusterdatacenterorgassignment
//       WHERE orgid = $2
//     )
// `,
//    GET_ALL_LABS_FOR_BATCH: `
//   /* ---------- Single VM AWS ---------- */
//   SELECT
//     cl.lab_id,
//     cl.title,
//     cl.user_id,
//     NULL AS start_date,
//     cl.enddate AS end_date,
//     'singlevm-aws' AS type,
//   FROM createlab cl
//   WHERE
//     $3 = true
//     OR cl.user_id = $1
//     OR cl.lab_id IN (
//       SELECT lab_id FROM lab_batch WHERE org_id = $2
//     )

//   UNION

//   /* ---------- Cloudslice ---------- */
//   SELECT
//     csl.labid AS lab_id,
//     csl.title,
//     csl.createdby AS user_id,
//     csl.startdate AS start_date,
//     csl.enddate AS end_date,
//     'cloudslice' AS type
//   FROM cloudslicelab csl
//   WHERE
//     $3 = true
//     OR csl.createdby = $1
//     OR csl.labid IN (
//       SELECT labid FROM cloudsliceorgassignment WHERE orgid = $2
//     )

//   UNION

//   /* ---------- Single VM Proxmox ---------- */
//   SELECT
//     sp.labid AS lab_id,
//     sp.title,
//     sp.user_id,
//     sp.startdate AS start_date,
//     sp.enddate AS end_date,
//     'singlevm-proxmox' AS type
//   FROM singlevmproxmox_lab sp
//   WHERE
//     $3 = true
//     OR sp.user_id = $1
//     OR sp.labid IN (
//       SELECT labid FROM singlevmproxmoxorgassignment WHERE orgid = $2
//     )

//   UNION

//   /* ---------- Single VM Datacenter ---------- */
//   SELECT
//     sd.lab_id,
//     sd.title,
//     sd.user_id,
//     sd.startdate AS start_date,
//     sd.enddate AS end_date,
//     'singlevm-datacenter' AS type
//   FROM singlevmdatacenter_lab sd
//   WHERE
//     $3 = true
//     OR sd.user_id = $1
//     OR sd.lab_id IN (
//       SELECT labid FROM singlevmdatacenterorgassignment WHERE orgid = $2
//     )

//   UNION

//   /* ---------- VM Cluster Datacenter ---------- */
//   SELECT
//     vc.labid AS lab_id,
//     vc.title,
//     vc.user_id,
//     vc.startdate AS start_date,
//     vc.enddate AS end_date,
//     'vmcluster-datacenter' AS type
//   FROM vmclusterdatacenter_lab vc
//   WHERE
//     $3 = true
//     OR vc.user_id = $1
//     OR vc.labid IN (
//       SELECT labid FROM vmclusterdatacenterorgassignment WHERE orgid = $2
//     )
// `,
    GET_ALL_LABS_FOR_BATCH: `

/* ---------- Single VM AWS ---------- */
SELECT
  cl.lab_id,
  cl.title,
  cl.user_id,

  CASE
    WHEN COALESCE(lb.purchased, false) = true
    THEN lb.status
    ELSE cl.status
  END AS status,

  NULL AS start_date,
  cl.enddate AS end_date,
  'singlevm-aws' AS type,
  COALESCE(lb.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(lb.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(cl.remaining, 0)
  END AS quantity

FROM createlab cl
LEFT JOIN lab_batch lb
  ON lb.lab_id = cl.lab_id
  AND lb.org_id = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = cl.lab_id
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR cl.user_id = ANY($1::uuid[])
  OR lb.lab_id IS NOT NULL

UNION ALL

/* ---------- Cloudslice ---------- */
SELECT
  csl.labid AS lab_id,
  csl.title,
  csl.createdby AS user_id,

  CASE
    WHEN COALESCE(csoa.purchased, false) = true
    THEN csoa.status
    ELSE csl.status
  END AS status,

  csl.startdate AS start_date,
  csl.enddate AS end_date,
  'cloudslice' AS type,
  COALESCE(csoa.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(csoa.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(csl.remaining, 0)
  END AS quantity

FROM cloudslicelab csl
LEFT JOIN cloudsliceorgassignment csoa
  ON csoa.labid = csl.labid
  AND csoa.orgid = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = csl.labid
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR csl.createdby = ANY($1::uuid[])
  OR csoa.labid IS NOT NULL

UNION ALL

/* ---------- Single VM Proxmox ---------- */
SELECT
  sp.labid AS lab_id,
  sp.title,
  sp.user_id,

  CASE
    WHEN COALESCE(spoa.purchased, false) = true
    THEN spoa.status
    ELSE sp.status
  END AS status,

  sp.startdate AS start_date,
  sp.enddate AS end_date,
  'singlevm-proxmox' AS type,
  COALESCE(spoa.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(spoa.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(sp.remaining, 0)
  END AS quantity

FROM singlevmproxmox_lab sp
LEFT JOIN singlevmproxmoxorgassignment spoa
  ON spoa.labid = sp.labid
  AND spoa.orgid = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = sp.labid
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR sp.user_id = ANY($1::uuid[])
  OR spoa.labid IS NOT NULL

UNION ALL

/* ---------- Single VM Datacenter ---------- */
SELECT
  sd.lab_id,
  sd.title,
  sd.user_id,

  CASE
    WHEN COALESCE(sdoa.purchased, false) = true
    THEN sdoa.status
    ELSE sd.status
  END AS status,

  sd.startdate AS start_date,
  sd.enddate AS end_date,
  'singlevm-datacenter' AS type,
  COALESCE(sdoa.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(sdoa.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(sd.remaining, 0)
  END AS quantity

FROM singlevmdatacenter_lab sd
LEFT JOIN singlevmdatacenterorgassignment sdoa
  ON sdoa.labid = sd.lab_id
  AND sdoa.orgid = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = sd.lab_id
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR sd.user_id = ANY($1::uuid[])
  OR sdoa.labid IS NOT NULL

UNION ALL

/* ---------- VM Cluster Datacenter ---------- */
SELECT
  vc.labid AS lab_id,
  vc.title,
  vc.user_id,

  CASE
    WHEN COALESCE(vcoa.purchased, false) = true
    THEN vcoa.status
    ELSE vc.status
  END AS status,

  vc.startdate AS start_date,
  vc.enddate AS end_date,
  'vmcluster-datacenter' AS type,
  COALESCE(vcoa.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(vcoa.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(vc.remaining, 0)
  END AS quantity

FROM vmclusterdatacenter_lab vc
LEFT JOIN vmclusterdatacenterorgassignment vcoa
  ON vcoa.labid = vc.labid
  AND vcoa.orgid = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = vc.labid
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR vc.user_id = ANY($1::uuid[])
  OR vcoa.labid IS NOT NULL

UNION ALL

/* ---------- Proxmox Cluster ---------- */
SELECT
  pl.labid AS lab_id,
  pl.title,
  pl.user_id,

  CASE
    WHEN COALESCE(poa.purchased, false) = true
    THEN poa.status
    ELSE pl.status
  END AS status,

  pl.startdate AS start_date,
  pl.enddate AS end_date,
  'proxmox-cluster' AS type,
  COALESCE(poa.purchased, false) AS purchased,

  CASE
    WHEN COALESCE(poa.purchased, false) = true
    THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
    ELSE COALESCE(pl.remaining, 0)
  END AS quantity

FROM proxmoxcluster_lab pl
LEFT JOIN proxmoxcluster_org_assignment poa
  ON poa.labid = pl.labid
  AND poa.orgid = $2
LEFT JOIN lab_batch_purchased lbp
  ON lbp.lab_id = pl.labid
  AND lbp.org_id = $2
WHERE
  $3 = true
  OR pl.user_id = ANY($1::uuid[])
  OR poa.labid IS NOT NULL

`,

    GET_LAB_DETAILS_BATCH: `

/* ---------- Single VM AWS ---------- */
SELECT 
    cl.lab_id::uuid AS lab_id,
    cl.title::text AS title,
    cl.user_id,
    NULL AS start_date,
    cl.enddate AS end_date,
    'singlevm-aws' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE cl.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
FROM createlab cl
LEFT JOIN lab_batch_purchased lbp
    ON lbp.lab_id = cl.lab_id
    AND lbp.org_id = $2
WHERE cl.lab_id = $1::uuid

UNION ALL

/* ---------- Cloudslice ---------- */
SELECT 
    csl.labid::uuid AS lab_id,
    csl.title::text AS title,
    csl.createdby AS user_id,
    csl.startdate AS start_date,
    csl.enddate AS end_date,
    'cloudslice' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE csl.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
FROM cloudslicelab csl
LEFT JOIN lab_batch_purchased lbp
    ON lbp.lab_id = csl.labid
    AND lbp.org_id = $2
WHERE csl.labid = $1::uuid

UNION ALL

/* ---------- Single VM Proxmox ---------- */
SELECT 
    sp.labid::uuid AS lab_id,
    sp.title::text AS title,
    sp.user_id,
    sp.startdate AS start_date,
    sp.enddate AS end_date,
    'singlevm-proxmox' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE sp.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
FROM singlevmproxmox_lab sp
LEFT JOIN lab_batch_purchased lbp
    ON lbp.lab_id = sp.labid
    AND lbp.org_id = $2
WHERE sp.labid = $1::uuid
UNION ALL

/* ---------- Single VM Datacenter ---------- */
SELECT 
    sd.lab_id::uuid AS lab_id,
    sd.title::text AS title,
    sd.user_id,
    sd.startdate AS start_date,
    sd.enddate AS end_date,
    'singlevm-datacenter' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE sd.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
FROM singlevmdatacenter_lab sd
LEFT JOIN lab_batch_purchased lbp
    ON lbp.lab_id = sd.lab_id
    AND lbp.org_id = $2
WHERE sd.lab_id = $1::uuid

UNION ALL

/* ---------- VM Cluster Datacenter ---------- */
SELECT
    vc.labid::uuid AS lab_id,
    vc.title::text AS title,
    vc.user_id,
    vc.startdate AS start_date,
    vc.enddate AS end_date,
    'vmcluster-datacenter' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE vc.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
    FROM vmclusterdatacenter_lab vc
    LEFT JOIN lab_batch_purchased lbp
        ON lbp.lab_id = vc.labid
        AND lbp.org_id = $2
    WHERE vc.labid = $1::uuid

UNION ALL

/* ---------- Proxmox Cluster ---------- */
SELECT
    pl.labid::uuid AS lab_id,
    pl.title::text AS title,
    pl.user_id,
    pl.startdate AS start_date,
    pl.enddate AS end_date,
    'proxmox-cluster' AS type,
    CASE
        WHEN lbp.purchased_id IS NOT NULL
        THEN COALESCE(lbp.number_of_users - lbp.assigned_users, 0)
        ELSE pl.remaining
    END AS quantity,
    CASE WHEN lbp.purchased_id IS NOT NULL THEN true ELSE false END AS purchased
FROM proxmoxcluster_lab pl
LEFT JOIN lab_batch_purchased lbp
    ON lbp.lab_id = pl.labid
    AND lbp.org_id = $2
WHERE pl.labid = $1::uuid
    `,

    CHECK_BATCH_USER_ALREADY_EXIST:`SELECT * FROM batch_users WHERE user_id=$1 AND batch_id=$2`,
    CHECK_BATCHLAB_ALREADY:`SELECT * FROM batchlabs WHERE lab_id=$1 and batch_id=$2`,
    CHECK_USERASSIGNED_SINGLEVM_DATACENTER_LAB:`SELECT * FROM singlevmdatacenteruserassignment where labid=$1 and  user_id=$2`,
    CHECK_USER_LABS_VMCLUSTERDATACENTER:`SELECT * FROM vmclusterdatacenteruserassignment where labid=$1 and  user_id=$2`,
    CHECK_USER_ASSIGNED_LAB:`SELECT * FROM cloudsliceuserassignment where labid=$1 and user_id=$2`,
    INSERT_DATACENTER_VM_USERASSIGNMENT :`INSERT INTO singlevmdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,creds_id,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    INSERT_CLOUDSLICE_USER_ASSIGNMENT:`INSERT INTO cloudsliceuserassignment(labid,user_id,assigned_by,start_date,end_date,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,

    UPDATE_BATCH_DETAILS:`UPDATE  batches set name=$1,description=$2,startdate=$3,enddate=$4 where id=$5 RETURNING *`,
    UPDATE_LAB_BATCH:`UPDATE batchlabs set lab_id=$1,lab_name=$2,start_date=$3,end_date=$4 ,remaining_days=$5,trainer_id=$6,trainer_name=$7 WHERE lab_id=$8 RETURNING *`,
    UPDATE_BATCH_USERS_TLAB:`UPDATE batch_users SET total_labs =GREATEST(COALESCE(total_labs, 0) + $1, 0) WHERE batch_id = $2 AND user_id=$3;`,
    UPDATE_BATCH_USERS_TLAB_STARTED:`UPDATE batchlabs SET total_users =GREATEST(COALESCE(total_users, 0) + $1, 0) WHERE batch_id = $2 AND lab_id=$3;`,
    UPDATE_BATCH_USERS_TLAB_COMPLETED:`UPDATE batchlabs SET users_completed =GREATEST(COALESCE(users_completed, 0) + $1, 0) WHERE batch_id = $2 AND lab_id=$3;`,
    UPDATE_BATCH_USER_TLAB:`UPDATE batch_users SET total_labs = GREATEST(COALESCE(total_labs, 0) + $1, 0) WHERE user_id = $2;`,
    UPDATE_BATCHLAB_COUNT:`UPDATE batches SET lab_count =GREATEST(COALESCE(lab_count, 0) + $1, 0) WHERE id=$2`,
    UPDATE_BATCHLAB_USER_COUNT:`UPDATE batch_users set labs_started = GREATEST(COALESCE(labs_started, 0) + $1, 0) WHERE batch_id=$2 and user_id=$3 RETURNING *`,
    UPDATE_BATCHLAB_COMPLETED_USER_COUNT:`UPDATE batch_users set labs_completed = GREATEST(COALESCE(labs_completed, 0) + $1, 0) WHERE batch_id=$2 and user_id=$3 RETURNING *`,
    UPDATE_BATCH_USER_TSTARTED:`UPDATE batchlabs set users_started=users_started + $1 WHERE lab_id=$2 AND batch_id=$3 RETURNING *`,
    UPDATE_USER_COUNT:`UPDATE batches
    SET user_count = GREATEST(user_count + $1, 0)
    WHERE id = $2;
    `,
    UPDATE_REMAINING_DAYS: `
    UPDATE batchlabs
    SET remaining_days = 
      CASE
        WHEN CURRENT_DATE < start_date THEN end_date::date - start_date::date
        WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN end_date::date - CURRENT_DATE
        ELSE 0
      END;
     `,
    UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT:`WITH to_update AS (
      SELECT id
      FROM datacenter_lab_user_credentials
      WHERE labid = $2 AND orgassigned = $3 and assigned_to is  NUll
      LIMIT 1
    )
    UPDATE datacenter_lab_user_credentials AS d
    SET assigned_to = $1
    FROM to_update
    WHERE d.id = to_update.id
    RETURNING d.*;
    ;
        `,
    UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER: `
    WITH to_update AS (
      SELECT id
      FROM datacenter_lab_user_credentials
      WHERE
        labid = $2
        AND assigned_to IS NULL
        AND (
          orgassigned IS NULL
          OR orgassigned = $3
        )
      LIMIT 1
    )
    UPDATE datacenter_lab_user_credentials AS d
    SET assigned_to = $1,assignment_type=$4,batch_id=$5
    FROM to_update
    WHERE d.id = to_update.id
    RETURNING d.*;
    `,

    UPDATE_USER_GROUP_CREDS_TO_RANDOM_USER:`WITH limited AS (
        SELECT id 
        FROM user_credential_groups 
        WHERE userassigned IS NULL 
            AND orgassigned IS NULL 
            AND labid = $2 
        LIMIT 1
        )
        UPDATE user_credential_groups 
        SET userassigned = $1,assignment_type=$3,batch_id=$4
        WHERE id IN (SELECT id FROM limited)
        RETURNING *;
     `,
     UPDATE_USER_GROUP_CREDS_TO_USER:`WITH limited AS (
        SELECT id 
        FROM user_credential_groups 
        WHERE userassigned IS NULL 
            AND (
          orgassigned IS NULL
          OR orgassigned = $3
        )
            AND labid = $2 
        LIMIT 1
        )
        UPDATE user_credential_groups 
        SET userassigned = $1,assignment_type=$4,batch_id=$5
        WHERE id IN (SELECT id FROM limited)
        RETURNING *;
        `, 
   UPDATE_ALL_USERLABS: `
    WITH updated_labassignments AS (
        UPDATE labassignments
        SET start_date = $3, completion_date = $4
        WHERE lab_id = $1 AND user_id = $2
        RETURNING 'labassignments' AS table_name, lab_id, user_id
    ),
    updated_cloudslice AS (
        UPDATE cloudsliceuserassignment
        SET start_date = $3, end_date = $4
        WHERE labid = $1 AND user_id = $2
        RETURNING 'cloudsliceuserassignment' AS table_name, labid AS lab_id, user_id
    ),
    updated_proxmox AS (
        UPDATE singlevmproxmoxuserassignment
        SET startdate = $3, enddate = $4
        WHERE labid = $1 AND user_id = $2
        RETURNING 'singlevmproxmoxuserassignment' AS table_name, labid AS lab_id, user_id
    ),
    updated_datacenter AS (
        UPDATE singlevmdatacenteruserassignment
        SET startdate = $3, enddate = $4
        WHERE labid = $1 AND user_id = $2
        RETURNING 'singlevmdatacenteruserassignment' AS table_name, labid AS lab_id, user_id
    ),
    updated_cluster AS (
        UPDATE vmclusterdatacenteruserassignment
        SET startdate = $3, enddate = $4
        WHERE labid = $1 AND user_id = $2
        RETURNING 'vmclusterdatacenteruserassignment' AS table_name, labid AS lab_id, user_id
    )
    SELECT * FROM updated_labassignments
    UNION ALL
    SELECT * FROM updated_cloudslice
    UNION ALL
    SELECT * FROM updated_proxmox
    UNION ALL
    SELECT * FROM updated_datacenter
    UNION ALL
    SELECT * FROM updated_cluster;
    `,

    DELETE_BATCHES:`DELETE FROM batches WHERE id=$1 RETURNING *`,
    DELETE_USER_FROM_BATCH:`DELETE FROM batch_users WHERE user_id=$1 AND batch_id=$2 RETURNING *`,
    DELETE_USERS_FROM_BATCH:`DELETE FROM batch_users WHERE batch_id=$1 RETURNING *`,
    DELETE_USERLABS_FROM_BATCH_LABASSIGNMENTS: `
    DELETE FROM labassignments WHERE lab_id = $1 AND user_id = $2 AND assignment_type=$3 AND batch_id=$4 RETURNING *;
    `,
    DELETE_CLOUD_ASSIGNED_INSTANCE:`DELETE FROM cloudassignedinstance WHERE user_id=$1 AND lab_id=$2 AND batch=$3 AND batch_id=$4 RETURNING *`,
    DELETE_USERLABS_FROM_BATCH_CLOUDSLICE: `
    DELETE FROM cloudsliceuserassignment WHERE labid = $1 AND user_id = $2 AND assignment_type=$3 AND batch_id=$4 RETURNING *;
    `,
    DELETE_USERLABS_FROM_BATCH_SINGLEVM: `
    DELETE FROM singlevmproxmoxuserassignment WHERE labid = $1 AND user_id = $2 AND assignment_type=$3 AND batch_id=$4 RETURNING *;
    `,
    DELETE_USERLABS_FROM_BATCH_VMCLUSTER:`
    DELETE FROM vmclusterdatacenteruserassignment WHERE labid=$1 AND user_id = $2 RETURNING *;
    `,
    DELETE_USERLABS_FROM_BATCH_SINGLEVMDATACENTER:`
    DELETE FROM singlevmdatacenteruserassignment WHERE labid=$1 AND user_id = $2 RETURNING *;
    `,
    DELETE_USER_CRED_FROM_CREDS: `UPDATE datacenter_lab_user_credentials set assigned_to=$1,assignment_type=NULL, batch_id=NULL where assigned_to=$2 AND assignment_type=$3 AND batch_id=$4`,
    DELETE_RANDOM_USER_CREDS:`UPDATE user_credential_groups SET userassigned = NULL,assignment_type = NULL ,batch_id = NULL WHERE labid=$1  and userassigned = $2 and assignment_type = $3 and batch_id = $4`,
    DELETE_USER_DATACENTER_LAB:`DELETE FROM vmclusterdatacenteruserassignment WHERE labid=$1 and user_id=$2 and assignment_type=$3 and batch_id=$4`,
    DELETE_SINGLEVM_DATACENTER_FROM_USER:`DELETE FROM singlevmdatacenteruserassignment where labid=$1 and user_id=$2 and assignment_type=$3 and batch_id=$4`, 
    DELETE_LAB_FROM_BATCH:`DELETE FROM batchlabs WHERE lab_id=$1 AND batch_id=$2 RETURNING *`,
    DELETE_LABS_FROM_BATCH:`DELETE  FROM batchlabs WHERE batch_id=$1 RETURNING *`,

    // Decrement remaining seats in the specific lab table for own labs (not purchased).
    // $1 = number of users to decrement by, $2 = lab primary key.
    // WHERE remaining != -1 ensures unlimited labs (remaining = -1) are never changed.
    DECREMENT_LAB_REMAINING: {
        'singlevm-aws':
            `UPDATE createlab SET remaining = GREATEST(remaining - $1, 0) WHERE lab_id = $2 AND remaining != -1`,
        'cloudslice':
            `UPDATE cloudslicelab SET remaining = GREATEST(remaining - $1, 0) WHERE labid = $2 AND remaining != -1`,
        'singlevm-proxmox':
            `UPDATE singlevmproxmox_lab SET remaining = GREATEST(remaining - $1, 0) WHERE labid = $2 AND remaining != -1`,
        'singlevm-datacenter':
            `UPDATE singlevmdatacenter_lab SET remaining = GREATEST(remaining - $1, 0) WHERE lab_id = $2 AND remaining != -1`,
        'vmcluster-datacenter':
            `UPDATE vmclusterdatacenter_lab SET remaining = GREATEST(remaining - $1, 0) WHERE labid = $2 AND remaining != -1`,
        'proxmox-cluster':
            `UPDATE proxmoxcluster_lab SET remaining = GREATEST(remaining - $1, 0) WHERE labid = $2 AND remaining != -1`
    }
    }