/**
 * proxmoxClusterService.js
 * Handles all Proxmox Cluster Lab operations:
 *   - Lab CRUD
 *   - Org / User assignment with template cloning
 *   - VM lifecycle (launch / stop / status)
 * This file is completely standalone — it does NOT modify any existing service.
 */

const pool    = require('../db/dbConfig');
const axios   = require('axios');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const queries = require('./proxmoxClusterQueries');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Proxmox API client (same credentials as proxmoxService.js) ────────────────
const PROXMOX_URL    = process.env.PROXMOX_URL;
const TOKEN_ID       = process.env.PROXMOX_TOKEN_ID;
const TOKEN_SECRET   = process.env.PROXMOX_TOKEN_SECRET;

const api = axios.create({
    baseURL: PROXMOX_URL,
    timeout: 0,
    headers: { Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}` },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const getTheCredentialAccount = async (labId)=>{
    if(!labId) throw new Error('Lab id is required');
    const getCredentialId = await pool.query(`select credential_id from proxmoxcluster_lab where labid=$1`,[labId]);
    if(!getCredentialId.rowCount > 0) throw new Error("No credential id found for this lab");
    const getCredentialData = await pool.query(`select credentials from global_cloud_credentials where id=$1 union all select credentials from org_cloud_credentials where id=$1`,[getCredentialId.rows[0].credential_id])
    if(!getCredentialData.rowCount > 0) throw new Error("No credentials found for the id");
    const credential = getCredentialData.rows[0].credentials;
   
    const api = axios.create({
    baseURL: credential.api_url,
    timeout: 0,
    headers: { Authorization: `PVEAPIToken=${credential.token}=${credential.secret_key}` },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    return api
}
// ── Helpers ───────────────────────────────────────────────────────────────────

/** Poll a Proxmox task UPID until it finishes (max ~3 min). */
const waitForTask = async (node, upid,api) => {
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const res = await api.get(`/nodes/${node}/tasks/${upid}/status`);
        const d   = res.data.data;
        if (d.status === 'stopped') {
            if (d.exitstatus === 'OK') return true;
            throw new Error(`Proxmox task failed: ${d.exitstatus}`);
        }
    }
    throw new Error('Proxmox task timed out after 3 minutes');
};

/** Fetch the next available VMID from the Proxmox cluster. */
const getNextVmId = async (api) => {
    const res = await api.get('/cluster/nextid');
    return parseInt(res.data.data, 10);
};

/**
 * Get VM IPv4 address via QEMU guest agent.
 * Mirrors getVmIP() in proxmoxService.js exactly:
 *   - resp.data.data.result is a direct array of interface objects
 *   - retries up to 15 times with 3 s delay (45 s total)
 *   - only catches 500 status (agent not ready); re-throws other errors
 *   - returns null after retries (non-fatal — callers decide what to do)
 */
const getVmIp = async (node, vmid,api) => {
    const maxRetries = 15;
    const delay      = 3000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const resp = await api.get(
                `/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`
            );
            // resp.data.data.result is a DIRECT ARRAY — NOT resp.data.data.result.interfaces
            for (const iface of resp.data.data.result) {
                if (!iface['ip-addresses']) continue;
                for (const ip of iface['ip-addresses']) {
                    if (
                        ip['ip-address'] &&
                        ip['ip-address'] !== '127.0.0.1' &&
                        ip['ip-address'].includes('.')
                    ) {
                        return ip['ip-address'];
                    }
                }
            }
        } catch (err) {
            if (err?.response?.status === 500) {
                console.log(`[proxmoxCluster] getVmIp: agent not ready (attempt ${i + 1}/${maxRetries})`);
            } else {
                console.error(`[proxmoxCluster] getVmIp unexpected error: ${err.message}`);
            }
        }
        await new Promise(r => setTimeout(r, delay));
    }

    return null;   // caller handles missing IP
};

/**
 * Clone a Proxmox template and configure the new VM's resources.
 * Returns { newVmId, vmName }.
 */
const cloneAndConfigureVM = async (node, templateId, vmLabel, userName, cpu, ram, storage, networkbridge, nicmodel) => {
    const newVmId = await getNextVmId();
    const safeName = `${vmLabel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${userName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${newVmId}`;

    // 1. Clone (full clone)
    const cloneRes = await api.post(`/nodes/${node}/qemu/${templateId}/clone`, {
        newid: newVmId,
        name:  safeName,
        full:  1
    });
    await waitForTask(node, cloneRes.data.data);

    // 2. Apply resource config
    await api.post(`/nodes/${node}/qemu/${newVmId}/config`, {
        memory:  ram,
        cores:   cpu,
        net0:    `${nicmodel},bridge=${networkbridge}`
    });

    // 3. Resize primary disk (non-fatal if template disk is already large enough)
    try {
        await api.put(`/nodes/${node}/qemu/${newVmId}/resize`, {
            disk: 'scsi0',
            size: `${storage}G`
        });
    } catch (e) {
        console.log(`[proxmoxCluster] disk resize note for vmid ${newVmId}: ${e.message}`);
    }

    return { newVmId, vmName: safeName };
};

// ── CREATE LAB ────────────────────────────────────────────────────────────────
const createProxmoxClusterLab = async (req, res) => {
    try {
        const {
            userId,
            details = {},          // from BasicInfoStep (localStorage.formData.details)
            labGuides  = [],       // from DocumentUploader (base64 file objects)
            userGuides = [],       // from DocumentUploader (base64 file objects)
            vmConfigs  = [],       // VM template configs
            startdate,
            enddate,
            software   = [],
            credential_id
        } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Please provide userId' });
        }
        if (!details.title) {
            return res.status(400).json({ success: false, message: 'Please provide a lab title' });
        }
        if (!Array.isArray(vmConfigs) || !vmConfigs.length) {
            return res.status(400).json({ success: false, message: 'Please provide at least one VM configuration' });
        }

        // Save lab guide files to disk and collect paths
        const savedLabGuidePaths = [];
        for (const file of labGuides) {
            try {
                const base64Data = file.content.split(';base64,').pop();
                const filePath   = path.join(uploadDir, file.name);
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                savedLabGuidePaths.push(filePath);
            } catch (fileErr) {
                console.error('[proxmoxCluster] Failed to save lab guide:', fileErr.message);
            }
        }

        // Save user guide files to disk and collect paths
        const savedUserGuidePaths = [];
        for (const file of userGuides) {
            try {
                const base64Data = file.content.split(';base64,').pop();
                const filePath   = path.join(uploadDir, file.name);
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                savedUserGuidePaths.push(filePath);
            } catch (fileErr) {
                console.error('[proxmoxCluster] Failed to save user guide:', fileErr.message);
            }
        }

        await pool.query('BEGIN');

        const insertLab = await pool.query(queries.INSERT_CLUSTER_LAB, [
            userId,
            details.title,
            details.description        || '',
            'available',
            startdate                  || null,
            enddate                    || null,
            savedLabGuidePaths,        // labguide[]
            savedUserGuidePaths,       // userguide[]
            software,
            credential_id              || null,
            'private',
            -1,                        // remaining = -1 → unlimited own lab
            details.learningObjectives || null,
            details.prerequisites      || null,
            details.targetAudience     || null,
            details.technologies ? details.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
            details.additionalDetails  || null,
            details.guacamoleName      || null,
            details.guacamoleUrl       || null
        ]);

        const labId = insertLab.rows[0].labid;

        for (const vm of vmConfigs) {
            await pool.query(queries.INSERT_VM_CONFIG, [
                labId,
                vm.vm_label        || 'VM',
                vm.node,
                vm.template_id,
                vm.cpu             || 2,
                vm.ram             || 2048,
                vm.storage         || 50,
                vm.storagetype     || 'local-lvm',
                vm.networkbridge   || 'vmbr0',
                vm.nicmodel        || 'virtio',
                vm.protocol        || 'RDP',
                vm.username        || '',
                vm.password        || '',
            ]);
        }

        await pool.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Proxmox cluster lab created successfully',
            data:    insertLab.rows[0]
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[proxmoxCluster] createProxmoxClusterLab:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};
const getAllUsers = async (orgId) => {
    const userResult = await pool.query(queries.getAllUsers,[orgId]);
    const orgUserResult = await pool.query(queries.getAllOrgUsers,[orgId]);
    const result = [...userResult.rows, ...orgUserResult.rows];
    return result;
};
// ── GET LABS (admin) ──────────────────────────────────────────────────────────
const getProxmoxClusterLabs = async (req, res) => {
    try {
        const { userId, role, orgId } = req.body;

        let labsResult;
        if (role === 'superadmin') {
            // Superadmin sees ALL labs
            labsResult = await pool.query(queries.GET_CLUSTER_LABS_SUPERADMIN);
        } else if ((role === 'orgsuperadmin' || role === 'labadmin') && orgId) {
            // Org roles see: labs they created + labs assigned/purchased to their org
            // GET_CLUSTER_LABS_FOR_ORG uses LEFT JOIN to cover both cases in one query
            console.log(`[proxmoxCluster] getProxmoxClusterLabs: org query userId=${userId} orgId=${orgId}`);
            labsResult = await pool.query(queries.GET_CLUSTER_LABS_FOR_ORG, [userId, orgId]);
            if(role === 'labadmin'){
                const getAdmin = await getAllUsers(orgId);
                const adminIds = getAdmin.map(
                        user => user.id
                    );
                const result = await pool.query(queries.GET_CLUSTER_LABS_BY_USERS,[adminIds]);
                labsResult.rows = [...labsResult.rows,...result.rows]
            }
        } else if ((role === 'orgsuperadmin' || role === 'labadmin') && !orgId) {
            // Same org roles but orgId not passed — still return own-created labs at minimum
            console.warn(`[proxmoxCluster] getProxmoxClusterLabs: orgId missing for ${role}, only returning own labs`);
            labsResult = await pool.query(queries.GET_CLUSTER_LABS_BY_USER, [userId]);
        } else {
            labsResult = await pool.query(queries.GET_CLUSTER_LABS_BY_USER, [userId]);
        }

        if (!labsResult.rows.length) {
            return res.status(200).json({ success: true, message: 'No labs found', data: [] });
        }

        const data = [];
        for (const lab of labsResult.rows) {
            const vmConfigs = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [lab.labid]);
            // Labs not created by this user are org-assigned (assessment=true → "Assign Lab" button)
            const isOrgAssigned = (role === 'superadmin') ? false : (lab.user_id !== userId);
            data.push({ ...lab, vmConfigs: vmConfigs.rows, assessment: isOrgAssigned });
        }

        return res.status(200).json({ success: true, message: 'Successfully fetched labs', data });
    } catch (error) {
        console.error('[proxmoxCluster] getProxmoxClusterLabs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

//Get the labadmins lab
const getProxmoxClusterLabAdminsLab = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids?.length) {
      return res.status(400).json({
        success: false,
        message: "Please provide lab admin ids",
      });
    }

    const userIds = ids.map(user => user.id);

    const labsResult = await pool.query(
      queries.GET_CLUSTER_LABS_BY_USERS,
      [userIds]
    );

    const labs = labsResult.rows;

    if (!labs.length) {
      return res.status(200).json({
        success: true,
        message: "No labs found",
        data: [],
      });
    }

    const labIds = labs.map(lab => lab.labid);

    const vmConfigsResult = await pool.query(
      queries.GET_VM_CONFIGS_BY_LABS,
      [labIds]
    );

    const vmConfigsByLab = vmConfigsResult.rows.reduce((acc, vm) => {
      if (!acc[vm.lab_id]) {
        acc[vm.lab_id] = [];
      }
      acc[vm.lab_id].push(vm);
      return acc;
    }, {});

    const data = labs.map(lab => ({
      ...lab,
      vmConfigs: vmConfigsByLab[lab.labid] || [],
    }));

    return res.status(200).json({
      success: true,
      message: "Successfully fetched labs",
      data,
    });

  } catch (error) {
    console.error("Error getting proxmox labadmins cluster labs:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ── GET SINGLE LAB BY ID ──────────────────────────────────────────────────────
const getProxmoxClusterLabOnId = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const lab = await pool.query(queries.GET_CLUSTER_LAB_BY_ID, [labId]);
        if (!lab.rows.length) return res.status(404).json({ success: false, message: 'Lab not found' });

        const vmConfigs = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);

        return res.status(200).json({
            success: true,
            message: 'Successfully fetched lab',
            data: { ...lab.rows[0], vmConfigs: vmConfigs.rows }
        });
    } catch (error) {
        console.error('[proxmoxCluster] getProxmoxClusterLabOnId:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── GET LAB DETAILS (with all user assignments) ───────────────────────────────
const getProxmoxClusterLabDetails = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const lab           = await pool.query(queries.GET_CLUSTER_LAB_BY_ID,    [labId]);
        const vmConfigs     = await pool.query(queries.GET_VM_CONFIGS_BY_LAB,    [labId]);
        const userAssignments = await pool.query(queries.GET_LAB_USER_ASSIGNMENTS, [labId]);

        const assignments = [];
        for (const ua of userAssignments.rows) {
            const vms = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT, [ua.id]);
            assignments.push({ ...ua, vms: vms.rows });
        }

        return res.status(200).json({
            success: true,
            message: 'Successfully fetched lab details',
            data: {
                lab:         lab.rows[0] || null,
                vmConfigs:   vmConfigs.rows,
                assignments
            }
        });
    } catch (error) {
        console.error('[proxmoxCluster] getProxmoxClusterLabDetails:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── UPDATE LAB ────────────────────────────────────────────────────────────────
const updateProxmoxClusterLab = async (req, res) => {
    try {
        const { labId, title, description, startdate, enddate, software } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const update = await pool.query(queries.UPDATE_CLUSTER_LAB, [title, description, startdate, enddate, software || [], labId]);
        if (!update.rows.length) return res.status(404).json({ success: false, message: 'Lab not found' });

        return res.status(200).json({ success: true, message: 'Lab updated successfully', data: update.rows[0] });
    } catch (error) {
        console.error('[proxmoxCluster] updateProxmoxClusterLab:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── Helper: stop a Proxmox VM if running, then delete it with purge=1 ─────────
// Mirrors deleteOrgAssignedLab from proxmoxService.js exactly.
const deleteVmFromProxmox = async (node, vmid, api) => {
    try {
        const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        const isRunning  = statusResp.data.data.status === 'running';

        if (isRunning) {
            console.log(`[proxmoxCluster] VM ${vmid} is running — stopping before delete...`);
            await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);

            let stopped = false;
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const check = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
                if (check.data.data.status === 'stopped') { stopped = true; break; }
            }
            if (!stopped) throw new Error(`VM ${vmid} did not stop in time`);
        }

        await api.delete(`/nodes/${node}/qemu/${vmid}`, { params: { purge: 1 } });
        console.log(`[proxmoxCluster] VM ${vmid} deleted from Proxmox node ${node}`);
    } catch (e) {
        // Log but don't throw — a missing/already-deleted VM shouldn't block lab deletion
        console.error(`[proxmoxCluster] Could not delete VM ${vmid} from Proxmox: ${e.message}`);
    }
};

// ── DELETE LAB ────────────────────────────────────────────────────────────────
// Deletes ALL Proxmox VMs (user clones + config/template VMs) before removing
// DB records — mirrors the pattern in deleteOrgAssignedLab from proxmoxService.js.
const deleteProxmoxClusterLab = async (req, res) => {
    try {
        const { labId } = req.params;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });
        const apiData = await getTheCredentialAccount(labId);
        // ── Step 1: Delete all USER clone VMs from Proxmox ───────────────────
        // These are the per-user cloned VMs in proxmoxcluster_user_vms
        const userVmsRes = await pool.query(queries.GET_ALL_USER_VMS_BY_LAB, [labId]);
        for (const uv of userVmsRes.rows) {
            if (uv.proxmox_vmid && uv.node) {
                await deleteVmFromProxmox(uv.node, uv.proxmox_vmid,apiData);
            }
        }

        // ── Step 2: Delete all CONFIG VMs (template_id) from Proxmox ─────────
        // These are the source VMs created by launchProxmoxClusterConfigVMs
        const vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        for (const cfg of vmConfigsRes.rows) {
            if (cfg.template_id && cfg.node && (cfg.vmid === cfg.template_id)) {
                await deleteVmFromProxmox(cfg.node, cfg.template_id);
            }
        }

        // ── Step 3: Clean up DB records in correct order ──────────────────────
        // (user_vms CASCADE from user_assignment, but we delete explicitly for clarity)
        await pool.query('BEGIN');
        await pool.query(queries.DELETE_ALL_USER_VMS_BY_LAB,         [labId]);
        await pool.query(queries.DELETE_ALL_USER_ASSIGNMENTS_BY_LAB,  [labId]);
        await pool.query(queries.DELETE_ALL_ORG_ASSIGNMENTS_BY_LAB,   [labId]);
        await pool.query(queries.DELETE_VM_CONFIGS_BY_LAB,            [labId]);
        const del = await pool.query(queries.DELETE_CLUSTER_LAB,      [labId]);
        await pool.query('COMMIT');

        if (!del.rows.length) return res.status(404).json({ success: false, message: 'Lab not found' });
        return res.status(200).json({ success: true, message: 'Lab and all Proxmox VMs deleted successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[proxmoxCluster] deleteProxmoxClusterLab:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── DELETE ORG ASSIGNMENT (org admin deletes — mirrors ClusterVMCard deleteFromOrganization) ─
// Removes only this org's usage:
//   1. Stop + delete each user's cloned VMs from Proxmox
//   2. Delete proxmoxcluster_user_vms  for org users
//   3. Delete proxmoxcluster_user_assignment for org users
//   4. Delete proxmoxcluster_org_assignment for this lab+org
// The master proxmoxcluster_lab and its vm_configs are NOT touched.
const deleteProxmoxClusterFromOrganization = async (req, res) => {
    try {
        const { labId, orgId, adminId,role } = req.body;
        if (!labId || !orgId) {
            return res.status(400).json({ success: false, message: 'Please provide labId and orgId' });
        }
        const apiData =  await  getTheCredentialAccount(labId);
        if(role === 'trainer'){
            await pool.query(`update  batchlabs set trainer_id = null where trainer_id=$1 AND lab_id=$2`,[adminId,labId]);
            return res.status(200).send({
                success:true,
                message:"Successfully deleted"
            })
        }
        // 1. Fetch all user VMs for org users so we can delete them from Proxmox
        const vmsRes = await pool.query(queries.GET_USER_ASSIGNMENTS_BY_LAB_AND_ORG, [labId, orgId]);

        // 2. Delete each cloned VM from Proxmox (stop first if running)
        for (const row of vmsRes.rows) {
            if (row.proxmox_vmid && row.node) {
                await deleteVmFromProxmox(row.node, row.proxmox_vmid, apiData);
            }
        }

        // 3. Delete DB records in order
        await pool.query('BEGIN');

        // user_vms cascade from user_assignment, but delete explicitly for clarity
        await pool.query(queries.DELETE_ALL_USER_VMS_BY_LAB,       [labId]);

        // Delete only THIS ORG's user assignments
        await pool.query(queries.DELETE_USER_ASSIGNMENTS_BY_LAB_AND_ORG, [labId, orgId]);

        // Remove the org assignment row
        const del = await pool.query(queries.DELETE_ORG_ASSIGNMENT, [labId, orgId]);

        await pool.query('COMMIT');

        if (!del.rows.length) {
            return res.status(404).json({ success: false, message: 'Org assignment not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Lab removed from organization and all user VMs deleted from Proxmox'
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[proxmoxCluster] deleteProxmoxClusterFromOrganization:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── ASSIGN TO ORG ─────────────────────────────────────────────────────────────
const assignProxmoxClusterToOrg = async (req, res) => {
    try {
        const { labId, orgId, assignedBy, startdate, enddate } = req.body;
        if (!labId || !orgId || !assignedBy) {
            return res.status(400).json({ success: false, message: 'Please provide labId, orgId, and assignedBy' });
        }

        const existing = await pool.query(queries.GET_ORG_ASSIGNMENT_BY_LAB, [labId, orgId]);
        if (existing.rows.length) {
            return res.status(400).json({ success: false, message: 'Lab already assigned to this organization' });
        }

        const insert = await pool.query(queries.INSERT_ORG_ASSIGNMENT, [labId, orgId, assignedBy, startdate, enddate, 'available']);
        return res.status(200).json({ success: true, message: 'Lab assigned to organization', data: insert.rows[0] });
    } catch (error) {
        console.error('[proxmoxCluster] assignProxmoxClusterToOrg:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── GET ORG LABS ──────────────────────────────────────────────────────────────
const getOrgProxmoxClusterLabs = async (req, res) => {
    try {
        const { orgId } = req.body;
        if (!orgId) return res.status(400).json({ success: false, message: 'Please provide orgId' });

        const orgAssignments = await pool.query(queries.GET_ORG_LABS, [orgId]);
        if (!orgAssignments.rows.length) {
            return res.status(200).json({ success: true, message: 'No labs found', data: [] });
        }

        const data = [];
        for (const oa of orgAssignments.rows) {
            const lab       = await pool.query(queries.GET_CLUSTER_LAB_BY_ID, [oa.labid]);
            const vmConfigs = await pool.query(queries.GET_VM_CONFIGS_BY_ORG,  [orgId,oa.labid]);
            data.push({ orgAssignment: oa, lab: lab.rows[0] || null, vmConfigs: vmConfigs.rows });
        }
        return res.status(200).json({ success: true, message: 'Successfully fetched org labs', data });
    } catch (error) {
        console.error('[proxmoxCluster] getOrgProxmoxClusterLabs:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const assignProxmoxClusterToUser = async (req, res) => {
    try {
        const { labId, userIds, assignedBy, startDate, endDate, assignmentType, batchId } = req.body;

        if (!labId || !userIds || !assignedBy) {
            return res.status(400).json({ success: false, message: 'Please provide labId, userIds, and assignedBy' });
        }

        const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

        // Fetch VM configs once (shared across all users)
        const vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        if (!vmConfigsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'No VM configurations found for this lab' });
        }
        const vmConfigs = vmConfigsRes.rows;

        const results = [];

        for (const userId of userIdArray) {
            // Duplicate check (outside transaction — safe to read before)
            const existing = await pool.query(queries.CHECK_USER_ALREADY_ASSIGNED, [labId, userId]);
            if (existing.rows.length) {
                return res.status(400).json({ success: false, message: `Lab already assigned to user ${userId}` });
            }

            // Resolve user name for VM naming
            let userName = 'user';
            try {
                const uRes = await pool.query(queries.GET_USER_NAME, [userId]);
                if (uRes.rows.length && uRes.rows[0].name) userName = uRes.rows[0].name;
            } catch (e) {
                console.log('[proxmoxCluster] Could not resolve user name:', e.message);
            }

            // Use a dedicated client so BEGIN/COMMIT/ROLLBACK all run on the same connection.
            // pool.query() checks out a new connection per call — BEGIN on one connection
            // does NOT protect INSERTs that run on a different connection.
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Create assignment record
                const assignment = await client.query(queries.INSERT_USER_ASSIGNMENT, [
                    labId, userId, assignedBy,
                    startDate || null, endDate || null,
                    assignmentType || 'direct',
                    batchId || null,
                    null

                ]);
                const assignmentId = assignment.rows[0].id;

                // Insert one placeholder VM row per VM config.
                // proxmox_vmid = null — the actual clone happens when the user launches.
                for (const vmConfig of vmConfigs) {
                    await client.query(queries.INSERT_USER_VM, [
                        assignmentId,
                        labId,
                        userId,
                        vmConfig.id,
                        vmConfig.vm_label,
                        null,   // proxmox_vmid — filled at launch time
                        null,   // vmname      — filled at launch time
                        vmConfig.node,
                        vmConfig.protocol,
                        vmConfig.username,
                        vmConfig.password,
                        null
                    ]);
                }

                await client.query('COMMIT');
                results.push({ userId, assignmentId });
            } catch (innerErr) {
                await client.query('ROLLBACK');
                client.release();
                throw innerErr;
            }
            client.release();
        }

        return res.status(200).json({ success: true, message: 'Lab assigned successfully', data: results });
    } catch (error) {
        console.error('[proxmoxCluster] assignProxmoxClusterToUser:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── GET USER'S CLUSTER LABS ───────────────────────────────────────────────────
const getUserProxmoxClusterLabs = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'Please provide userId' });
        const assignments = [];
        const assignedLabs = await pool.query(queries.GET_USER_ASSIGNMENTS, [userId]);
        // if (!assignments.rows.length) {
        //     return res.status(200).json({ success: true, message: 'No labs found', data: [] });
        // }
        const purchasedLabs = await pool.query(queries.GET_USER_PURCHASED_LABS,[userId]);
        assignments.push(
        ...(assignedLabs.rows.length ? assignedLabs.rows : []),
        ...(purchasedLabs.rows.length ? purchasedLabs.rows : [])
        );
        const data = [];
        for (const assignment of assignments) {
            const lab  = await pool.query(queries.GET_CLUSTER_LAB_BY_ID,       [assignment.labid]);
            const vms  = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT,   [assignment.id]);
            data.push({ assignment, lab: lab.rows[0] || null, vms: vms.rows });
        }
        console.log("Data:",data)
        return res.status(200).json({ success: true, message: 'Successfully fetched labs', data });
    } catch (error) {
        console.error('[proxmoxCluster] getUserProxmoxClusterLabs:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── START + GET CONNECTION DETAILS for a config VM (mirrors startVM exactly) ─────
// Starts the VM if stopped, then retries up to 15 times (3 s each) until the
// QEMU guest agent returns a valid IPv4 address — same as getVmIP() in proxmoxService.
// Returns { hostname, protocol, port, username, password } just like startVM does.
const startAndConnectProxmoxClusterVM = async (req, res) => {
    try {
        const { vmConfigId } = req.body;
        if (!vmConfigId) return res.status(400).json({ success: false, message: 'Please provide vmConfigId' });

        const cfgRes = await pool.query(
            `SELECT * FROM proxmoxcluster_vm_configs WHERE id = $1`, [vmConfigId]
        );
        if (!cfgRes.rows.length) return res.status(404).json({ success: false, message: 'VM config not found' });

        const { node,  vmid, protocol: storedProtocol,
                username, password ,lab_id } = cfgRes.rows[0];
        const api = await getTheCredentialAccount(lab_id);
        // 1. Start VM if currently stopped
        const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (statusResp.data.data.status === 'stopped') {
            await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);
            console.log(`[proxmoxCluster] startAndConnect: started VM ${vmid} on node ${node}`);
        }

        // 2. Get VM IP using the fixed getVmIp() helper (same logic as getVmIP in proxmoxService.js)
        //    Retries up to 15 × 3 s = 45 s, iterating resp.data.data.result directly (NOT .interfaces)
        const hostname = await getVmIp(node, vmid,api);

        if (!hostname) {
            return res.status(404).json({
                success: false,
                message: 'Could not get VM IP after 45 s — ensure the QEMU guest agent is installed and running in the VM'
            });
        }

        // 3. Map stored protocol to guacamole protocol + default port
        const proto = (storedProtocol || 'RDP').toLowerCase();
        const port  = proto === 'ssh' ? 22 : proto === 'vnc' ? 5900 : 3389;

        console.log(`[proxmoxCluster] VM ${vmid} ready: ${hostname}:${port} (${proto})`);

        return res.status(200).json({
            success: true,
            message: 'VM started and ready to connect',
            data: { hostname, protocol: proto, port, username, password }
        });
    } catch (error) {
        console.error('[proxmoxCluster] startAndConnectProxmoxClusterVM:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── START a single config VM (from vm_configs — used in the admin VM list modal) ─
const startSingleProxmoxClusterConfigVM = async (req, res) => {
    try {
        let { vmConfigId, readOnly } = req.body;
        if (!vmConfigId) {
            return res.status(400).json({
                success: false,
                message: "Please provide vmConfigId"
            });
        }

        let cfgRes;

        if (readOnly) {
            const vmData = await pool.query(
                `SELECT * FROM proxmoxcluster_user_vms WHERE id = $1`,
                [vmConfigId]
            );

            if (!vmData.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "User VM not found"
                });
            }

            cfgRes = await pool.query(
                `SELECT * FROM proxmoxcluster_vm_configs WHERE id = $1`,
                [vmData.rows[0].vm_config_id]
            );

            if (!cfgRes.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "VM config not found"
                });
            }

            // Override vmid with the user's proxmox_vmid
            cfgRes.rows[0].vmid = vmData.rows[0].proxmox_vmid;
        } else {
            cfgRes = await pool.query(
                `SELECT * FROM proxmoxcluster_vm_configs WHERE id = $1`,
                [vmConfigId]
            );
        }

        if (!cfgRes.rows.length) {
            return res.status(404).json({
                success: false,
                message: "VM config not found"
            });
        }

        const { node, vmid, vm_label, lab_id  } = cfgRes.rows[0];
        const api = await getTheCredentialAccount(lab_id);
        await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);

        await new Promise(r => setTimeout(r, 3000));

        let liveStatus = "unknown";

        try {
            const s = await api.get(
                `/nodes/${node}/qemu/${vmid}/status/current`
            );
            liveStatus = s.data.data.status;
        } catch (e) {
            // ignore
        }

        return res.status(200).json({
            success: true,
            message: `VM ${vm_label} start command sent`,
            data: { vmConfigId, liveStatus }
        });

    } catch (error) {
        console.error(
            "[proxmoxCluster] startSingleProxmoxClusterConfigVM:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// ── STOP a single config VM ───────────────────────────────────────────────────
const stopSingleProxmoxClusterConfigVM = async (req, res) => {
    try {
        const { vmConfigId,readOnly } = req.body;
        if (!vmConfigId) return res.status(400).json({ success: false, message: 'Please provide vmConfigId' });

        let cfgRes;

        if (readOnly) {
            const vmData = await pool.query(
                `SELECT * FROM proxmoxcluster_user_vms WHERE id = $1`,
                [vmConfigId]
            );

            if (!vmData.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "User VM not found"
                });
            }

            cfgRes = await pool.query(
                `SELECT * FROM proxmoxcluster_vm_configs WHERE id = $1`,
                [vmData.rows[0].vm_config_id]
            );

            if (!cfgRes.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "VM config not found"
                });
            }

            // Override vmid with the user's proxmox_vmid
            cfgRes.rows[0].vmid = vmData.rows[0].proxmox_vmid;
        } else {
            cfgRes = await pool.query(
                `SELECT * FROM proxmoxcluster_vm_configs WHERE id = $1`,
                [vmConfigId]
            );
        }

        if (!cfgRes.rows.length) {
            return res.status(404).json({
                success: false,
                message: "VM config not found"
            });
        }
        const { node,  vmid, vm_label,lab_id } = cfgRes.rows[0];
        const api = await getTheCredentialAccount(lab_id);
        await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);

        return res.status(200).json({ success: true, message: `VM ${vm_label} stopped`, data: { vmConfigId, liveStatus: 'stopped' } });
    } catch (error) {
        console.error('[proxmoxCluster] stopSingleProxmoxClusterConfigVM:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── START a single user VM ───────────────────────────────────────────────────
const startSingleProxmoxClusterVM = async (req, res) => {
    try {
        const { vmRowId } = req.body;
        console.log(req.body)
        if (!vmRowId) return res.status(400).json({ success: false, message: 'Please provide vmRowId' });

        const vmRes = await pool.query(
            `SELECT * FROM proxmoxcluster_user_vms WHERE id = $1`, [vmRowId]
        );
        if (!vmRes.rows.length) return res.status(404).json({ success: false, message: 'VM record not found' });

        const vm = vmRes.rows[0];
        if (!vm.proxmox_vmid) {
            return res.status(400).json({ success: false, message: 'VM is not yet provisioned. Launch All first to clone the templates.' });
        }
        const api = await getTheCredentialAccount(vm.labid);
        await api.post(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/start`);

        // Wait briefly and update status
        await new Promise(r => setTimeout(r, 3000));
        let isRunning = false;
        try {
            const s = await api.get(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/current`);
            isRunning = s.data.data.status === 'running';
        } catch (e) { /* ignore */ }
        const getVmIP = await getVmIp(vm.node,vm.proxmox_vmid,api);
        await pool.query(
            `UPDATE proxmoxcluster_user_vms SET isrunning=$1, isprocessing=false,ip=$3 WHERE id=$2`,
            [isRunning, vmRowId,getVmIP]
        );

        return res.status(200).json({ success: true, message: `VM start command sent`, data: { isrunning: isRunning,ip:getVmIP } });
    } catch (error) {
        console.error('[proxmoxCluster] startSingleProxmoxClusterVM:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── STOP a single user VM ────────────────────────────────────────────────────
const stopSingleProxmoxClusterVM = async (req, res) => {
    try {
        const { vmRowId } = req.body;
        if (!vmRowId) return res.status(400).json({ success: false, message: 'Please provide vmRowId' });

        const vmRes = await pool.query(
            `SELECT * FROM proxmoxcluster_user_vms WHERE id = $1`, [vmRowId]
        );
        if (!vmRes.rows.length) return res.status(404).json({ success: false, message: 'VM record not found' });

        const vm = vmRes.rows[0];
        if (!vm.proxmox_vmid) {
            return res.status(400).json({ success: false, message: 'VM is not yet provisioned' });
        }
        const api = await getTheCredentialAccount(vm.labid);
        await api.post(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/stop`);
        await pool.query(
            `UPDATE proxmoxcluster_user_vms SET isrunning=false, isprocessing=false WHERE id=$1`,
            [vmRowId]
        );

        return res.status(200).json({ success: true, message: 'VM stop command sent', data: { isrunning: false } });
    } catch (error) {
        console.error('[proxmoxCluster] stopSingleProxmoxClusterVM:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── LAUNCH ALL VMs for an assignment ─────────────────────────────────────────
// Mirrors createVM in proxmoxService.js exactly:
//   1. GET /cluster/nextid
//   2. POST clone  (full=1, target=node, storage='local-lvm')
//   3. Poll while(true) until status==="stopped"
//   4. POST config  (memory, cores, net0)
//   5. GET config → detect disk key regex
//   6. PUT resize   (+N G additive)
//   7. POST start
//   8. Update DB with vmid  — NO waiting for running state or IP here;
//      those are fetched by the frontend via getProxmoxClusterVMStatus / refresh.
const launchProxmoxClusterVMs = async (req, res) => {
    try {
        const { assignmentId } = req.body;
        if (!assignmentId) return res.status(400).json({ success: false, message: 'Please provide assignmentId' });

        // JOIN version — need cpu/ram/storage/template_id/networkbridge/nicmodel from vm_configs
        const userVms = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT_WITH_CONFIG, [assignmentId]);
        if (!userVms.rows.length) {
            return res.status(404).json({ success: false, message: 'No VMs found for this assignment' });
        }

        const launched = [];

        for (const vm of userVms.rows) {
            // Mark processing so frontend can show spinner
            await pool.query(queries.UPDATE_USER_VM_RUNNING, [false, true, vm.id]);

            let proxmoxVmId = vm.proxmox_vmid;
            let vmName      = vm.vmname;
            const api = await getTheCredentialAccount(vm.labid);
            try {
                // ── CREATE VM if not yet provisioned (proxmox_vmid = null) ───
                // This block clones the template, gets a real Proxmox VMID,
                // configures the VM, and saves the VMID to the DB.
                // START cannot happen until this block has run and the VMID is known.
                if (!proxmoxVmId) {
                    // 1. Get next available VMID from Proxmox cluster
                    const nextIdRes = await api.get('/cluster/nextid');
                    proxmoxVmId = parseInt(nextIdRes.data.data, 10);  // always integer
                    if (!proxmoxVmId) throw new Error('Failed to get next VMID from Proxmox');

                    vmName = `${(vm.vm_label || 'vm').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${proxmoxVmId}`;
                    console.log(`[proxmoxCluster] Provisioning "${vm.vm_label}" as VMID ${proxmoxVmId}`);
                    console.log(vm)
                    // 2. Clone the template (full clone — same options as createVM)
                    const cloneResp = await api.post(
                        `/nodes/${vm.node}/qemu/${vm.template_id}/clone`,
                        {
                            newid:   proxmoxVmId,
                            name:    vmName,
                            full:    1,
                            target:  vm.node,
                            storage: 'local-lvm'    // hardcoded — same as createVM / createUserVm
                        }
                    );
                    const upid = cloneResp.data.data;

                    // 3. Poll task until clone task finishes (same loop as createVM)
                    while (true) {
                        const task = await api.get(`/nodes/${vm.node}/tasks/${upid}/status`);
                        if (task.data.data.status === 'stopped') break;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    console.log(`[proxmoxCluster] Cloned template ${vm.template_id} → VMID ${proxmoxVmId}`);

                    // 4. Apply hardware config (memory, cores, network — same as createVM)
                    await api.post(`/nodes/${vm.node}/qemu/${proxmoxVmId}/config`, {
                        memory: Number(vm.ram   || 2048),
                        cores:  Number(vm.cpu   || 2),
                        net0:   `${vm.nicmodel || 'virtio'},bridge=${vm.networkbridge || 'vmbr0'}`
                    });
                    console.log(`[proxmoxCluster] VM ${proxmoxVmId} RAM/CPU/Network configured`);

                    // 5. Detect the primary disk key (scsi0/ide0/sata0/virtio0 — same regex as createVM)
                    const configResp = await api.get(`/nodes/${vm.node}/qemu/${proxmoxVmId}/config`);
                    const vmConfig   = configResp.data.data;
                    const diskKey    = Object.keys(vmConfig).find(k =>
                        /^(scsi|ide|sata|virtio)\d+$/.test(k)
                    );
                    if (!diskKey) throw new Error('Unable to detect VM disk — cannot resize');
                    console.log(`[proxmoxCluster] Using disk ${diskKey} for resize`);

                    // 6. Resize disk additively (+N G) — same as createVM
                    if (vm.storage && Number(vm.storage) > 0) {
                        await api.put(`/nodes/${vm.node}/qemu/${proxmoxVmId}/resize`, {
                            disk: diskKey,
                            size: `+${vm.storage}G`
                        });
                    }

                    // 7. Save the new VMID to the DB BEFORE starting
                    //    This is the critical step: the row now has a real Proxmox VMID.
                    await pool.query(queries.UPDATE_USER_VM_PROXMOX_ID, [proxmoxVmId, vmName, true, vm.id]);
                    console.log(`[proxmoxCluster] VMID ${proxmoxVmId} saved to DB for row ${vm.id}`);
                }

                // ── Safety guard: VMID must be set before we attempt to start ──
                // If the creation block above was somehow skipped or failed to set
                // proxmoxVmId, we refuse to call start on an unknown VM.
                if (!proxmoxVmId) {
                    throw new Error(`VM "${vm.vm_label}" has no Proxmox VMID — cannot start`);
                }

                // ── START the VM (same as createVM step 5) ────────────────────
                await api.post(`/nodes/${vm.node}/qemu/${proxmoxVmId}/status/start`);
                console.log(`[proxmoxCluster] VM ${proxmoxVmId} start command sent`);
                const getVmip = await getVmIp(vm.node,proxmoxVmId,api);
                // ── 8. Update DB — islaunched=true, isrunning=true, port ───────
                // No waiting for running state or IP here (same as createVM behaviour).
                // Frontend polls getProxmoxClusterVMStatus to get live state + IP.
                const defaultPort = vm.protocol === 'RDP' ? '3389' : vm.protocol === 'SSH' ? '22' : '5900';
                await pool.query(queries.UPDATE_USER_VM_LAUNCHED, [
                    true, true, null, defaultPort, false, vm.id
                ]);

                launched.push({
                    id: vm.id, vm_label: vm.vm_label,
                    proxmox_vmid: proxmoxVmId, vmname: vmName,
                    node: vm.node, protocol: vm.protocol,
                    username: vm.username, password: vm.password,
                    port: defaultPort, islaunched: true, isrunning: true,
                    ip:getVmip
                });

            } catch (vmErr) {
                console.error(`[proxmoxCluster] Failed to launch "${vm.vm_label}": ${vmErr}`);
                await pool.query(queries.UPDATE_USER_VM_RUNNING, [false, false, vm.id]);
                launched.push({ id: vm.id, vm_label: vm.vm_label, error: vmErr.message });
            }
        }

        await pool.query(queries.UPDATE_ASSIGNMENT_STATUS, ['running', true, assignmentId]);

        return res.status(200).json({ success: true, message: 'VMs launched', data: launched });
    } catch (error) {
        console.error('[proxmoxCluster] launchProxmoxClusterVMs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── STOP ALL VMs for an assignment ────────────────────────────────────────────
const stopProxmoxClusterVMs = async (req, res) => {
    try {
        const { assignmentId } = req.body;
        if (!assignmentId) return res.status(400).json({ success: false, message: 'Please provide assignmentId' });

        const userVms = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT, [assignmentId]);
        const stopped = [];

        for (const vm of userVms.rows) {
            if (!vm.proxmox_vmid) { stopped.push({ id: vm.id, vm_label: vm.vm_label, skipped: true }); continue; }
            const api = await getTheCredentialAccount(vm.labid);
            try {
                await api.post(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/stop`);
                await pool.query(queries.UPDATE_USER_VM_RUNNING, [false, false, vm.id]);
                stopped.push({ id: vm.id, vm_label: vm.vm_label, isrunning: false });
            } catch (vmErr) {
                stopped.push({ id: vm.id, vm_label: vm.vm_label, error: vmErr.message });
            }
        }

        await pool.query(queries.UPDATE_ASSIGNMENT_STATUS, ['not-started', false, assignmentId]);
        return res.status(200).json({ success: true, message: 'VMs stopped', data: stopped });
    } catch (error) {
        console.error('[proxmoxCluster] stopProxmoxClusterVMs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── GET LIVE VM STATUS for an assignment ──────────────────────────────────────
const getProxmoxClusterVMStatus = async (req, res) => {
    try {
        const { assignmentId } = req.body;
        if (!assignmentId) return res.status(400).json({ success: false, message: 'Please provide assignmentId' });

        const userVms = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT, [assignmentId]);
        const statuses = [];

        for (const vm of userVms.rows) {
            if (!vm.proxmox_vmid) {
                statuses.push({ ...vm, liveStatus: 'not-provisioned' });
                continue;
            }
            const api = await getTheCredentialAccount(vm.labid);
            try {
                const s = await api.get(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/current`);
                   const isRunning  = s.data.data.status === 'running';
                const isTemplate = s.data.data.template === 1;
                // Fetch IP from guest agent when VM is running
                let ip = null;
                if (isRunning && !isTemplate) {
                    ip = await getVmIp(vm.node, vm.proxmox_vmid,api);
                }
                statuses.push({ ...vm, liveStatus: s.data.data.status,ip});
            } catch (e) {
                statuses.push({ ...vm, liveStatus: 'unknown' });
            }
        }

        return res.status(200).json({ success: true, data: statuses });
    } catch (error) {
        console.error('[proxmoxCluster] getProxmoxClusterVMStatus:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── DELETE USER ASSIGNMENT (also removes clones from Proxmox) ─────────────────
const deleteProxmoxClusterUserAssignment = async (req, res) => {
    try {
        const { assignmentId,purchased } = req.body;
        if (!assignmentId) return res.status(400).json({ success: false, message: 'Please provide assignmentId' });

        const userVms = await pool.query(queries.GET_USER_VMS_BY_ASSIGNMENT, [assignmentId]);

        // Delete each cloned VM from Proxmox
        for (const vm of userVms.rows) {
            if (!vm.proxmox_vmid) continue;
            const api = await getTheCredentialAccount(vm.labid);
            try {
                const statusRes = await api.get(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/current`);
                if (statusRes.data.data.status === 'running') {
                    await api.post(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}/status/stop`);
                    await new Promise(r => setTimeout(r, 5000)); // brief wait before delete
                }
                await api.delete(`/nodes/${vm.node}/qemu/${vm.proxmox_vmid}`, { params: { purge: 1 } });
            } catch (vmErr) {
                console.error(`[proxmoxCluster] Could not delete VM ${vm.proxmox_vmid}: ${vmErr.message}`);
            }
        }

        await pool.query('BEGIN');
        await pool.query(queries.DELETE_USER_VMS_BY_ASSIGNMENT, [assignmentId]);
        let del;
        if(purchased) del = await pool.query(queries.DELETE_USER_PURCHASE,[assignmentId])

        else del = await pool.query(queries.DELETE_USER_ASSIGNMENT,[assignmentId]);
        await pool.query('COMMIT');

        if (!del.rows.length) return res.status(404).json({ success: false, message: 'Assignment not found' });
        return res.status(200).json({ success: true, message: 'Assignment and VMs deleted successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[proxmoxCluster] deleteProxmoxClusterUserAssignment:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── LAUNCH CONFIG VMs (admin card — starts the VMs that will become templates) ─
// ── LAUNCH CONFIG VMs (admin card — creates VMs from base templates) ─────────
// This is the admin-side equivalent of launchProxmoxClusterVMs:
//   For each VM config:
//     1. Get next VMID
//     2. Clone from template_id  (the base/source template on Proxmox)
//     3. Poll clone task
//     4. Apply hardware config  (memory, cores, network)
//     5. Detect disk key, resize (+N G)
//     6. Start the new VM
//     7. Update proxmoxcluster_vm_configs.template_id with the new VMID
//
// After this, template_id points to the newly created (running) VM.
// Admin configures it, then "Convert to Template" converts it to a Proxmox template.
// User assignment later clones THAT template for each user.
const launchProxmoxClusterConfigVMs = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        if (!vmConfigsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'No VM configs found for this lab' });
        }

        const results = [];
        const api = await getTheCredentialAccount(labId);
        for (const vmConfig of vmConfigsRes.rows) {
            const { id: configId, node, template_id: baseTemplateId, vm_label,
                    cpu, ram, storage, networkbridge, nicmodel } = vmConfig;

            try {
                // 1. Get next available VMID
                const nextIdRes = await api.get('/cluster/nextid');
                const newVmId   = parseInt(nextIdRes.data.data, 10);
                if (!newVmId) throw new Error('Failed to get next VMID from Proxmox');

                const vmName = `${(vm_label || 'vm').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${newVmId}`;
                console.log(`[proxmoxCluster] Cloning config VM "${vm_label}" from template ${baseTemplateId} → new VMID ${newVmId}`);

                // 2. Clone from the base template
                const cloneResp = await api.post(
                    `/nodes/${node}/qemu/${baseTemplateId}/clone`,
                    {
                        newid:   newVmId,
                        name:    vmName,
                        full:    1,
                        target:  node,
                        storage: 'local-lvm'
                    }
                );
                const upid = cloneResp.data.data;

                // 3. Poll until clone task finishes
                while (true) {
                    const task = await api.get(`/nodes/${node}/tasks/${upid}/status`);
                    if (task.data.data.status === 'stopped') break;
                    await new Promise(r => setTimeout(r, 2000));
                }
                console.log(`[proxmoxCluster] Config VM cloned → VMID ${newVmId}`);

                // 4. Apply hardware config
                await api.post(`/nodes/${node}/qemu/${newVmId}/config`, {
                    memory: Number(ram   || 2048),
                    cores:  Number(cpu   || 2),
                    net0:   `${nicmodel || 'virtio'},bridge=${networkbridge || 'vmbr0'}`
                });

                // 5. Detect disk key and resize
                const configResp = await api.get(`/nodes/${node}/qemu/${newVmId}/config`);
                const diskKey    = Object.keys(configResp.data.data).find(k =>
                    /^(scsi|ide|sata|virtio)\d+$/.test(k)
                );
                if (diskKey && Number(storage) > 0) {
                    await api.put(`/nodes/${node}/qemu/${newVmId}/resize`, {
                        disk: diskKey,
                        size: `+${storage}G`
                    });
                }

                // 6. Start the new VM
                await api.post(`/nodes/${node}/qemu/${newVmId}/status/start`);
                console.log(`[proxmoxCluster] Config VM ${newVmId} started`);

                // 7. Update template_id in vm_configs to point to the newly created VM
                await pool.query(queries.UPDATE_VM_CONFIG_TEMPLATE_ID, [baseTemplateId,newVmId, configId]);
                console.log(`[proxmoxCluster] proxmoxcluster_vm_configs.template_id updated to ${newVmId} for config ${configId}`);

                results.push({ configId, vm_label, oldTemplateId: baseTemplateId, newVmId, status: 'started' });

            } catch (e) {
                console.error(`[proxmoxCluster] Failed to launch config VM "${vm_label}": ${e.message}`);
                results.push({ configId, vm_label, status: 'failed', error: e.message });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Config VMs cloned and started',
            data: results
        });
    } catch (error) {
        console.error('[proxmoxCluster] launchProxmoxClusterConfigVMs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── STOP CONFIG VMs (admin card) ──────────────────────────────────────────────
const stopProxmoxClusterConfigVMs = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        if (!vmConfigsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'No VM configs found for this lab' });
        }
         const api = await getTheCredentialAccount(labId);
        const results = [];
        for (const vmConfig of vmConfigsRes.rows) {
            const { node, vmid, vm_label } = vmConfig;
            try {
                await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
                results.push({ vmid, vm_label, status: 'stopped' });
            } catch (e) {
                results.push({ vmid, vm_label, status: 'failed', error: e.message });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'VM stop commands sent',
            data: results
        });
    } catch (error) {
        console.error('[proxmoxCluster] stopProxmoxClusterConfigVMs:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── GET CONFIG VM STATUS (admin card — live status from Proxmox) ───────────────
const getProxmoxClusterConfigVMStatus = async (req, res) => {
    try {
        const { labId,readOnly,orgId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });
        
        let vmConfigsRes;
        if(!readOnly) vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB,[labId])
         else vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_ORG, [orgId,labId]);
        const statuses = [];
        const api = await getTheCredentialAccount(labId);
        for (const vmConfig of vmConfigsRes.rows) {
            const { id: configId, node, vm_label,
                    protocol, username, password } = vmConfig;
            const vmid = readOnly ? vmConfig.proxmox_vmid : vmConfig.vmid
            
            try {
                const s = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
                
                const isRunning  = s.data.data.status === 'running';
                const isTemplate = s.data.data.template === 1;
                
                // Fetch IP from guest agent when VM is running
                let ip = null;
                if (isRunning && !isTemplate) {
                    ip = await getVmIp(node, vmid,api);
                }
                statuses.push({
                    configId, vmid, vm_label, node,
                    liveStatus: s.data.data.status,
                    isTemplate,
                    ip,
                    protocol: protocol || 'RDP',
                    username,
                    password
                });
            } catch (e) {
                statuses.push({ configId, vmid, vm_label, node, liveStatus: 'unknown', isTemplate: false, ip: null });
            }
        }
        
        return res.status(200).json({ success: true, data: statuses });
    } catch (error) {
        console.error('[proxmoxCluster] getProxmoxClusterConfigVMStatus:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const getOrgVMConfigs = async(req,res)=>{
    try {
         const { labId,readOnly,orgId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });
        
        let vmConfigsRes;
        if(!readOnly) vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB,[labId])
         else vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_ORG, [orgId,labId]);
        const labData = await pool.query(`select * from proxmoxcluster_org_assignment where labid=$1 and orgid=$2`,[labId,orgId])
        if(!labData.rowCount > 0){
            return res.status(404).send({
                success:false,
                message:"No org assignment",
            

            })
        }
       return res.status(200).send({
            success:true,
            message:"Successfully accessed the data",
            data:{...labData.rows,vmConfigs:vmConfigsRes.rows}
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

// ── UPDATE CATALOGUE DETAILS (called from ConvertToCatalogue modal) ──────────
// Same pattern as vmcluster updateVMClusterDatacenterCatalogueDetails
const updateProxmoxClusterCatalogueDetails = async (req, res) => {
    try {
        const { labId, catalogueName, catalogueType, software, level, category, price, hoursPerDay } = req.body;
        if (!labId || !catalogueName) {
            return res.status(400).json({ success: false, message: 'Please provide labId and catalogueName' });
        }
        const update = await pool.query(queries.UPDATE_CATALOGUE_DETAILS, [
            catalogueType || 'private',
            catalogueName,
            software      || [],
            level         || '',
            category      || '',
            price         || 0,
            hoursPerDay   || 1,
            labId
        ]);
        if (!update.rows.length) return res.status(404).json({ success: false, message: 'Lab not found' });
        return res.status(200).json({ success: true, message: 'Catalogue details updated', data: update.rows[0] });
    } catch (error) {
        console.error('[proxmoxCluster] updateProxmoxClusterCatalogueDetails:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── CONVERT ALL VMs TO PROXMOX TEMPLATES ─────────────────────────────────────
// For each VM config in the cluster, converts the referenced Proxmox VM to a template.
// Mirrors createTemplateInProxmox from proxmoxService.js — stop → verify → template API.
const convertProxmoxClusterVMsToTemplates = async (req, res) => {
    try {
        const { labId } = req.body;
        if (!labId) return res.status(400).json({ success: false, message: 'Please provide labId' });

        const vmConfigsRes = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        if (!vmConfigsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'No VM configs found for this lab' });
        }

        const results = [];
        const api = await getTheCredentialAccount(labId);
        for (const vmConfig of vmConfigsRes.rows) {
            const { node,  vmid, vm_label } = vmConfig;
            try {
                // 1. Check current VM status
                const statusRes = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
                if (!statusRes.data?.data) throw new Error('VM not found in Proxmox');

                let vmStatus = statusRes.data.data.status;

                // 2. Stop VM if running
                if (vmStatus === 'running') {
                    await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
                    let retries = 0;
                    while (retries < 15) {
                        await new Promise(r => setTimeout(r, 1000));
                        const check = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
                        vmStatus = check.data.data.status;
                        if (vmStatus === 'stopped') break;
                        retries++;
                    }
                    if (vmStatus !== 'stopped') throw new Error(`VM ${vmid} did not stop in time`);
                }

                // 3. Verify disk exists
                const configRes = await api.get(`/nodes/${node}/qemu/${vmid}/config`);
                const disks = Object.keys(configRes.data.data).filter(k =>
                    k.startsWith('ide') || k.startsWith('scsi') || k.startsWith('sata') || k.startsWith('virtio')
                );
                if (!disks.length) throw new Error(`VM ${vmid} has no disk — cannot template`);

                // 4. Convert to Proxmox template
                await api.post(`/nodes/${node}/qemu/${vmid}/template`);
                await pool.query(`update  proxmoxcluster_vm_configs set template_id = $1 WHERE vmid=$2 AND node=$3`,[vmid,vmid,node]);
                console.log(`[proxmoxCluster] VM ${vmid} (${vm_label}) converted to template on node ${node}`);
                results.push({ vmid, vm_label, status: 'converted' });
            } catch (vmErr) {
                console.error(`[proxmoxCluster] Failed to template VM ${vmid} (${vm_label}): ${vmErr.message}`);
                results.push({ vmid, vm_label, status: 'failed', error: vmErr.message });
            }
        }

        const allOk = results.every(r => r.status === 'converted');

        // Mark the lab as having converted templates so "Convert to Catalogue" becomes available
        if (allOk) {
            await pool.query(
                `UPDATE proxmoxcluster_lab SET templates_converted = true WHERE labid = $1`,
                [labId]
            );
        }

        return res.status(200).json({
            success: true,
            message: allOk ? 'All VMs converted to templates' : 'Some VMs failed — check results',
            data: results
        });
    } catch (error) {
        console.error('[proxmoxCluster] convertProxmoxClusterVMsToTemplates:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── CONVERT TO CATALOGUE ─────────────────────────────────────────────────────
const convertProxmoxClusterToCatalogue = async (req, res) => {
    try {
        const { labId, catalogueName, software, level, category, price, catalogueType } = req.body;
        if (!labId || !catalogueName) {
            return res.status(400).json({ success: false, message: 'Please provide labId and catalogueName' });
        }
        const update = await pool.query(queries.CONVERT_TO_CATALOGUE, [
            catalogueType || 'public',
            catalogueName,
            software || [],
            level    || 'beginner',
            category || 'general',
            price    || 0,
            labId
        ]);
        if (!update.rows.length) return res.status(404).json({ success: false, message: 'Lab not found' });
        return res.status(200).json({ success: true, message: 'Lab converted to catalogue successfully', data: update.rows[0] });
    } catch (error) {
        console.error('[proxmoxCluster] convertProxmoxClusterToCatalogue:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── SELF-ASSIGN (admin launches for themselves) ───────────────────────────────
// Allows orgsuperadmin/labadmin to assign the lab to their own user ID so they
// can test it via the same ProxmoxClusterUserCard flow that regular users see.
// Checks quantity before assigning and decrements assigned_users if purchased.
const selfAssignProxmoxCluster = async (req, res) => {
    try {
        const { labId, userId, startDate, endDate } = req.body;
        if (!labId || !userId) {
            return res.status(400).json({ success: false, message: 'Please provide labId and userId' });
        }
        // Resolve org_id — check users table first, then organization_users
        let orgId = null;
        const userRow = await pool.query(`SELECT org_id FROM users WHERE id = $1 LIMIT 1`, [userId]);
        if (userRow.rows.length && userRow.rows[0].org_id) {
            orgId = userRow.rows[0].org_id;
        } else {
            const orgUserRow = await pool.query(`SELECT org_id FROM organization_users WHERE id = $1 LIMIT 1`, [userId]);
            if (orgUserRow.rows.length) orgId = orgUserRow.rows[0].org_id;
        }

        // Check if already self-assigned
        const existing = await pool.query(queries.CHECK_USER_ALREADY_ASSIGNED, [labId, userId]);
        if (existing.rows.length) {
            return res.status(200).json({
                success: true,
                message: 'Already assigned — open your user view to launch',
                data: { assignmentId: existing.rows[0].id }
            });
        }

        // Check quantity if purchased
        if (orgId) {
            const qty = await pool.query(
                `SELECT (number_of_users - assigned_users) AS remaining
                 FROM lab_batch_purchased
                 WHERE lab_id = $1 AND org_id = $2 AND status = 'active'`,
                [labId, orgId]
            );
            if (qty.rows.length && Number(qty.rows[0].remaining) <= 0) {
                return res.status(400).json({ success: false, message: 'No seats remaining for this lab' });
            }
        }

        const vmConfigs = await pool.query(queries.GET_VM_CONFIGS_BY_LAB, [labId]);
        if (!vmConfigs.rows.length) {
            return res.status(404).json({ success: false, message: 'No VM configs found' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const assignment = await client.query(queries.INSERT_USER_ASSIGNMENT, [
                labId, userId, userId,
                startDate || null, endDate || null,
                'direct', null,orgId
            ]);
            const assignmentId = assignment.rows[0].id;

            for (const vmConfig of vmConfigs.rows) {
                await client.query(queries.INSERT_USER_VM, [
                    assignmentId, labId, userId,
                    vmConfig.id, vmConfig.vm_label,
                    null, null, vmConfig.node,
                    vmConfig.protocol, vmConfig.username, vmConfig.password,orgId
                ]);
            }

            await client.query('COMMIT');

            // Decrement available seats if purchased
            if (orgId) {
                await pool.query(
                    `UPDATE lab_batch_purchased
                     SET assigned_users = GREATEST(COALESCE(assigned_users,0)+1, 0)
                     WHERE lab_id=$1 AND org_id=$2`,
                    [labId, orgId]
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Lab assigned to your account — go to your labs to launch',
                data: { assignmentId }
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[proxmoxCluster] selfAssignProxmoxCluster:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
    createProxmoxClusterLab,
    getProxmoxClusterLabs,
    getProxmoxClusterLabOnId,
    getProxmoxClusterLabDetails,
    updateProxmoxClusterLab,
    deleteProxmoxClusterLab,
    assignProxmoxClusterToOrg,
    getOrgProxmoxClusterLabs,
    assignProxmoxClusterToUser,
    getUserProxmoxClusterLabs,
    launchProxmoxClusterVMs,
    stopProxmoxClusterVMs,
    getProxmoxClusterVMStatus,
    deleteProxmoxClusterUserAssignment,
    convertProxmoxClusterToCatalogue,
    updateProxmoxClusterCatalogueDetails,
    convertProxmoxClusterVMsToTemplates,
    launchProxmoxClusterConfigVMs,
    stopProxmoxClusterConfigVMs,
    getProxmoxClusterConfigVMStatus,
    startSingleProxmoxClusterVM,
    stopSingleProxmoxClusterVM,
    startSingleProxmoxClusterConfigVM,
    stopSingleProxmoxClusterConfigVM,
    startAndConnectProxmoxClusterVM,
    deleteProxmoxClusterFromOrganization,
    selfAssignProxmoxCluster,
    getProxmoxClusterLabAdminsLab,
    getOrgVMConfigs
};
