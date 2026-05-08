module.exports ={
    INSERT_ORG_CLOUD_CREDENTIALS:`INSERT INTO org_cloud_credentials(org_id,provider,name,credentials,created_by,updated_at) VALUES($1,$2,$3,$4,$5,NOW()) returning *`,
    INSERT_GLOBAL_CLOUD_CREDENTIALS:`INSERT INTO global_cloud_credentials(user_id,provider,name,credentials,created_by,updated_at) VALUES($1,$2,$3,$4,$5,NOW()) returning *`,

    GET_ORG_CREDENTIALS:`SELECT * FROM org_cloud_credentials where org_id=$1`,
    GET_GLOBAL_CREDENTAILS:`SELECT * FROM global_cloud_credentials`,

    EDIT_CREDENTIALS:`UPDATE  org_cloud_credentials set provider=$1,name=$2,credentials=$3,updated_at=NOW() where id=$4 returning *`,
    EDIT_GLOBAL_CREDENTIALS:`UPDATE  global_cloud_credentials set provider=$1,name=$2,credentials=$3,updated_at=NOW() where id=$4 returning *`,

    DELETE_ORGCLOUD_CREDENTIAL:`DELETE FROM org_cloud_credentials WHERE id=$1 RETURNING *`,
    DELETE_GLOBALCLOUD_CREDENTIAL:`DELETE FROM global_cloud_credentials WHERE id=$1 RETURNING *`
}
