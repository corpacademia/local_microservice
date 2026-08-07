const labService = require('../services/labService');

const path = require('path');
const fs = require('fs');
const cookie = require('cookie');
const pool = require('../db/dbConfig');

const uploadDir = path.join(__dirname, '../public/uploads');

const {executeCron} = require('../services/labStatusService');
executeCron();
const {executeNotificationCron, executeStaleSessionReaper} = require('../services/notificationServices');
executeNotificationCron();
executeStaleSessionReaper();
const { startBrowserStreamServer } = require('../services/browserStreamServer');
startBrowserStreamServer();

const createLab = async (req, res) => {
  try {
    const { data, user} = req.body;
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

    const output = await labService.createLab(updatedData, user);

    if (!output) {
      return res.status(405).send({
        success: false,
        message: "Could not store the lab catalogue",
      });
    }

    res.status(200).send({
      success: true,
      message: "Successfully stored the catalogue",
      output,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Could not create the lab",
      error,
    });
  }
};

const getLabsOfLabadmins = async(req,res)=>{
    try {
        const {userIds} = req.body;
        console.log(req.body)
        if(!userIds.length){
            return res.status(400).send({
                success:false,
                message:"Please Provide the user Ids"
            })
        }
        const result = await labService.getSingleVMAwsLabsOnOrgId(userIds);
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the labs",
            data:result
        })
    } catch (error) {
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}
//create single vm datacenter lab
const createSingleVmDatacenterLab = async (req,res)=>{
    try {
        const { data, user } = req.body;
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
        const output = await labService.createSingleVmDatacenterLab(updatedData, user);
        if (!output) {
            return res.status(405).send({
                success: false,
                message: "Could not store the single vm datacenter lab",
            });
        }
        return res.status(200).send({
            success: true,  
            message: "Successfully stored the single vm datacenter lab",
            data:output,
        });

    } catch (error) {
        console.error("Error in creating single vm datacenter lab:", error);
        return res.status(500).send({
            success: false,
            message: "Could not create the single vm datacenter lab",
            error: error.message,
        });
        
    }
}

const getAllLab = async(req,res)=>{
    try{
        const labs = await labService.getAllLab();
        if(!labs.rows){
            return res.status(405).send({
                success:false,
                message:"Could not get the labs"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully retrieved the labs',
            data:labs.rows
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in gettings the labs",
            error,
        })
    }
}
const getAllLabs = async(req,res)=>{
    try{
        const labs = await labService.getAllLabs();
        if(!labs.length){
            return res.status(405).send({
                success:false,
                message:"Could not get the labs"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully retrieved the labs',
            data:labs
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in gettings the labs",
            error,
        })
    }
}

//get datacenter lab on admin id
const getDatacenterLabOnAdminId = async (req, res) => {
    try {
        const { adminId } = req.body;
        const result = await labService.getDatacenterLabsOnAdminId(adminId);
        if (!result || result.length === 0) {
            return res.status(200).send({
                success: true,
                message: "No datacenter labs found for the provided adminId",
                data:[]
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully accessed datacenter labs",
            data: result,
        });
    } catch (error) {
        console.log("Error:",error)
        return res.status(500).send({
            success: false,
            message: "Error in getting the datacenter labs",
            error: error.message,
        });
    }
}

const getDatacenterLabAdminsLab = async(req,res)=>{
      try {
        const { adminIds } = req.body;
        const result = await labService.getDatacenterLabAdminsLab(adminIds);
        if (!result || result.length === 0) {
            return res.status(200).send({
                success: true,
                message: "No datacenter labs found for the provided adminId",
                data:[]
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully accessed datacenter labs",
            data: result,
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Error in getting the datacenter labs",
            error: error.message,
        });
    }
}

const getDatacenterLabOnLabId = async (req, res) => {
    try {
        const { labId } = req.body;
        const result = await labService.getDatacenterLabsOnLabId(labId);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No datacenter labs found for the provided adminId",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully accessed datacenter labs",
            data: result,
        });
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success: false,
            message: "Error in getting the datacenter labs",
            error: error.message,
        });
    }
}
//connect to datacenter vm
const connectDatacenterVM = async(req,res)=>{
    try {
    const {Protocol,VmId,Ip,userName,password,port} = req.body;

    if(!Protocol || !VmId || !Ip || !userName ||!password ||!port){
        return res.status(404).send({
            success:false,
            message:"Please Provide the required fields."
        })
    }
    const result = await labService.connectToVm(Protocol,VmId,Ip,userName,password,port);
    if(!result.success){
        return res.stautus(404).send({
            success:false,
            message:"Could not connect to datacenter vm"
        })
    }
    return res.status(200).send({
        success:true,
        message:"Successfully connected to vm",
        token:result
    })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error connectin to VM",
            error:error.message
        })
    }
   

}

//get datacenter lab credentials
const getDatacenterLabCredentials = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) {       
            return res.status(400).send({
                success: false,
                message: "labId is required",
            });
        }
        const result = await labService.getDatacenterLabCredentials(labId);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No credentials found for the provided labId",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully accessed datacenter lab credentials",
            data: result,
        });
    } catch (error) {
        console.log("Error in getting datacenter lab credentials:", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting the datacenter lab credentials",
            error: error.message,
        });
    }
}

