const cron = require('node-cron');
const pool =  require('../db/dbConfig');
const labQueries = require('./labQueries');
const batchesQueries = require('./batchesQueries');
const {getUserEmail,getUserData} = require('./emailNotificationService');
const path = require('path');
const { sendNotificationToMail } = require('./notificationServices');
const {api} = require('./proxmoxService')

const Settings = async(userId,email,type,typeDescription,message,med,metadata)=>{
  try {
      //send mail to organiztion admin
   const userSettings = await pool.query(batchesQueries.GET_USER_NOTIFICATION_SETTINGS, [userId]);
        if (userSettings.rowCount > 0) {
           const settings = userSettings.rows[0];
           const adminMail = await getUserEmail(userId);
           const insertNotification = await pool.query(batchesQueries.INSERT_NOTIFICATION, [type, typeDescription, message,med, userId,[JSON.stringify(metadata)] ]);
  } 
  return userSettings.rows[0];
} catch (error) {
    console.log("Error:",error)
  }
}

const expireLabsAndLog =async  ({
  fetchQuery,
  updateQuery,
  logQuery,
  labType,
  ownerType, 
}) =>{
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(fetchQuery);
    if (res.rows.length === 0) {
      console.log(`[${labType}] No labs to expire.`);
      await client.query('COMMIT');
      return;
    }

    await client.query(updateQuery);

    for (const lab of res.rows) {
      await client.query(
        logQuery,
        [lab.lab_id, labType, ownerType, lab.status, 'expired', 'cron_job']
      );
    }

    await client.query('COMMIT');
    console.log(`[${labType}] Expired ${res.rows.length} labs and logged.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[${labType}] Cron failed:`, err);
  } finally {
    client.release();
  }
}

