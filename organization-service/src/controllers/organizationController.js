const { UPDATE_ADMIN_STATUS } = require('../services/organizationQueries');
const organizationServices = require('../services/organizationService');
const {bringYourOwnCloudUpdate} = require('../socket');


const organizations = async (req, res) => {
    try {
        const data = await organizationServices.getAllOrganizations();

        if (!data || data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No data available for organizations"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Organization list accessed successfully",
            data: data
        });
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Error in the database",
            error: error.message
        });
    }
};

const organizationsParameter = async (req, res) => {
    try {
        const { org_id } = req.body;

        if (!org_id) {
            return res.status(400).send({
                success: false,
                message: "Organization ID is required"
            });
        }

        const organization = await organizationServices.getOrganizationById(org_id);

        if (!organization) {
            return res.status(404).send({
                success: false,
                message: "No data available for organization"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Organization accessed successfully",
            data: organization
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error in the database",
            error: error.message
        });
    }
};

const deleteOrgAssignedCloudVms = async (req, res) => {
    try {
        const { lab_id, admin_id } = req.body;

        if (!lab_id || !admin_id) {
            return res.status(400).send({
                success: false,
                message: "Invalid details",
            });
        }

        const result = await organizationServices.deleteOrgAssignedCloudVmsService(lab_id, admin_id);

        return res.status(200).send(result);
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error deleting lab from the database",
            error: error.message,
        });
    }
};

const createOrganization = async (req, res) => {
    try {
        const { organization_name, admin_name, email, phone, address, website, org_type, org_id } = req.body;
        const logoPath = req.file ? req.file.path : null;

        if (!organization_name || !email || !org_type || !admin_name || !phone || !address || !website || !org_id || !logoPath) {
            return res.status(400).send({
                success: false,
                message: "All fields are required"
            });
        }

        const organization = await organizationServices.createOrganizationService({
            organization_name,
            email,
            org_type,
            admin_name,
            phone,
            address,
            website,
            org_id,
            logoPath
        });

        if (!organization) {
            return res.status(400).send({
                success: false,
                message: "Failed to create organization"
            });
        }

        return res.status(201).send({
            success: true,
            message: "Organization created successfully",
            data: organization
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error in server",
            error: error.message
        });
    }
};

const getOrganizationStats = async (req, res) => {
    const { orgId } = req.params;
    try {
        const { userCount, adminCount } = await organizationServices.getOrganizationStatsService(orgId);

        // Instead of returning 404, return 0 counts
        return res.status(200).send({
            success: true,
            message: "Organization stats fetched successfully.",
            data: {
                users: userCount || 0,
                admins: adminCount || 0
            }
        });
    } catch (error) {
        console.error("Error fetching organization stats:", error);
        return res.status(500).send({
            success: false,
            message: "Error fetching organization stats",
            error: error.message || "Internal Server Error"
        });
    }
};

const editOrganizationModal = async (req, res) => {
    try {
        const orgId = req.params.orgId;
        const data = req.body;
        const logo = req.file ? req.file.path : null;
        console.log(data)
        const updatedOrganization = await organizationServices.updateOrganizationService(orgId, data, logo);

        if (!updatedOrganization) {
            return res.status(404).send({
                success: false,
                message: "Could not update the organization. Organization not found.",
            });
        }

        return res.status(200).send({
            success: true,
            message: "Successfully updated the organization details",
            data: updatedOrganization
        });

    } catch (error) {
        console.error("Error editing organization:", error);
        return res.status(500).send({
            success: false,
            message: "Could not edit the organization",
            error: error.message
        });
    }
};

//update the organization admin
const updateOrganizationAdmin = async(req,res)=>{
    try {
        const {orgAdmin ,Id } = req.body
        const result = await organizationServices.updateOrganizationAdmin(orgAdmin,Id);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Could not update the organization admin"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully updated organization admin',
            data:result
        })
    } catch (error) {
       console.log(error);
       return res.status(500).send({
        success:false,
        message:"Error in updating organization admin",
        error:error.message
       }) 
    }
}
//approve or reject the organization
const approveOrRejectOrg = async(req,res)=>{
    try {
        const {orgId,action} = req.body;

        if(!orgId || !action){
            return res.status(400).send({
                success:false,
                message:"Please provide all required fields"
            })
        }
        const update = await organizationServices.approveOrRejectOrg(orgId,action);
        if(!update){
            return res.status(404).send({
                success:false,
                message:`Cound not ${action === 'approve' ? 'approve' : 'reject'} `
            })
        }
        
        return res.status(200).send({
            success:true,
            message:"Succesfully updated",
            data:update
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

const deleteOrganization = async (req, res) => {
    try {
        const { orgIds } = req.body;

        if (!Array.isArray(orgIds) || orgIds.length === 0) {
            return res.status(400).send({
                success: false,
                message: "Invalid orgIds array"
            });
        }

        const deletedOrganizations = await organizationServices.deleteOrganizationsService(orgIds);

        if (!deletedOrganizations) {
            return res.status(404).send({
                success: false,
                message: "No matching organization IDs found"
            });
        }

        return res.status(200).send({
            success: true,
            message: "Organizations deleted successfully",
            data: deletedOrganizations
        });

    } catch (error) {
        console.error("Error deleting organizations:", error);
        return res.status(500).send({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const bringYourOwnCloud = async(req,res)=>{
    try {
        const {orgId,bring_your_own_cloud} = req.body;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the required fields"
            })
        }
        const update = await organizationServices.bringYourOwnCloud(orgId,bring_your_own_cloud);
        if(!update.rows.length){
            return res.status(404).send({
                success:false,
                message:"Could not update"
            })
        }
        await bringYourOwnCloudUpdate({orgId:orgId,data:update.rows[0]});
        return res.status(200).send({
            success:true,
            message:"Successfully updated",
            data:update.rows
        })
    } catch (error) {
        console.log("Error:",error);
        return res.status(500).send({
            success:true,
            message:"Internal server error",
            error:error.message
        })
    }
}


module.exports = {
    organizations,
    deleteOrgAssignedCloudVms,
    organizationsParameter,
    createOrganization,
    getOrganizationStats,
    editOrganizationModal,
    deleteOrganization,
    updateOrganizationAdmin,
    approveOrRejectOrg,
    bringYourOwnCloud
}