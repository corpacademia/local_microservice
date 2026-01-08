const pool = require('../db/dbConfig');
const queries = require('../services/fetchLabsQueries');

const getOrgUserIds = async (orgId) => {
  const { rows } = await pool.query(queries.GET_ORG_USERS, [orgId]);
  return rows;
};
const getAllUsers = async () => {
    const userResult = await pool.query(queries.getAllUsers);
    const orgUserResult = await pool.query(queries.getAllOrgUsers);
    const result = [...userResult.rows, ...orgUserResult.rows];
    return result;
};

 const getOrgAwsLabs = async (req, res) => {
 const { orgId, labId } = req.params;

  if (!orgId || !labId) {
    return res.status(400).send({
      success: false,
      message: "Please provide required fields",
    });
  }

  try {

    if (orgId === 'superadmin'){
    userData = await getAllUsers();
     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );
  }
  else{
     /* --------------------------------------------------
       1️⃣ Fetch org users WITH DATA
    -------------------------------------------------- */
     userData  = await getOrgUserIds(orgId);

     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );

  }

    /* --------------------------------------------------
        Fetch labs from all 3 sources
    -------------------------------------------------- */
    const [{ rows: created }, { rows: orgAssigned }, { rows: userAssigned }] =
      await Promise.all([
        pool.query(queries.GET_SINGLEVM_AWS_LAB, [userIds, labId]),
        pool.query(queries.GET_ORG_ASSIGNED_SINGLEVM_AWS, [userIds, labId]),
        pool.query(queries.GET_USER_ASSIGNED_SINGLEVM_AWS, [userIds, labId]),
      ]);

     const getLabDetails = await pool.query(queries.GET_SINGLEVM_AWS_LABDETAILS,[labId]);
     const labData = getLabDetails.rows[0];
     const getInstanceDetails = await pool.query(queries.GET_INSTANCE_DETAILS,[labId]);
     const instanceDetails = getInstanceDetails.rows;
    /* --------------------------------------------------
       3️⃣ Merge & dedupe
    -------------------------------------------------- */
    const allRows = [
    ...created,
    ...orgAssigned,
    ...userAssigned,
    ];
const rows = allRows.map(row => {
  let userId = null;
  let source = null;

  if (row.user_id) {
    userId = row.user_id;
    source = "user";
  } else if (row.admin_id) {
    userId = row.admin_id;
    source = "org";
  } else if (row.createdby) {
    userId = row.createdby;
    source = "created";
  }
 
  const user = userId ? userMap.get(userId) : null;
  return {
    ...labData,
    ...row,
    ...instanceDetails?.find(i=>i.user_id === userId) || null,
    // flatten user data directly into row
    user_id:userId,
    name: user?.name || null,
    email: user?.email || null,
    role: user?.role || null,
    type:'singlevm-aws',
    source,
  };
});
    console.log(rows)
    // });
    return res.status(200).send({
      success: true,
      data: rows,
      message: "Successfully accessed data",
    });

  } catch (e) {
    console.error(e);
    return res.status(500).send({ success: false ,message:"Internal server erro",error:e.message});
  }
};

const getOrgCloudsliceLabs = async (req, res) => {
 

  try {
     const { orgId, labId } = req.params;
     let  userData,userIds,userMap ;
       if (!orgId || !labId) {
    return res.status(400).send({
      success: false,
      message: "Please provide required fields",
    });
  }
  if (orgId === 'superadmin'){
    userData = await getAllUsers();
     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );
  }
  else{
     /* --------------------------------------------------
       1️⃣ Fetch org users WITH DATA
    -------------------------------------------------- */
     userData  = await getOrgUserIds(orgId);

     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );

  }

   
    /* --------------------------------------------------
       2️⃣ Fetch labs from all 3 sources
    -------------------------------------------------- */
    const [{ rows: created }, { rows: orgAssigned }, { rows: userAssigned }] =
      await Promise.all([
        pool.query(queries.GET_CLOUDSLICE_LAB, [userIds, labId]),
        pool.query(queries.GET_ORG_ASSIGNED_CLOUDSLICE, [userIds, labId]),
        pool.query(queries.GET_USER_ASSIGNED_CLOUDSLICE, [userIds, labId]),
      ]);

     const getLabDetails = await pool.query(queries.GET_CLOUDSLICE_LABDETAILS,[labId]);
     const labData = getLabDetails.rows[0];
    /* --------------------------------------------------
       3️⃣ Merge & dedupe
    -------------------------------------------------- */
    const allRows = [
  ...created,
  ...orgAssigned,
  ...userAssigned,
];
const rows = allRows.map(row => {
  let userId = null;
  let source = null;

  if (row.user_id) {
    userId = row.user_id;
    source = "user";
  } else if (row.admin_id) {
    userId = row.admin_id;
    source = "org";
  } else if (row.createdby) {
    userId = row.createdby;
    source = "created";
  }
 
  const user = userId ? userMap.get(userId) : null;
  return {
    ...labData,
    ...row,
    // flatten user data directly into row
    name: user?.name || null,
    email: user?.email || null,
    role: user?.role || null,
    user_id:user?.id,

    source,
  };
});

    // });
    return res.status(200).send({
      success: true,
      data: rows,
      message: "Successfully accessed data",
    });

  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};

