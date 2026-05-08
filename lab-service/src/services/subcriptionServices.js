const queries = require('./subscriptionQueries');
const pool = require('../db/dbConfig');
const { getUserData } = require('./emailNotificationService');
const path = require('path');
const { sendNotificationToMail } = require('./notificationServices');

const createPlan = async(req,res)=>{
    try {
        const {
        tier,styleKey,name,description,monthly_price,annual_monthly_price,annual_discount,trial_days,is_popular,is_active,features
        } = req.body.newPlan
        console.log(req.body.newPlan)
        if(!tier || !styleKey ){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const createPlan = await pool.query(queries.CREATE_PLAN,[tier,styleKey,name,description,monthly_price,annual_monthly_price,annual_discount,trial_days,is_popular,is_active,features]);
        if(!createPlan.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not create the plan"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created a plan",
            data:createPlan.rows[0]
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

//get all plans
const getAllPlans = async(req,res)=>{
    try {
        const plans = await pool.query(queries.GET_ALL_PLANS);
        if(!plans.rows.length){
            return res.status(200).send({
                success:true,
                message:"No plans are available",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed plans",
            data:plans.rows
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
//delete plan
const deletePlan = async(req,res)=>{
    try {
        const {deleteId} = req.params;

        if(!deleteId) {
            return res.status(400).send({
                success:false,
                message:"Please provide the id"
            })
        }
        const deletePlan = await pool.query(queries.DELETE_PLAN,[deleteId]);
        if(!deletePlan.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not delete the plan"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted plan",
            data:deletePlan.rows[0]
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
//update plan
const updatePlan = async(req,res)=>{
  try {
    const {id,tier,styleKey,name,description,monthly_price,annual_monthly_price,annual_discount,trial_days,is_popular,is_active,features
       } = req.body.updated;
    const update = await pool.query(queries.UPDATE_PLAN,[tier,styleKey,name,description,monthly_price,annual_monthly_price,annual_discount,trial_days,is_popular,is_active,features,id]);
    if(!update.rows.length){
        return res.status(400).send({
            success:false,
            message:"Could not update the plan"
        })
    }
    return res.status(200).send({
        success:true,
        message:"Successfully updated the plan",
        data:update.rows[0]
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
//get license key 
const getLicenseKey = async(req,res)=>{
    try {
        const {orgId} = req.params;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required details"
            })
        }
        const getLicenseKey = await pool.query(queries.GET_LICENSE_KEY,[orgId,'active']);
        if(!getLicenseKey.rows.length){
            return res.status(200).send({
                success:true,
                message:"No active license keys",
                // data:{}
            })
        }
        const paymentData = [];

        for(const key of getLicenseKey.rows){
            const getPaymentData = await pool.query(queries.GET_PAYMENT_DATA,[key.plan_id,key.org_id]);
            if(!getPaymentData.rows.length)
                continue;
            for(const data of getPaymentData.rows){
                const dateYear = new Date(data.created_at).getFullYear()
                 paymentData.push({date:data.created_at,desc:`${key.plan_name} - ${(key.billing_cycle === "annual") ? "annual" : "monthly"} ${dateYear}`,amount:data.amount_paid,status:data.status});
            }
           
        }

        return res.status(200).send({
            success:true,
            message:"Successfully accessed the license key",
            data:getLicenseKey.rows[0],
            paymentData:paymentData
        })
    } catch (error) {
        console.log("Error in getting license key:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}
//get all license keys
const getAllLicenseKeys = async(req,res)=>{
    try {
        const getAllKeys = await pool.query(queries.GET_ALL_KEYS);
        if(!getAllKeys.rows.length){
            return res.status(200).send({
                success:true,
                message:"No license key",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed keys",
            data:getAllKeys.rows
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
//update license key
const updateLicenseKey = async(req,res)=>{
  try {
    const {updated} = req.body;
    const update = await pool.query(queries.UPDATE_KEY,[updated.features,updated.id]);
    if(!update.rows.length){
        return res.status(400).send({
            success:false,
            message:"Could not update the Key"
        })
    }
    return res.status(200).send({
        success:true,
        message:"Successfully updated the Key",
        data:update.rows[0]
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
//delete license key
const deleteKey = async(req,res)=>{
    try {
        const {deleteId} = req.params;

        if(!deleteId) {
            return res.status(400).send({
                success:false,
                message:"Please provide the id"
            })
        }
        const deleteKey = await pool.query(queries.DELETE_KEY,[deleteId]);
        if(!deleteKey.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not delete the key"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted key",
            data:deleteKey.rows[0]
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
const activateLicenseKey = async(req,res)=>{
    try {
         const {key} = req.body;
    if(!key){
        return res.status(400).send({
            success:false,
            message:"Please provide the required id"
        })
    }

    const activatekey = await pool.query(queries.ACTIVATE_KEY,[true,key]);
    if(!activatekey.rows.length){
        return res.status(200).send({
            success:true,
            message:"Could not activate",
            data:[]
        })
    }
    return res.status(200).send({
        success:true,
        message:"Successfully activated key",
        data:activatekey.rows[0]
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
//generate key manually for organization
//plans purchase
const generateUsageFromFeatures = (features) => {
  return Object.keys(features).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
};
const generateAndMailKey = async(req,res)=>{
    try {
        const {key,planId,billingCycle,orgId,organization,userId,orgEmail} = req.body;
        const isAnnual = billingCycle === "annual" || billingCycle === "true";
       const plan = await pool.query(queries.GET_PLAN,[planId]);
       const usage = generateUsageFromFeatures(plan?.rows[0].features);
        const createKey = await pool.query(queries.CREATE_LICENSE_KEY,[key,orgId,organization,plan?.rows[0].tier,plan?.rows[0].name,isAnnual ? "annual" : "monthly",'active',isAnnual ? "365" : "30",plan?.rows[0].features,usage,planId]);
        if(!createKey.rows.length){
            throw new Error("Could not create the plan") 
        }
        const userData = await getUserData(userId);
        const htmlTemplate = path.join(process.env.LICENSE_KEY_TEMPLATE_PATH);
        const placeholder = {
            name: userData?.name,
            email:orgEmail ? orgEmail : userData?.email,
            subject:'License Key',
            licenseKey: createKey.rows[0]?.license_key,
            planName: createKey.rows[0]?.plan_name,
            billingCycle: isAnnual ? "Annual" : "Monthly",
            amount: 0,
            expiryDate: createKey.rows[0]?.expires_at,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/billing`
            }
        
        await sendNotificationToMail(htmlTemplate,placeholder);
        return res.status(200).send({
            success:true,
            message:"Successfully generated key",
            data:createKey.rows[0]
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

//update the usage
const updateUsage = async(req,res)=>{
    try {
        const {licenseKey,featureKey,quantity} = req.body;
        if(!licenseKey || !featureKey){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const update = await pool.query(queries.UPDATE_CATALOGUES_PLAN,[featureKey,quantity,licenseKey]);
        if(!update.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not update the feature"
            })
        }
       return res.status(200).send({
        success:true,
        message:"Successfully updated the feature",
        data:update.rows[0]
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

module.exports={
     createPlan,
     getAllPlans,
     deletePlan,
     updatePlan,
     getLicenseKey,
     getAllLicenseKeys,
     updateLicenseKey,
     deleteKey,
     activateLicenseKey,
     generateAndMailKey,
     updateUsage
}