const { updateUser } = require("./userServices");

module.exports = {
    insertUserQuery : `INSERT INTO organization_users (name, email, password,admin_id,organization,organization_type,org_id) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *`,
    insertAdminUserQuery : `INSERT INTO users (name, email, password,organization,organization_type,role,org_id) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *`,
    insertRandomUserQuery : `INSERT INTO users (name, email, password,organization,organization_type,org_id) VALUES ($1, $2, $3,$4,$5,$6) RETURNING *`,
    insertVerificationCode:`INSERT INTO email_verification_code(email,verification_code,expires_at) VALUES($1,$2,NOW() + INTERVAL '10 minutes') RETURNING *`,

    getVerificationCode: `SELECT * FROM email_verification_code WHERE email = $1 AND verification_code = $2 AND expires_at > NOW()`,
    deleteVerificationCode: `DELETE FROM email_verification_code WHERE email = $1 AND verification_code = $2 RETURNING *`,
    getUserByEmailQuery: `SELECT * FROM users WHERE email = $1`,
    getOrgUserByEmailQuery: `SELECT * FROM organization_users WHERE email = $1`,
    updateUserLastActiveQuery : `UPDATE users SET lastactive = $1, status = 'active' WHERE email = $2 RETURNING *`,
    updateOrgUserLastActiveQuery : `UPDATE organization_users SET lastactive = $1, status = 'active' WHERE email = $2 RETURNING *`,
    updateUserStatusOnLogout:`UPDATE users SET status = 'inactive' WHERE email = $1 RETURNING *`,
    updateOrgUserStatusOnLogout:`UPDATE organization_users SET status = 'inactive' WHERE email = $1 RETURNING *`,

    getAllUsers: `SELECT * FROM users`,
    getAllOrgUsers: `SELECT * FROM organization_users`,
    addUser: `INSERT INTO users (name, email, password, role, organization,organization_type,org_id, created_by) 
              VALUES ($1, $2, $3, $4, $5, $6,$7,$8) RETURNING *`,
    getUserById: 'SELECT * FROM users WHERE id = $1',
    getOrgUserById: 'SELECT * FROM organization_users WHERE id = $1',
    getUserStats: 'SELECT * FROM UserStats WHERE UserId = $1',
    getUserCertifications: 'SELECT CertificationName FROM Certifications WHERE UserId = $1',
    updateUserOrganizationOfOrg: 'UPDATE organization_users SET organization = $1, organization_type = $2,org_id=$3 WHERE id = $4 RETURNING *',
    updateUserOrganizationDetails: 'UPDATE users SET organization = $1, organization_type = $2, org_id=$3 WHERE id = $4 RETURNING *',
    
    //update the user profile
    updateUserProfile: `UPDATE users SET name = $1, email = $2, password = $3, phone = $4, location = $5 ,profilephoto = $6 WHERE id = $7 RETURNING *`,
    updateUserProfileWithNoPassword: `UPDATE users SET name = $1, email = $2, phone = $3, location = $4 ,profilephoto = $5 WHERE id = $6 RETURNING *`,

    updateUserProfileOrg: `UPDATE organization_users SET name = $1, email = $2, password = $3, phone = $4, location = $5 ,profilephoto = $6 WHERE id = $7 RETURNING *`,
    updateUserProfileWithNoPasswordOrg: `UPDATE organization_users SET name = $1, email = $2, phone = $3, location = $4 ,profilephoto = $5 WHERE id = $6 RETURNING *`,
    // updateUserProfileNoProfilePhotoOrg: `UPDATE organization_users SET name = $1, email = $2, password=$3, phone = $4, location = $5 WHERE id = $6 RETURNING *`,



    ADD_ORG_USER: `INSERT INTO organization_users(name, email, password, role, admin_id,organization,org_id,organization_type) VALUES($1, $2, $3, $4, $5,$6,$7,$8) RETURNING *`,
    GET_ORG_USERS: `SELECT * FROM organization_users WHERE admin_id=$1`,
    UPDATE_USER: `UPDATE users SET name=$1, email=$2,password=$3,status=$4, role=$5  WHERE id=$6`,
    UPDATE_USER_NO_PASSWORD:`UPDATE users SET name=$1, email=$2,status=$3, role=$4  WHERE id=$5`,
    UPDATE_ORG_USER: `UPDATE organization_users SET name=$1, email=$2,password=$3, role=$5, status=$4 WHERE id=$6`,
    UPDATE_ORG_USER_NO_PASSWORD: `UPDATE organization_users SET name=$1, email=$2, role=$4, status=$3 WHERE
    id=$5`,
    GET_USER_BY_ID: `SELECT * FROM users WHERE id=$1`,
    GET_ORG_USER_BY_ID: `SELECT * FROM organization_users WHERE id=$1`,
    INSERT_USERS: `INSERT INTO users (email, password, organization, created_by, organization_type) VALUES($1, $2, $3, $4, $5)`,
    GET_ORG_USERS_ORGID:`
            SELECT * 
            FROM users 
            WHERE org_id = $1
        `,
    GET_USERS_FROM_ORG:`
            SELECT * 
            FROM organization_users 
            WHERE org_id = $1
        `,
    UPDATE_USER_ROLE:`update users set role = $1 where id = $2 returning *`,
    UPDATE_ORG_USER_ROLE:`update organization_users set role = $1 where id = $2 returning *`,

    DELETE_USERS:`
          DELETE FROM users 
          WHERE id = ANY($1) AND org_id = $2
          RETURNING id
      `,
    DELETE_ORG_USERS:`
          DELETE FROM organization_users 
          WHERE id = ANY($1) AND org_id = $2
          RETURNING id
      `,
    DELETE_RANDOM_USERS:`delete from users where id = any($1) returning id`,
    DELETE_RANDOM_ORG_USERS:`delete from organization_users where id = any($1) returning id`,    
}