//update single vm datacenter lab
const updateSingleVmDatacenterLab = async (req, res) => {
    try {
        console.log(req.body)
        const { software, catalogueType, labId,catalogueName,level,category,price,hoursPerDay } = req.body;
        if (!software || !catalogueType || !labId ||!catalogueName || !level || !category || !price || !hoursPerDay) {
            return res.status(400).send({
                success: false,
                message: "Software, catalogueType, and labId are required",
            });
        }
        const result = await labService.updateSingleVmDatacenterLab(labId,software, catalogueType,catalogueName,level,category,price,hoursPerDay); 
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No datacenter lab found for the provided labId",
            });
        }

       
        return res.status(200).send({
            success: true,
            message: "Successfully updated the single VM datacenter lab",
            data: result,
        });
    } catch (error) {
        console.error("Error in updating single VM datacenter lab:", error);
        return res.status(500).send({
            success: false,
            message: "Error in updating the single VM datacenter lab",
            error: error.message,
        });
    }
}


//get all lab catalogues
const getAllLabCatalogues = async (req, res) => {
    try {
        console.log('getting a request');
        const {user} = req.body;
        const result = await labService.getAllLabCatalogues(user);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No lab catalogues found",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully retrieved all lab catalogues",
            data: result,
        });
    } catch (error) {
        console.error("Error in getting all lab catalogues:", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting all lab catalogues",
            error: error.message,
        });
    }
}
//get all org labs
const getAllOrgLabs = async(req,res)=>{
    try {
        const {orgId} = req.body;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const result = await labService.getAllOrganizationLabs(orgId);
        if(!result) return [];
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the labs",
            data:result
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

//get user purchased single vm labs
const getUserPurchasedSinglvmLabs = async (req, res) => {
    try {
        const {userId} = req.body;
        if(!userId){
            return res.status(400).send({
                success:true,
                message:"Please provide the userid",
            })
        }
        const result = await labService.getUserPurchasedSinglvmLabs(userId);
        if (!result || result.length === 0) {
            return res.status(200).send({
                success: false,
                message: "No lab  found",
                data: [],
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully retrieved all lab ",
            data: result,
        });
    } catch (error) {
        console.error("Error in getting all lab :", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting all lab ",
            error: error.message,
        });
    }
}

//get all user purchased labs (superadmin view — all users)
const getAllUserPurchasesForAdmin = async (req, res) => {
    try {
        const result = await pool.query(`
    /* -------------------- Single VM AWS -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.start_date,
        p.completions_date AS end_date,
        p.status,
        p.duration::text,
        'singlevm_aws' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(cl.cataloguename, cl.title, 'Lab') AS lab_title
    FROM singlevm_aws_purchased_labs p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN createlab cl
        ON cl.lab_id::text = p.labid::text

    UNION ALL

    /* -------------------- CloudSlice -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.start_date,
        p.end_date,
        p.status,
        p.duration::text,
        'cloudslice' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(csl.cataloguename, csl.title, 'Lab') AS lab_title
    FROM cloudslice_purchased_labs p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN cloudslicelab csl
        ON csl.labid::text = p.labid::text

    UNION ALL

    /* -------------------- Single VM Proxmox -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.startdate AS start_date,
        p.enddate AS end_date,
        p.status,
        p.duration::text,
        'singlevmproxmox' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(pl.cataloguename, pl.title, 'Lab') AS lab_title
    FROM singlevmproxmox_purchased_labs p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN singlevmproxmox_lab pl
        ON pl.labid::text = p.labid::text

    UNION ALL

    /* -------------------- VM Cluster Proxmox -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.startdate AS start_date,
        p.enddate AS end_date,
        p.status,
        p.duration::text,
        'vmclusterproxmox' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(pl.cataloguename, pl.title, 'Lab') AS lab_title
    FROM proxmox_cluster_purchased p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN proxmoxcluster_lab pl
        ON pl.labid::text = p.labid::text

    UNION ALL

    /* -------------------- Single VM Datacenter -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.startdate AS start_date,
        p.enddate AS end_date,
        p.status,
        p.duration::text,
        'singlevmdatacenter' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(dl.cataloguename, dl.title, 'Lab') AS lab_title
    FROM singlevmdatacenter_purchased p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN singlevmdatacenter_lab dl
        ON dl.lab_id::text = p.labid::text

    UNION ALL

    /* -------------------- VM Cluster Datacenter -------------------- */
    SELECT
        p.labid,
        p.user_id,
        p.startdate AS start_date,
        p.enddate AS end_date,
        p.status,
        p.duration::text,
        'vmclusterdatacenter' AS lab_type,
        COALESCE(u.name, ou.name) AS user_name,
        COALESCE(u.email, ou.email) AS user_email,
        COALESCE(vcl.cataloguename, vcl.title, 'Lab') AS lab_title
    FROM vmclusterdatacenter_purchased p
    LEFT JOIN users u
        ON u.id::text = p.user_id::text
    LEFT JOIN organization_users ou
        ON ou.id::text = p.user_id::text
    LEFT JOIN vmclusterdatacenter_lab vcl
        ON vcl.labid::text = p.labid::text

    ORDER BY start_date DESC;
`);
        return res.status(200).send({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getAllUserPurchasesForAdmin:', error);
        return res.status(500).send({ success: false, message: 'Error fetching user purchases', error: error.message });
    }
};

//get all user purchased labs

const getAllUserPurchasedLabs = async (req, res) => {
    try {
        const {userId} = req.body;
        if(!userId){
            return res.status(400).send({
                success:true,
                message:"Please provide the userid",
            })
        }
        const result = await labService.getAllUserPurchasedLabs(userId);
        if (!result || result.length === 0) {
            return res.status(200).send({
                success: false,
                message: "No lab  found",
                data: [],
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully retrieved all lab ",
            data: result,
        });
    } catch (error) {
        console.error("Error in getting all lab :", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting all lab ",
            error: error.message,
        });
    }
}

//get user dashboard labs with titles — used by user-role overview page
const getUserDashboardLabs = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).send({ success: false, message: 'Please provide userId' });
        }
        const result = await labService.getUserDashboardLabs(userId);
        return res.status(200).send({
            success: true,
            message: 'Successfully retrieved user dashboard labs',
            data: result || [],
        });
    } catch (error) {
        console.error('Error in getUserDashboardLabs:', error);
        return res.status(500).send({ success: false, message: 'Error fetching dashboard labs', error: error.message });
    }
}

