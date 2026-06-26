const { get } = require('../config/proxmoxApi');
const pool = require('../db/dbConfig');
const purchaseQueries = require('./purchaseQueries');
const cartQueries = require('./labCartQueries');
const labQueries = require('./labQueries');
const { extensionRequestUpdate } = require('../socket');
const { GET_ALL_PLANS, GET_PLAN } = require('./subscriptionQueries');
const { sendNotificationToMail } = require('./notificationServices');
const path = require('path');
const { getUserData } = require('./emailNotificationService');
const promoxQueries = require('./promoxQueries');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const getOrgCataloguePurchased = async(req,res)=>{
    try {
        const {role,org_id} = req.body;
        if(!role){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        let getCatalogues;
        if(org_id){
            getCatalogues = await pool.query(purchaseQueries.GET_CATALOGUE_PURCHASE_DETAILS_ORG,[org_id])
        }
        else{
             getCatalogues = await pool.query(purchaseQueries.GET_CATALOGUE_PURCHASE_DETAILS_FORADMIN);
        }
       
        if(!getCatalogues.rows.length){
            return res.status(200).send({
                success:true,
                message:"Could find any catalogue purchased",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the details",
            data:getCatalogues.rows
        })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal Server Error",
            error:error.message
        })
    }
}

// const createTheExtensionRequest =  async(session)=>{
//     try {
//           let insertData;
//                 let session = event.data.object;
//                 let {
//                 purchased_id,
//                 lab_id,
//                 lab_title,
//                 org_id,
//                 org_name,
//                 admin_id,
//                 admin_name,
//                 additional_days,
//                 additional_users,reason,payment } = session.metadata;
//                 payment = JSON.parse(payment);
        
//             insertData = await pool.query(purchaseQueries.CREATE_EXTENSION_REQUEST,[purchased_id,lab_id,lab_title,org_id,org_name,admin_id,admin_name,additional_days,additional_users,reason]);
//             if(!insertData.rows.length){
//                 throw new Error("Could not add the extension request");
//             }
//             const insertPayment = await pool.query(cartQueries.INSERT_PAYMENT, [
//                       admin_id,
//                       session.id,
//                       session.payment_intent,
//                       payment.total,
//                       session.currency,
//                       session.payment_status,
//                       session.customer_details.email,
//                       lab_id,
//                       additional_days,
//                       org_id || null
//                     ]);
//           }
          
//      catch (error) {
//         console.log("Error:",error);
//         throw new Error("Could not create the request")
//     }
// }
const createTheExtensionRequest = async (session) => {
  try {
    const {
      purchased_id,
      lab_id,
      lab_title,
      org_id,
      org_name,
      admin_id,
      admin_name,
      additional_days,
      additional_users,
      reason,
      total
    } = session.order.order_tags;
      const insertData = await pool.query(cartQueries.INSERT_PAYMENT, [
      admin_id,
      session.order.order_id,
      session.payment.cf_payment_id,
      total,
      session.payment.payment_currency,
      session.payment.payment_status,
      session.customer_details?.customer_email,
      lab_id,
      additional_days,
      org_id || null
    ]);
    if (!insertData.rowCount) {
      throw new Error("Could not add the extension request");
    }
    const payment_id = insertData?.rows[0]?.id
    const requestData =  await pool.query(
      purchaseQueries.CREATE_EXTENSION_REQUEST,
      [
        purchased_id,
        lab_id,
        lab_title,
        org_id,
        org_name,
        admin_id,
        admin_name,
        additional_days,
        additional_users,
        reason,
        payment_id
      ]
    );
    await extensionRequestUpdate({
        orgId:org_id,
        data:requestData?.rows[0]
    })
  
  } catch (error) {
    console.error("Extension creation error:", error);
    throw error; //  rethrow so webhook can rollback
  }
};
//plans purchase
const generateUsageFromFeatures = (features) => {
  return Object.keys(features).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
};

