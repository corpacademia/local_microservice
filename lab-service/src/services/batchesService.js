const batchQueries = require('./batchesQueries');
const proxmoxQueries = require('./promoxQueries');
const labQueries = require('./labQueries');
const cookie = require('cookie');
const pool = require('../db/dbConfig');
const axios = require('axios');

const getUserData = async(userId,sessionToken)=>{
    console.log('userId:',userId);
  try {
    if(!userId){
      throw new Error("Please Provide the user id")
    }
    const getUserData = await axios.post(`${process.env.BACKEND_URL}/api/v1/user_ms/getuserdata/${userId}`,{},{
       headers: {
        Cookie: `session_token=${sessionToken}`
      }
    }
    );
    if(!getUserData.data.response){
      throw new Error("No user is found with this user id");
    }
    return getUserData.data.response.user;
  } catch (error) {
    throw error
  }
}

const assignCloudsliceLab = async(lab, user, assign_admin_id, start_date, end_date,sessionToken)=>{
    const existsLab =  await pool.query(batchQueries.CHECK_USER_ASSIGNED_LAB,[lab,user]);
            const userData = await getUserData(user,sessionToken)
            if(existsLab.rows.length){
                return res.status(404).send({
                    success:false,
                    message:`Already lab assigned to ${userData.name}`
                })
            }
            const result = await pool.query(
              batchQueries.INSERT_CLOUDSLICE_USER_ASSIGNMENT,
              [lab, user, assign_admin_id, start_date, end_date]
            );
      
            if (!result.rows.length) {
                return res.status(404).send({
                    success:false,
                    message:`Could not assign lab to ${userData.name}`
                })
            }
}

