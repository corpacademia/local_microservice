const clusterService = require('../services/clusterService');

const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads');

const createVMClusterDatacenterLab = async(req,res)=>{
    try {
        const {userId,data} = req.body;
         const { userGuides = [], labGuides = [] } = data;
                const savedUserGuidePaths = [];
                const savedLabGuidePaths = [];
                // Save user guide files and collect full paths
                userGuides.forEach(file => {
              const base64Data = file.content.split(';base64,').pop();
              const filePath = path.join(uploadDir, file.name);
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              savedUserGuidePaths.push(filePath); 
            });
        
            // Save lab guide files and collect full paths
            labGuides.forEach(file => {
              const base64Data = file.content.split(';base64,').pop();
              const filePath = path.join(uploadDir, file.name);
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              savedLabGuidePaths.push(filePath); 
            });
            // Add full paths to the data object
            const updatedData = {
              ...data,
              userGuides: savedUserGuidePaths,
              labGuides: savedLabGuidePaths,
            };
        const result = await clusterService.createVMClusterDatacenterLab(updatedData,userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"Could not create the vmcluster datacenter lab"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created the vm cluster lab",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in creating vmcluster datacenter lab",
            error:error.message
        })
    }
}

//get all labs of user
const getVMClusterDatacenterlab = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await clusterService.getVMClusterDatacenterlab(userId);

    if (!result || result.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No labs found for the user",
        data: [],
      });
    }

    return res.status(200).send({
      success: true,
      message: "Successfully accessed the labs",
      data: result,
    });
  } catch (error) {
    console.error("Error in getVMClusterDatacenterlab:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error while fetching labs",
      error: error.message,
    });
  }
};


//get datacenter lab by labId
const getVMClusterDatacenterlabOnLabId = async(req,res)=>{
    try {
        const {labId} = req.body;
        const result = await clusterService.getVMClusterDatacenterlabOnLabId(labId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"No labs found for the labid"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the labs",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in getting the labs",
            error:error.message
        })
    }
}

//delete the datacenter lab
const deleteDatacenterLab = async(req,res)=>{
    try {
        const labId = req.params.labId;
        await clusterService.deleteDatacenterLab(labId);

        return res.status(200).send({
            success:true,
            messsage:"Successfully deleted the  lab"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in deleting the datacenter lab",
            error:error.message
        })
    }
}

//update the vm cluster datacenter lab
const updateSingleVMDatacenterLab = async(req,res)=>{
    try {
       const labGuideFile = req.files?.labGuide?.[0] // new file if any
       const userGuideFile = req.files?.userGuide?.[0];
       let {labId , title ,description ,startDate,endDate,software,existingLabGuide,existingUserGuide,credentials,vmConfigs} = req.body;
       const finalLabGuide = [existingLabGuide, labGuideFile?.path].filter(Boolean);
       const finalUserGuide = [existingUserGuide, userGuideFile?.path].filter(Boolean);
       software = software.length > 0 ? JSON.parse(software) : null;
       const result  = await clusterService.updateVMClusterDatacenterLab(labId , title ,description ,startDate,endDate,software,finalLabGuide,finalUserGuide,JSON.parse(credentials),JSON.parse(vmConfigs));
       if(!result){
        return res.status(400).send({
            success:false,
            message:"Could not update the lab"
        })
       }
       return res.status(200).send({
        success:true,
        message:"Successfully updated the lab",
        data:result
       })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:'Error in updating vm cluster datacenter lab',
            error:error.message
        })
    }
}

//update the uservm enable/disable
const updateUserVM = async(req,res)=>{
    try {
         const data = req.body;
        const result = await clusterService.updateUserVM(data);
        if(!result){
             return res.status(400).send({
             success:false,
             message:"Could not update the vmcluster datacenter lab"
             })
            }
   return res.status(200).send({
    success:true,
    message:"Successfully updated the vmcluster datacenter lab",
    data:result
   })
    } catch (error) {
        console.log("Error in updating the vmcluster datacenter lab:",error.message);
        return res.status(500).send({
            success:false,
            message:"Error in updating the vmcluster datacenter lab",
            error:error.message
        })
    }
  

}

//update the uservm details
const updateUserVMWithProtocol = async(req,res)=>{
    try {
        const data = req.body;
        const result =  await clusterService.updateUserVMWithProtocol(data);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"No user vm found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully updated the user vm',
            data:result
        })
    } catch (error) {
        console.log("Error in updating the user vm details",error);
        return res.status(500).send({
            success:false,
            message:'Error in updating the user vm details',
            error:error.message
        })
    }
}

