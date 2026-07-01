module.exports = {

    // ── Lab CRUD ──────────────────────────────────────────────────────────────
    INSERT_CLUSTER_LAB:
        `INSERT INTO proxmoxcluster_lab
            (user_id, title, description, status, startdate, enddate,
             labguide, userguide, software, credential_id, cataloguetype, remaining,
             learning_objectives, prerequisites, target_audience, key_technologies,
             additional_details, guacamole_name, guacamole_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,

    GET_CLUSTER_LABS_SUPERADMIN:
        `SELECT * FROM proxmoxcluster_lab ORDER BY created_at DESC`,
    GET_CLUSTER_LABS_BY_USERS:`
    SELECT *
    FROM proxmoxcluster_lab
    WHERE user_id = ANY($1::uuid[])`,
    GET_VM_CONFIGS_BY_LABS:`
        SELECT *
        FROM proxmoxcluster_vm_configs
        WHERE lab_id = ANY($1::uuid[])`,
    GET_CLUSTER_LABS_BY_USER:
        `SELECT * FROM proxmoxcluster_lab WHERE user_id = $1 ORDER BY created_at DESC`,
     getAllUsers: `SELECT id FROM users where org_id=$1 and role='orgsuperadmin'`,
    getAllOrgUsers: `SELECT id FROM organization_users where org_id=$1 and role='orgsuperadmin'`,
    
    // Labs an org can see: labs they created + labs assigned/purchased for their org
    // Single LEFT JOIN avoids UNION ordering issues with PostgreSQL array columns.
    GET_CLUSTER_LABS_FOR_ORG:
        `SELECT DISTINCT pl.*
         FROM proxmoxcluster_lab pl
         LEFT JOIN proxmoxcluster_org_assignment poa
             ON poa.labid = pl.labid AND poa.orgid = $2
         WHERE pl.user_id = $1
            OR poa.labid IS NOT NULL
         ORDER BY pl.created_at DESC`,

    GET_CLUSTER_LAB_BY_ID:
        `SELECT * FROM proxmoxcluster_lab WHERE labid = $1`,

    UPDATE_CLUSTER_LAB:
        `UPDATE proxmoxcluster_lab
         SET title=$1, description=$2, startdate=$3, enddate=$4, software=$5
         WHERE labid=$6 RETURNING *`,

    DELETE_CLUSTER_LAB:
        `DELETE FROM proxmoxcluster_lab WHERE labid = $1 RETURNING *`,

    // ── VM Configs ────────────────────────────────────────────────────────────
    INSERT_VM_CONFIG:
        `INSERT INTO proxmoxcluster_vm_configs
            (lab_id, vm_label, node, template_id, cpu, ram, storage,
             storagetype, networkbridge, nicmodel, protocol, username, password)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
   COPY_VM_CONFIGS: `INSERT INTO proxmoxcluster_vm_configs
(
    lab_id,
    vm_label,
    node,
    template_id,
    cpu,
    ram,
    storage,
    storagetype,
    networkbridge,
    nicmodel,
    protocol,
    username,
    password,
    vmid
)
VALUES
(
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13,
    $14
) RETURNING *;`,
 COPY_LAB:`INSERT INTO proxmoxcluster_lab
(
    user_id,
    title,
    description,
    startdate,
    enddate,
    labguide,
    userguide,
    software,
    credential_id,
    learning_objectives,
    prerequisites,
    target_audience,
    key_technologies,
    additional_details,
    quantity,
    remaining
) VALUES($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
RETURNING *`,

    GET_VM_CONFIGS_BY_LAB:
        `SELECT * FROM proxmoxcluster_vm_configs
         WHERE lab_id = $1 ORDER BY created_at ASC`,
    GET_VM_CONFIGS_BY_ORG:`
        SELECT * FROM proxmoxcluster_user_vms
        WHERE org_id=$1 AND labid=$2 ORDER BY created_at ASC
    `,
    DELETE_VM_CONFIGS_BY_LAB:
        `DELETE FROM proxmoxcluster_vm_configs WHERE lab_id = $1`,

    // ── Org assignment ────────────────────────────────────────────────────────
    INSERT_ORG_ASSIGNMENT:
        `INSERT INTO proxmoxcluster_org_assignment
            (labid, orgid, assigned_by, startdate, enddate, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,

    GET_ORG_LABS:
        `SELECT * FROM proxmoxcluster_org_assignment WHERE orgid = $1`,

    GET_ORG_ASSIGNMENT_BY_LAB:
        `SELECT * FROM proxmoxcluster_org_assignment
         WHERE labid = $1 AND orgid = $2`,

    DELETE_ORG_ASSIGNMENT:
        `DELETE FROM proxmoxcluster_org_assignment
         WHERE labid = $1 AND orgid = $2 RETURNING *`,

    // ── User assignment ───────────────────────────────────────────────────────
    INSERT_USER_ASSIGNMENT:
        `INSERT INTO proxmoxcluster_user_assignment
            (labid, user_id, assigned_by, startdate, enddate,
             assignment_type, batch_id,org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,

    CHECK_USER_ALREADY_ASSIGNED:
        `SELECT * FROM proxmoxcluster_user_assignment
         WHERE labid = $1 AND user_id = $2`,

    GET_USER_ASSIGNMENTS:
        `SELECT * FROM proxmoxcluster_user_assignment WHERE user_id = $1`,

    GET_USER_ASSIGNMENT_BY_ID:
        `SELECT * FROM proxmoxcluster_user_assignment WHERE id = $1`,
    GET_USER_PURCHASED_LABS:`SELECT * FROM proxmox_cluster_purchased WHERE user_id=$1`,

    GET_LAB_USER_ASSIGNMENTS:
        `SELECT pua.*,
                COALESCE(u.name, ou.name) AS user_name,
                COALESCE(u.email, ou.email) AS user_email
         FROM proxmoxcluster_user_assignment pua
         LEFT JOIN users u ON pua.user_id = u.id
         LEFT JOIN organization_users ou ON pua.user_id = ou.id
         WHERE pua.labid = $1`,

    UPDATE_ASSIGNMENT_STATUS:
        `UPDATE proxmoxcluster_user_assignment
         SET status=$1, isrunning=$2 WHERE id=$3 RETURNING *`,

    DELETE_USER_ASSIGNMENT:
        `DELETE FROM proxmoxcluster_user_assignment WHERE id = $1 RETURNING *`,
    DELETE_USER_PURCHASE:`DELETE FROM proxmox_cluster_purchased WHERE id = $1 RETURNING *`,

    DELETE_USER_ASSIGNMENT_BY_USER_LAB:
        `DELETE FROM proxmoxcluster_user_assignment
         WHERE labid=$1 AND user_id=$2 RETURNING *`,

    // ── User VMs (provisioned clones) ─────────────────────────────────────────
    INSERT_USER_VM:
        `INSERT INTO proxmoxcluster_user_vms
            (assignment_id, labid, user_id, vm_config_id, vm_label,
             proxmox_vmid, vmname, node, protocol, username, password,org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,

    // Simple SELECT — used for display (user list modal, status checks).
    // No JOIN so results are never empty due to a join mismatch.
    GET_USER_VMS_BY_ASSIGNMENT:
        `SELECT * FROM proxmoxcluster_user_vms
         WHERE assignment_id = $1 ORDER BY created_at ASC`,

    // JOIN version — used ONLY at launch time to get cpu/ram/storage/etc for Proxmox API calls
    GET_USER_VMS_BY_ASSIGNMENT_WITH_CONFIG:
        `SELECT puv.*,
                pvc.cpu, pvc.ram, pvc.storage, pvc.storagetype,
                pvc.networkbridge, pvc.nicmodel, pvc.template_id,pvc.lab_id
         FROM proxmoxcluster_user_vms puv
         LEFT JOIN proxmoxcluster_vm_configs pvc ON puv.vm_config_id = pvc.id
         WHERE puv.assignment_id = $1 ORDER BY puv.created_at ASC`,

    GET_USER_VMS_BY_LAB_USER:
        `SELECT * FROM proxmoxcluster_user_vms
         WHERE labid=$1 AND user_id=$2`,

    UPDATE_USER_VM_LAUNCHED:
        `UPDATE proxmoxcluster_user_vms
         SET islaunched=$1, isrunning=$2, ip=$3, port=$4, isprocessing=$5
         WHERE id=$6 RETURNING *`,

    UPDATE_USER_VM_RUNNING:
        `UPDATE proxmoxcluster_user_vms
         SET isrunning=$1, isprocessing=$2 WHERE id=$3 RETURNING *`,

    // Update the vm_config's template_id after admin-side cloning
    // (launchProxmoxClusterConfigVMs creates a new VM and updates template_id to point to it)
    UPDATE_VM_CONFIG_TEMPLATE_ID:
        `UPDATE proxmoxcluster_vm_configs SET template_id=$1,vmid=$2 WHERE id=$3 RETURNING *`,

    // Set the actual Proxmox VMID + name after a successful clone
    UPDATE_USER_VM_PROXMOX_ID:
        `UPDATE proxmoxcluster_user_vms
         SET proxmox_vmid=$1, vmname=$2, isprocessing=$3 WHERE id=$4 RETURNING *`,

    DELETE_USER_VMS_BY_ASSIGNMENT:
        `DELETE FROM proxmoxcluster_user_vms WHERE assignment_id = $1`,

    // Get all user assignments for a specific lab+org (for org-level delete)
    GET_USER_ASSIGNMENTS_BY_LAB_AND_ORG:
        `SELECT pua.*, puv.proxmox_vmid, puv.node, puv.id AS vm_row_id
         FROM proxmoxcluster_user_assignment pua
         LEFT JOIN proxmoxcluster_user_vms puv ON puv.assignment_id = pua.id
         WHERE pua.labid = $1
           AND pua.user_id IN (
               SELECT id FROM users WHERE org_id = $2
               UNION
               SELECT id FROM organization_users WHERE org_id = $2
           )`,

    // Delete user assignments for a specific lab+org
    DELETE_USER_ASSIGNMENTS_BY_LAB_AND_ORG:
        `DELETE FROM proxmoxcluster_user_assignment
         WHERE labid = $1
           AND user_id IN (
               SELECT id FROM users WHERE org_id = $2
               UNION
               SELECT id FROM organization_users WHERE org_id = $2
           ) RETURNING id`,

    // Delete the org assignment entry
    DELETE_ORG_ASSIGNMENT:
        `DELETE FROM proxmoxcluster_org_assignment
         WHERE labid = $1 AND orgid = $2 RETURNING *`,

    // Delete all user VMs for a lab (across all assignments) — used at lab-delete time
    DELETE_ALL_USER_VMS_BY_LAB:
        `DELETE FROM proxmoxcluster_user_vms WHERE labid = $1 RETURNING *`,

    // Delete all user assignments for a lab
    DELETE_ALL_USER_ASSIGNMENTS_BY_LAB:
        `DELETE FROM proxmoxcluster_user_assignment WHERE labid = $1 RETURNING *`,

    // Delete all org assignments for a lab
    DELETE_ALL_ORG_ASSIGNMENTS_BY_LAB:
        `DELETE FROM proxmoxcluster_org_assignment WHERE labid = $1`,

    // Fetch all user VMs for a lab (for Proxmox cleanup before DB delete)
    GET_ALL_USER_VMS_BY_LAB:
        `SELECT * FROM proxmoxcluster_user_vms WHERE labid = $1`,

    // Update catalogue details (same pattern as vmcluster updateVMClusterDatacenterCatalogueDetails)
    UPDATE_CATALOGUE_DETAILS:
        `UPDATE proxmoxcluster_lab
         SET cataloguetype=$1, cataloguename=$2, software=$3,
             catalogue_level=$4, catalogue_category=$5, catalogue_price=$6,
             number_hours_day=$7
         WHERE labid=$8 RETURNING *`,

    // Convert to catalogue (mark the lab as public catalogue)
    CONVERT_TO_CATALOGUE:
        `UPDATE proxmoxcluster_lab
         SET cataloguetype=$1, cataloguename=$2, software=$3,
             catalogue_level=$4, catalogue_category=$5, catalogue_price=$6
         WHERE labid=$7 RETURNING *`,

    // ── User name lookup (shared users + org users) ───────────────────────────
    GET_USER_NAME:
        `SELECT COALESCE(u.name, ou.name) AS name
         FROM users u
         FULL OUTER JOIN organization_users ou ON u.id = ou.id
         WHERE u.id = $1 OR ou.id = $1
         LIMIT 1`,
};