//get user purchased single vm labs on labid
const getUserPurchasedSinglvmLabsOnLabId = async (req, res) => {
    try {
        const {labId} = req.body;
        if(!labId){
            return res.status(400).send({
                success:true,
                message:"Please provide the labId",
            })
        }
        const result = await labService.getUserPurchasedSinglvmLabsOnLabId(labId);
        if (!result || result.length === 0) {
            return res.status(200).send({
                success: false,
                message: "No lab  found",
                data: [],
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully retrieved all lab ",
            data: result,
        });
    } catch (error) {
        console.error("Error in getting all lab :", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting all lab ",
            error: error.message,
        });
    }
}

//delete lab catalogue
const deleteCatalogue = async (req, res) => {
    try {
        const { catalogueId } = req.params;
        if (!catalogueId) {
            return res.status(400).send({
                success: false,
                message: "catalogueId is required",
            });
        }
        const result = await labService.deleteCatalogue(catalogueId);
        if (!result) {

            return res.status(404).send({
                success: false,
                message: "No catalogue found for the provided catalogueId",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully deleted the lab catalogue",
            data: result,
        });
    } catch (error) {
        console.error("Error in deleting lab catalogue:", error);
        return res.status(500).send({
            success: false,
            message: "Error in deleting the lab catalogue",
            error: error.message,
        });
    }
}

//update the catalogue details
const updateCatalogueDetails = async (req, res) => {
    try {
        const { id, category, description, price, level, title, provider } = req.body;
        if (!id || !title || !description || !level || !category || !price || !provider) {
            return res.status(400).send({
                success: false,
                message: "All fields are required: id, title, description, level, category, and price",
            });
        }
        const result = await labService.updateCatalogueDetails(id, category, description,price,level,provider,title );
        console.log(result)
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No catalogue found for the provided catalogueId",
            });
        }
        
        return res.status(200).send({
            success: true,
            message: "Successfully updated the catalogue details",
            data: result,
        });
    } catch (error) {
        console.error("Error in updating catalogue details:", error);
        return res.status(500).send({
            success: false,
            message: "Error in updating catalogue details",
            error: error.message,
        });
    }
};

//update single vm datacenter user creds running state
const updateSingleVMDatacenterUserCredRunningState = async (req, res) => {
    try {
        const { isrunning, userId, labId, purchased=false,hoursPerDay,duration } = req.body;
        
        if (!userId || !labId ) {
            return res.status(400).send({
                success: false,
                message: "Please Provide All The Required Fields",
            });
        }
        const result = await labService.updateSingleVMDatacenterUserCredRunningState(isrunning, userId, labId,purchased,hoursPerDay,duration); 
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No datacenter lab found for the provided labId",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully updated the single VM datacenter creds running state",
            data: result,
        });
    } catch (error) {
        console.error("Error in updating single VM datacenter user creds running state :", error);
        return res.status(500).send({
            success: false,
            message: "Error in updating single VM datacenter user creds running state",
            error: error.message,
        });
    }
}
 const getAllOrganizationAssignedLabs = async (req,res) => {
    const {orgId} = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "orgId is required",
    });
  }

  try {
    

    const  rows  = await labService.getAllOrganizationAssignedLabs(orgId);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching organization assigned labs:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization assigned labs",
    });
  }
};