const getOrgSingleVMDatacenterLabs = async (req, res) => {
  const { orgId, labId } = req.params;

  if (!orgId || !labId) {
    return res.status(400).send({
      success: false,
      message: "Please provide required fields",
    });
  }

  try {

    if (orgId === 'superadmin'){
    userData = await getAllUsers();
     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );
  }
  else{
     /* --------------------------------------------------
       1️⃣ Fetch org users WITH DATA
    -------------------------------------------------- */
     userData  = await getOrgUserIds(orgId);

     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );

  }

    /* --------------------------------------------------
        Fetch labs from all 3 sources
    -------------------------------------------------- */
    const [{ rows: created }, { rows: orgAssigned }, { rows: userAssigned }] =
      await Promise.all([
        pool.query(queries.GET_DATACENTERVM_LAB, [userIds, labId]),
        pool.query(queries.GET_ORG_ASSIGNED_DATACENTERVM, [userIds, labId]),
        pool.query(queries.GET_USER_ASSIGNED_DATACENTERVM, [userIds, labId]),
      ]);

     const getLabDetails = await pool.query(queries.GET_DATACENTERVM_LABDETAILS,[labId]);
     const labData = getLabDetails.rows[0];
    /* --------------------------------------------------
       3️⃣ Merge & dedupe
    -------------------------------------------------- */
    const allRows = [
    ...created,
    ...orgAssigned,
    ...userAssigned,
    ];
const rows = allRows.map(row => {
  let userId = null;
  let source = null;

  if (row.user_id) {
    userId = row.user_id;
    source = "user";
  } else if (row.admin_id) {
    userId = row.admin_id;
    source = "org";
  } else if (row.createdby) {
    userId = row.createdby;
    source = "created";
  }
 
  const user = userId ? userMap.get(userId) : null;
  return {
    ...labData,
    ...row,

    // flatten user data directly into row
    user_id:userId,
    name: user?.name || null,
    email: user?.email || null,
    role: user?.role || null,
    type:'singlevm-datacenter',
    source,
  };
});
    console.log(rows)
    // });
    return res.status(200).send({
      success: true,
      data: rows,
      message: "Successfully accessed data",
    });

  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};

