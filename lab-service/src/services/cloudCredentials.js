const pool = require('../db/dbConfig');
const queries = require('./cloudCredentialsQueries');

const addOrgCloudCredentials = async(req,res)=>{
    try {
        console.log(req.body)
        const {provider,name,credentials,org_id,createdBy} = req.body;
        if(!provider || !name ||!credentials ||!org_id ||!createdBy){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        const addCredentials  = await pool.query(queries.INSERT_ORG_CLOUD_CREDENTIALS,[org_id,provider,name,credentials,createdBy]);
        if(!addCredentials.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not insert the credentials"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully added credentials",
            data:addCredentials.rows[0]
        })
    } catch (error) {
        console.log("error:",error);
        return res.status(500).send({
            success:true,
            message:"Internal server error",
            error:error.message
        })
    }
}

const editOrgCloudCredentials = async(req,res)=>{
    try {
        console.log(req.body)
        const {provider,name,credentials} = req.body;
        const {id}= req.params;
        if(!provider || !name ||!credentials ){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        const addCredentials  = await pool.query(queries.EDIT_CREDENTIALS,[provider,name,credentials,id]);
        if(!addCredentials.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not insert the credentials"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully added credentials",
            data:addCredentials.rows[0]
        })
    } catch (error) {
        console.log("error:",error);
        return res.status(500).send({
            success:true,
            message:"Internal server error",
            error:error.message
        })
    }
}

//get credentials
const getOrgCloudCredentials = async(req,res)=>{
    try {
        const {orgId} = req.params;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const getCredentials =  await pool.query(queries.GET_ORG_CREDENTIALS,[orgId]);
        if(!getCredentials.rows.length){
            return res.status(200).send({
                success:true,
                message:"Could not edit the credentials",
                data:[]
            })
        }
        return res.status(200).send({
                success:true,
                message:"Successfully edited the credentials",
                data:getCredentials.rows
            })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.messsage
        })
    }
}

module.exports={
    addOrgCloudCredentials,
    getOrgCloudCredentials,
    editOrgCloudCredentials
}