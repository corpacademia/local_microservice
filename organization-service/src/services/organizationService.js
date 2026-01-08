const pool = require('../db/dbConfig');
const organizationQueries = require('./organizationQueries');
const queries = require('./organizationQueries');

const getAllOrganizations = async () => {
    try {
        const data = await pool.query(queries.GET_ALL_ORGANIZATIONS);
      
        return data.rows;
    } catch (error) {
        throw error;
    }
};

const getOrganizationById = async (org_id) => {
    try {
        const data = await pool.query(queries.GET_ORGANIZATION_BY_ID, [org_id]);
        return data.rows[0] || null;
    } catch (error) {
        throw error;
    }
};

const deleteOrgAssignedCloudVmsService = async (lab_id, admin_id) => {
    try {
        // Delete from labassignments
        await pool.query(queries.DELETE_LAB_ASSIGNMENTS, [admin_id]);

        // Delete from lab_batch
        await pool.query(queries.DELETE_LAB_BATCH, [lab_id]);

        return { success: true, message: "Lab deleted successfully" };
    } catch (error) {
        throw error;
    }
};


const createOrganizationService = async (organizationData) => {
    try {
        const {
            organization_name,
            email,
            org_type,
            admin_name,
            phone,
            address,
            website,
            org_id,
            logoPath,
            branding_primary_color,
            branding_secondary_color
        } = organizationData;

        const response = await pool.query(queries.CREATE_ORGANIZATION, [
            organization_name,
            email,
            org_type,
            admin_name,
            phone,
            address,
            website,
            org_id,
            logoPath,
             branding_primary_color,
            branding_secondary_color
        ]);

        return response.rows[0] || null;
    } catch (error) {
        throw error;
    }
};

const getOrganizationStatsService = async (orgId) => {
    try {
        // Execute both queries in parallel
        const [usersCountResult, adminsCountResult] = await Promise.all([
            pool.query(queries.GET_USERS_COUNT, [orgId]),
            pool.query(queries.GET_ADMINS_COUNT, [orgId])
        ]);

        // Extract counts
        const userCount = Number(usersCountResult.rows[0]?.user_count || 0);
        const adminCount = Number(adminsCountResult.rows[0]?.admin_count || 0);

        return { userCount, adminCount };
    } catch (error) {
        throw error;
    }
};

const updateOrganizationService = async (orgId, data, logo) => {
    try {
        let query;
        let queryParams;

        if (!logo) {
            query = queries.UPDATE_ORGANIZATION;
            queryParams = [
                data.organization_name,
                data.org_email,
                data.phone_number,
                data.address,
                data.website,
                data.org_type,
                data.status,
                data.org_id,
                orgId,
                data.branding_primary_color,
                data.branding_secondary_color
            ];
        } else {
            query = queries.UPDATE_ORGANIZATION_WITH_LOGO;
            queryParams = [
                data.organization_name,
                data.org_email,
                data.phone_number,
                data.address,
                data.website,
                data.org_type,
                data.status,
                data.org_id,
                logo,
                orgId,
                data.branding_primary_color,
                data.branding_secondary_color
            ];
        }
        await pool.query('BEGIN');
        const result = await pool.query(query, queryParams);
        await pool.query(queries.DEACTIVATE_USERS,['inactive',[orgId]]);
        await pool.query(queries.DEACTIVATE_ORG_USERS,['inactive',[orgId]]);
        await pool.query('COMMIT');
        return result.rows.length ? result.rows[0] : null;
    } catch (error) {
        await pool.query('ROLLBACK');
        console.log(error)
        throw error;
    }
};
//approve or reject the organization and its admin
const approveOrRejectOrg = async(orgId,action)=>{
    try {
        await pool.query('BEGIN');
        const update = await pool.query(organizationQueries.UPDATE_ORGANITION_STATUS,[action === 'approve' ? 'active' : 'rejected',orgId]);
        if(!update.rows){
            throw new Error("No organization found to approve or reject");
        }
        await pool.query(organizationQueries.UPDATE_ADMIN_STATUS,[action === 'approve' ? 'inactive' : 'rejected',orgId,'orgsuperadmin']);
        await pool.query('COMMIT');
        return update.rows;
    } catch (error) {
        await pool.query('ROLLBACK');
        console.log(error);
        throw error;
    }
}

//update organization admin
const updateOrganizationAdmin = async(orgAdmin,id)=>{
    try {
        if(!orgAdmin || !id){
            throw new Error("Please Provide the required fields");
        }
        const result = await pool.query(queries.UPDATE_ORGANIZATION_ADMIN,[orgAdmin,id]);
        if(!result.rows.length){
            throw new Error("No Organization found to update its admin");
        }
        return result.rows[0];
    } catch (error) {
        console.log("Error in updating the admin");
        throw new Error("Error in updating the admin:",error);
    }
}

const deleteOrganizationsService = async (orgIds) => {
    try {
        await pool.query('BEGIN');
        const result = await pool.query(queries.DEACTIVE_ORGANIZATION, ['inactive',orgIds]);
        if(!result.rows){
            throw new Error('Could not deactivate the organization');
        }
        await pool.query(queries.DEACTIVATE_USERS,['pending',orgIds]);
        await pool.query(queries.DEACTIVATE_ORG_USERS,['pending',orgIds]);

        await pool.query('COMMIT');
        return result.rows.length ? result.rows : null;
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
};


module.exports = {
    getAllOrganizations,
    getOrganizationById,
    deleteOrgAssignedCloudVmsService,
    createOrganizationService,
    getOrganizationStatsService,
    updateOrganizationService,
    deleteOrganizationsService,
    updateOrganizationAdmin,
    approveOrRejectOrg
}