const createBatch = async(req,res)=>{
    try {
        const {batchName,description,createdBy,startDate,endDate} = req.body;
        console.log(req.body)
        if(!batchName || !createdBy || !startDate || !endDate){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        const createBatch = await pool.query(batchQueries.CREATE_BATCH,[batchName,description,createdBy,startDate,endDate]);
        if(!createBatch.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not create batch"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created batch",
            data:createBatch.rows[0]
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//get batches
const getBatches = async(req,res)=>{
    try {
        const {userId} = req.params;
        if(!userId){
            return res.status(400).send({
                success:false,
                message:"Please provide required fields"
            })
        }
        const getBatches = await pool.query(batchQueries.GET_BATCHES,[userId]);
        if(!getBatches.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not fetch the batches"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed batches",
            data:getBatches.rows
        })
    } catch (error) {
       console.log(error);
       return res.status(500).send({
        success:false,
        message:"Internal server error",
        error:error.message
       })
    }
}

//get batch
const getBatch = async(req,res)=>{
    try {
        const {batchId} = req.params;
        if(!batchId){
            return res.status(400).send({
                success:false,
                message:"Please provide required fields"
            })
        }
        const getBatch = await pool.query(batchQueries.GET_BATCH,[batchId]);
        if(!getBatch.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not fetch the batches"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed batches",
            data:getBatch.rows[0]
        })
    } catch (error) {
       console.log(error);
       return res.status(500).send({
        success:false,
        message:"Internal server error",
        error:error.message
       })
    }
}
//add users to batch
const addUsersToBatch = async(req,res)=>{
    try {
        const {batchId,userIds,assignedBy} = req.body;
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        if(!batchId || !userIds ||!assignedBy){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        await pool.query('BEGIN');

        const getLabsOfBatch = await pool.query(batchQueries.GET_BATCH_LABS,[batchId]);
        let labIds = getLabsOfBatch.rows.map(lab=>lab.lab_id);
        
        for (const userId of userIds){
            const userDetails = await getUserData(userId,sessionToken)
            const addUser = await pool.query(batchQueries.CREATE_BATCH_USER,[batchId,userId]);
            if(!addUser.rows.length){
                return res.status(404).send({
                    success:false,
                    message:'Could not add user to batch'
                })
            }
            //ADD IF THERE ARE EXISTING LABS FOR BATCH
            for(const labId of labIds){
                const getLab = await pool.query(batchQueries.GET_LAB_DETAILS_BATCH,[labId]);
                if(!getLab.rows.length){
                    return res.status(404).send({
                        success:false,
                        message:"No lab found. Please check lab is created"
                    })
                }
                let labDetails = getLab.rows[0];
                if(labDetails.type === 'singlevm-proxmox'){
                     const checkAlreadyAssigned = await pool.query(proxmoxQueries.CHECK_ALREADY_ASSIGNED, [userId, labId]);
             
             if (checkAlreadyAssigned.rows.length > 0) {
                return res.status(404).send({
                    success:false,
                    message:`Lab already assigned to ${userDetails.name}`
                })
             }
            const vmName = `vm-${userDetails.name.replace(' ','-')}`
             // Insert lab assignment into the database
             const result = await pool.query(proxmoxQueries.INSERT_SINGLEVM_USER_ASSIGNMENT, [
                 labId,
                 userId,
                 assignedBy,
                 labDetails.start_date,
                 labDetails.end_date,
                 vmName
                 
             ]);
                }
                else if(labDetails.type === 'singlevm-aws'){
                     const checkAlreadyAssigned = await pool.query(labQueries.CHECK_ALREADY_ASSIGNED, [userId, labId]);
                       if (checkAlreadyAssigned.rows.length > 0) {
                           throw new Error(`Lab already assigned to ${userData.name}`)
                       }
                       // Insert lab assignment into the database
                       const result = await pool.query(labQueries.ASSIGN_LAB, [
                           
                           labId,
                           userId,
                           labDetails.start_date,
                           labDetails.end_date,
                           assignedBy,
                       ]);
                }
                else if(labDetails.type === 'cloudslice'){
                    await assignCloudsliceLab (labId, userId, assignedBy,labDetails.start_date,labDetails.end_date,sessionToken)
                }
                else if (labDetails.type === 'singlevm-datacenter') {
        const checkAlreadyAssigned = await pool.query(batchQueries.CHECK_USERASSIGNED_SINGLEVM_DATACENTER_LAB, [labId,userId]);
        const userData = await getUserData(userId, sessionToken);
        if (checkAlreadyAssigned.rows.length) {
          return res.status(404).send({
                success:false,
                message:`Lab already assigned to ${userData.name}`
            })
        }

        const creds = await pool.query(batchQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER, [userId, labId]);
        if (!creds.rows.length){
            return res.status(404).send({
                success:false,
                message:`No credential available to assign`
            })
        }

        const assign = await pool.query(batchQueries.INSERT_DATACENTER_VM_USERASSIGNMENT, [
          labId,
          userId,
          assignedBy,
          labDetails.start_date,
          labDetails.end_date,
          creds.rows[0].id
        ]);
        if (!assign.rows.length){
            return res.status(404).send({
                success:false,
                message:`Failed to assign datacenter lab to ${userData.name}`
            })
        }
                }
                else if (labDetails.type === 'vmcluster-datacenter') {
        const userdata = await getUserData(userId,sessionToken);
              const checkAlreadyAssigned = await pool.query(batchQueries.CHECK_USER_LABS_VMCLUSTERDATACENTER,[labId,userId]);
              if(checkAlreadyAssigned.rows.length){
                return res.status(404).send({
                    success:false,
                    message:`Lab Already assigned to ${userdata.name}`
                })
              }
              let groupCredsIdToUser;
                groupCredsIdToUser = await pool.query(
                  batchQueries.UPDATE_USER_GROUP_CREDS_TO_RANDOM_USER,
                  [userId, labId]
                );
              // console.log(groupCredsIdToUser)
              if (!groupCredsIdToUser.rows.length) {
                return res.status(404).send({
                    success:false,
                    message:`Could not assign user group creds for user ${userdata.name}`
                })
              }
        
              const result = await pool.query(batchQueries.INSERT_INTO_USERASSIGNMENT, [
                labId,
                userId,
                assignedBy,
                labDetails.start_date,
                labDetails.end_date,
                groupCredsIdToUser.rows[0].id,
              ]);
        
              if (!result.rows.length) {
                return res.status(404).send({
                    success:false,
                    message:`Could not assign lab ${labId} to user ${userdata.name}`
                })
              }
      }

                await pool.query(batchQueries.UPDATE_BATCH_USER_TLAB,[1,userId]);

            }

        }
        await pool.query(batchQueries.UPDATE_USER_COUNT,[userIds.length,batchId]);

        await pool.query('COMMIT');

        return res.status(200).send({
            success:true,
            message:`Successfully added ${userIds.length > 0 ? 'users' : 'user'}`
        })
    } catch (error) {
        console.log(error);
        await pool.query('ROLLBACK');
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.messsage
        })
    }
}
const getBatchUsers = async(req,res)=>{
    try {
        const {batchId} = req.params;
        if(!batchId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const getUsers = await pool.query(batchQueries.GET_BATCH_USERS,[batchId]);
        if(!getUsers.rows.length){
            return res.status(200).send({
                success:true,
                message:"Could not fetch batch users",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed batch users",
            data:getUsers.rows
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//create lab batch
const addLabsToBatch = async (req, res) => {
  try {
    let {
      lab_id,
      trainer_id,
      start_date,
      end_date,
      batch_id,
      lab_name,
      assigned_by,
      trainer_name,
      type,
      org_id
    } = req.body;
    const cookies = cookie.parse(req?.headers?.cookie || '');
    const sessionToken = cookies.session_token;

    if (!lab_id || !start_date || !end_date || !batch_id || !lab_name || !assigned_by || !type) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields"
      });
    }

    if (trainer_id === '') trainer_id = null;
    await pool.query('BEGIN');

    // Get batch users
    const getBatchUsers = await pool.query(batchQueries.GET_BATCH_USERS, [batch_id]);
    const users = getBatchUsers.rows.filter(row => row.role === 'user');

    // Prevent duplicate batch lab
    const checkLabAlreadyAssigned = await pool.query(batchQueries.CHECK_BATCHLAB_ALREADY, [lab_id,batch_id]);
    if (checkLabAlreadyAssigned.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(400).send({
        success: false,
        message: "Lab already assigned to batch"
      });
    }

    // Add lab to batch
    const addLab = await pool.query(batchQueries.CREATE_BATCH_LAB, [
      lab_id,
      lab_name,
      start_date,
      end_date,
      trainer_id,
      trainer_name,
      batch_id,
      assigned_by,
      users.length
    ]);

    if (!addLab.rows.length) throw new Error("Could not add lab to batch");
    
    //  Single unified loop for all types
    for (const user of users) {
      // Proxmox single-VM
      if (type === 'singlevm-proxmox') {
        const checkAlreadyAssigned = await pool.query(proxmoxQueries.CHECK_ALREADY_ASSIGNED, [user.id, lab_id]);
        if (checkAlreadyAssigned.rows.length > 0) {
            return res.status(404).send({
                success:false,
                message:`Lab already assigned to ${user.name}`
            })
        }
        const vmName = `vm-${user.name.replace(/\s+/g, '-')}`;
        await pool.query(proxmoxQueries.INSERT_SINGLEVM_USER_ASSIGNMENT, [
          lab_id,
          user.user_id,
          assigned_by,
          start_date,
          end_date,
          vmName
        ]);
      }
      //single vm aws
      else if(type === 'singlevm-aws'){
           const checkAlreadyAssigned = await pool.query(labQueries.CHECK_ALREADY_ASSIGNED, [user.user_id, lab_id]);
                       if (checkAlreadyAssigned.rows.length > 0) {
                           throw new Error(`Lab already assigned to ${userData.name}`)
                       }
                       // Insert lab assignment into the database
                       const result = await pool.query(labQueries.ASSIGN_LAB, [
                           
                           lab_id,
                           user.user_id,
                           start_date,
                           end_date,
                           assigned_by,
                       ]);
      }
      // Datacenter single-VM
      else if (type === 'singlevm-datacenter') {
        const checkAlreadyAssigned = await pool.query(batchQueries.CHECK_USERASSIGNED_SINGLEVM_DATACENTER_LAB, [lab_id, user.user_id]);
        const userData = await getUserData(user.user_id, sessionToken);
        if (checkAlreadyAssigned.rows.length) {
          return res.status(404).send({
                success:false,
                message:`Lab already assigned to ${user.name}`
            })
        }

        const creds = await pool.query(batchQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER, [user.user_id, lab_id,org_id]);
        if (!creds.rows.length){
            return res.status(404).send({
                success:false,
                message:`No credential available to assign`
            })
        }

        const assign = await pool.query(batchQueries.INSERT_DATACENTER_VM_USERASSIGNMENT, [
          lab_id,
          user.user_id,
          assigned_by,
          start_date,
          end_date,
          creds.rows[0].id
        ]);
        if (!assign.rows.length){
            return res.status(404).send({
                success:false,
                message:`Failed to assign datacenter lab to ${userData.name}`
            })
        }
      }

      // Datacenter cluster VM
      else if (type === 'vmcluster-datacenter') {
        const userdata = await getUserData(user.user_id,sessionToken);
              const checkAlreadyAssigned = await pool.query(batchQueries.CHECK_USER_LABS_VMCLUSTERDATACENTER,[lab_id,user.user_id]);
              if(checkAlreadyAssigned.rows.length){
                return res.status(404).send({
                    success:false,
                    message:`Lab Already assigned to ${userdata.name}`
                })
              }
              let groupCredsIdToUser;
                groupCredsIdToUser = await pool.query(
                  batchQueries.UPDATE_USER_GROUP_CREDS_TO_USER,
                  [user.user_id, lab_id,org_id]
                );
              // console.log(groupCredsIdToUser)
              if (!groupCredsIdToUser.rows.length) {
                return res.status(404).send({
                    success:false,
                    message:`Could not assign user group creds for user ${userdata.name}`
                })
              }
        
              const result = await pool.query(batchQueries.INSERT_INTO_USERASSIGNMENT, [
                lab_id,
                user.user_id,
                assigned_by,
                start_date,
                end_date,
                groupCredsIdToUser.rows[0].id,
              ]);
        
              if (!result.rows.length) {
                return res.status(404).send({
                    success:false,
                    message:`Could not assign lab ${lab_id} to user ${userdata.name}`
                })
              }
      }
      //cloudslice
      else if (type === 'cloudslice'){
        await assignCloudsliceLab(lab_id, user.user_id, assigned_by, start_date, end_date,sessionToken)
      }
    }

    // Update batch counters
    await pool.query(batchQueries.UPDATE_BATCHLAB_COUNT, [1, batch_id]);
    await pool.query(batchQueries.UPDATE_BATCH_USERS_TLAB, [1, batch_id]);

    await pool.query('COMMIT');

    return res.status(200).send({
      success: true,
      message: "Successfully added lab and assigned to users",
      data: addLab.rows[0]
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

//get batch labs
const getBatchLabs = async(req,res)=>{
    try {
        const {batchId} = req.params;
        if(!batchId){
            return res.status(400).send({
                success:false,
                message:"Please provide required fields"
            })
        }
        const getBatchLabs = await pool.query(batchQueries.GET_BATCH_LABS,[batchId]);
        if(!getBatchLabs.rows.length){
            return res.status(200).send({
                success:false,
                message:"No labs found for the batch",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed labs",
            data:getBatchLabs.rows
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}
//get labs for batches
const getLabsForBatch = async (req,res)=>{
    try {
         const {userId,orgId} = req.body;
    if(!userId || !orgId){
        return res.status(400).send({
            success:false,
            message:"Please provide the batch id"
        })
    }
    const getLabs = await pool.query(batchQueries.GET_ALL_LABS_FOR_BATCH,[userId,orgId]);
    if(!getLabs.rows.length){
        return res.status(200).send({
            success:false,
            message:"No labs found",
            data:[]
        })
    }
    return res.status(200).send({
        success:true,
        message:"Successfully accessed labs",
        data:getLabs.rows
    })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
   
}

//update batch details
const updateBatchDetails = async(req,res)=>{
    try {
        const {name,description,startdate,enddate,batchId} = req.body;
        if(!name||!startdate||!enddate||!batchId){
            return res.status(400).send({
                success:false,
                message:'Please provide all required fields'
            })
        }
        const updateBatch = await pool.query(batchQueries.UPDATE_BATCH_DETAILS,[name,description,startdate,enddate,batchId]);
        if(!updateBatch.rows.length){
            return res.status(404).send({
                success:false,
                message:'Could not update batch details'
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated batch details",
            data:updateBatch.rows[0]
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}
//update batch lab
const updateBatchLab = async (req, res) => {
  try {
    let {
      lab_id,
      trainer_id,
      start_date,
      end_date,
      batch_id,
      lab_name,
      assigned_by,
      trainer_name,
      type
    } = req.body;

    const cookies = cookie.parse(req?.headers?.cookie || '');
    const sessionToken = cookies.session_token;
    if (!lab_id || !start_date || !end_date || !batch_id || !lab_name || !assigned_by || !type) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (trainer_id === '') trainer_id = null;

    // Calculate remaining days
    const todayDate = new Date();
    const start = new Date(start_date);
    const end = new Date(end_date);

    const remaining_days =
      todayDate > start
        ? Math.ceil((end - todayDate) / (1000 * 60 * 60 * 24))
        : Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Begin transaction
    await pool.query('BEGIN');

    // Update batch lab
    const updateLabBatchDetails = await pool.query(
      batchQueries.UPDATE_LAB_BATCH,
      [lab_id, lab_name, start_date, end_date, remaining_days, trainer_id, trainer_name, lab_id] // Id used for WHERE
    );

    if (!updateLabBatchDetails.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).send({
        success: false,
        message: "No lab found with this id to update",
      });
    }

    //  Optional: also update all assigned user labs of this batch
    const getUsersOfBatch = await pool.query(batchQueries.GET_USERSOF_BATCH,[batch_id]);
    if(getUsersOfBatch.rows.length){
        for (const user of getUsersOfBatch.rows){
              const updateAllUserLabs = await pool.query(batchQueries.UPDATE_ALL_USERLABS, [
                lab_id,
                user.user_id,
                start_date,
                end_date,
            ]);
        }
    }
    
    await pool.query('COMMIT');

    return res.status(200).send({
      success: true,
      message: "Batch lab updated successfully",
      data: updateLabBatchDetails.rows[0],
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//delete user and its labs from batch
const deleteUserAndItsLabs = async(req,res)=>{
    try {
        const {labIds,userId,batchId} = req.body;
        console.log(req.body);
        if( !userId || !batchId){
            return res.status(400).send({
                success:false,
                message:'Please provide all required fields'
            })
        }
        await pool.query('BEGIN');
        const deleteUser = await pool.query(batchQueries.DELETE_USER_FROM_BATCH,[userId,batchId]);
        if(!deleteUser.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not delete user from batch"
            })
        }
        for (const labId of labIds){
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_LABASSIGNMENTS, [labId, userId]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_CLOUDSLICE, [labId, userId]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_SINGLEVM, [labId, userId]);
             await pool.query(batchQueries.DELETE_USER_CRED_FROM_CREDS,[null,userId]);
             await pool.query(batchQueries.DELETE_SINGLEVM_DATACENTER_FROM_USER,[labId,userId]);
             await pool.query(batchQueries.DELETE_RANDOM_USER_CREDS,[labId,userId]);
             await pool.query(batchQueries.DELETE_USER_DATACENTER_LAB,[labId,userId]);
             await pool.query(batchQueries.UPDATE_USER_COUNT,[-1,batchId]);
        }
        await pool.query(batchQueries.UPDATE_USER_COUNT,[-1,batchId])
        await pool.query('COMMIT');
        return res.status(200).send({
            success:true,
            message:"Successfully deleted user from batch",
            data:deleteUser.rows[0]
        })
    } catch (error) {
       await pool.query('ROLLBACK');
       console.log(error);
       return res.status(500).send({
        success:false,
        message:"Internal server error",
        error:error.message
       })
    }
}

//delete batches
const deleteBatch = async(req,res)=>{
    try {
        const {batchId} = req.params;
    if(!batchId){
        return res.status(400).send({
            success:false,
            message:"Could not delete the batch"
        })
    }
    await pool.query('BEGIN');
    const getBatchUsers = await pool.query(batchQueries.GET_USERSOF_BATCH,[batchId]);
    const getBatchLabs = await pool.query(batchQueries.GET_BATCH_LABS,[batchId]);
    if(getBatchLabs.rows.length){
         if(getBatchUsers.rows.length){
      for(const lab of getBatchLabs.rows){
         for (const user of getBatchUsers.rows){
            await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_LABASSIGNMENTS, [lab.lab_id, user.user_id]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_CLOUDSLICE, [lab.lab_id, user.user_id]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_SINGLEVM, [lab.lab_id, user.user_id]);
             await pool.query(batchQueries.DELETE_USER_CRED_FROM_CREDS,[null,user.user_id]);
             await pool.query(batchQueries.DELETE_SINGLEVM_DATACENTER_FROM_USER,[lab.lab_id,user.user_id]);
             await pool.query(batchQueries.DELETE_RANDOM_USER_CREDS,[lab.lab_id,user.user_id]);
             await pool.query(batchQueries.DELETE_USER_DATACENTER_LAB,[lab.lab_id,user.user_id]);
        }
      }
       await pool.query(batchQueries.DELETE_USERS_FROM_BATCH,[batchId]);
    }
       await pool.query(batchQueries.DELETE_LABS_FROM_BATCH,[batchId]);
    }
   
    const deleteBatch =  await pool.query(batchQueries.DELETE_BATCHES,[batchId]);
    if(!deleteBatch.rows.length){
        return res.status(404).send({
            success:false,
            message:'Could not delete batch'
        })
    }
    await pool.query('COMMIT');
    return res.status(200).send({
        success:true,
        message:"Successfully deleted batch",
        data:deleteBatch.rows[0]
    })
    } catch (error) {
        await pool.query('ROLLBACK');
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
    
}

//delete lab from batch
const deleteLabFromBatch = async(req,res)=>{
    try {
        const {batchId,labId} = req.body;
        if(!batchId || !labId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const deleteLab = await pool.query(batchQueries.DELETE_LAB_FROM_BATCH,[labId,batchId]);
        if(!deleteLab.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not delete the lab"
            })
        }
        const getBatchUsers = await pool.query(batchQueries.GET_USERSOF_BATCH,[batchId]);
        if(!getBatchUsers.rows.length){
            return res.status(200).send({
                success:true,
                message:"No users found in the batch"
            })
        }
        for (const user of getBatchUsers.rows){
            await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_LABASSIGNMENTS, [labId, user.user_id]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_CLOUDSLICE, [labId, user.user_id]);
             await pool.query(batchQueries.DELETE_USERLABS_FROM_BATCH_SINGLEVM, [labId, user.user_id]);
             await pool.query(batchQueries.DELETE_USER_CRED_FROM_CREDS,[null,user.user_id]);
             await pool.query(batchQueries.DELETE_SINGLEVM_DATACENTER_FROM_USER,[labId,user.user_id]);
             await pool.query(batchQueries.DELETE_RANDOM_USER_CREDS,[labId,user.user_id]);
             await pool.query(batchQueries.DELETE_USER_DATACENTER_LAB,[labId,user.user_id]);
        }
        await pool.query(batchQueries.UPDATE_BATCHLAB_COUNT,[-1,batchId]);
        await pool.query(batchQueries.UPDATE_BATCH_USERS_TLAB,[-1,batchId]);
        return res.status(200).send({
            success:true,
            message:"Succesfully deleted a lab",
            data:deleteLab.rows
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//edit batch details
// const editBatchDetails = async(req,res)=>{
//     try {
//         const {name,description,startdate,enddate,batchId} = req.body;
//         if(!batchId){
//             return res.status(400).send({
//                 success:false,
//                 message:"Please provide required fields"
//             })
//         }
//         const updateBatchDetails = 
//     } catch (error) {
//         console.log(error);
//         return res.status(500).send({
//             success:false,
//             message:'Internal server error',
//             error:error.message
//         })
//     }
// }

module.exports = {
    createBatch,
    getBatches,
    deleteBatch,
    getBatch,
    addUsersToBatch,
    getBatchUsers,
    getBatchLabs,
    updateBatchDetails,
    addLabsToBatch,
    getLabsForBatch,
    deleteUserAndItsLabs,
    deleteLabFromBatch,
    updateBatchLab

    
}