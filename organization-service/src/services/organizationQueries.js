module.exports = {
    GET_ALL_ORGANIZATIONS: `SELECT * FROM organizations`,
    GET_ORGANIZATION_BY_ID: `SELECT * FROM organizations WHERE id = $1`,
    DELETE_LAB_ASSIGNMENTS: `DELETE FROM labassignments WHERE assigned_admin_id = $1`,
    DELETE_LAB_BATCH: `DELETE FROM lab_batch WHERE lab_id = $1`,
    
    CREATE_ORGANIZATION: `
        INSERT INTO organizations
        (organization_name, org_email, org_type, admin_name, phone_number, address, website_url, org_id, logo,branding_primary_color,branding_secondary_color) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11) 
        RETURNING *`,
        GET_USERS_COUNT: `
        SELECT COUNT(*) AS user_count 
        FROM organization_users 
        WHERE org_id = $1
    `,

    GET_ADMINS_COUNT: `
        SELECT COUNT(*) AS admin_count 
        FROM users 
        WHERE org_id = $1 AND role = 'orgadmin'
    `,
    UPDATE_ORGANIZATION: `
        UPDATE organizations 
        SET organization_name=$1, org_email=$2, phone_number=$3, address=$4, website_url=$5, org_type=$6, status=$7, org_id=$8,branding_primary_color=$10,branding_secondary_color=$11
        WHERE id=$9 
        RETURNING *;
    `,

    UPDATE_ORGANIZATION_WITH_LOGO: `
        UPDATE organizations 
        SET organization_name=$1, org_email=$2, phone_number=$3, address=$4, website_url=$5, org_type=$6, status=$7, org_id=$8, logo=$9,branding_primary_color=$11,branding_secondary_color=$12
        WHERE id=$10 
        RETURNING *;
    `,
    DELETE_ORGANIZATION: `
        DELETE FROM organizations WHERE id = ANY($1) RETURNING *;
    `,

    DEACTIVATE_USERS: `
    UPDATE users
    SET status = $1
    WHERE org_id = ANY($2); `,
    DEACTIVATE_ORG_USERS:`
     UPDATE organization_users
    SET status = $1
    WHERE org_id = ANY($2);
    `,
    DEACTIVE_ORGANIZATION:`UPDATE organizations set status=$1 WHERE id = ANY($2) RETURNING *`,
    UPDATE_ORGANIZATION_ADMIN:`UPDATE organizations set org_admin=$1 where id=$2 RETURNING *`,
    UPDATE_ORGANITION_STATUS:`UPDATE organizations set status=$1 where id =$2 RETURNING *`,
    UPDATE_ADMIN_STATUS:`UPDATE users SET status = $1 WHERE org_id = $2 AND role = $3`,
};