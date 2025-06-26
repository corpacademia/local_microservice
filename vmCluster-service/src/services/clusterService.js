const clusterQueries = require('./clusterQueries');
const pool = require('../dbconfig/db');


const createVMClusterDatacenterLab = async (data, userId) => {
  try {
    const { details, type, platform, labGuides, userGuides, clusterConfig } = data;
    const { startDate, startTime, endDate, endTime, vms, users } = clusterConfig;
    const { title, description } = details;
    // Validation
    if (!title || !description || !type || !platform || !labGuides || !userGuides || !startDate || !endDate) {
      throw new Error("Please provide all the required fields");
    }
    // Insert lab
    const result = await pool.query(clusterQueries.INSERT_LAB_DETAILS, [
      userId,
      title,
      description,
      type,
      platform,
      labGuides,
      userGuides,
      `${startDate} ${startTime}`,
      `${endDate} ${endTime}`
    ]);

    if (!result.rows.length) {
      throw new Error("Could not create the VM cluster lab");
    }

    const labId = result.rows[0].labid;
    // Insert VMs and user VMs
    const groupNameToId = new Map();


// 1. Insert all VMs
for (const vm of vms) {
  await pool.query(clusterQueries.INSERT_VM_DETAILS, [
    labId,
    vm.id,
    vm.name,
    vm.protocol
  ]);
}

// 2. For each user group, insert group, credentials, and link to group
for (const userVms of users) {
  const groupName = userVms.groupName;

  // Insert group once
  let groupId = groupNameToId.get(groupName);
  if (!groupId) {
    const insertedGroup = await pool.query(
      clusterQueries.INSERT_USER_GROUPED,
      [groupName, labId]
    );
    groupId = insertedGroup.rows[0].id;
    groupNameToId.set(groupName, groupId);
  }

  // Loop through that group's credentials
  for (const userVm of userVms.userVMs) {
    // Ensure VM exists
    const vm = vms.find(v => v.id === userVm.vmId);
    if (!vm) continue;

    // Insert the credential
    const insertedCred = await pool.query(
      clusterQueries.INSERT_USERVM_DETAILS,
      [
        labId,
        vm.id,
        userVm.username,
        userVm.password,
        userVm.ip,
        userVm.port,
        groupName
      ]
    );

    const credId = insertedCred.rows[0].id;

    // Link to group
    await pool.query(
      clusterQueries.INSERT_GROUPED_CREDENTIAL,
      [groupId, credId,labId]
    );
  }
}



    return result.rows[0];
  } catch (error) {
    console.error(error);
    throw new Error("Error in creating VM cluster datacenter lab: " + error.message);
  }
};

//get the labs of user
const getVMClusterDatacenterlab = async (userId) => {
  try {
    if (!userId) {
      throw new Error("Please provide the user id");
    }

    const labs = [];

    const labDetails = await pool.query(clusterQueries.GET_ALL_LABS_ON_USERID, [userId]);

    if (!labDetails.rows.length) {
      return [];
    }

    for (const lab of labDetails.rows) {
      const vmDetails = await pool.query(clusterQueries.GET_VM_DETAILS_ON_LABID, [lab.labid]);
      const userVMDetails = await pool.query(clusterQueries.GET_USER_VM_CREDS, [lab.labid]);

      labs.push({
        lab,
        vms: vmDetails.rows,
        users: userVMDetails.rows
      });
    }

    return labs;
  } catch (error) {
    throw new Error(`Error in getting the labs: ${error.message}`);
  }
};


//get the lab details on labId
const getVMClusterDatacenterlabOnLabId = async (labId) => {
  try {
    if(!labId){
        throw new Error("Please provide the lab id");
    }
    const labs = [];

    const labDetails = await pool.query(clusterQueries.GET_ALL_LABS_ON_LABID, [labId]);

    if (!labDetails.rows.length) {
      throw new Error("No labs found for this lab id");
    }

    for (const lab of labDetails.rows) {
      const vmDetails = await pool.query(clusterQueries.GET_VM_DETAILS_ON_LABID, [lab.labid]);

      const userVMDetails = await pool.query(
        clusterQueries.GET_USER_VM_CREDS,
        [lab.labid]
      );

      labs.push({
        lab,
        vms: vmDetails.rows,      
        users: userVMDetails.rows  
      }); 
    }

    return labs;
  } catch (error) {
    throw new Error(`Error in getting the labs: ${error.message}`);
  }
};