//update cloudslicelab user completion status
const updateUserCloudsliceModularLabStatus = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: allLabs } = await client.query(labQueries.GET_CLOUDSLICE_MODULAR_LAB);
    if (!allLabs.length) {
      await client.query("COMMIT");
      return;
    }

    for (const lab of allLabs) {
      const { rows: modules } = await client.query(labQueries.GET_MODULES, [lab.labid]);

      for (const mod of modules) {
        const { rows: exercises } = await client.query(labQueries.GET_EXERCISES_MODULE, [mod.id]);
        const { rows: users } = await client.query(labQueries.GET_LABEXERCISE_DATA, [mod.id]);

        for (const user of users) {
          let allCompleted = true;

          for (const exercise of exercises) {
            if (exercise.type === "lab") {
              const { rows: labStatusRows } = await client.query(
                labQueries.GET_IS_LAB_COMPLETED,
                [user.user_id, mod.id]
              );
              if (!labStatusRows.length || !labStatusRows[0].has_all_completed_status) {
                allCompleted = false;
                break;
              }
            } else if (exercise.type === "quiz") {
              const { rows: quizStatusRows } = await client.query(
                labQueries.GET_IS_QUIZ_COMPLETED,
                [user.user_id, mod.id]
              );
              if (!quizStatusRows.length || !quizStatusRows[0].has_all_completed_status) {
                allCompleted = false;
                break;
              }
            }
          }

          await client.query(labQueries.INSERT_MODULE_STATUS_USER_LAB, [
            user.user_id,
            mod.lab_id,
            mod.id,
            allCompleted ? "completed" : "in-progress",
          ]);
        }
      }
    }

    await client.query("COMMIT");
    console.log("Cloudslice modular lab user status update complete.");
  } catch (error) {
    console.error("Error in updateUserCloudsliceModularLabStatus:", error);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

const updateLabSessionTime = async()=>{
     try {
      // runs every 1 minute
  console.log("Running credit deduction job");

  const activeSessions = await pool.query(
   labQueries.GET_ACTIVE_SESSIONS
  );

  for (const session of activeSessions.rows) {

    // 1. Check if VM is running
    // const isRunning = await checkEC2Status(session.instance_id);

    // if (!isRunning) continue;

    // 2. Deduct credits
    await pool.query(
      labQueries.UPDATE_REMAINING_TIME,
      [session.user_id,session.labid]
    );

    // 3. Get updated credits
    const credits = await pool.query(
      labQueries.GET_CREDITS,
      [session.user_id,session.labid]
    );
    const remaining = credits.rows[0]?.remaining_minutes ?? 0;

    console.log(`User ${session.user_id} remaining: ${remaining}`);

    // 4. If credits finished → STOP LAB
    if (remaining <= 0) {
      console.log(" Credits finished. Stopping Lab");

    if(session.type === 'singlevm-proxmox'){
       await api.post(
      `/nodes/${session.node}/qemu/${session.instance_id}/status/stop`
    );
    }
      await pool.query(
        labQueries.UPDATE_SESSION,
        [session.id]
      );
    }
  }
     } catch (error) {
    console.error("Error in updating:", error);
    await pool.query("ROLLBACK");
  } 
}

//update cloudslice user lab status
const updateUserCloudSliceLabStatus = async (
  {fetchQuery,
  updateQuery}
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: allModularLabs } = await client.query(labQueries.GET_CLOUDSLICE_MODULAR_LAB);

    if (allModularLabs.length === 0) {
      console.log(`cloudslice: No labs found`);
      await client.query('COMMIT');
      return;
    }

    for (const lab of allModularLabs) {
      const { rows: userLabs } = await client.query(
        fetchQuery,
        [lab.labid]
      );

      if (userLabs.length === 0) {
        console.log(`cloudslice: No user labs found for lab ${lab.labid}`);
        continue;
      }
       
      for (const userLab of userLabs) {
       

        const { rows: statusRows } = await client.query(
          labQueries.GET_LAB_MODULAR_STATUS_USER,
          [userLab.labid, userLab.user_id]
        );

        const isCompleted = statusRows[0]?.has_all_completed_status;

        const newStatus = isCompleted ? 'completed' : 'in-progress';

        await client.query(
          updateQuery,
          [newStatus, userLab.user_id, userLab.labid]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Cloudslice modular lab status update complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating cloudslice modular lab status:', error);
  } finally {
    client.release();
  }
};

//send software expiry notification
const sendSoftwareExpiryNotification = async()=>{

}

//update remaining days of batch lab
const updateRemainingDaysOfBatchLab = async()=>{
    try {
        const getAllBatchLabs = await pool.query(batchesQueries.GET_ALL_BATCH_LABS);
        if(!getAllBatchLabs.rows.length){
          console.log('No labs found for this batch');
          return;
        }
        const updateRemainingDaysOfBatchLab = await pool.query(batchesQueries.UPDATE_REMAINING_DAYS);
        console.log("Remaining days of batch labs is updated");
    } catch (error) {
      console.log('Error in updating the remaining days')
    }
}
const deleteBatchById = async (batchId) => {
  if (!batchId) {
    throw new Error("BatchId is required");
  }

  await pool.query('BEGIN');

  try {
    const getBatchUsers = await pool.query(
      batchesQueries.GET_USERSOF_BATCH,
      [batchId]
    );

    const getBatchLabs = await pool.query(
      batchesQueries.GET_BATCH_LABS,
      [batchId]
    );

    if (getBatchLabs.rows.length && getBatchUsers.rows.length) {
      for (const lab of getBatchLabs.rows) {
        for (const user of getBatchUsers.rows) {
          await pool.query(batchesQueries.DELETE_USERLABS_FROM_BATCH_LABASSIGNMENTS, [lab.lab_id, user.user_id]);
          await pool.query(batchesQueries.DELETE_USERLABS_FROM_BATCH_CLOUDSLICE, [lab.lab_id, user.user_id]);
          await pool.query(batchesQueries.DELETE_USERLABS_FROM_BATCH_SINGLEVM, [lab.lab_id, user.user_id]);
          await pool.query(batchesQueries.DELETE_USER_CRED_FROM_CREDS, [null, user.user_id]);
          await pool.query(batchesQueries.DELETE_SINGLEVM_DATACENTER_FROM_USER, [lab.lab_id, user.user_id]);
          await pool.query(batchesQueries.DELETE_RANDOM_USER_CREDS, [lab.lab_id, user.user_id]);
          await pool.query(batchesQueries.DELETE_USER_DATACENTER_LAB, [lab.lab_id, user.user_id]);
        }
      }

      await pool.query(batchesQueries.DELETE_USERS_FROM_BATCH, [batchId]);
    }

    await pool.query(batchesQueries.DELETE_LABS_FROM_BATCH, [batchId]);

    const result = await pool.query(
      batchesQueries.DELETE_BATCHES,
      [batchId]
    );

    if (!result.rows.length) {
      throw new Error("Batch not found");
    }

    await pool.query('COMMIT');
    return result.rows[0];

  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
};


//delete the batch and its details when expires
const deleteBatchDetails = async () => {
  try {
    const now = new Date();

    const { rows: batches } = await pool.query(
      batchesQueries.GET_ALL_BATCHES
    );

    if (!batches.length) {
      console.log("No batches found");
      return;
    }

    for (const batch of batches) {
      const endDate = new Date(batch.enddate);

      // Skip active batches immediately
      if (endDate >= now) continue;

      console.log(`Deleting expired batch: ${batch.id}`);

      // Fetch related data ONLY for expired batches
      const [{ rows: labs }, { rows: users }] = await Promise.all([
        pool.query(batchesQueries.GET_BATCH_LABS, [batch.id]),
        pool.query(batchesQueries.GET_USERSOF_BATCH, [batch.id]),
      ]);

      // Delete batch
      await deleteBatchById(batch.id);

      // Build metadata
      const metadata = {
        batchName: batch.name,
        startDate: batch.startdate,
        endDate: batch.enddate,

        users: users.map(u => ({
          name: u.name,
          email: u.email,
        })),

        labs: labs.map(l => ({
          labName: l.lab_name,
          startDate: l.start_date,
          endDate: l.end_date,
        })),
      };

      const email = await getUserEmail(batch.created_by);

      const settings = await Settings(
        batch.created_by,
        email,
        'batch_deletion',
        'Batch Deletion Notification',
        `Batch ${batch.name} and its details deleted successfully`,
        'high',
        metadata
      );

      if (settings?.emailnotifications?.includes('batch_deletion')) {
        const htmlTemplate = path.join(
          process.cwd(),
          'public/templates/notification-email-template.html'
        );
        console.log('Email:',email)
        await sendNotificationToMail(htmlTemplate, {
          title: 'Batch Deletion Notification',
          priority: 'high',
          message: `Batch "${batch.name}" has been deleted successfully.`,
          metadata,
          actionUrl: 'https://app.golabing.ai/login',
          actionText: 'Login Now',
          formattedDate: new Date().toLocaleString(),
          notificationType: 'batch_deletion',
          unsubscribeUrl: 'https://example.com/unsubscribe',
          preferencesUrl: 'https://example.com/preferences',
          email,
        });
      }
    }
  } catch (error) {
    console.error(
      "Error deleting batch and its details:",
      error.message
    );
  }
};


//execute
const executeCron = () =>{
//single vm aws
cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_OF_SINGLEVM_LAB,
    updateQuery: labQueries.UPDATE_SINGLEvM_AWS_LAB_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-aws-lab',
    ownerType: 'lab'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_OF_SINGLEVM_ORGLAB,
    updateQuery: labQueries.UPDATE_SINGLEvM_AWS_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-aws-org',
    ownerType: 'org'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_OF_SINGLEVM_USERLAB,
    updateQuery: labQueries.UPDATE_SINGLEvM_AWS_USER_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-aws-user',
    ownerType: 'user'
  });
});