const getOrgVMClusterDatacenterLabs = async (req, res) => {
  const { orgId, labId } = req.params;

  if (!orgId || !labId) {
    return res.status(400).send({
      success: false,
      message: "Please provide required fields",
    });
  }

  try {
     if (orgId === 'superadmin'){
    userData = await getAllUsers();
     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );
  }
  else{
     /* --------------------------------------------------
       1️⃣ Fetch org users WITH DATA
    -------------------------------------------------- */
     userData  = await getOrgUserIds(orgId);

     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );

  }
    /* --------------------------------------------------
        Fetch labs from all 3 sources
    -------------------------------------------------- */
    let [{ rows: created }, { rows: orgAssigned }, { rows: userAssigned }] =
      await Promise.all([
        pool.query(queries.GET_VMCLUSTERDATACENTER_LAB, [userIds, labId]),
        pool.query(queries.GET_ORG_ASSIGNED_VMCLUSTERDATACENTER, [userIds, labId]),
        pool.query(queries.GET_USER_ASSIGNED_VMCLUSTERDATACENTER, [userIds, labId]),
      ]);

     const getLabDetails = await pool.query(queries.GET_VMCLUSTERDATACENTER_LABDETAILS,[labId]);
     const labData = getLabDetails.rows[0];
     const vmDetails = await pool.query(queries.GET_VM_DETAILS_ON_LABID, [labId]);
     const userVMDetails = await pool.query(queries.GET_USER_VM_CREDS, [labId]);
     let userCredGrps =  await pool.query(queries.GET_USERCRED_GRPS);
     let grpCreds = await pool.query(queries.GET_GRP_CREDS);
     
     /* --------------------------------------------------
       3 Merge & dedupe
    -------------------------------------------------- */
    let allRows = [
        ...created,
        ...orgAssigned,
        ...userAssigned,
    ];
   const rows = allRows.map(row => {
  let userId = null;
  let source = null;

  if (row.user_id) {
    userId = row.user_id;
    source = "user";
  } else if (row.admin_id) {
    userId = row.admin_id;
    source = "org";
  } else if (row.createdby) {
    userId = row.createdby;
    source = "created";
  }
 
  const user = userId ? userMap.get(userId) : null;
  return {
    ...labData,
    ...row,
    // flatten user data directly into row
    name: user?.name || null,
    email: user?.email || null,
    role: user?.role || null,
    user_id:userId,
    type:'vmcluster-datacenter',
    source,
  };
});
const allData = [];
allData.push({
        userData:rows,
        vms: vmDetails.rows,
        users: userVMDetails.rows,
        userCredGrps:userCredGrps.rows,
        grpCreds:grpCreds.rows
})
 return res.status(200).send({
      success: true,
      data: allData,
      message: "Successfully accessed data",
    });

  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};

const getOrgProxmoxLabs = async (req, res) => {
  const { orgId, labId } = req.params;
  if (!orgId || !labId) {
    return res.status(400).send({
      success: false,
      message: "Please provide required fields",
    });
  }
  try {  
     if (orgId === 'superadmin'){
    userData = await getAllUsers();
     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );
  }
  else{
     /* --------------------------------------------------
       1️⃣ Fetch org users WITH DATA
    -------------------------------------------------- */
     userData  = await getOrgUserIds(orgId);

     userIds = userData.map(u => u.id);

     userMap = new Map(
      userData.map(u => [u.id, u])
    );

  }

    /* --------------------------------------------------
        Fetch labs from all 3 sources
    -------------------------------------------------- */
    const [{ rows: created }, { rows: orgAssigned }, { rows: userAssigned }] =
      await Promise.all([
        pool.query(queries.GET_SINGLEVMPROXMOX_LAB, [userIds, labId]),
        pool.query(queries.GET_ORG_ASSIGNED_SINGLEVMPROXMOX, [userIds, labId]),
        pool.query(queries.GET_USER_ASSIGNED_SINGLEVMPROXMOX, [userIds, labId]),
      ]);

     const getLabDetails = await pool.query(queries.GET_SINGLEVMPROXMOX_LABDETAILS,[labId]);
     const labData = getLabDetails.rows[0];
     const result = await pool.query(queries.GET_VM_DETAILS, [labId]);
     const vmDetails = result.rows[0] || [];
   /* --------------------------------------------------
       3️⃣ Merge & dedupe
    -------------------------------------------------- */
    const allRows = [
  ...created,
  ...orgAssigned,
  ...userAssigned,
    ];
const rows = allRows.map(row => {
  let userId = null;
  let source = null;

  if (row.user_id) {
    userId = row.user_id;
    source = "user";
  } else if (row.admin_id) {
    userId = row.admin_id;
    source = "org";
  } else if (row.createdby) {
    userId = row.createdby;
    source = "created";
  }
 
  const user = userId ? userMap.get(userId) : null;
  return {
    ...labData,
    ...vmDetails,
    ...row,
    user_id:userId,
    // flatten user data directly into row
    name: user?.name || null,
    email: user?.email || null,
    role: user?.role || null,
    type:'singlevm-proxmox',
    source,
  };
});

    // });
    return res.status(200).send({
      success: true,
      data: rows,
      message: "Successfully accessed data",
    });

  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: e.message,
    });
  }
};





module.exports = {
    getOrgCloudsliceLabs,
    getOrgSingleVMDatacenterLabs,
    getOrgVMClusterDatacenterLabs,
    getOrgProxmoxLabs,
    getOrgAwsLabs
}