//delete single vm datacenter lab of user
const deleteSingleVMDatacenterLabOfUser = async (req,res)=>{
    try {
        const { labId,userId,purchased } = req.body;
        if(!labId || !userId){
            return res.status(404).send({
                success:false,
                message:"Please Provide the required fields"
            })
        }
        
        const result = labService.deleteSingleVMDatacenterLabForUser(labId,userId,purchased);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not delete the single vm datacenter lab of user"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the lab"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in deleting the single vm datacenter lab",
            error:error.message
        })
    }
}
//delete the single vm datacenter lab of org
const deleteSingleVMDatacenterLabFromOrg = async (req,res)=>{
    try {
        const { labId,orgId } = req.body;
        if(!labId || !orgId){
            return res.status(404).send({
                success:false,
                message:"Please Provide the required fields"
            })
        }
        const result = labService.deleteSingleVMDatacenterLabFromOrg(labId,orgId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not delete the single vm datacenter lab "
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the lab"
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in deleting the single vm datacenter lab",
            error:error.message
        })
    }
}

//update the single vm datacenter lab
const updateSingleVMDatacenterLabContent = async(req,res)=>{
    try {
       const labGuideFile = req.files?.labGuide?.[0]; // new file if any
       const userGuideFile = req.files?.userGuide?.[0];
       let {labId , title ,description ,startDate,endDate,software,existingLabGuide,existingUserGuide,credentials} = req.body;
       const finalLabGuide = [existingLabGuide, labGuideFile?.path].filter(Boolean);
      const finalUserGuide = [existingUserGuide, userGuideFile?.path].filter(Boolean);
        software = software.length > 0 ? JSON.parse(software) : null;
       const result = await labService.updateSingleVMDatacenterLab(title,description,startDate,endDate,finalLabGuide,finalUserGuide,labId,software,JSON.parse(credentials));
       if(!result){
        return res.status(400).send({
            success:false,
            message:"Could not edit the lab"
        })
       }
       return res.status(200).send({
        success:true,
        message:"Successfully edited the lab",
        data:result
       })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:true,
            message:"Error in editing the lab",
            error:error.message
        })
    }
}

const updateSingleVMAwsLab = async(req,res)=>{
    try {
        const labGuidesFile = req.files?.labGuide?.[0]; // new file if any
        const userGuidesFile = req.files?.userGuide?.[0];

        const { title, description, cpu, ram, os, provider, instance, software, existingLabGuide, existingUserGuide, startDate, endDate, labId } = req.body;
        const finalLabGuide = [existingLabGuide, labGuidesFile?.path].filter(Boolean);
        const finalUserGuide = [existingUserGuide, userGuidesFile?.path].filter(Boolean);
        const softwareArray = software.length > 0 ? JSON.parse(software) : null;
        const result = await labService.updateSingleVMAwsLab(title, description, cpu, ram, os, provider, instance, softwareArray, finalLabGuide, finalUserGuide, endDate, labId);
        if (!result) {
            return res.status(400).send({
                success: false,
                message: "Could not update the lab"
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully updated the lab",
            data: result
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: "Error in updating the lab",
            error: error.message
        });
    }
}

const getLabOnId = async(req,res)=>{
    try{
        const {labId} = req.body;
        const result = await labService.getLabOnId(labId);

        if (!result ) {
          return res.status(404).send({
            success: false,
            message: "No lab found for the provided labId",
          });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed lab catalogue",
            data:result,
        })
    }
    catch(error){
        return res.status(500).send({
            success:false,
            message:"Error in getting the lab",
            error,
        })
    }
}

//assign single vm datacenter lab to organization
const assignSingleVmDatacenterLab = async (req, res) => {
    try { 
        console.log(req.body);
        const { labId, orgId,admin_id, assignedBy,startDate,endDate } = req.body;
        if (!labId || !orgId || !assignedBy ) {
            return res.status(400).send({
                success: false,
                message: "labId, orgId and assignedBy are required",
            });
        }
        const result = await labService.createDatacenterLabOrgAssignment(labId, orgId,admin_id, assignedBy,startDate,endDate);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No assignment found for the provided labId and orgId",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully assigned the single VM datacenter lab to the organization",
            data: result,
        });
    } catch (error) {
        console.error("Error in assigning single VM datacenter lab:", error);
        return res.status(500).send({
            success: false,
            message: "Error in assigning the single VM datacenter lab",
            error: error.message,
        });
    }
};
//get the org assigned labs
const getOrgAssignedSingleVMDatacenterLab = async(req,res)=>{
    try {
        console.log(req.body);
        const {orgId,created_by} = req.body;
        if( !orgId || !created_by){
            return res.status(404).send({
                success:false,
                message:"Please Provide the labid or admin id"
            })
        }
        const result = await labService.getOrgAssignedsingleVMDatacenterLab(orgId,created_by);
        if(!result || result?.rows?.length === 0){
            return res.status(400).send({
                success:false,
                message:"No lab is found for this organization for this lab"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully Fetched the lab",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in getting the lab",
            error,
        })
    }
}
//assign single vm datacenter credentials to organization
const assignSingleVmDatacenterLabCredentialsToOrg = async (req, res) => {
    try {
        const { labId, orgAssigned, assignedBy,admin_id } = req.body;
        if (!labId || !orgAssigned || !assignedBy) {
            return res.status(400).send({
                success: false,
                message: "labId, orgAssigned, and assignedBy are required",
            });
        }
        const result = await labService.assignSingleVmDatacenterCredsToOrg(labId, orgAssigned, assignedBy,admin_id);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No credentials found for the provided labId",
            });
        }
        console.log(result)
        return res.status(200).send({
            success: true,
            message: "Successfully assigned the single VM datacenter lab credentials to the organization",
            data: result,
        });
    } catch (error) {
        console.error("Error in assigning single VM datacenter lab credentials:", error);
        return res.status(500).send({
            success: false,
            message: "Error in assigning the single VM datacenter lab credentials",
            error: error.message,
        });
    }
};

