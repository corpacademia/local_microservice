module.exports = {
    CREATE_LAB :`
    INSERT INTO createlab 
    (user_id,type,platform,provider,os,os_version,cpu,ram,storage,instance,title,description,duration,snapshot_type,labguide,userguide,guacamole_name,guacamole_url) 
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) 
    RETURNING *
    `,
    INSERT_DATACENTER_LAB:`
    INSERT INTO singlevmdatacenter_lab
    ( user_id, title, description, type, platform,startdate,enddate, labguide, userguide ,protocol,guacamole_name,guacamole_url)
    VALUES ($1, $2, $3, $4, $5,$6, $7,$8,$9,$10,$11,$12)
    RETURNING *
    `,
    INSERT_DATACENTER_VM_CREDS:`INSERT INTO datacenter_lab_user_credentials (labid, username, password, ip, port, protocol)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    INSERT_DATACENTER_VM_ORGASSIGNMENT:`INSERT INTO singlevmdatacenterorgassignment(labid,orgid,assigned_by,startdate,enddate) VALUES ($1, $2, $3 ,$4,$5) RETURNING *`,
    INSERT_DATACENTER_VM_USERASSIGNMENT:`INSERT INTO singlevmdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,creds_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    GET_ALL_LAB:`
     SELECT * FROM createlab
    `,
    GET_LAB_ON_ID:`
    SELECT * from createlab where lab_id=$1
    `,
    GET_DATACENTER_LAB_ON_ADMIN_ID:`
    SELECT * FROM singlevmdatacenter_lab WHERE user_id=$1
    `,
    GET_DATACENTER_LAB_ON_LAB_ID:`
    SELECT * FROM singlevmdatacenter_lab WHERE lab_id=$1
    `,
    GET_USERASSIGNED_SINGLEVM_DATACENTER_LAB:`SELECT * FROM singlevmdatacenteruserassignment where  user_id=$1`,
    CHECK_USERASSIGNED_SINGLEVM_DATACENTER_LAB:`SELECT * FROM singlevmdatacenteruserassignment where labid=$1 and  user_id=$2`,
    GET_DATACENTER_LAB_CREDS:`SELECT * FROM datacenter_lab_user_credentials WHERE labid=$1`,
    GET_DATACENTER_LAB_CREDS_ONID:`SELECT * FROM datacenter_lab_user_credentials WHERE id=$1`,
    GET_DATACENTER_LAB_CREDS_TOUSER:`SELECT * FROM datacenter_lab_user_credentials WHERE labid=$1 AND assigned_to=$2`,
    UPDATE_SINGLEVM_DATACENTER:`UPDATE singlevmdatacenter_lab SET  software=$1, cataloguetype=$2,cataloguename=$4 where lab_id=$3 RETURNING *`,
    UPDATE_SINGLEVM_DATACENTER_CONTENT:`UPDATE singlevmdatacenter_lab SET title=$1,description=$2,startdate=$3,enddate=$4,labguide=$5,userguide=$6,software=$7 where lab_id=$8 RETURNING *`,
    UPDATE_SINGLEVM_DATACENTER_CREDS:`UPDATE datacenter_lab_user_credentials SET orgassigned=$1,assigned_by=$2 WHERE labid=$3 RETURNING *`,
    UPDATE_SINGLEVM_DATACENTER_CREDS_RUNNINGSTATE:`UPDATE singlevmdatacenteruserassignment SET isrunning=$1 WHERE user_id=$2 and labid=$3 RETURNING *`,
     UPDATE_SINGLEVM_DATACENTER_USER_STATUS:`UPDATE singlevmdatacenteruserassignment SET status=$1 WHERE user_id=$2 and labid=$3 RETURNING *`,
    
    UPDATE_SINGLEVM_DATACENTER_USER_LAB_TIME:`UPDATE singlevmdatacenteruserassignment SET startdate=$1,enddate=$2 WHERE user_id=$4 and labid=$3 RETURNING *`,
     UPDATE_SINGLEVM_DATACENTER_ORG_LAB_TIME:`UPDATE singlevmdatacenterorgassignment SET startdate=$1,enddate=$2 WHERE orgid=$4 and labid=$3 RETURNING *`,
    UPDATE_SINGLEVM_AWS_USER_LAB_TIME:`UPDATE labassignments SET start_date=$1,completion_date=$2 WHERE user_id=$4 and lab_id=$3 RETURNING *`,
     UPDATE_SINGLEVM_AWS_ORG_LAB_TIME:`UPDATE lab_batch SET startdate=$1,enddate=$2 WHERE org_id=$4 and lab_id=$3 RETURNING *`,
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
    UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER:`WITH to_update AS (
  SELECT id
  FROM datacenter_lab_user_credentials
  WHERE labid = $2 AND orgassigned  is NULL and assigned_to is  NUll
  LIMIT 1
)
UPDATE datacenter_lab_user_credentials AS d
SET assigned_to = $1
FROM to_update
WHERE d.id = to_update.id
RETURNING d.*;
;
    `,


    EDIT_SINGLEVM_DATACENTER_CREDS:`UPDATE datacenter_lab_user_credentials SET username=$1, password=$2, ip=$3, port=$4, protocol=$5 WHERE id=$6 AND labid=$7 RETURNING *`,
    GET_CONFIG_DETAILS: `SELECT config_details FROM lab_batch WHERE lab_id=$1 AND admin_id=$2`,
    GET_CONFIG_DETAILS_RANDOM_USER: `SELECT config_details FROM lab_batch WHERE lab_id=$1 `,
    CHECK_ALREADY_ASSIGNED: `SELECT * FROM labassignments WHERE user_id=$1 AND lab_id=$2`,
    ASSIGN_LAB: `
        INSERT INTO labassignments (lab_id, user_id, start_date, completion_date, assigned_admin_id) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`,
        GET_ASSIGNED_LABS: `SELECT * FROM labassignments WHERE user_id=$1`,
    
    GET_INSTANCES_DETAILS: (table) => `SELECT * FROM ${table} WHERE vcpu=$1 AND memory=$2`,
    GET_INSTANCE_DETAILS_FOR_PRICING: (table, instancename) => `
        SELECT * 
        FROM ${table} 
        WHERE REPLACE(${instancename}, E'\n', '') = $1 
        AND vcpu = $2 
        AND memory = $3
    `,
    UPDATE_LAB_CONFIG:`
    INSERT INTO lab_configurations (lab_id, admin_id, config_details) 
    VALUES ($1, $2, $3) 
    RETURNING *`,
    GET_AMI_INFO: `SELECT * FROM amiinformation WHERE lab_id=$1`,
    GET_INSTANCE_DETAILS: `SELECT * FROM instances WHERE lab_id=$1`,
    GET_USER_INSTANCE_DETAILS: `SELECT * FROM cloudassignedinstance WHERE lab_id=$1 AND user_id=$2`,
    UPDATE_USER_INSTANCE_STATE: `UPDATE cloudassignedinstance SET isRunning=$1 WHERE lab_id=$2 AND user_id=$3 RETURNING *`,
    UPDATE_USER_INSTANCE_STATES: `UPDATE cloudassignedinstance SET isstarted=$1 , isRunning=$2 WHERE lab_id=$3 AND user_id=$4 RETURNING *`,
    UPDATE_USER_SINGLEvM_AWS_STATUS:`UPDATE labassignments SET status=$1 WHERE lab_id=$2 AND user_id=$3 RETURNING *`,
    UPDATE_LAB_INSTANCE_STATE: `UPDATE instances SET isRunning=$1 WHERE lab_id=$2 RETURNING *`,
    UPDATE_LAB_INSTANCE_STATES: `UPDATE instances SET isstarted=$1, isRunning=$2 WHERE lab_id=$3 RETURNING *`,
    UPDATE_SINGLEVM_DATACENTER_CREDS_DISABLE:`UPDATE datacenter_lab_user_credentials set disabled=$1 where id = $2 RETURNING *`,
    CHECK_LAB_ASSIGNMENT: `SELECT * FROM lab_batch WHERE lab_id = $1 AND admin_id = $2 AND org_id = $3`,
    INSERT_LAB_BATCH: `INSERT INTO lab_batch(lab_id, admin_id, org_id, configured_by,enddate,startdate,assigned_at) 
                       VALUES($1, $2, $3, $4, $5,NOW(),NOW()) RETURNING *`,
    GET_SINGLEVM_DATACENTER_ORG:`SELECT * FROM singlevmdatacenterorgassignment where  orgid=$1`,
    GET_SINGLEVM_DATACENTER_ORG_LAB:`SELECT * FROM singlevmdatacenterorgassignment where labid=$1 and  orgid=$2`,
    GET_LAB_BATCH_BY_ADMIN: `SELECT * FROM lab_batch WHERE admin_id=$1`,
    GET_ALL_SOFTWARE_DETAILS: `SELECT * FROM createlab`,
    CHECK_LAB_BATCH_ASSESSMENT: `SELECT * FROM lab_batch WHERE admin_id=$1 AND org_id=$2`,
    GET_CONFIGURED_LABS: `
    SELECT cl.* 
    FROM createlab cl
    INNER JOIN instances ic 
    ON cl.lab_id = ic.lab_id
  `,
  GET_LAB_CATALOGUES: `
  SELECT * 
  FROM createlab l 
  INNER JOIN lab_configurations lc 
  ON l.lab_id = lc.lab_id 
  WHERE lc.config_details->>'catalogueType' = 'public'
`,

CHECK_LAB_INSTANCE_STARTED: "SELECT isstarted FROM instances WHERE instance_id = $1",
CHECK_USER_INSTANCE_STARTED: "SELECT isstarted FROM cloudassignedinstance WHERE instance_id = $1",

CREATE_CATALOGUE: `
    INSERT INTO createlab 
    (user_id, type, platform, provider, os, os_version, cpu, ram, storage, instance, title, description, duration, snapshot_type) 
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) 
    RETURNING *`,
    GET_OPERATING_SYSTEMS: 'SELECT * FROM operating_systems',
    GET_ASSIGNED_LABS_ON_LABID:"SELECT * from labassignments where lab_id=$1 and user_id=$2",
UPDATE_LAB_STATUS: `UPDATE createlab SET status=$1 WHERE lab_id=$2 RETURNING *`,
UPDATE_SINGLEVM_AWS:`UPDATE createlab SET cataloguename=$1,cataloguetype=$2,number_days=$3,number_hours_day=$4,software=$5,enddate=$6 where lab_id=$7 RETURNING *`,

GET_COUNT: `
SELECT json_object_agg(table_name, row_count) AS counts
FROM (
  SELECT 'workspace' AS table_name, COUNT(*) AS row_count FROM workspace WHERE created_by = $1

  UNION ALL

  SELECT 'cloud-vm' AS table_name, COUNT(*) AS row_count
  FROM (
    SELECT lab_id FROM createlab WHERE user_id = $1
    UNION ALL
    SELECT lab_id FROM singlevmdatacenter_lab WHERE user_id = $1
  ) AS combined

  UNION ALL
  select 'cluster' AS table_name, COUNT(*) AS row_count FROM vmclusterdatacenter_lab WHERE user_id = $1

  UNION ALL
  SELECT 'cloud-slice' AS table_name, COUNT(*) AS row_count FROM cloudslicelab WHERE createdby = $1
) AS subquery;
`,
GET_ORG_LAB_COUNT: `
SELECT json_object_agg(table_name, row_count) AS counts
FROM (
  SELECT 'workspace' AS table_name, COUNT(*) AS row_count 
  FROM workspace 
  WHERE created_by = $1

  UNION ALL

  SELECT 'cloud-vm' AS table_name, COUNT(*) AS row_count
  FROM (
    SELECT lab_id FROM labassignments WHERE user_id = $1
    UNION ALL
    SELECT labid FROM singlevmdatacenterorgassignment WHERE orgid = $2
  ) AS combined

  UNION ALL

  SELECT 'cluster' AS table_name, COUNT(*) AS row_count 
  FROM vmclusterdatacenterorgassignment 
  WHERE orgid = $2

  UNION ALL

  SELECT 'cloud-slice' AS table_name, COUNT(*) AS row_count 
  FROM cloudsliceorgassignment 
  WHERE orgid = $2
) AS subquery;
`,
GET_ALL_CLOUDSLICE_LABS_ORG:`Select * from cloudsliceorgassignment where orgid=$1`,
GET_CLOUDSLICE_LABS_LABID: `select * from cloudslicelab where labid=$1`,

GET_SINGLE_VM_DATACENTER:`SELECT * FROM singlevmdatacenter_lab where user_id=$1`,

DELETE_SINGLEVM_DATACENTER_LAB:`DELETE FROM singlevmdatacenter_lab where lab_id=$1`,
DELETE_SINGLEVM_DATACENTER_CREDS:`DELETE FROM datacenter_lab_user_credentials where labid=$1`,
DELETE_SINGLEVM_DATACENTER_CREDS_ONID:`DELETE FROM datacenter_lab_user_credentials where id=$1`,
DELETE_SINGLEVM_DATACENTER_ORGASSINGMENT:`DELETE FROM singlevmdatacenterorgassignment WHERE labid=$1`,
DELETE_SINGLEVM_DATACENTER_USERASSIGNMENT:`DELETE FROM singlevmdatacenteruserassignment WHERE labid=$1`,

DELETE_SINGLEVM_DATACENTER_FROM_USER:`DELETE FROM singlevmdatacenteruserassignment where labid=$1 and user_id=$2`,
DELETE_USER_CRED_FROM_CREDS: `UPDATE datacenter_lab_user_credentials set assigned_to=$1 where assigned_to=$2`,
DELETE_SINGLEVM_DATACENTER_ORGASSINGMENT_FROM_ORG:`DELETE FROM singlevmdatacenterorgassignment WHERE labid=$1 AND orgid=$2`,
DELETE_SINGLEVM_DATACENTER_CREDS_FROM_ORG:`UPDATE datacenter_lab_user_credentials SET assigned_to=$1,orgassigned=$2 where orgassigned=$3`,

//single vm aws status update
GET_STATUS_OF_SINGLEVM_LAB:`SELECT lab_id, status FROM createlab
      WHERE enddate < NOW() AND status != 'expired'`,
INSERT_LAB_STATUS_LOGS:`INSERT INTO lab_status_logs (labid, lab_type,type, previous_status, new_status,change_reason)
        VALUES ($1, $2, $3, $4,$5,$6)`,
GET_STATUS_OF_SINGLEVM_ORGLAB:`SELECT lab_id, status FROM lab_batch
      WHERE enddate < NOW() AND status != 'expired'`,

//single vm datacenter status update
GET_STATUS_SINGLEVM_DATACENTER_LAB:`SELECT lab_id, status FROM singlevmdatacenter_lab
      WHERE enddate < NOW() AND status != 'expired'`,
GET_STATUS_SINGLEVM_DATACENTER_ORG:`SELECT labid, status FROM singlevmdatacenterorgassignment
      WHERE enddate < NOW() AND status != 'expired'`,

//vmcluster datacenter status update
GET_STATUS_VMCLUSTER_DATACENTER_LAB:`SELECT labid, status FROM vmclusterdatacenter_lab
      WHERE enddate < NOW() AND status != 'expired'`,
GET_STATUS_VMCLUSTER_DATACENTER_ORG:`SELECT labid, status FROM vmclusterdatacenterorgassignment
      WHERE enddate < NOW() AND status != 'expired'`,
GET_STATUS_CLOUDSLICE_LAB:`SELECT labid, status FROM cloudslicelab
      WHERE enddate < NOW() AND status != 'expired'`,
GET_STATUS_CLOUDSLICE_ORG:`SELECT labid, status FROM cloudsliceorgassignment
      WHERE enddate < NOW() AND status != 'expired'`,

//lab status auto update based on enddate
UPDATE_SINGLEvM_AWS_LAB_STATUS:`UPDATE createlab set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_SINGLEvM_AWS_ORG_STATUS:`UPDATE lab_batch set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_SINGLEVM_DATACENTER_LAB_STATUS:`UPDATE singlevmdatacenter_lab set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_SINGLEVM_DATACENTER_ORG_STATUS:`UPDATE singlevmdatacenterorgassignment set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_VMCLUSTER_DATACENTER_LAB_STATUS:`UPDATE vmclusterdatacenter_lab set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_VMCLUSTER_DATACENTER_ORG_STATUS:`UPDATE vmclusterdatacenterorgassignment set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_cloudslice_LAB_STATUS:`UPDATE cloudslicelab set status = 'expired' where enddate<NOW() and status!='expired'`,
UPDATE_cloudslice_ORG_STATUS:`UPDATE cloudsliceorgassignment set status = 'expired' where enddate<NOW() and status!='expired'`,
}