//single vm datacenter
cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_DATACENTER_LAB,
    updateQuery: labQueries.UPDATE_SINGLEVM_DATACENTER_LAB_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-datacenter-lab',
    ownerType: 'lab'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_DATACENTER_ORG,
    updateQuery: labQueries.UPDATE_SINGLEVM_DATACENTER_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-datacenter-org',
    ownerType: 'org'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_DATACENTER_USER,
    updateQuery: labQueries.UPDATE_SINGLEVM_DATACENTER_USER_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-datacenter-user',
    ownerType: 'user'
  });
});

//VMCLUSTER DATACENTER

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_VMCLUSTER_DATACENTER_LAB,
    updateQuery: labQueries.UPDATE_VMCLUSTER_DATACENTER_LAB_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'vmcluster-datacenter-lab',
    ownerType: 'lab'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_VMCLUSTER_DATACENTER_ORG,
    updateQuery: labQueries.UPDATE_VMCLUSTER_DATACENTER_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'vmcluster-datacenter-org',
    ownerType: 'org'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_VMCLUSTER_DATACENTER_USER,
    updateQuery: labQueries.UPDATE_VMCLUSTER_DATACENTER_USER_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'vmcluster-datacenter-user',
    ownerType: 'user'
  });
});

//cloudslice status
// cron.schedule('*/1 * * * *', async () => {
//   await expireLabsAndLog({
//     fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_LAB,
//     updateQuery: labQueries.UPDATE_cloudslice_LAB_STATUS,
//     logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
//     labType: 'cloudslice-lab',
//     ownerType: 'lab'
//   });
// });

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_ORG,
    updateQuery: labQueries.UPDATE_cloudslice_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'cloudslice-org',
    ownerType: 'org'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_USER,
    updateQuery: labQueries.UPDATE_cloudslice_USER_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'cloudslice-user',
    ownerType: 'user'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_USER_PURCHASED,
    updateQuery: labQueries.UPDATE_cloudslice_USER_PURCHASED_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'cloudslice-user-purchased',
    ownerType: 'user-purchased'
  });
});

