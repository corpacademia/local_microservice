const pool = require('../db/dbConfig');
const queries = require('./cloudCredentialsQueries');

const addOrgCloudCredentials = async(req,res)=>{
    try {
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

const addGlobalCloudCredentails = async(req,res)=>{
    try {
        const {provider,name,credentials,createdBy} = req.body;
        if(!provider || !name ||!credentials ||!createdBy){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        const addCredentials  = await pool.query(queries.INSERT_GLOBAL_CLOUD_CREDENTIALS,[createdBy,provider,name,credentials,createdBy]);
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
            const globalEdit = await pool.query(queries.EDIT_GLOBAL_CREDENTIALS,[provider,name,credentials,id])
            if(!globalEdit.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not insert the credentials"
            })
        }
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
                message:"Could not get the credentials",
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
//get global credentials
const getGlobalCloudCredentials = async(req,res)=>{
    try {
        const getCredentials = await pool.query(queries.GET_GLOBAL_CREDENTAILS);
        console.log("Credentials:",getCredentials)
        if(!getCredentials.rows.length){
            return res.status(200).send({
                success:true,
                message:"Could not get the credentials",
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
            error:error.message
        })
    }
}

//delete thhe credential
const deleteCredential = async(req,res)=>{
    try {
        const {id} = req.params;
        if(!id){
            return res.status(400).send({
                success:false,
                message:"Please provide the required field"
            })
        }
        let deleteData = await pool.query(queries.DELETE_GLOBALCLOUD_CREDENTIAL,[id]);
        if(!deleteData.rows.length){
            deleteData = await pool.query(queries.DELETE_ORGCLOUD_CREDENTIAL,[id]);
            if(!deleteData.rows.length){
                return res.status(404).send({
                    success:false,
                    message:"No data to delete"
                })
            }
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the data",
            data:deleteData.rows
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
    addOrgCloudCredentials,
    getOrgCloudCredentials,
    editOrgCloudCredentials,
    addGlobalCloudCredentails,
    getGlobalCloudCredentials,
    deleteCredential
}