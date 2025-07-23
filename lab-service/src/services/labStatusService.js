const cron = require('node-cron');
const pool =  require('../db/dbConfig');
const labQueries = require('./labQueries');

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

//cloudslice status
cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_LAB,
    updateQuery: labQueries.UPDATE_cloudslice_LAB_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'cloudslice-lab',
    ownerType: 'lab'
  });
});

cron.schedule('*/1 * * * *', async () => {
  await expireLabsAndLog({
    fetchQuery: labQueries.GET_STATUS_CLOUDSLICE_ORG,
    updateQuery: labQueries.UPDATE_cloudslice_ORG_STATUS,
    logQuery: labQueries.INSERT_LAB_STATUS_LOGS,
    labType: 'cloudslice-org',
    ownerType: 'org'
  });
});

}

module.exports = {executeCron};