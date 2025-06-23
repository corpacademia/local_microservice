module.exports = {
    INSERT_LAB_DETAILS:`INSERT INTO vmclusterdatacenter_lab(user_id,title,description,type,platform,labguide,userguide,startdate,enddate) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    INSERT_VM_DETAILS:`INSERT INTO vmclusterdatacenter_vms(lab_id,vmid,vmname,protocol,created_at) VALUES($1,$2,$3,$4,NOW()) RETURNING *`,
    INSERT_USERVM_DETAILS:`INSERT INTO vmclusterdatacenter_uservms(labid,vmid,username,password,ip,port,usergroup) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    
    INSERT_INTO_USERASSIGNMENT:`INSERT INTO vmclusterdatacenteruserassignment(labid,user_id,assigned_by,startdate,enddate,group_creds_id,assigned_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,

    INSERT_USER_GROUPED:`INSERT INTO user_credential_groups (groupname,labid,created_at) VALUES($1,$2,NOW()) RETURNING id`,
    INSERT_GROUPED_CREDENTIAL:`INSERT INTO grouped_credentials (group_id, cred_id,labid) VALUES ($1, $2,$3) RETURNING *`,

    GET_ALL_LABS_ON_USERID:`SELECT * FROM vmclusterdatacenter_lab where user_id=$1`,
    GET_VM_DETAILS_ON_LABID:`SELECT * FROM vmclusterdatacenter_vms where lab_id=$1`,
    GET_VM_DETAILS_ON_VMID:`SELECT * FROM vmclusterdatacenter_vms where vmid=$1`,
    GET_VM_DETAILS_ON_VMNAME:`SELECT * FROM vmclusterdatacenter_vms where lab_id=$1 and vmname=$2`,
    GET_USER_VM_CREDS:`SELECT * FROM vmclusterdatacenter_uservms where labid=$1`,
    GET_USER_VM_CRED_ON_ID:`SELECT * FROM vmclusterdatacenter_uservms where id=$1`,
    GET_USER_LABS_VMCLUSTERDATACENTER:`SELECT * FROM vmclusterdatacenteruserassignment where user_id=$1`,
    GET_ALL_LABS_ON_LABID:`SELECT * FROM vmclusterdatacenter_lab where labId=$1`,
    GET_GROUP_CREDS_ID_DATACENTER:`SELECT * FROM user_credential_groups where labid=$1 and userassigned =$2 `,
    GET_GROUP_CREDENTIALS_ON_GROUPID:`SELECT * FROM grouped_credentials where group_id=$1`,
    GET_CREDENTIALS_DETAILS_ON_CREDID:`SELECT * FROM vmclusterdatacenter_uservms where id=$1`,

    //for organization
    GET_VMCLUSTER_ORGASSIGNMENT:`SELECT * FROM vmclusterdatacenterorgassignment where orgid=$1`,
    GET_ALL_LABS_ON_LABID:`SELECT * FROM vmclusterdatacenter_lab where labid=$1`,
    GET_ALL_USERVM_CREDS_FOR_ID:`SELECT * FROM vmclusterdatacenter_uservms where labid=$1 and orgassigned=$2`,

    DELETE_LAB_FROM_ADMIN:'DELETE FROM vmclusterdatacenter_lab where labid=$1',
    DELETE_VMS_ON_LABID:`DELETE FROM vmclusterdatacenter_vms where lab_id=$1`,
    DELETE_VMS_ON_LABID_ID:`DELETE FROM vmclusterdatacenter_vms where lab_id=$1 AND id=$2`,
    DELETE_USERVMS_ON_LABID:`DELETE FROM vmclusterdatacenter_uservms where labid=$1`,
    DELETE_USERVMS_ON_LABID_ID:`DELETE FROM vmclusterdatacenter_uservms where id=$1 and labid=$2`,
    DELETE_USER_GROUP_CREDS:`DELETE FROM user_credential_groups where labid=$1`,
    DELETE_GROUPED_CREDENTIALS:`DELETE FROM grouped_credentials where labid=$1`,

    //From organization delete
    DELETE_USER_CREDENTIAL_GROUPS:`UPDATE  user_credential_groups SET orgassigned = NULL , USERASSIGNED = NULL WHERE labid=$1 and orgassigned = $2`,
    DELETE_DATACENTER_USERVMS:`UPDATE vmclusterdatacenter_uservms SET orgassigned = NULL WHERE labid=$1 and orgassigned = $2`,
    DELETE_DATACENTER_USER:`DELETE FROM vmclusterdatacenteruserassignment WHERE labid=$1 and assigned_by=$2`,
    DELETE_DATACENTER_ORG_ASSIGNMENT:`DELETE FROM vmclusterdatacenterorgassignment WHERE labid=$1 AND orgid=$2`,

    //DELETE USER ASSIGNED LAB
    DELETE_USER_CREDS:`UPDATE user_credential_groups SET userassigned = NULL WHERE labid=$1 and orgassigned=$3 and userassigned = $2`,
    DELETE_USER_DATACENTER_LAB:`DELETE FROM vmclusterdatacenteruserassignment WHERE labid=$1 and user_id=$2`,

     UPDATE_USER_GROUP_CREDS_TO_USER:`WITH limited AS (
        SELECT id 
        FROM user_credential_groups 
        WHERE userassigned IS NULL 
            AND orgassigned = $3 
            AND labid = $2 
        LIMIT 1
        )
        UPDATE user_credential_groups 
        SET userassigned = $1
        WHERE id IN (SELECT id FROM limited)
        RETURNING *;
        `,
    UPDATE_USER_GROUP_CREDS:`UPDATE user_credential_groups set orgassigned=$1 where orgassigned IS NULL and labid=$2 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_LAB:`UPDATE vmclusterdatacenter_lab set title=$1,description=$2,startdate=$3,enddate=$4,software=$5,userguide=$6,labguide=$7 where labid=$8 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_VMS:`UPDATE vmclusterdatacenter_vms set vmname=$1,protocol=$2 where lab_id=$3 and vmid=$4 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_USERVMS:`UPDATE vmclusterdatacenter_uservms set username=$1,password=$2,ip=$3,port=$4,usergroup=$5 where labid=$6 and vmid=$7 and id=$8 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_USERVMS_UPDATE:`UPDATE vmclusterdatacenter_uservms set username=$1,password=$2,ip=$3,port=$4 where id=$5 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_LAB:`UPDATE vmclusterdatacenter_lab set software=$1,cataloguetype=$2 where labid=$3 RETURNING *`,
    INSERT_VMCLUSTER_DATACENTER_ORG_ASSIGNMENT:`INSERT INTO vmclusterdatacenterorgassignment (labid,orgid,cataloguename,assignedby,assigned_at) VALUES($1,$2,$3,$4,NOW()) RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_USERVMS_ORG_ASSIGNMENT:`UPDATE vmclusterdatacenter_uservms set orgassigned=$1 where orgassigned IS NULL and labid=$2 RETURNING *`,

    UPDATE_VMCLUSTER_DATACENTER_VMS_PROTOCOL:`UPDATE vmclusterdatacenter_vms set protocol=$1 where vmid=$2 RETURNING *`,
    UPDATE_VMCLUSTER_DATACENTER_USERVMS_DISABLE:`UPDATE vmclusterdatacenter_uservms set disabled=$1 where id=$2 RETURNING *`,
    DELETE_VMS_ON_LABID_ID:`DELETE FROM vmclusterdatacenter_vms where lab_id=$1 AND id=$2`,
    // DELETE_USERVMS_ON_LABID_ID:`DELETE FROM vmclusterdatacenter_uservms where labid=$1 id=$2`,

}