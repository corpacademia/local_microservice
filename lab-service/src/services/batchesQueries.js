const { DELETE_CLOUD_ASSIGNED_INSTANCE } = require("../../../aws-service/src/services/awsQueries");

module.exports ={
    CREATE_BATCH :`INSERT INTO batches(name,description,created_by,startdate,enddate) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    CREATE_BATCH_USER:`INSERT INTO batch_users(batch_id,user_id) VALUES ($1,$2) RETURNING *`,
    CREATE_BATCH_LAB:`INSERT INTO batchlabs (lab_id,lab_name,start_date,end_date,remaining_days,trainer_id,trainer_name,updated_at,batch_id,assigned_by,total_users)
    VALUES ( $1, $2,$3,$4,EXTRACT(DAY FROM ($4::timestamp  - $3::timestamp)),$5,$6,NOW(),$7,$8,$9)RETURNING *`,
    INSERT_INTO_USERASSIGNMENT:`INSERT INTO vmclusterdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,group_creds_id,assigned_at,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,NOW(),$7,$8) RETURNING *`,

    GET_USER_NOTIFICATION_SETTINGS:`SELECT * FROM user_notification_settings WHERE user_id = $1`,
    INSERT_NOTIFICATION:`INSERT INTO notifications (type,title,message,priority,user_id,metadata) values($1,$2,$3,$4,$5,$6) RETURNING *`,

    GET_BATCHES:`SELECT * FROM batches WHERE created_by=$1`,
    GET_ALL_BATCHES:`SELECT * FROM batches`,
    GET_BATCH:`SELECT * FROM batches WHERE id=$1`,
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
    GET_ALL_LABS_FOR_BATCH: `
  /* ---------- Single VM AWS ---------- */
  SELECT
    cl.lab_id,
    cl.title,
    cl.user_id,
    NULL AS start_date,
    cl.enddate AS end_date,
    'singlevm-aws' AS type
  FROM createlab cl
  WHERE
    cl.user_id = $1
    OR cl.lab_id IN (
      SELECT lab_id
      FROM lab_batch
      WHERE org_id = $2
    )

  UNION

  /* ---------- Cloudslice ---------- */
  SELECT
    csl.labid AS lab_id,
    csl.title,
    csl.createdby AS user_id,
    csl.startdate AS start_date,
    csl.enddate AS end_date,
    'cloudslice' AS type
  FROM cloudslicelab csl
  WHERE
    csl.createdby = $1
    OR csl.labid IN (
      SELECT labid
      FROM cloudsliceorgassignment
      WHERE orgid = $2
    )

  UNION

  /* ---------- Single VM Proxmox ---------- */
  SELECT
    sp.labid AS lab_id,
    sp.title,
    sp.user_id,
    sp.startdate AS start_date,
    sp.enddate AS end_date,
    'singlevm-proxmox' AS type
  FROM singlevmproxmox_lab sp
  WHERE
    sp.user_id = $1
    OR sp.labid IN (
      SELECT labid
      FROM singlevmproxmoxorgassignment
      WHERE orgid = $2
    )

  UNION

  /* ---------- Single VM Datacenter ---------- */
  SELECT
    sd.lab_id,
    sd.title,
    sd.user_id,
    sd.startdate AS start_date,
    sd.enddate AS end_date,
    'singlevm-datacenter' AS type
  FROM singlevmdatacenter_lab sd
  WHERE
    sd.user_id = $1
    OR sd.lab_id IN (
      SELECT labid
      FROM singlevmdatacenterorgassignment
      WHERE orgid = $2
    )

  UNION

  /* ---------- VM Cluster Datacenter ---------- */
  SELECT
    vc.labid AS lab_id,
    vc.title,
    vc.user_id,
    vc.startdate AS start_date,
    vc.enddate AS end_date,
    'vmcluster-datacenter' AS type
  FROM vmclusterdatacenter_lab vc
  WHERE
    vc.user_id = $1
    OR vc.labid IN (
      SELECT labid
      FROM vmclusterdatacenterorgassignment
      WHERE orgid = $2
    )
`,


    GET_LAB_DETAILS_BATCH: `
    SELECT 
        lab_id::uuid AS lab_id,
        title::text AS title,
        user_id,
        NULL AS start_date,
        enddate AS end_date,
        'singlevm-aws' AS type
    FROM createlab
    WHERE lab_id = $1::uuid

    UNION ALL

    SELECT 
        labid::uuid AS lab_id,
        title::text AS title,
        createdby AS user_id,
        startdate AS start_date,
        enddate AS end_date,
        'cloudslice' AS type
    FROM cloudslicelab
    WHERE labid = $1::uuid

    UNION ALL

    SELECT 
        labid::uuid AS lab_id,
        title::text AS title,
        user_id,
        startdate AS start_date,
        enddate AS end_date,
        'singlevm-proxmox' AS type
    FROM singlevmproxmox_lab
    WHERE labid = $1::uuid

    UNION ALL

    SELECT 
        lab_id::uuid AS lab_id,
        title::text AS title,
        user_id,
        startdate AS start_date,
        enddate AS end_date,
        'singlevm-datacenter' AS type
    FROM singlevmdatacenter_lab
    WHERE lab_id = $1::uuid

    UNION ALL

    SELECT
        labid::uuid AS lab_id,
        title::text AS title,
        user_id,
        startdate AS start_date,
        enddate AS end_date,
        'vmcluster-datacenter' AS type
    FROM vmclusterdatacenter_lab
    WHERE labid = $1::uuid;
    `,

    CHECK_BATCHLAB_ALREADY:`SELECT * FROM batchlabs WHERE lab_id=$1 and batch_id=$2`,
    CHECK_USERASSIGNED_SINGLEVM_DATACENTER_LAB:`SELECT * FROM singlevmdatacenteruserassignment where labid=$1 and  user_id=$2`,
    CHECK_USER_LABS_VMCLUSTERDATACENTER:`SELECT * FROM vmclusterdatacenteruserassignment where labid=$1 and  user_id=$2`,
    CHECK_USER_ASSIGNED_LAB:`SELECT * FROM cloudsliceuserassignment where labid=$1 and user_id=$2`,
    INSERT_DATACENTER_VM_USERASSIGNMENT :`INSERT INTO singlevmdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,creds_id,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    INSERT_CLOUDSLICE_USER_ASSIGNMENT:`INSERT INTO cloudsliceuserassignment(labid,user_id,assigned_by,start_date,end_date,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,

    UPDATE_BATCH_DETAILS:`UPDATE  batches set name=$1,description=$2,startdate=$3,enddate=$4 where id=$5 RETURNING *`,
    UPDATE_LAB_BATCH:`UPDATE batchlabs set lab_id=$1,lab_name=$2,start_date=$3,end_date=$4 ,remaining_days=$5,trainer_id=$6,trainer_name=$7 WHERE lab_id=$8 RETURNING *`,
    UPDATE_BATCH_USERS_TLAB:`UPDATE batch_users SET total_labs = total_labs + $1 WHERE batch_id = $2;`,
    UPDATE_BATCH_USER_TLAB:`UPDATE batch_users SET total_labs = total_labs + $1 WHERE user_id = $2;`,
    UPDATE_BATCHLAB_COUNT:`UPDATE batches SET lab_count = lab_count + $1 WHERE id=$2`,
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
            AND orgassigned = $3 
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
    DELETE_LABS_FROM_BATCH:`DELETE  FROM batchlabs WHERE batch_id=$1 RETURNING *`
    }