//edit single vm datacenter lab credentials
const editSingleVmDatacenterLabCredentials = async (req, res) => {
    try {
        const { username, password, ip, port, protocol, id, labId } = req.body;
        console.log(username, password, ip, port, protocol, id, labId);
        if (!username || !password || !ip || !port || !protocol || !id || !labId) {
            return res.status(400).send({
                success: false,
                message: "All fields are required: username, password, ip, port, protocol, id, and labId",
            });
        }
        const result = await labService.editSingleVmDatacenterCreds(username, password, ip, port, protocol, id, labId);
        if (!result || result.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No credentials found for the provided id and labId",
            });
        }
        return res.status(200).send({

            success: true,
            message: "Successfully edited the single VM datacenter lab credentials",
            data: result,

        });
    } catch (error) {
        console.error("Error in editing single VM datacenter lab credentials:", error);
        return res.status(500).send({
            success: false,
            message: "Error in editing the single VM datacenter lab credentials",
            error: error.message,
        });
    }
};
//update the single vm datacenter creds
const updateSingleVmDatacenterCredsDisable = async(req,res)=>{
    try {
        const {id,disable} = req.body;
        console.log(req.body)
        if(!id){
            return res.status(400).send({
                success:false,
                message:"Please Provide the field id"
            })
        }
        const result = await labService.updateSingleVmDatacenterCredsDisable(id,disable);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No credentials found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the credentials",
            data:result
        })
    } catch (error) {
         console.error("Error in editing single VM datacenter lab credentials:", error);
        return res.status(500).send({
            success: false,
            message: "Error in editing the single VM datacenter lab credentials",
            error: error.message,
        });
    }
}
//delete the single vm datacenter lab
const deleteSingleVmDatacenterLab = async(req,res)=>{
    try {
        const  labId = req.params.labId;
        if(!labId){
             return res.status(400).send({
                success: false,
                message: "All fields are required: username, password, ip, port, protocol, id, and labId",
            });
        }
        const result = await labService.deleteSingleVmDatacenterLab(labId);
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the lab",
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in deleting the single vm datacenter lab",
            error:error.message
        })
    }
}

//assign single vm datacenter lab to users

const assignSingleVMDatacenterLabToUsers = async(req,res)=>{
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        const data =  req.body;
        const result =  await labService.assignSingleVmDatacenterLabToUser(data,sessionToken);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not assign the lab to user"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully assigned lab to user",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in assigning single vm datacenter lab to user",
            error:error.message
        })
    }
}

const getUserAssignedSingleVMDatacenterCredsToUser = async(req,res)=>{
    try {
        const {labId,userId} = req.body;
        if(!userId || !labId){
            return res.status(404).send({
                success:false,
                message:"Please Provide the required fields"
            })
        }
        const result =  await labService.getUserAssignedSingleVMDatacenterCredsToUser(labId,userId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:'No Lab credentials found for this user'
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the lab credentials",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Error in getting the single vm datacenter lab credentials for user",
            error:error.message
        })
    }
}
//const get user assigned datacenter single vm labs

const getUserAssignedSingleVMDatacenterLabs = async(req,res)=>{
    try {
        const {userId} = req.params;
        if(!userId){
            return res.status(404).send({
                success:false,
                message:"Please Provide the user id"
            })
        }
        const result =  await labService.getUserAssignedSingleVMDatacenterLabs(userId);
        if(!result){
            return res.status(400).send({
                success:false,
                message:'No Labs found for this user'
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
            message:"Error in getting the single vm datacenter lab",
            error:error.message
        })
    }
}

const getUserPurchasedSingleVMDatacenterLabs = async(req,res)=>{
    try {
        const {userId} = req.params;
        if(!userId){
            return res.status(404).send({
                success:false,
                message:"Please Provide the user id"
            })
        }
        const result =  await labService.getUserPurchasedSingleVMDatacenterLabs(userId);
        if(!result){
            return res.status(200).send({
                success:true,
                message:'No Labs found for this user',
                data:[]
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
            message:"Error in getting the single vm datacenter lab",
            error:error.message
        })
    }
}

const assignLab = async (req, res) => {
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        const { lab, userId, assign_admin_id,startDate,endDate } = req.body;
        const response = await labService.assignLab(lab, userId, assign_admin_id,startDate,endDate,sessionToken);
        
        return res.status(200).send({
            success: true,
            message: "Lab assignments processed",
            ...response, // Successful assignments and errors
        });
        } catch (error) {
                return res.status(500).send({
                    success: false,
                    message: "Error in assigning the labs",
                    error: error.message,
                });
        }
};

//get the single vm datacenter labs 
const getSingleVmDatacenterLabs = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {  
            return res.status(400).send({
                success: false, 
                message: "userId is required",
            });
        }
        const data = await labService.getAllSingleVMDatacenterLabs(userId);
        if (!data) {
            return res.status(404).send({
                success: false,
                message: "No single VM datacenter labs found for the provided userId",
            });
        }   
        return res.status(200).send({
            success: true,
            message: "Successfully accessed the single VM datacenter labs",
            data,
        });
    } catch (error) {
        console.error("Error in getting single VM datacenter labs:", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting the single VM datacenter labs",
            error: error.message,
        }); 
    }   
};