//singlevm-proxmox 
cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_PROXMOX_LAB,
    updateQuery: labQueries.UPDATE_SINGLEVM_PROXMOX_LAB_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-proxmox',
    ownerType: 'lab'
  });

});

//lab user session
cron.schedule('*/1 * * * *',async () =>{
  await updateLabSessionTime();
})

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_PROXMOX_ORG,
    updateQuery: labQueries.UPDATE_SINGLEVM_PROXMOX_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-proxmox',
    ownerType: 'org'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_PROXMOX_USER,
    updateQuery: labQueries.UPDATE_SINGLEVM_PROXMOX_USER_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-proxmox',
    ownerType: 'user'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_SINGLEVM_PROXMOX_USER_PURCHASED,
    updateQuery: labQueries.UPDATE_SINGLEVM_PROXMOX_USER_PURCHASED_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'singlevm-proxmox',
    ownerType: 'user-purchased'
  });
});


//cloudslice modular lab status of user
// Schedule the job to run every 1 minute
cron.schedule('*/1 * * * *', async () => {
  console.log('Running updateUserCloudsliceModularLabStatus() via cron');
  try {
    await updateUserCloudsliceModularLabStatus();
    await deleteBatchDetails();
    console.log('Lab status update completed successfully.');
  } catch (error) {
    console.error('Error running updateUserCloudsliceModularLabStatus in cron:', error);
  }
});

//update cloudlice modular status of user
cron.schedule('*/1 * * * *', async () => {
  await updateUserCloudSliceLabStatus({
    fetchQuery: labQueries.GET_ALL_USER_CLOUDSLICE_LABS,
    updateQuery: labQueries.UPDATE_CLOUDSLICE_USER_MODULAR,
  });
});

//update cloudlice modular status of user purchased
cron.schedule('*/1 * * * *', async () => {
  await updateUserCloudSliceLabStatus({
    fetchQuery: labQueries.GET_ALL_USER_CLOUDSLICE_PURCHASED_LABS,
    updateQuery: labQueries.UPDATE_CLOUDSLICE_USER_PURCHASED_MODULAR,
  });
});

//update the remaining days of batch labs
cron.schedule('0 0 * * *', () => {
  console.log('Running cron to update batchlabs remaining days...');
  updateRemainingDaysOfBatchLab();
});
}

module.exports = {executeCron};