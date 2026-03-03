const { get } = require('../config/proxmoxApi');
const pool = require('../db/dbConfig');
const purchaseQueries = require('./purchaseQueries');
const cartQueries = require('./labCartQueries');
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
      payment
    } = session.metadata;

    const parsedPayment = JSON.parse(payment);
      const insertData = await pool.query(cartQueries.INSERT_PAYMENT, [
      admin_id,
      session.id,
      session.payment_intent,
      parsedPayment.total,
      session.currency,
      session.payment_status,
      session.customer_details?.email,
      lab_id,
      additional_days,
      org_id || null
    ]);
    if (!insertData.rowCount) {
      throw new Error("Could not add the extension request");
    }
    const payment_id = insertData?.rows[0]?.id
     await pool.query(
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
  
  } catch (error) {
    console.error("Extension creation error:", error);
    throw error; //  rethrow so webhook can rollback
  }
};
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
        } = req.body;
        if(!request_id  || !status){
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
            await pool.query(purchaseQueries.UPDATE_EXPIRY_LAB,[approved_days,purchased_id]);
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

module.exports = {
    getOrgCataloguePurchased,
    createTheExtensionRequest,
    extensionRequest,
    approveOrRejectExtensionRequest
}