//delete datacenter lab 
const deleteDatacenterLab = async (labId) => {
  try {
    if (!labId) {
      throw new Error("Please Provide the Lab Id");
    }

    await pool.query('BEGIN');

    await pool.query(clusterQueries.DELETE_USERVMS_ON_LABID, [labId]);
    await pool.query(clusterQueries.DELETE_VMS_ON_LABID, [labId]);
    await pool.query(clusterQueries.DELETE_LAB_FROM_ADMIN, [labId]);
    await pool.query(clusterQueries.DELETE_GROUPED_CREDENTIALS, [labId]);
    await pool.query(clusterQueries.DELETE_USER_GROUP_CREDS, [labId]);

    await pool.query('COMMIT');
    
    return { success: true, message: "Lab deleted successfully" };

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    throw new Error('Error in deleting the datacenter lab: ' + error.message);
  }
};


//update the vmcluster datacenter lab
const updateVMClusterDatacenterLab = async(labId , title ,description ,startDate,endDate,software,LabGuide,UserGuide,credentials,vmConfigs)=>{
    if( !labId || !title || !description || !startDate || !endDate || !credentials || !vmConfigs){
      throw new Error('Please Provide all the required fields');
    }
    const updateLab = await pool.query(clusterQueries.UPDATE_VMCLUSTER_DATACENTER_LAB,[title,description,startDate,endDate,software,UserGuide,LabGuide ,labId]);
    if(!updateLab.rows){
      throw new Error('Could not update the vm cluster datacenter lab');
    }
    const vmCredentialsId = new Set();
    for(const vmConfig of vmConfigs){
      const vm = await pool.query(clusterQueries.GET_VM_DETAILS_ON_VMID,[vmConfig.id])
      if(vm.rows.length){
        console.log('existing',vmConfig)
        const updateVM = await pool.query(clusterQueries.UPDATE_VMCLUSTER_DATACENTER_VMS,[vmConfig.name,vmConfig.protocol, labId,vmConfig.id])
        vmCredentialsId.add(updateVM.rows[0].id)
      }
      else{
        console.log('new one',vmConfig)
        const insertVM = await pool.query(clusterQueries.INSERT_VM_DETAILS,[labId,vmConfig.id,vmConfig.name,vmConfig.protocol]);
        vmCredentialsId.add(insertVM.rows[0].id)
      }
      
    }
    const userVMCredentialsId = new Set();
    for(const credential of credentials){
      const existingCred = await pool.query(clusterQueries.GET_USER_VM_CRED_ON_ID,[credential.id]);
      if(existingCred.rows.length){
        const getVm = await pool.query(clusterQueries.GET_VM_DETAILS_ON_VMNAME,[labId,credential.vmName]);
        const vmId = getVm.rows[0].vmid
        const updateCred = await pool.query(clusterQueries.UPDATE_VMCLUSTER_DATACENTER_USERVMS,[credential.username,credential.password,credential.ip,credential.port,credential.groupName,labId,vmId,credential.id]);
        userVMCredentialsId.add(credential.id)
      }
      else{
        const getVm = await pool.query(clusterQueries.GET_VM_DETAILS_ON_VMNAME,[labId,credential.vmName]);
        const vmId = getVm.rows[0].vmid
        const insertUserVm  = await pool.query(clusterQueries.INSERT_USERVM_DETAILS,[labId,vmId,credential.username,credential.password,credential.ip,credential.port,credential.groupName]);
        userVMCredentialsId.add(insertUserVm.rows[0].id)

      }
         }

    //delete vms
    const existingVMS = await pool.query(clusterQueries. GET_VM_DETAILS_ON_LABID,[labId]);
    for(const vm of existingVMS.rows){
      if(!vmCredentialsId.has(vm.id)){
        const deleteVM = await pool.query(clusterQueries.DELETE_VMS_ON_LABID_ID,[labId,vm.id])
      }
    }

    //delete user vms
    const existingUserVms = await pool.query(clusterQueries.GET_USER_VM_CREDS,[labId]);
    for (const user of existingUserVms.rows){
      if(!userVMCredentialsId.has(user.id)){
        const deleteUserVm = await pool.query(clusterQueries.DELETE_USERVMS_ON_LABID_ID,[user.id,labId])
      }
    }
    return updateLab.rows[0]

}

//update the disable/enable of user vm
const updateUserVM =  async(data)=>{
  try {
    const {id,disable} = data;
    if(!id ){
      throw new Error("Please Provide the required fields");
    }
    const result = await pool.query(clusterQueries.UPDATE_VMCLUSTER_DATACENTER_USERVMS_DISABLE,[disable,id]);
    return result.rows[0];
  } catch (error) {
    console.log("Error in updating datacenter vmcluster lab",error);
    throw new Error("Error in updating the vmcluster datacenter lab:",error.message)
  }
}