const getAssignLabOnId = async (req, res) => {
    try {
        const { userId } = req.body;
        const data = await labService.getAssignLabOnId(userId);
        return res.status(200).send({
            success: true,
            message: "Successfully accessed the labs",
            data,
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};
const getAssignLabOnLabId = async(req,res)=>{
    try {
        const {labId,userId} = req.body;
        const data = await labService.getAssignLabOnLabId(labId,userId);
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the lab",
            data
        })

    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
}

const getInstanceOnParameters = async (req, res) => {
    try {
        const { cloud, cpu, ram } = req.body;
        const data = await labService.getInstanceOnParameters(cloud, cpu, ram);
      
        return res.status(200).send({
            success: true,
            message: "Successfully accessed the data",
            result:data,
        });
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message,
        });
    }
};
const getInstanceDetailsForPricing = async (req, res) => {
    try {
        const { provider, instance, cpu, ram } = req.body;
        const data = await labService.getInstanceDetailsForPricing(provider, instance, cpu, ram);

        return res.status(200).send({
            success: true,
            message: "Successfully accessed the details",
            data,
        });
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message,
        });
    }
};

const updateLabsOnConfig = async (req, res) => {
    try {
        const { lab_id, admin_id, config_details } = req.body;

        const updatedLab = await labService.updateLabConfig(lab_id, admin_id, config_details);

        if (!updatedLab) {
            return res.status(404).send({
                success: false,
                message: "Invalid Details for updating lab"
            });
        }

        return res.status(201).send({
            success: true,
            message: "Successfully updated the lab configuration",
            data: updatedLab
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Could not update the lab config",
            error,
        });
    }
};

//update single vm aws
const updateSingleVMAws =  async(req,res)=>{
    try {
        const {catalogueName, numberOfDays,hoursPerDay,expiresIn,software,catalogueType,labId,level,category,price} = req.body;
        if(!catalogueName || !numberOfDays ||!hoursPerDay||!expiresIn||!catalogueType ||!labId || !level || !category || !price){
            return res.status(400).send({
                success:false,
                message:'Please provide all the required fields'
            })
        }
        const result = await labService.updateSingleVMAws(catalogueName, numberOfDays,hoursPerDay,expiresIn,software,catalogueType,labId,level,category,price);
        if(!result || !result.length === 0){
            return res.status(404).send({
                success:false,
                message:"No lab found to update the catalogue details"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfull updated",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal Server Error",
            error:error.message
        })
    }
}

//update the lab timings
const updateUserLabTimingsOfSingleVMDatacenter = async (req,res)=>{
        try {
            const {labId,identifier,startTime,endTime,type} = req.body;
            if(!labId||!identifier||!startTime||!endTime || !type){
                return res.status(404).send({
                    success:false,
                    message:"Please provide all required fields"
                })
            }
            const result = await labService.updateUserLabTimingsOfSingleVMDatacenter(labId,identifier,startTime,endTime,type);
            return res.status(200).send({
                success:true,
                message:"Successfully updated the lab timings",
                data:result
            })
        } catch (error) {
            console.log(error);
            return res.status(500).send({
                success:false,
                message:"Internal server error",
                error:error?.message
            })
        }
}

//update the aws single vm user lab timings
const updateUserLabTimingsOfAwsSingleVMDatacenter = async (req,res)=>{
        try {
            const {labId,identifier,startTime,endTime,type} = req.body;
            if(!labId||!identifier||!startTime||!endTime||!type){
                return res.status(404).send({
                    success:false,
                    message:"Please provide all required fields"
                })
            }
            const result = await labService.updateUserLabTimingsOfAwsSingleVMDatacenter(labId,identifier,startTime,endTime,type);
            return res.status(200).send({
                success:true,
                message:"Successfully updated the lab timings",
                data:result
            })
        } catch (error) {
            console.log(error);
            return res.status(500).send({
                success:false,
                message:"Internal server error",
                error:error?.message
            })
        }
}

const awsConfigure = async (req, res) => {
    try {
        const { lab_id } = req.body;

        const amiInfo = await labService.getAmiInformation(lab_id);

        if (!amiInfo) {
            return res.status(404).send({
                success: false,
                message: "Invalid lab ID",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed AMI information",
            result: amiInfo,
        });

    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Error accessing AMI information",
            error,
        });
    }
};

