module.exports = {
    GET_ORG_USERS: `
SELECT id,name,role,email FROM users WHERE org_id = $1
UNION
SELECT  id,name,role,email FROM organization_users WHERE org_id = $1
`,
getAllUsers: `SELECT * FROM users`,
getAllOrgUsers: `SELECT * FROM organization_users`,
GET_ORG_AWS_LABS: `
SELECT
  cl.lab_id,
  cl.title,
  cl.user_id,
  lb.startdate,
  lb.enddate,
  lb.status,
  'singlevm-aws' AS type
FROM createlab cl
LEFT JOIN lab_batch lb
  ON cl.lab_id = lb.lab_id
WHERE
  cl.user_id = ANY($1::uuid[])
  OR lb.org_id = $2
  OR lb.user_id = ANY($1::uuid[])
`,
GET_ORG_CLOUDSLICE_LABS: `
SELECT
  csl.labid AS lab_id,
  csl.title,
  csl.createdby AS user_id,
  coa.startdate,
  coa.enddate,
  coa.status,
  'cloudslice' AS type
FROM cloudslicelab csl
LEFT JOIN cloudsliceorgassignment coa
  ON csl.labid = coa.labid
WHERE
  csl.labid = $3
  AND (
    -- created by org users
    csl.createdby = ANY($1::uuid[])

    -- org assigned
    OR EXISTS (
      SELECT 1
      FROM cloudsliceorgassignment coa2
      WHERE coa2.labid = csl.labid
        AND coa2.admin_id = $2
    )

    -- user assigned
    OR EXISTS (
      SELECT 1
      FROM cloudsliceuserassignment cua
      WHERE cua.labid = csl.labid
        AND cua.user_id = ANY($1::uuid[])
    )
  )
`,

GET_ORG_PROXMOX_LABS: `
SELECT
  sp.labid AS lab_id,
  sp.title,
  sp.user_id,
  soa.startdate,
  soa.enddate,
  soa.status,
  'singlevm-proxmox' AS type
FROM singlevmproxmox_lab sp
LEFT JOIN singlevmproxmoxorgassignment soa
  ON sp.labid = soa.labid
WHERE
  sp.user_id = ANY($1::uuid[])
  OR soa.orgid = $2
  OR soa.assigned_to = ANY($1::uuid[])
`,
GET_ORG_DATACENTER_LABS: `
SELECT
  sd.lab_id,
  sd.title,
  sd.user_id,
  sdoa.startdate,
  sdoa.enddate,
  sdoa.status,
  'singlevm-datacenter' AS type
FROM singlevmdatacenter_lab sd
LEFT JOIN singlevmdatacenterorgassignment sdoa
  ON sd.lab_id = sdoa.labid
WHERE
  sd.user_id = ANY($1::uuid[])
  OR sdoa.orgid = $2
  OR sdoa.assigned_to = ANY($1::uuid[])
`,
GET_ORG_VMCLUSTER_DATACENTER_LABS: `
SELECT
  vc.labid AS lab_id,
  vc.title,
  vc.user_id,
  vcoa.startdate,
  vcoa.enddate,
  vcoa.status,
  'vmcluster-datacenter' AS type
FROM vmclusterdatacenter_lab vc
LEFT JOIN vmclusterdatacenterorgassignment vcoa
  ON vc.labid = vcoa.labid
WHERE
  vc.user_id = ANY($1::uuid[])
  OR vcoa.orgid = $2
  OR vcoa.assigned_to = ANY($1::uuid[])
`,

GET_CLOUDSLICE_LAB :`SELECT * FROM CLOUDSLICELAB WHERE LABID=$2 AND CREATEDBY=ANY($1::uuid[])`,
GET_ORG_ASSIGNED_CLOUDSLICE:`SELECT * FROM CLOUDSLICEORGASSIGNMENT WHERE LABID=$2 AND ADMIN_ID=ANY($1::uuid[])`,
GET_USER_ASSIGNED_CLOUDSLICE:`SELECT * FROM CLOUDSLICEUSERASSIGNMENT WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_CLOUDSLICE_LABDETAILS:`SELECT * FROM CLOUDSLICELAB WHERE LABID=$1`,

GET_DATACENTERVM_LAB :`SELECT * FROM SINGLEVMDATACENTER_LAB WHERE LAB_ID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_ORG_ASSIGNED_DATACENTERVM:`SELECT * FROM SINGLEVMDATACENTERORGASSIGNMENT WHERE LABID=$2 AND ADMIN_ID=ANY($1::uuid[])`,
GET_USER_ASSIGNED_DATACENTERVM:`SELECT * FROM SINGLEVMDATACENTERUSERASSIGNMENT WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_DATACENTERVM_LABDETAILS:`SELECT * FROM SINGLEVMDATACENTER_LAB WHERE LAB_ID=$1`,

GET_SINGLEVM_AWS_LAB :`SELECT * FROM createlab WHERE LAB_ID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_ORG_ASSIGNED_SINGLEVM_AWS:`SELECT * FROM lab_batch WHERE LAB_ID=$2 AND ADMIN_ID=ANY($1::uuid[])`,
GET_USER_ASSIGNED_SINGLEVM_AWS:`SELECT * FROM labassignments WHERE LAB_ID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_SINGLEVM_AWS_LABDETAILS:`SELECT * FROM createlab WHERE LAB_ID=$1`,
GET_INSTANCE_DETAILS:`SELECT * FROM cloudassignedinstance WHERE lab_id=$1`,
GET_LAB_INSTANCE_DETAILS:`SELECT * FROM instances WHERE lab_id=$1`,

GET_VMCLUSTERDATACENTER_LAB :`SELECT * FROM VMCLUSTERDATACENTER_LAB WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_ORG_ASSIGNED_VMCLUSTERDATACENTER:`SELECT * FROM VMCLUSTERDATACENTERORGASSIGNMENT WHERE LABID=$2 AND ADMIN_ID=ANY($1::uuid[])`,
GET_USER_ASSIGNED_VMCLUSTERDATACENTER:`SELECT * FROM VMCLUSTERDATACENTERUSERASSIGNMENT WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_VMCLUSTERDATACENTER_LABDETAILS:`SELECT * FROM VMCLUSTERDATACENTER_LAB WHERE LABID=$1`,
GET_VM_DETAILS_ON_LABID:`SELECT * FROM vmclusterdatacenter_vms where lab_id=$1`,
GET_USER_VM_CREDS:`SELECT * FROM vmclusterdatacenter_uservms where labid=$1`,
GET_USERCRED_GRPS:`SELECT * FROM user_credential_groups`,
GET_GRP_CREDS:`SELECT * FROM grouped_credentials`,

GET_SINGLEVMPROXMOX_LAB :`SELECT * FROM SINGLEVMPROXMOX_LAB WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_ORG_ASSIGNED_SINGLEVMPROXMOX:`SELECT * FROM SINGLEVMPROXMOXORGASSIGNMENT WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_USER_ASSIGNED_SINGLEVMPROXMOX:`SELECT * FROM SINGLEVMPROXMOXUSERASSIGNMENT WHERE LABID=$2 AND USER_ID=ANY($1::uuid[])`,
GET_SINGLEVMPROXMOX_LABDETAILS:`SELECT * FROM SINGLEVMPROXMOX_LAB WHERE LABID=$1`,
GET_VM_DETAILS :`SELECT * FROM proxmox_vm_details where labid=$1`


}