//update the uservm with protcol
const updateUserVMWithProtocol = async(data)=>{
  try {
    const {id,username,password,ip,port}= data;
    if(!username || !password || !ip ||!port ||!id){
      throw new Error('Please Provide the required fields');
    }
    const result = await pool.query(clusterQueries.UPDATE_VMCLUSTER_DATACENTER_USERVMS_UPDATE,[username,password,ip,port,id]);
    if(!result.rows.length){
      throw new Error("Could not update the uservm")
    }
    return result.rows[0];
  } catch (error) {
    console.log("Error in updating the uservm details",error);
    throw new Error("Error in updating the uservm details",error.message);
  }
}

//assign the vmclusterdatacenterlab to organization
const vmclusterDatacenterLabOrgAssignment = async (data) => {
  const client = await pool.connect(); // Get a dedicated client
  try {
    let { labId, orgId, assignedBy, software, catalogueType, catalogueName } = data;
    software = software.length > 0 ? software : null;

    if (!labId || !orgId || !assignedBy || !software || !catalogueType || !catalogueName) {
      throw new Error("Please provide all required fields");
    }

    await client.query('BEGIN'); // Start transaction

    const updateLab = await client.query(
      clusterQueries.UPDATE_VMCLUSTER_DATACENTER_LAB,
      [software, catalogueType, labId]
    );
    if (!updateLab.rows.length) {
      throw new Error('Could not update the software and catalogue type for vmclusterdatacenter lab');
    }

    const orgAssignment = await client.query(
      clusterQueries.INSERT_VMCLUSTER_DATACENTER_ORG_ASSIGNMENT,
      [labId, orgId, catalogueName, assignedBy]
    );
    if (!orgAssignment.rows.length) {
      throw new Error('Could not assign the vmclusterdatacenter lab to organization');
    }

    const updateUserVMCreds = await client.query(
      clusterQueries.UPDATE_VMCLUSTER_DATACENTER_USERVMS_ORG_ASSIGNMENT,
      [orgId, labId] // <-- update this if NULL is involved, as discussed earlier
    );
    if (!updateUserVMCreds.rows.length) {
      throw new Error('Could not assign the uservm creds to organization');
    }
    const updateUserGroupCreds = await client.query(
      clusterQueries.UPDATE_USER_GROUP_CREDS,
      [orgId, labId]
    );
    if (!updateUserGroupCreds.rows.length) {
      throw new Error('Could not update the user group creds for organization');
    }

    await client.query('COMMIT'); // All good, commit changes

    return {
      ...updateLab.rows[0],
      ...orgAssignment.rows[0],
      ...updateUserVMCreds.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK'); // Revert all changes if any query fails
    console.error("Error in assigning lab to organization:", error.message);
    throw new Error("Error in assigning lab to organization: " + error.message);
  } finally {
    client.release(); // Always release the client back to the pool
  }
};

//get the orgassigned labs
const getAllTheOrganizationLabs = async (orgId)=>{
  try {
    if(!orgId){
      throw new Error("Please provide the required fieds");
    }
    const orgLabs = await pool.query(clusterQueries.GET_VMCLUSTER_ORGASSIGNMENT,[orgId]);

    if(!orgLabs.rows.length){
      throw new Error('No labs found for organiztion');
    }
    let labRows = [];
    for(const org of orgLabs.rows){
      const labDetails = await pool.query(clusterQueries.GET_ALL_LABS_ON_LABID,[org.labid]);
      labRows.push(labDetails.rows[0]);
    }
    let labs = [];
    for(const lab of labRows){
          const vmDetails = await pool.query(clusterQueries.GET_VM_DETAILS_ON_LABID,[lab.labid]);

          const userVm =  await pool.query(clusterQueries.GET_ALL_USERVM_CREDS_FOR_ID,[lab.labid,orgId]);
          labs.push({
            lab:lab,
            vms:vmDetails.rows,
            users:userVm.rows
          })
    }
    return labs;
  } catch (error) {
    console.log('Error in getting the organization labs:'+error.message);
    throw new Error('Error in getting the organization labs:'+error)
  }
}

//ASSIGN LABS TO USERS
const assignLabToUser = async (labId, userIds, assignedBy, startDate, endDate,orgId) => {
  try {
    if (!labId || !userIds || !assignedBy || !startDate || !endDate) {
      throw new Error("Please provide all required fields");
    }

    const client = await pool.connect();
    await client.query('BEGIN');

    // Insert user assignments
    for (const userId of userIds) {
       const groupCredsIdToUser = await client.query(
        clusterQueries.UPDATE_USER_GROUP_CREDS_TO_USER,
        [userId, labId, orgId]
      );
      console.log("Group Creds ID to User:", groupCredsIdToUser.rows);
      if(!groupCredsIdToUser.rows.length) {
        throw new Error(`Could not assign user group creds for user ${userId}`);
      }
      const result = await client.query(clusterQueries.INSERT_INTO_USERASSIGNMENT, [
        labId,
        userId,
        assignedBy,
        startDate,
        endDate,
        groupCredsIdToUser.rows[0].id,
      ]);
      if (!result.rows.length) {
        throw new Error(`Could not assign lab ${labId} to user ${userId}`);
      }
     
    }

    await client.query('COMMIT');
    client.release();
    
    return true;
  } catch (error) {
    console.error("Error in assigning lab to users:", error);
    throw new Error("Error in assigning lab to users: " + error.message);
    
  }
};

//get user assigned datacenter labs
const getUserAssignedDatacenterLabs = async (userId) => {
  try {
    if (!userId) {
      throw new Error("Please provide the user id");
    }
    const userLabs = await pool.query(clusterQueries.GET_USER_LABS_VMCLUSTERDATACENTER, [userId]);
    if (!userLabs.rows.length) {
      throw new Error("No labs found for this user");
    }
    return userLabs.rows;
  } catch (error) {
    console.error("Error in getting user assigned datacenter labs:", error);
    throw new Error("Error in getting user assigned datacenter labs: " + error.message);
  }
};

//get the user credentials for user
const gerUserCredentialsForUser = async(labId,userId)=>{
  try {
      if(!labId || !userId){
        throw new Error("Please provide the user id and organization id");
      }
      const getGroupId = await pool.query(clusterQueries.GET_GROUP_CREDS_ID_DATACENTER,[labId,userId]);
      if(!getGroupId.rows.length){
        throw new Error("No group credentials found for this user");
      }
      const groupId = getGroupId.rows[0].id;
      const userCredentials = await pool.query(clusterQueries.GET_GROUP_CREDENTIALS_ON_GROUPID,[groupId]);
      if(!userCredentials.rows.length){
        throw new Error("No user credentials found for this user");
      }
      const credentialsDetails = [];
      for(const cred of userCredentials.rows){
        const credDetails = await pool.query(clusterQueries.GET_CREDENTIALS_DETAILS_ON_CREDID,[cred.cred_id]);
        if(credDetails.rows.length){
          credentialsDetails.push(credDetails.rows[0]);
        }
      }
      if(!credentialsDetails.length){
        throw new Error("No credentials details found for this user");
      }
      return credentialsDetails;


  } catch (error) {
    console.error("Error in getting user credentials for user:", error);
    throw new Error("Error in getting user credentials for user: " + error.message);
    
  }
}

//delete the datacenter lab from organization
const deleteDatacenterLabFromOrg = async (labId, orgId , adminId) => {
  try {
      if(!labId || !orgId || !adminId) {
        throw new Error("Please provide the lab id, organization id and admin id");
      }
      await pool.query('BEGIN');
      // Delete user credential groups
      await pool.query(clusterQueries.DELETE_USER_CREDENTIAL_GROUPS, [labId, orgId]);
      // Delete user VMs
      await pool.query(clusterQueries.DELETE_DATACENTER_USERVMS, [labId, orgId]);
      // Delete user assignments
      await pool.query(clusterQueries.DELETE_DATACENTER_USER, [labId,adminId]);
      // Delete organization assignment
      await pool.query(clusterQueries.DELETE_DATACENTER_ORG_ASSIGNMENT, [labId, orgId]);
      
      await pool.query('COMMIT');
      return true;
      
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error in deleting datacenter lab from organization:", error);
    throw new Error("Error in deleting datacenter lab from organization: " + error.message);
    
  }
}

//DELETE USER ASSIGNED DATACENTER LAB
const deleteDatacenterLabOfUser = async (labId,orgId, userId) => {
    try {
        if (!labId || !orgId || !userId) {
            throw new Error("Please provide the lab id, organization id and user id");
        }
        await pool.query('BEGIN');
        // Delete user credentials
        await pool.query(clusterQueries.DELETE_USER_CREDS, [labId, userId, orgId]);
        // Delete user assignment
        await pool.query(clusterQueries.DELETE_USER_DATACENTER_LAB, [labId, userId]);
        
        await pool.query('COMMIT');
        return true;
    } catch (error) {
        console.error("Error in deleting datacenter lab of user:", error);
        throw new Error("Error in deleting datacenter lab of user: " + error.message);
      
    }
}

module.exports = {
    createVMClusterDatacenterLab,
    getVMClusterDatacenterlab,
    deleteDatacenterLab,
    updateVMClusterDatacenterLab,
    updateUserVM,
    updateUserVMWithProtocol,
    vmclusterDatacenterLabOrgAssignment,
    getAllTheOrganizationLabs,
    assignLabToUser,
    getUserAssignedDatacenterLabs,
    getVMClusterDatacenterlabOnLabId,
    gerUserCredentialsForUser,
    gerUserCredentialsForUser,
    deleteDatacenterLabFromOrg,
    deleteDatacenterLabOfUser
};