const subscriptionPurchase = async(session)=>{
    try {
        const {
        key,
        planName,
        planTier,
        billingCycle,
        monthly_price,
        annual_monthly_price,
        annual_discount,
        planId,
        userId,
        orgId,
        organization,
        total
        } = session.order.order_tags;
      const insertData = await pool.query(cartQueries.INSERT_PLAN_PAYMENT, [
      userId,
      session.order.order_id,
      session.payment.cf_payment_id,
      total,
      session.payment.payment_currency,
      session.payment.payment_status,
      session.customer_details?.customer_email,
      planId,
      "plan",
     orgId || null,
      ]);
    if (!insertData.rowCount) {
      throw new Error("Could not add the extension request");
    }
  const isAnnual = billingCycle === true || billingCycle === "true";
    const plan = await pool.query(GET_PLAN,[planId]);
    const usage = generateUsageFromFeatures(plan?.rows[0].features);
    const payment_id = insertData?.rows[0]?.id
        const createKey = await pool.query(purchaseQueries.CREATE_LICENSE_KEY,[key,orgId,organization,planTier,planName,isAnnual ? "annual" : "monthly",'active',isAnnual ? "365" : "30",plan?.rows[0].features,usage,planId,payment_id]);
        if(!createKey.rows.length){
            throw new Error("Could not create the plan") 
        }
        const userData = await getUserData(userId);
        const htmlTemplate = path.join(process.env.LICENSE_KEY_TEMPLATE_PATH);
        const placeholder = {
            name: userData?.name,
            email:userData?.email,
            subject:'License Key',
            licenseKey: createKey.rows[0]?.license_key,
            planName: createKey.rows[0]?.plan_name,
            billingCycle: createKey.rows[0]?.billing_cycle === "annual" ? "Annual" : "Monthly",
            amount: total,
            expiryDate: createKey.rows[0]?.expires_at,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/billing`
            }
        await sendNotificationToMail(htmlTemplate,placeholder)
    } catch (error) {
        console.log("Plan Purchase Failed:".error);
        throw error;
    }
}

const extensionRequest = async(req,res)=>{
    try {
        const {orgId,role} = req.body;
        let extensions;
        if(role === 'superadmin' ){
            extensions = await pool.query(purchaseQueries.GET_EXTENSIONS_FOR_ADMIN)
        }
        else{
            extensions = await pool.query(purchaseQueries.GET_EXTENSION_FOR_ORG,[orgId]);
        }
        if(!extensions.rows.length){
            return res.status(404).send({
                success:true,
                message:"Could not find any extensions",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed extensions",
            data:extensions.rows
        })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}
//approve/request the extension request
const approveOrRejectExtensionRequest = async(req,res)=>{
    try {
        const {
                    request_id,
                    purchased_id,
                    lab_id,
                    org_id,
                    admin_id,
                    approved_days,
                    approved_users,
                    admin_note,
                    status,
                    type
        } = req.body;
        console.log(req.body)
        if(!request_id  || !status ||!type){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        await pool.query("BEGIN");
        
        const updateData = await pool.query(purchaseQueries.UPDATE_EXTENSION_APPORREJ,[status,admin_note,request_id]);
        if(!updateData.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not update the status"
            })
        }
        if(status === 'approved'){
            await pool.query(purchaseQueries.UPDATE_CURRENT_DAYS_USERS,[approved_days,approved_users,purchased_id]);
            if(type === "singlevm-aws")
               await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB,[approved_days,purchased_id]);
            else if(type === "cloudslice")
                await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB_CLOUDSLICE,[approved_days,purchased_id]);
            else if(type === "singlevm-proxmox")
                await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB_SINGLEVMPROXMOX,[approved_days,purchased_id]);
            else if(type === "singlevmdatacenter"){
                const checkAvailability = await pool.query(purchaseQueries.CHECK_SINGLEVMDATACENTER_LAB_AVAILABILITY,[lab_id]);
                if(checkAvailability.rows.length >= approved_users){
                 const assignCreds = await pool.query(labQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_LAB,[org_id,lab_id,approved_users]);
                 await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB_SINGLEVMDATACENTER,[approved_days,purchased_id]);
                }
                return res.status(404).send({
                    success:false,
                    message:`No credential available, Could not approve,Credentials availability is ${checkAvailability.rows.length}`
                })
                }
            else if(type === "vmclusterdatacenter"){
                 const checkAvailability = await pool.query(purchaseQueries.CHECK_AVAILABILITY_CREDENTIALS,[lab_id]);
                  if(checkAvailability.rows.length >= approved_users){
                     const assignCreds = await pool.query(labQueries.UPDATE_USER_GROUP_CREDS_TO_PURCHASED_LAB,[org_id,lab_id,approved_users,admin_id]);
                     await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB_VMCLUSTERDATACENTER,[approved_days,purchased_id]);
                  }
                  console.log("yes this one")
                  return res.status(404).send({
                    success:false,
                    message:`No credential available, Could not approve,Credentials availability is ${checkAvailability.rows.length}`
                })
            }
            }
            
        
        await pool.query('COMMIT');
        return res.status(200).send({
            success:true,
            message:"Successfully updated the status",
            data:updateData.rows[0]
        })
    } catch (error) {
        console.log("Error:",error);
        await pool.query('ROLLBACK')
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//CHECK THE LAB AVAILABILITY 
const checkLabAvailability = async(req,res)=>{
    try {
         const {course} = req.body;
    if(!course){
        return res.status(400).send({
            success:false,
            message:"Please provide the required fields"
        })
    }
    let availability;
    if(course?.type === "singlevmdatacenter"){
        availability = await pool.query(purchaseQueries.CHECK_SINGLEVMDATACENTER_LAB_AVAILABILITY,[course?.id]);
    }
    else if(course?.type === "vmclusterdatacenter"){
        availability = await pool.query(purchaseQueries.CHECK_AVAILABILITY_CREDENTIALS,[course?.id]);
    }
    if(availability.rows.length > 0){
        return res.status(200).send({
            success:true,
            message:"Sucessfully accessed",
            data:availability.rows
        })
    }
    return res.status(200).send({
        success:false,
        message:"Lab is not available"
    })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
   
}
//check the quantity remaining from lab batch purchased
const checkQuantityOfPurchased = async(req,res)=>{
    try {
        const {labId,orgId} = req.body;
        if(!labId || !orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
    }
    const getQty = await pool.query(purchaseQueries.GET_PURCHASED_LAB_QUANTITY,[labId,orgId]);
    
    if(!getQty.rows.length){
        // No purchase record → own lab → query remaining directly from the lab tables
        const getOwnLabRemaining = await pool.query(`
            SELECT COALESCE(
                (SELECT remaining FROM createlab WHERE lab_id = $1),
                (SELECT remaining FROM cloudslicelab WHERE labid = $1),
                (SELECT remaining FROM singlevmproxmox_lab WHERE labid = $1),
                (SELECT remaining FROM singlevmdatacenter_lab WHERE lab_id = $1),
                (SELECT remaining FROM vmclusterdatacenter_lab WHERE labid = $1),
                (SELECT remaining FROM proxmoxcluster_lab WHERE labid = $1),
                -1
            ) AS remaining
        `, [labId]);
        const remaining = getOwnLabRemaining.rows[0]?.remaining ?? -1;
        return res.status(200).send({
            success:true,
            data:{ quantity: remaining },
            message:"Successfully accessed the data"
        })
    }
    return res.status(200).send({
        success:true,
        data:getQty.rows[0],
        message:"Successfully accessed the data"
    })
    } catch (error) {
       console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        }) 
    }
    
}


//get the single vm datacenter user purchased labs
const getUserPurchasedSingleVmDatacenterLabs = async(req,res)=>{
    try {
        const {labId} = req.body;
        if(!labId){
            return res.status(200).send({
                success:true,
                message:"Please privide the required fields"
            })
        }
        const getLabs =  await pool.query(purchaseQueries.GET_USER_PURCHASED_SINGLEVM_DATACENTER_LABS,[labId]);
        if(!getLabs.rowCount > 0){
            return res.status(200).send({
            success:true,
            message:"No purchased labs found",
            data:[]
        })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed purchased labs",
            data:getLabs.rows
        })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}


module.exports = {
    getOrgCataloguePurchased,
    createTheExtensionRequest,
    extensionRequest,
    approveOrRejectExtensionRequest,
    checkLabAvailability,
    getUserPurchasedSingleVmDatacenterLabs,
    subscriptionPurchase,
    checkQuantityOfPurchased
}