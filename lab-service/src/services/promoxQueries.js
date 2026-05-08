module.exports = {
    INSERT_LAB_DETAILS :  `INSERT INTO singlevmproxmox_lab (labid,user_id,title,description,type,platform,labguide,userguide,guacamole_name,guacamole_url,learning_objectives,prerequisites,target_audience,key_technologies,additional_details,vmdetails_id,startdate,enddate,username,password) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    INSERT_VM_DETAILS : `INSERT INTO proxmox_vm_details (node,vmname,description,storagetype,storage,cpu,ram,networkbridge,nicmodel,firewall,boot,template_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    INSERT_TEMPLATE_INFORMATION: `INSERT INTO templateinformation (labid,templateid) values($1,$2) RETURNING *`,
    INSERT_ORG_ASSIGNMENT:`INSERT INTO singlevmproxmoxorgassignment (labid,orgid,startdate,enddate,assigned_by,user_id,vmname) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    INSERT_SINGLEVM_USER_ASSIGNMENT:`INSERT INTO singlevmproxmoxuserassignment (labid,user_id,assigned_by,startdate,enddate,vmname,assignment_type,batch_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    INSERT_USER_CREDITS:`INSERT INTO user_credits(user_id,labid,total_minutes,remaining_minutes) VALUES($1,$2,$3,$4) `,
    INSERT_LAB_SESSION:`INSERT INTO user_sessions(labid,user_id,starttime,isactive,type,instance_id,node) VALUES($1,$2,NOW(),$3,$4,$5,$6)`,
    UPDATE_LAB_END_SESSION:`UPDATE user_sessions set isactive=$1, endtime=NOW() WHERE labid=$2 AND user_id=$3`,

    CHECK_ALREADY_ASSIGNED:`SELECT * FROM singlevmproxmoxuserassignment where user_id=$1 and labid=$2`,

    GET_USERCREDITS_DATA:`SELECT * FROM user_credits WHERE user_id=$1 AND labid=$2`,
    GET_USER_DETAILS:`SELECT id, name 
        FROM users 
        WHERE id = $1

        UNION

        SELECT id, name 
        FROM organization_users 
        WHERE id = $1;`,
    GET_LABS_FOR_SUPERADMIN:`SELECT * FROM singlevmproxmox_lab`,
    GET_LAB_DETAILS: `SELECT * FROM singlevmproxmox_lab WHERE user_id=$1`,
    GET_LABADMINS_LAB:`SELECT * FROM singlevmproxmox_lab WHERE user_id=ANY($1)`,
    GET_LAB_LABID:`SELECT * FROM singlevmproxmox_lab WHERE labid=$1`,
    GET_LAB_CONFIGURATIONS : `SELECT * FROM PROXMOX_VM_DETAILS WHERE vmdetails_id=$1`,
    GET_LAB_STATUS:`SELECT * FROM proxmox_vm_details where labid=$1 and vmid=$2`,
    GET_LAB_ORG_STATUS:`SELECT * FROM singlevmproxmoxorgassignment where labid=$1 and vmid=$2`,
    GET_LAB_USER_STATUS:`SELECT * FROM singlevmproxmoxuserassignment where labid=$1 and vmid=$2`,
    GET_LAB_USER_PURCHASED_STATUS:`SELECT * FROM singlevmproxmox_purchased_labs where labid=$1 and vmid=$2`,
    GET_TEMPLATE_INFORMATION:`SELECT * FROM templateinformation where labid=$1`,
    GET_SINGLEVM_LAB_USERID:`SELECT * FROM singlevmproxmox_lab where user_id=$1`,
    GET_SINGLEVM_ORG_LABS:`SELECT * FROM singlevmproxmoxorgassignment where orgid=$1 `,
    GET_SINGLEVM_USER_LABS:`SELECT * FROM  singlevmproxmoxuserassignment where user_id=$1`,
    GET_SINGLEVM_USER_PURCHASED_LABS:`SELECT * FROM singlevmproxmox_purchased_labs where user_id=$1`,

    UPDATE_LAUNCH:`UPDATE PROXMOX_VM_DETAILS SET islaunched=$1,vmid=$4 where node=$2 and labid=$3 RETURNING *`,
    UPDATE_LAUNCH_LOADING:`UPDATE PROXMOX_VM_DETAILS SET isloading=$1 ,isrunning = $3 where vmdetails_id=$2 RETURNING *`,
   
    UPDATE_USERLAB_COMPLETE_STATUS:`UPDATE singlevmproxmoxuserassignment SET status=$1 WHERE labid=$2 AND user_id=$3 RETURNING *`,
    UPDATE_USERLAB_PURCHASED_COMPLETE_STATUS:`UPDATE singlevmproxmox_purchased_labs SET status=$1 WHERE labid=$2 AND user_id=$3 RETURNING *`,
    UPDATE_LAUNCH_ORG_LOADING:`UPDATE singlevmproxmoxorgassignment SET isprocessing=$1,isrunning=$4 where labid=$2 and user_id=$3`,
    UPDATE_LAUNCH_ORG:`UPDATE singlevmproxmoxorgassignment SET islaunched=$1,vmid=$3 where  labid=$2 and user_id=$4 RETURNING *`,
    UPDATE_LAUNCH_USER:`UPDATE singlevmproxmoxuserassignment SET islaunched=$1 , vmid=$3,node=$5 where  labid=$2 and user_id=$4 RETURNING *`,
    UPDATE_LAUNCH_USER_LOADING:`UPDATE singlevmproxmoxuserassignment SET isprocessing=$1  where  user_id=$3 and labid=$2 RETURNING *`,
    UPDATE_LAUNCH_USER_PURCHASED:`UPDATE singlevmproxmox_purchased_labs SET islaunched=$1,startdate=NOW(),enddate= NOW() + ($4 || ' days')::INTERVAL,vmid=$3 where  labid=$2 RETURNING *`,
   
    UPDATE_LAUNCH_USER_PURCHASED_LOADING:`UPDATE singlevmproxmox_purchased_labs SET isloading=$1 where user_id=$3  AND labid=$2 RETURNING *`,
    UPDATE_LAUNCH_USER_PURCHASED_RUNNING:`UPDATE singlevmproxmox_purchased_labs SET isrunning=$1 where user_id=$3 AND  labid=$2 RETURNING *`,
    UPDATE_LAUNCH_USER_RUNNING:`UPDATE singlevmproxmoxuserassignment SET isrunning=$1 where user_id=$3 AND  labid=$2 RETURNING *`,
    UPDATE_LAUNCH_USER_RUNNINGSTATUS:`UPDATE singlevmproxmoxuserassignment SET isrunning=$1 , status=$4 where user_id=$3 AND  labid=$2 RETURNING *`,
   

    UPDATE_LAB_DETAILS:`UPDATE singlevmproxmox_lab set title=$1,description=$2,startdate=$3,enddate=$4 where labid=$5`,
    UPDATE_LAB_CONFIG:`UPDATE proxmox_vm_details set storageType=$1,storage=$2,isoimage=$3,cpu=$4,ram=$5,networkbridge=$6,nicmodel=$7,firewall=$8,boot=$9 where labid=$10`,
    UPDATE_TEMPLATE_CREATION_PROCESS_STATUS:`UPDATE templateinformation set processing=$1 RETURNING *`,
    UPDATE_ORG_LAB_TIME:`UPDATE singlevmproxmoxorgassignment set startdate=$1,enddate=$2 where labid=$3 and orgid=$4  RETURNING *`,
    UPDATE_USER_LAB_TIME:`UPDATE singlevmproxmoxuserassignment set startdate=$1,enddate=$2 where labid=$3 and user_id=$4 RETURNING *`,
    UPDATE_USER_PURCHASED_LAB_TIME:`UPDATE singlevmproxmoxuserassignment set startdate=$1,enddate=$2 where labid=$3 and user_id=$4 RETURNING *`,
    CREATE_SINGLEVM_CATALOGUE:`UPDATE singlevmproxmox_lab set cataloguename=$1,software=$2,cataloguetype=$3,level=$4,category=$5,price=$6,number_hours_day=$8 where labid=$7 RETURNING *`,

    DELETE_PROXMOX_LAB_CONFIG:`DELETE FROM proxmox_vm_details WHERE labid=$1`,
    DELETE_PROXMOX_LAB:`DELETE FROM singlevmproxmox_lab WHERE labid=$1`,
    DELETE_SINGLEVM_ORG_LAB: `DELETE FROM singlevmproxmoxorgassignment where labid=$1 and orgid=$2 and user_id=$3 RETURNING *`,
    DELETE_SINGLEVM_ORG_LAB_vmid: `DELETE FROM singlevmproxmoxorgassignment where labid=$1 RETURNING *`,
    DELETE_USER_SINGLEVM_VMID:`DELETE FROM singlevmproxmoxuserassignment where labid=$1 `,
    DELETE_SINGLEVM_USER_LAB:`DELETE FROM singlevmproxmoxuserassignment where labid=$1 and  user_id=$2 RETURNING *`,
    DELETE_SINGLEVM_USER_PURCHASED_LAB:`DELETE FROM singlevmproxmox_purchased_labs where labid=$1 and  user_id=$2 RETURNING *`,
    DELETE_SINGLEVM_USER_LAB_ORG:`DELETE FROM singlevmproxmoxuserassignment where labid=$1 and assigned_by=$2 RETURNING *`,
}
