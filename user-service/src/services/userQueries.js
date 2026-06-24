const { updateUser } = require("./userServices");

module.exports = {
    insertUserQuery : `INSERT INTO organization_users (name, email, password,admin_id,organization,organization_type,org_id) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *`,
    insertAdminUserQuery : `INSERT INTO users (name, email, password,organization,organization_type,role,org_id) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *`,
    insertRandomUserQuery : `INSERT INTO users (name, email, password,organization,organization_type,org_id) VALUES ($1, $2, $3,$4,$5,$6) RETURNING *`,
    insertVerificationCode:`INSERT INTO email_verification_code(email,verification_code,expires_at) VALUES($1,$2,NOW() + INTERVAL '10 minutes') RETURNING *`,
    INSERT_NOTIFICATION:`INSERT INTO notifications (type,title,message,priority,user_id,metadata) values($1,$2,$3,$4,$5,$6) RETURNING *`,

    getVerificationCode: `SELECT * FROM email_verification_code WHERE email = $1 AND verification_code = $2 AND expires_at > NOW()`,
    deleteVerificationCode: `DELETE FROM email_verification_code WHERE email = $1 AND verification_code = $2 RETURNING *`,
    getUserByEmailQuery: `SELECT * FROM users WHERE email = $1`,
    getOrgUserByEmailQuery: `SELECT * FROM organization_users WHERE email = $1`,
    updateUserLastActiveQuery : `UPDATE users SET lastactive = $1, status = 'active' WHERE email = $2 RETURNING *`,
    updateOrgUserLastActiveQuery : `UPDATE organization_users SET lastactive = $1, status = 'active' WHERE email = $2 RETURNING *`,
    updateUserStatusOnLogout:`UPDATE users SET status = 'inactive' WHERE email = $1 RETURNING *`,
    updateOrgUserStatusOnLogout:`UPDATE organization_users SET status = 'inactive' WHERE email = $1 RETURNING *`,

    GET_LICENSE_KEY:`SELECT * FROM license_keys WHERE org_id=$1 AND status='active'`,
    GET_USER_NOTIFICATION_SETTINGS:`SELECT * FROM user_notification_settings WHERE user_id = $1`,

    getAllUsers: `SELECT * FROM users`,
    getAllOrgUsers: `SELECT * FROM organization_users`,
    addUsers: `INSERT INTO users (name, email, password, role, organization,organization_type,org_id, created_by,status) 
              VALUES ($1, $2, $3, $4, $5, $6,$7,$8,$9) RETURNING *`,
    addUser: `INSERT INTO users (name, email, password, role, organization,organization_type,org_id, created_by) 
              VALUES ($1, $2, $3, $4, $5, $6,$7,$8) RETURNING *`,
    addToOrg:`INSERT INTO organization_users (name, email, password, role, organization,organization_type,org_id, admin_id,status) 
              VALUES ($1, $2, $3, $4, $5, $6,$7,$8,$9) RETURNING *`,
    getUserById: 'SELECT * FROM users WHERE id = $1',
    getOrgUserById: 'SELECT * FROM organization_users WHERE id = $1',
    getUserStats: 'SELECT * FROM UserStats WHERE UserId = $1',
    getUserCertifications: 'SELECT CertificationName FROM Certifications WHERE UserId = $1',
    updateUserOrganizationOfOrg: 'UPDATE organization_users SET organization = $1, organization_type = $2,org_id=$3 WHERE id = $4 RETURNING *',
    updateUserOrganizationDetails: 'UPDATE users SET organization = $1, organization_type = $2, org_id=$3 WHERE id = $4 RETURNING *',
     UPDATE_CATALOGUES_PLAN: `
        UPDATE license_keys
        SET usage = jsonb_set(
            usage,
            ARRAY[$1],
            to_jsonb(COALESCE((usage->>$1)::int, 0) + $2),
            true
        )
        WHERE id = $3
        RETURNING *;
        `,
    //update the user profile
    updateUserProfile: `UPDATE users SET name = $1, email = $2, password = $3, phone = $4, location = $5 ,profilephoto = $6 WHERE id = $7 RETURNING *`,
    updateUserProfileWithNoPassword: `UPDATE users SET name = $1, email = $2, phone = $3, location = $4 ,profilephoto = $5 WHERE id = $6 RETURNING *`,
    updateUserPassword:`UPDATE users set password=$1 where email=$2 RETURNING *`,
    updateUserProfileOrg: `UPDATE organization_users SET name = $1, email = $2, password = $3, phone = $4, location = $5 ,profilephoto = $6 WHERE id = $7 RETURNING *`,
    updateUserProfileWithNoPasswordOrg: `UPDATE organization_users SET name = $1, email = $2, phone = $3, location = $4 ,profilephoto = $5 WHERE id = $6 RETURNING *`,
    updateOrgUserPassword:`UPDATE organization_users set password=$1 where email=$2 RETURNING *`,
    // updateUserProfileNoProfilePhotoOrg: `UPDATE organization_users SET name = $1, email = $2, password=$3, phone = $4, location = $5 WHERE id = $6 RETURNING *`,
    updateUserApproval:`WITH updated_org AS (
    UPDATE organization_users
    SET status = $1,
        approved_at = NOW(),
        approved_by = $2
    WHERE id = $3
    RETURNING *
    )
    UPDATE users
    SET status = $1,
        approved_at = NOW(),
        approved_by = $2
    WHERE id = $3
    AND NOT EXISTS (SELECT 1 FROM updated_org)
    RETURNING *;`,
    UPDATE_ORGANIZATION_ADMIN:`UPDATE organizations set org_admin=$1 where id=$2 RETURNING *`,

    ADD_ORG_USER: `INSERT INTO organization_users(name, email, password, role, admin_id,organization,org_id,organization_type,status) VALUES($1, $2, $3, $4, $5,$6,$7,$8,$9) RETURNING *`,
    GET_ORG_USERS: `SELECT * FROM organization_users WHERE org_id=$1`,
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
          RETURNING *
      `,
    DELETE_ORG_USERS:`
          DELETE FROM organization_users 
          WHERE id = ANY($1) AND org_id = $2
          RETURNING *
      `,
    DELETE_RANDOM_USERS:`delete from users where id = any($1) returning *`,
    DELETE_RANDOM_ORG_USERS:`delete from organization_users where id = any($1) returning *`,    
}