const getAwsInstanceDetails = async (req, res) => {
    try {
        const { lab_id } = req.body;

        const instanceDetails = await labService.getAwsInstanceDetails(lab_id);

        if (!instanceDetails) {
            return res.status(404).send({
                success: false,
                message: "Invalid lab ID",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed instance details",
            result: instanceDetails,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Could not access the AWS instance details",
            error,
        });
    }
};

const updateUserLabCompletedStatus = async(req,res)=>{
    try {
        const {userLab} = req.body;
        if(!userLab){
            return res.status(400).send({
                success:false,
                message:"Please provide the required data"
            })
        }
        const update = await labService.updateUserLabCompletedStatus(userLab);
        return res.status(200).send({
            success:true,
            messsage:"Successfully updated the status"
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

const getAwsInstanceDetailsOfUsers = async (req, res) => {
    try {
        const { lab_id, user_id } = req.body;
        const instanceDetails = await labService.getAwsInstanceDetailsOfUsers(lab_id, user_id);
        // if (!instanceDetails) {
        //     return res.status(404).send({
        //         success: true,
        //         message: "No instance details for this Lab ID",
        //     });
        // }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed instance details",
            result: instanceDetails,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Could not access the AWS instance details",
            error,
        });
    }
};

const updateAwsInstanceDetailsOfUsers = async (req, res) => {
    try {
        const { lab_id, user_id, state ,isStarted,type } = req.body;

        const updatedInstance = await labService.updateAwsInstanceDetailsOfUsers(lab_id, user_id, state,isStarted,type);

        if (!updatedInstance) {
            return res.status(404).send({
                success: false,
                message: "Invalid lab ID",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully updated instance details",
            result: updatedInstance,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Could not update the AWS instance details",
            error,
        });
    }
};

const updateAwsLabInstanceDetails = async (req, res) => {
    try {
        const { lab_id, state ,isStarted } = req.body;

        const updatedLabInstance = await labService.updateAwsLabInstanceDetails(lab_id, state, isStarted);

        if (!updatedLabInstance) {
            return res.status(404).send({
                success: false,
                message: "Invalid lab ID",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully updated lab instance details",
            result: updatedLabInstance,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Could not update the AWS lab instance details",
            error,
        });
    }
};

const labBatch = async (req, res) => {
    try {
        const { lab_id, admin_id, org_id, configured_by, enddate } = req.body;

        const { assigned, data } = await labService.assignLabBatch(lab_id, admin_id, org_id, configured_by, enddate);
        if (assigned) {
            return res.status(200).send({
                success: false,
                message: "Already assigned to the organization",
                data,
            });
        }

        return res.status(201).send({
            success: true,
            message: "Successfully stored the data",
            data,
        });

    } catch (error) {
        console.error("Error in labBatch:", error);
        return res.status(500).send({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

const getLabBatchAssessment = async (req, res) => {
    try {
        const { orgId } = req.body;

        const data = await labService.getLabBatchAssessment(orgId);

        if (!data || !data?.rows?.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Invalid details",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed",
            data,
        });

    } catch (error) {
        console.error("Error in getLabBatchAssessment:", error);
        return res.status(500).send({
            success: false,
            message: "Server error",
            error,
        });
    }
};

const getSoftwareDetails = async (req, res) => {
    try {
        const data = await labService.getSoftwareDetails();

        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "Invalid details",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed",
            data,
        });

    } catch (error) {
        console.error("Error in getSoftwareDetails:", error);
        return res.status(500).send({
            success: false,
            message: "Server error",
            error,
        });
    }
};

const checkLabBatchAssessment = async (req, res) => {
    try {
        const { admin_id, org_id } = req.body;

        const data = await labService.checkLabBatchAssessment(admin_id, org_id);

        if (!data.length) {
            return res.status(404).send({
                success: false,
                message: "Invalid details",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully accessed",
            data,
        });

    } catch (error) {
        console.error("Error in checkLabBatchAssessment:", error);
        return res.status(500).send({
            success: false,
            message: "Server error",
            error,
        });
    }
};

const getLabsConfigured = async (req, res) => {
    try {
        const {admin_id} = req.body;
      if (!admin_id) {
        return res.status(400).send({
          success: false,
          message: "Admin details are required",
        });
      }
      const labs = await labService.getLabsConfigured(admin_id);
      if (!labs.length) {
        return res.status(200).send({
          success: false,
          message: "No configured labs found",
          data:[]
        });
      }
      return res.status(200).send({
        success: true,
        message: "Successfully retrieved the labs",
        data: labs,
      });
    } catch (error) {
      console.error("Error getting configured labs:", error);
      return res.status(500).send({
        success: false,
        message: "Error retrieving the labs",
        error: error.message,
      });
    }
  };

  // Controller: Get Lab Catalogues
const getLabCatalogues = async (req, res) => {
    try {
      const labCatalogues = await labService.getLabCatalogues();
  
      if (labCatalogues.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No lab catalogues available",
        });
      }
  
      return res.status(200).json({
        success: true,
        message: "Successfully accessed the lab catalogues",
        data: labCatalogues,
      });
    } catch (error) {
      console.error("Error fetching lab catalogues:", error);
      return res.status(500).json({
        success: false,
        message: "Could not access the catalogues",
        error: error.message,
      });
    }
  };

  const checkIsStarted = async (req, res) => {
    try {
      const { type, id } = req.body;
  
      if (!type || !id) {
        return res.status(400).json({ success: false, message: "Type and ID are required." });
      }
  
      const response = await labService.checkIsStartedService(type, id);
      
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error checking status:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not check the status",
        error: error.message,
      });
    }
  };
 
  const createNewCatalogue = async (req, res) => {
    try {
      const catalogueData = req.body;
      const newCatalogue = await labService.createNewCatalogue(catalogueData);
  
      return res.status(200).send({
        success: true,
        message: "Successfully stored the catalogue",
        output: newCatalogue,
      });
    } catch (error) {
      console.error("Error creating catalogue:", error.message);
  
      return res.status(500).send({
        success: false,
        message: "Could not create the lab",
        error: error.message,
      });
    }
  };


  const getOperatingSystemsFromDatabase = async (req, res) => {
    try {
        const result = await labService.getOperatingSystems();
       
        if (!result.success) {
            return res.status(404).send({
                success: false,
                message: result.message,
            });
        }

        return res.status(200).send({
            success: true,
            message: result.message,
            data: result.data,
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Error in database for getting operating system list",
            error: error.message,
        });
    }
};

const UpdateSingleVmLabStatus = async(req,res)=>{
    try {
        const { labId,status } = req.body;
        if(!labId || !status) {
            return res.status(400).send({
                success: false,
                message: "labId and status are required",
            });
        }
        const result  = await labService.updateSigleVmLabStatus(labId,status);
        if(result.length === 0){
            return res.status(404).send({
                success: false,
                message: "Lab not found",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully updated the lab status",
            data: result,
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Error in updating the lab status",
            error: error.message,
        });
    }
}

//get count of labs
const getCount = async (req, res) => {
    try {
        const userId = req.params.userId;
        const {user} = req.body;
        if (!userId) {  
            return res.status(400).send({
                success: false,
                message: "User ID is required",
            });
        }
        const result = await labService.getCount(userId,user);
        if(!result) {
            return res.status(404).send({
                success: false,
                message: "No data found",
            });
        }
        return res.status(200).send({
            success: true,
            message: "Successfully retrieved the count",
            data: result,
        });
    } catch (error) {
        console.error("Error in getting the count:", error);
        return res.status(500).send({
            success: false,
            message: "Error in getting the count",
            error: error.message,
        });
    }
};

//get cloudslice labs of organization
const getCloudSliceOrgLabs = async(req,res)=>{
    try {
        const orgId = req.params.orgId;
        if (!orgId) {  
            return res.status(400).send({
                success: false,
                message: "Organization ID is required",
            });
        }
        const result = await labService.getCloudSliceOrgLabs(orgId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No Labs Found for the organization"
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
            message:"Error in getting Cloudslice labs of organization",
            error:error.message
        })
    }
}



module.exports = {
    createLab,
    getAllLab,
    getLabOnId,
    assignLab,
    getAssignLabOnId,
    getInstanceOnParameters,
    getInstanceDetailsForPricing,
    updateLabsOnConfig,
    awsConfigure,
    getAwsInstanceDetails,
    getAwsInstanceDetailsOfUsers,
    updateAwsInstanceDetailsOfUsers,
    updateAwsLabInstanceDetails,
    labBatch,
    getLabBatchAssessment,
    getSoftwareDetails,
    checkLabBatchAssessment,
    getLabsConfigured,
    getLabCatalogues,
    checkIsStarted,
    createNewCatalogue,
    getOperatingSystemsFromDatabase,
    getAssignLabOnLabId,
    UpdateSingleVmLabStatus,
    getCount,
    getCloudSliceOrgLabs,
    createSingleVmDatacenterLab,
    getDatacenterLabOnAdminId,
    getDatacenterLabCredentials,
    updateSingleVmDatacenterLab,
    assignSingleVmDatacenterLab,
    assignSingleVmDatacenterLabCredentialsToOrg,
    editSingleVmDatacenterLabCredentials,
    deleteSingleVmDatacenterLab,
    updateSingleVmDatacenterCredsDisable,
    getOrgAssignedSingleVMDatacenterLab,
    getDatacenterLabOnLabId,
    assignSingleVMDatacenterLabToUsers,
    getUserAssignedSingleVMDatacenterLabs,
    getUserAssignedSingleVMDatacenterCredsToUser,
    connectDatacenterVM,
    updateSingleVMDatacenterUserCredRunningState,
    deleteSingleVMDatacenterLabOfUser,
    deleteSingleVMDatacenterLabFromOrg,
    updateSingleVMDatacenterLabContent,
    getSingleVmDatacenterLabs,
    updateUserLabTimingsOfSingleVMDatacenter,
    updateSingleVMAws,
    updateUserLabTimingsOfAwsSingleVMDatacenter,
    getAllLabCatalogues,
    deleteCatalogue,
    updateCatalogueDetails,
    getUserPurchasedSinglvmLabs,
    updateSingleVMAwsLab,
    getUserPurchasedSinglvmLabsOnLabId,
    getAllUserPurchasedLabs,
    getAllUserPurchasesForAdmin,
    getUserDashboardLabs,
    getAllOrganizationAssignedLabs,
    getAllLabs,
    getLabsOfLabadmins,
    updateUserLabCompletedStatus,
    getUserPurchasedSingleVMDatacenterLabs,
    getAllOrgLabs,
    getDatacenterLabAdminsLab
}