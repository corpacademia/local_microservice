module.exports ={
    INSERT_ORG_CLOUD_CREDENTIALS:`INSERT INTO org_cloud_credentials(org_id,provider,name,credentials,created_by) VALUES($1,$2,$3,$4,$5) returning *`,

    GET_ORG_CREDENTIALS:`SELECT * FROM org_cloud_credentials where org_id=$1`,

    EDIT_CREDENTIALS:`UPDATE  org_cloud_credentials set provider=$1,name=$2,credentials=$3 where id=$4 returning *`
}