const vmclusterDatacenterLabOrgAssignment = async (req,res)=>{
    try {
        const data  = req.body;
        const result =  await clusterService.vmclusterDatacenterLabOrgAssignment(data);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could nor assign the vmclusterdatacenter lab to organization"
            })
        }
        return res.status(200).send({
           success:true,
           message:"Successfully assigned lab to organization",
           data:result
        })
    } catch (error) {
        console.log('Error in assigning lab to organization'+error.message);
        return res.status(500).send({
            success:false,
            message:"Error in assigning vmcluster datacenter lab to organization",
            error:error.message
        })
    }
}

//get all the organization labs
const getAllTheOrganizationLabs = async(req,res)=>{
    try {
        const {orgId} = req.body;
        const orgLabs = await clusterService.getAllTheOrganizationLabs(orgId);
        if(!orgLabs){
            return res.status(404).send({
                success:false,
                message:"No labs found for the organization"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the organization labs",
            data:orgLabs
        })
    } catch (error) {
        console.log("Error in getting organization labs:"+error);
        return res.status(500).send({
            success:false,
            messsage:"Error in getting the organization labs",
            error:error.message
        })
    }
}

//assign the labs to user
const assignLabToUser = async(req,res)=>{
    try {
        const {labId, userId, assignedBy, startDate, endDate,orgId} = req.body;
        const result = await clusterService.assignLabToUser(labId, userId, assignedBy, startDate, endDate,orgId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not assign the lab to user"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully assigned the lab to user",
            data:result
        })
    } catch (error) {
        console.log("Error in assigning lab to user:", error.message);
        return res.status(500).send({
            success:false,
            message:"Error in assigning lab to user",
            error:error.message
        })
    }
}

//get user assigned datancenter labs
const getUserAssignedDatacenterLabs = async(req,res)=>{
    try {
        const {userId} = req.params;
        const result = await clusterService.getUserAssignedDatacenterLabs(userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No labs found for the user"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the user assigned labs",
            data:result
        })
    } catch (error) {
        console.log("Error in getting user assigned datacenter labs:", error.message);
        return res.status(500).send({
            success:false,
            message:"Error in getting user assigned datacenter labs",
            error:error.message
        })
    }
}

//get user assigned credentials
const gerUserCredentialsForUser = async(req,res)=>{
    try {
        const {labId,userId} = req.body;
        const result = await clusterService.gerUserCredentialsForUser(labId,userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No user credentials found for the lab"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the user credentials",
            data:result
        })
    } catch (error) {
        console.log("Error in getting user credentials for user:", error);
        return res.status(500).send({
            success:false,
            message:"Error in getting user credentials for user",
            error:error.message
        })
    }
}

//delete datacenter lab from organization
const deleteDatacenterLabFromOrg = async(req,res)=>{
    try {
        const {labId,orgId,adminId} = req.body;
        const result = await clusterService.deleteDatacenterLabFromOrg(labId,orgId,adminId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not delete the datacenter lab from organization"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the datacenter lab from organization",
            data:result
        })
    } catch (error) {
        console.log("Error in deleting datacenter lab from organization:", error.message);
        return res.status(500).send({
            success:false,
            message:"Error in deleting datacenter lab from organization",
            error:error.message
        })
    }
}

//delete datacenter lab of user
const deleteDatacenterLabOfUser = async(req,res)=>{
    try {
        const {labId,orgId,userId} = req.body;
        const result = await clusterService.deleteDatacenterLabOfUser(labId,orgId,userId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not delete the datacenter lab of user"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the datacenter lab of user",
            data:[]
        })
    } catch (error) {
        console.log("Error in deleting datacenter lab of user:", error.message);
        return res.status(500).send({
            success:false,
            message:"Error in deleting datacenter lab of user",
            error:error.message
        })
        
    }
}

module.exports = {
    createVMClusterDatacenterLab,
    getVMClusterDatacenterlab,
    deleteDatacenterLab,
    updateSingleVMDatacenterLab,
    updateUserVM,
    updateUserVMWithProtocol,
    vmclusterDatacenterLabOrgAssignment,
    getAllTheOrganizationLabs,
    assignLabToUser,
    getUserAssignedDatacenterLabs,
    getVMClusterDatacenterlabOnLabId,
    gerUserCredentialsForUser,
    deleteDatacenterLabFromOrg,
    deleteDatacenterLabOfUser
}