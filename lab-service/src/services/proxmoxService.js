const proxmoxQueries = require('./promoxQueries');
const labQueries = require('./labQueries')
const pool = require('../db/dbConfig');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SFTPClient = require("ssh2-sftp-client");
require('dotenv').config();

const { getUserEmail, markEmailAsSent, isWithinQuietHours, nowInTz, emailPlacehoders } =require('./emailNotificationService');
const { sendNotificationToMail } = require('./notificationServices');
const { sendNotification } = require('../socket');
const promoxQueries = require('./promoxQueries');
const batchesQueries = require('./batchesQueries');

const PROXMOX_URL = process.env.PROXMOX_URL;
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID;
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET;

const uploadDir = path.join(__dirname, '../public/uploads');

const api = axios.create({
  baseURL: PROXMOX_URL,
  timeout:0,
  headers: {
    Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}`
  },
  httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false })
});

//detect the os
const detectOS = async (ostype) => {
  if (!ostype) return "other";

  // Convert to lowercase
  const os = String(ostype).toLowerCase();

  // Numeric codes → convert
  if (!isNaN(os)) {
    const code = Number(os);

    if (code === 10 || code === 11 || code === 12 || code === 13) {
      return "windows"; // treat all as windows
    }
    if (code >= 100) {
      return "windows"; // future-proof numeric codes
    }
    if (code === 1 || code === 2) {
      return "linux";
    }
  }

  // String Matches
  if (os.includes("win")) return "windows";
  if (os.includes("windows")) return "windows";
  if (os.includes("server")) return "windows";
  if (os.match(/win\d+/)) return "windows";     // win10, win12, win2025 etc
  if (os.match(/windows\d+/)) return "windows"; // windows11, windows12
  if (os.includes("ubuntu")) return "linux";
  if (os.includes("debian")) return "linux";
  if (os.includes("centos")) return "linux";
  if (os.includes("fedora")) return "linux";
  if (os.includes("linux") || os.includes("l26")) return "linux";

  return "other";
}
/**
 * Detect OS type (windows | linux | unknown) from Proxmox VM
 */
const detectOSFromProxmox = async (node, vmid) => {
  try {
    const resp = await api.get(`/nodes/${node}/qemu/${vmid}/config`);
    const config = resp.data.data;

    const ostype = config.ostype; // eg: win11, l26, ubuntu, etc.

    if (!ostype) {
      return {
        os: "unknown",
        reason: "ostype not set in Proxmox config"
      };
    }

    if (ostype.startsWith("win")) {
      return {
        os: "windows",
        ostype
      };
    }

    return {
      os: "linux",
      ostype
    };

  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to detect OS from Proxmox"
    );
  }
};


//get os config
const getOSConfig = async(os)=> {
  // Convert numeric codes
  if (typeof os === "number") {
    os = mapNumericOSType(os);
  }

  os = os.toLowerCase();

  if (os.includes("win")) {
    return {
      ostype: "win11",
      scsihw: "virtio-scsi-pci",
      machine: "q35",
      bios: "ovmf",
      needVirtio: true,
      needEFI: true,
      needTPM:true
    };
  }

  if (os.includes("linux") || os.includes("l26")) {
    return {
      ostype: "l26",
      scsihw: "virtio-scsi-pci",
      machine: "pc",
      bios: "seabios",
      needVirtio: false,
      needEFI: false,
    };
  }

  return {
    ostype: "other",
    scsihw: "virtio-scsi-pci",
    machine: "pc",
    bios: "seabios",
    needVirtio: false,
    needEFI: false,
  };
}



//get ip
const getVmIp=async(node, vmid) =>{
  const res = await api.get(`/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`);


  const interfaces = res.data.data.result.interfaces;

  for (const iface of interfaces) {
    for (const ip of iface["ip-addresses"] || []) {
      if (!ip["ip-address"].startsWith("127.")) {
        return ip["ip-address"];
      }
    }
  }

  throw new Error("No IP detected");
}


const getSingleVmProxmoxLab = async (req, res) => {
  try {
    const { adminId } = req.body;
    let getLabDetails;
    if(adminId === 'superadmin'){
      getLabDetails = await pool.query(proxmoxQueries.GET_LABS_FOR_SUPERADMIN);
    }
    else{
     getLabDetails = await pool.query(proxmoxQueries.GET_LAB_DETAILS, [adminId]);
    }
    if (!getLabDetails.rows.length) {
      return res.status(200).send({
        success: false,
        message: 'No lab found',
        data: []
      });
    }

    const results = [];

    for (const lab of getLabDetails.rows) {
      const getConfigurations = await pool.query(proxmoxQueries.GET_LAB_CONFIGURATIONS, [lab.vmdetails_id]);
      
      if (getConfigurations.rows.length) {
        results.push({
           ...lab,
           ...getConfigurations.rows[0]
        });
      } else {
        // Skip labs with no configuration, but don't stop everything
        console.warn(`No configuration found for lab: ${lab.vmdetails_id}`);
      }
    }
    return res.status(200).send({
      success: true,
      message: "Successfully accessed lab",
      data: results
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const createSingleVmProxmoxConfig = async(req,res)=>{
   try {
     const {data,user} = req.body;
     const {details,platform,proxmoxConfig,type} = data;
      const { userGuides = [], labGuides = [] } = data;
             const savedUserGuidePaths = [];
             const savedLabGuidePaths = [];
             // Save user guide files and collect full paths
             userGuides.forEach(file => {
           const base64Data = file.content.split(';base64,').pop();
           const filePath = path.join(uploadDir, file.name);
           fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
           savedUserGuidePaths.push(filePath); 
         });
     
         // Save lab guide files and collect full paths
         labGuides.forEach(file => {
           const base64Data = file.content.split(';base64,').pop();
           const filePath = path.join(uploadDir, file.name);
           fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
           savedLabGuidePaths.push(filePath); 
         });
         
         await pool.query('BEGIN');

         const insertVMDetails = await pool.query(proxmoxQueries.INSERT_VM_DETAILS,[proxmoxConfig.node,proxmoxConfig.name,proxmoxConfig.description,proxmoxConfig.storage,proxmoxConfig.storageSize,proxmoxConfig.cores,proxmoxConfig.memoryMB,proxmoxConfig.networkBridge,proxmoxConfig.nicModel,proxmoxConfig.firewall,proxmoxConfig.onBoot,proxmoxConfig.template]);
     if(!insertVMDetails.rows.length > 0){
      return res.status(404).send({
        success:false,
        message:"Could not find vm details"
      })
     }
     const vmDetailsId = insertVMDetails.rows[0].vmdetails_id;
     const labId = insertVMDetails.rows[0].labid;
     const insertLabDetails = await pool.query(proxmoxQueries.INSERT_LAB_DETAILS,[labId,user,details.title,details.description,type,platform,savedLabGuidePaths,savedUserGuidePaths,details.guacamoleName,details.guacamoleUrl,details.learningObjectives,details.prerequisites,details.targetAudience,details.technologies,details.additionalDetails,vmDetailsId,proxmoxConfig.startDate,proxmoxConfig.endDate,proxmoxConfig.username,proxmoxConfig.password]);
     if(!insertLabDetails.rows.length){
      return res.status(404).send({
        success:false,
        message:"Could no create lab"
      })
     }
      
     await pool.query('COMMIT');

     return res.status(200).send({
      success:true,
      message:"Successfully created lab",
      data:insertLabDetails.rows[0]
     })
   } catch (error) {
    console.log(error);
    await pool.query('ROLLBACK');
    return res.status(500).send({
      success:false,
      message:"Internal server error",
      error:error.message
    })
   }
}

const getStorages = async(req,res)=>{
    try {
        const { NODE} = req.body;
        const  {data}  = await api.get(`/nodes/${NODE}/storage`);
        return res.status(200).send({
            success:true,
            message:"Successfully accessed storages",
            data:data.data
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

// controllers/proxmoxController.js

 const getTemplatesByNode = async (req, res) => {
  try {
    const {NODE} = req.body;
    
    if (!NODE) {
      console.log("Node",req.body)
      return res.status(400).send({
        success: false,
        message: "Node is required",
      });
    }

    // Fetch all QEMU VMs on the node
    const resp = await api.get(`/nodes/${NODE}/qemu`);

    const allVms = resp.data.data || [];

    // Filter only templates (template = 1)
    const templates = allVms.filter(vm => vm.template === 1);

    return res.status(200).send({
      success: true,
      message:"Successfully accessed templates",
      data:templates,
    });

  } catch (err) {
    console.error(" Error fetching templates:", err.response?.data || err.message);

    return res.status(500).send({
      success: false,
      message:"Internal server error",
      error: err.response?.data || err.message,
    });
  }
};


const getNextVmid = async (req, res) => {
  try {
    const { data } = await api.get("/cluster/nextid");
    return res.status(200).send({
      success: true,
      message:'Successfully accessed vmid',
      data: data.data,
    });
  } catch (error) {
    console.error("Error fetching next VMID:", error.message);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch next VMID",
      error: error.message,
    });
  }
};


const getIsos = async(req,res) =>{
    try {
         const { NODE,storage } = req.body;
         console.log(req.body)
     if (!storage) return res.status(400).send({ success:false,message: "Missing storage" });

    const { data } = await api.get(`/nodes/${NODE}/storage/${storage}/content`);
    const isos = data.data.filter(item => item.content === "iso");
    return res.status(200).send({
        success:true,
        message:"Successfully accessed isos",
        isos:isos
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

const getNetworkBridges = async (req,res)=>{
    try {
        const {NODE} = req.body
        const { data } = await api.get(`/nodes/${NODE}/network`);
        console.log('data:',data.data)
    const bridges = data.data.filter(n => n.type === "bridge");
     return res.status(200).send({
        success:true,
        message:"Successfully accessed network bridges",
        networkBridges:bridges
     });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

const getCpuModels = async(req,res)=>{
    try {
        const {NODE} = req.body;
          const { data } = await api.get(`/nodes/${NODE}/capabilities/qemu/cpu`);
          return res.status(200).send({
            success:true,
            message:"Successfully accessed cpu models",
            data:data.data
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

/**
 * Fetch cluster nodes and their resources (CPU, memory, storage).
 */
const getClusterResources = async (req, res) => {
  try {
    // 1. Get all nodes in the cluster
    const { data } = await api.get("/nodes");
    const nodes = data.data;
    const results = [];

    for (const node of nodes) {
      const nodeName = node.node;

      // Skip offline nodes completely
      if (node.status !== "online") {
        console.log(`Skipping offline node: ${nodeName}`);
        continue;
      }

      try {
        // 2. Node status (CPU & memory)
        const nodeStatusRes = await api.get(`/nodes/${nodeName}/status`);
        const nodeStatus = nodeStatusRes.data.data;

        // 3. Node storages
        const storageRes = await api.get(`/nodes/${nodeName}/storage`);
        const storages = storageRes.data.data.map((s) => ({
          storage: s.storage,
          type: s.type,
          total: s.total,
          available: s.available,
          used: s.used,
          content: s.content,
        }));

        results.push({
          node: nodeName,
          status: nodeStatus.status,
          uptime: nodeStatus.uptime,
          cpuCores: nodeStatus.cpuinfo.cpus,
          cpuLoad: nodeStatus.cpu,
          memory: {
            total: nodeStatus.memory.total,
            free: nodeStatus.memory.free,
            used: nodeStatus.memory.used,
          },
          storages,
        });
      } catch (err) {
        console.error(`Error fetching details for node ${nodeName}:`, err.message);
        results.push({
          node: nodeName,
          status: "error",
          error: err.message,
          uptime: null,
          cpuCores: null,
          cpuLoad: null,
          memory: null,
          storages: [],
        });
      }
    }

    return res.status(200).send({
      success: true,
      message: "Successfully accessed nodes",
      data: results,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//upload iso file
const uploadIsoFile = async (req, res) => {
  const files = req.files; // now these have .path
  const { node, storageType, storageName } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: "Please upload at least one file" });
  }

  const sftp = new SFTPClient();

  try {
 
    await sftp.connect({
      host: '171.172.173.199',
      port: 22,
      username: "root",
      password: "C0rp@123!@#", // or privateKey
    });

    for (const file of files) {
      // file.path is where Multer saved the ISO
      let remoteDir;

      switch (storageType) {
        case "local":
          case "dir":
          remoteDir = "/var/lib/vz/template/iso";
          break;
        case "nfs":
        case "ceph":
          remoteDir = `/mnt/pve/${storageName}/template/iso`;
          break;
        default:
          throw new Error(`Unsupported storage type: ${storageType}`);
      }

      const remotePath = path.posix.join(remoteDir, file.originalname);

      console.log(`Uploading ${file.path} → ${remotePath} ...`);
      await sftp.fastPut(file.path, remotePath);

      // cleanup local temp file after upload
      fs.unlink(file.path, () => {});
    }

    return res.status(200).send({
      success: true,
      message: "Uploaded successfully via SFTP",
    });
  } catch (error) {
    console.error("ISO upload failed:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    sftp.end();
  }
};

//get ip
const getIpOfVm = async(req,res)=>{
   try {
    const { node,vmid } = req.body;
    if(!node || !vmid){
      return res.status(400).send({
        success:false,
        message:"Please provide required fields"
      })
    }
    const config = await api.get(`/nodes/${node}/qemu/${vmid}/config`);
    
    await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);
    const ipResp = await api.get(`/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`);

  const interfaces = ipResp.data.data.result;
  const ip = interfaces
    .flatMap(i => i['ip-addresses'])
    .find(ip => ip['ip-address-type'] === 'ipv4')?.['ip-address'];
  return res.status(200).send({
    success:true,
    message:"Successfully accessed ip",
    ip:ip,
    data:config.data.data
  })
   } catch (error) {
    console.log('Error:',error);
    return res.status(500).send({
      success:false,
      message:"Internal server error",
      error:error.message
    })
   }
}

const createVM = async (req, res) => {
  const {
    node,
    name,
    labid,
    memory,
    cores,
    storage,       // disk size
    storageType,   // local or local-lvm
    networkBridge,
    nicModel,
    template,
    vmdetails_id,
    type,
    userid
  } = req.body;

  try {
    if(!node || !labid|| !vmdetails_id){
      return res.status(400).send({
        success:false,
        message:"Please provide all required fields"
      })
    }
  // 1️⃣ Get next VMID
    const { data } = await api.get("/cluster/nextid");
    const vmid = data.data;
 // 2️⃣ Clone from template
    const cloneResp = await api.post(
      `/nodes/${node}/qemu/${template}/clone`,
      {
        newid: vmid,
        name: name || `vm-${vmid}`,
        full: 1,
        target: node,
        storage: 'local-lvm'
      }
    );
  const upid = cloneResp.data.data;
    if(type === 'org'){
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_ORG_LOADING,[true,true,labid,userid])
    }
    else{
    await pool.query(proxmoxQueries.UPDATE_LAUNCH_LOADING,[true,vmdetails_id,false]);
    }
// Poll task until finished
while (true) {
  const task = await api.get(`/nodes/${node}/tasks/${upid}/status`);
  if (task.data.data.status === "stopped") break;
  await new Promise(r => setTimeout(r, 2000));
}
    console.log(`📀 Template ${template} cloned into VM ${vmid}`);

    // 3️⃣ Apply hardware config
    await api.post(`/nodes/${node}/qemu/${vmid}/config`, {
      memory: Number(memory),
      cores: Number(cores),
       net0: `${nicModel || "virtio"},bridge=${networkBridge}`,
    });

    console.log(`🔧 VM ${vmid} RAM/CPU/Network configured`);

    // 4 Resize disk IF diskSize exists
   // After clone polling
const configResp = await api.get(`/nodes/${node}/qemu/${vmid}/config`);
const config = configResp.data.data;

const diskKey = Object.keys(config).find(k =>
  /^(scsi|ide|sata|virtio)\d+$/.test(k)
);

if (!diskKey) {
  throw new Error("Unable to detect VM disk");
}

console.log(`💿 Using disk ${diskKey} for resize`);

if (storage && Number(storage) > 0) {
  await api.put(`/nodes/${node}/qemu/${vmid}/resize`, {
    disk: diskKey,
    size: `+${storage}G`
  });
}


    // 5️⃣ Start VM
    await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);
    console.log(`🚀 VM ${vmid} started`);
 if(type === 'org'){
  await pool.query(proxmoxQueries.UPDATE_LAUNCH_ORG,[true,labid,vmid,userid]);
   await pool.query(proxmoxQueries.UPDATE_LAUNCH_ORG_LOADING,[false,labid,userid])
 }
 else{
  await pool.query(proxmoxQueries.UPDATE_LAUNCH,[true,node,labid,vmid]);
  await pool.query(proxmoxQueries.UPDATE_LAUNCH_LOADING,[false,vmdetails_id,false])

 }
   return res.status(200).send({
      success: true,
      message: "VM created successfully",
      vmid,
      os,
    });

  } catch (err) {
    console.log("❌ Error creating VM:", err);
    await pool.query(proxmoxQueries.UPDATE_LAUNCH_LOADING,[false,vmdetails_id,false])
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
};

//create user vn
const createUserVm = async (req,res)=>{
  try {
    const {labid,name,type,purchased,userid,vmdetailsId} = req.body;
    if(!labid||!name||!type||!userid){
      return res.status(400).send({
        success:false,
        message:'Please provide all required fields'
      })
    }
     const { data } = await api.get("/cluster/nextid");
    const vmid = data.data;
    const getTempInfo =  await pool.query(proxmoxQueries.GET_TEMPLATE_INFORMATION,[labid]);
    if(!getTempInfo.rows.length){
      return res.status(400).send({
        success:false,
        message:"No template information is found"
      })
    }
    const template = getTempInfo.rows[0].templateid;
    const vmDetailsConfig = await pool.query(proxmoxQueries.GET_LAB_CONFIGURATIONS,[vmdetailsId]);
    const vmDetails = vmDetailsConfig?.rows[0];
    const node = vmDetails?.node;
    await pool.query('BEGIN')
     if(type=='user' && purchased){
      await pool.query(promoxQueries.UPDATE_LAUNCH_USER_PURCHASED_LOADING,[true,labid,userid])
    }
    else{
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_LOADING,[true,labid,userid]);
    }
   
 // 2️⃣ Clone from template
    const cloneResp = await api.post(
      `/nodes/${node}/qemu/${template}/clone`,
      {
        newid: vmid,
        name: name || `vm-${vmid}`,
        full: 1,
        target: node,
        storage: 'local-lvm'
      }
    );
 const upid = cloneResp.data.data;

// Poll task until finished
  // while (true) {
  //   const task = await api.get(`/nodes/${node}/tasks/${upid}/status`);
  //   if (task.data.data.status === "stopped") break;
  //   await new Promise(r => setTimeout(r, 2000));
  // }
  let taskStatus;

while (true) {
  const task = await api.get(`/nodes/${node}/tasks/${upid}/status`);
  taskStatus = task.data.data;

  if (taskStatus.status === "stopped") break;

  await new Promise(r => setTimeout(r, 2000));
}

//  CHECK IF CLONE FAILED
if (taskStatus.exitstatus !== "OK") {
  throw new Error(`VM Clone failed: ${taskStatus.exitstatus}`);
}


   if(type === 'user' && purchased){
      await pool.query(promoxQueries.UPDATE_LAUNCH_USER_PURCHASED,[true,labid,vmid,duration]);
      await pool.query(promoxQueries.UPDATE_LAUNCH_USER_PURCHASED_LOADING,[false,labid,userid])
    }
    else{
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER,[true,labid,vmid,userid,node])
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_LOADING,[false,labid,userid]);
    }

   await pool.query("COMMIT");
   return res.status(200).send({
    success:true,
    message:"Successfully launched"
   })
  } catch (error) {
    console.log("Error:",error);
    await pool.query("ROLLBACK")
    return res.status(500).send({
      success:false,
      message:"Internal server error",
      error:error.message
    })
  }
}

async function waitForGuestAgent(node, vmid) {
  for (let i = 0; i < 30; i++) {
    try {
      const ping = await api.get(`/nodes/${node}/qemu/${vmid}/agent/ping`);
      if (ping.data.data) return true;
    } catch {}
    console.log("⏳ Waiting for guest agent...");
    await new Promise(res => setTimeout(res, 2000));
  }
  throw new Error("Guest agent did not become ready.");
}

async function isGuestAgentReady(node, vmid) {
  try {
    const ping = await api.get(`/nodes/${node}/qemu/${vmid}/agent/ping`);
    return !!ping.data.data;
  } catch {
    return false;
  }
}

async function installLinuxGuestAgent(node, vmid) {
  return api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "bash",
    arguments: [
      "-c",
      "apt update && apt install qemu-guest-agent -y && systemctl enable --now qemu-guest-agent"
    ]
  });
}

async function installWindowsGuestAgent(node, vmid) {
  return api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "powershell.exe",
    arguments: [
      "-Command",
      `
      Invoke-WebRequest -Uri 'https://download.proxmox.com/proxmox-ve/qemu-server/proxmox-windows-guest-agent.exe' -OutFile 'C:\\qga.exe';
      Start-Process 'C:\\qga.exe' -ArgumentList '/S' -Wait;
      `
    ]
  });
}

async function configureLinuxVM(node, vmid, username, password) {
  console.log("🐧 Configuring Linux VM...");

  // Create user
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "bash",
    arguments: ["-c", `id -u ${username} || useradd -m ${username}`]
  });

  // Set password
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "bash",
    arguments: ["-c", `echo '${username}:${password}' | chpasswd`]
  });

  // Enable SSH password login
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "bash",
    arguments: ["-c", "sed -i 's/#PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config"]
  });

  // Restart SSH
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "systemctl",
    arguments: ["restart", "ssh"]
  });
}

async function configureWindowsVM(node, vmid, username, password) {
  console.log("🪟 Configuring Windows VM...");

  // Create user
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "powershell.exe",
    arguments: ["-Command", `net user ${username} ${password} /add`]
  });

  // Allow RDP login
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "powershell.exe",
    arguments: [
      "-Command",
      `net localgroup "Remote Desktop Users" ${username} /add`
    ]
  });

  // Enable RDP service
  await api.post(`/nodes/${node}/qemu/${vmid}/agent/exec`, {
    command: "powershell.exe",
    arguments: [
      "-Command",
      `
      Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name fDenyTSConnections -Value 0;
      Enable-NetFirewallRule -DisplayGroup 'Remote Desktop';
      `
    ]
  });
}

async function getVmIP(node, vmid) {
  const resp = await api.get(`/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`);

  for (const iface of resp.data.data.result) {
    if (!iface["ip-addresses"]) continue;

    for (const ip of iface["ip-addresses"]) {
      if (ip["ip-address"] && ip["ip-address"] !== "127.0.0.1" && ip["ip-address"].includes(".")) {
        return ip["ip-address"];
      }
    }
  }

  throw new Error("Unable to detect VM IP.");
}

//start vm
// const startVM = async (req,res)=>{
//   try {
//      const {node,vmId} = req.body;
//      console.log(req.body)
//      if(!node || !vmId){
//       return res.status(400).send({
//         success:false,
//         messsage:"Please provide the required fields"
//       })
//      }

//      await api.post(`/nodes/${node}/qemu/${vmId}/config`, {
//       ciuser: 'khan',
//       cipassword: 'Khan@123',
//       ipconfig0: "dhcp",
//       nameserver: "1.1.1.1",
//       searchdomain: "local"
//     });

//      const startvm = await api.post(`/nodes/${node}/qemu/${vmId}/status/start`);
//      const ip = await getVmIp(node,vmId);
//      if(!ip){
//       return res.status(404).send({
//         success:false,
//         message:"No ip found for the vm"
//       })
//      }
//      return res.status(200).send({
//       success:true,
//       messsage:'Successfully starting',
//       protocol:'ssh',
//       hostname: ip,
//       port:22,
//       username:"khan",
//       password:"Khan@123", 
//      })
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({
//       success:false,
//       message:"Internal server error",
//       error:error.message
//     })
//   }
// }
// Prepare VM After Clone - Works for BOTH Windows & Linux
const startVM = async (req, res) => {
  try {
     const { lab_id,node, vmid,type,userid,purchased,vmDetailsId } = req.body;
     if(!lab_id ||!node ||!vmid||!type||!userid){
      return res.status(400).send({
        success:false,
        message:"Please provide required fields"
      })
     }

      //  Get current VM status
    const statusResp = await api.get(
      `/nodes/${node}/qemu/${vmid}/status/current`
    );

    const status = statusResp.data.data.status;
    if(status === 'stopped'){
      //start vm
      await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);}
      await pool.query('BEGIN');
     if(type === 'user' && purchased){
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_PURCHASED_RUNNING,[true,lab_id,userid]);
     }
     else if(type === 'org'){
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_ORG_LOADING,[true,lab_id,userid,true])
     }
     else if (type === 'sup'){
       await pool.query(proxmoxQueries.UPDATE_LAUNCH_LOADING,[true,vmDetailsId,true])
     }
     else{
       await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_RUNNINGSTATUS,[true,lab_id,userid,'started'])
     }
     
    const hostname = await getVmIP(node,vmid);
    const osInfo = await detectOSFromProxmox(node, vmid);
    const os = osInfo?.os ?? null;
    if(!hostname || !os){
      return res.status(404).send({
        success:false,
        message:"Could no get hostname and protocol"
      })
    }
    await pool.query('COMMIT');
    return res.status(200).send({
      success:true,
      message:"Successfully started vm.Ready to connect",
      data:{
        hostname:hostname,
        protocol:os === 'windows' ? 'rdp' : "ssh",
        port:os === 'windows' ? 3389 : 22
      }
    })
  } catch (error) {
    console.log("error:",error);
    await pool.query("ROLLBACK");
    return res.status(500).send({
      success:false,
      message:"Internal server error",
      error:error.message
    })
  }
};

/**
 * Stop a Proxmox VM safely
 * POST /api/v1/vm/stop
 * body: { node, vmid }
 */
const stopVM = async (req, res) => {
  const { lab_id,node, vmid,userid,purchased ,type,vmdetails_id} = req.body;

  try {
    // 🔍 Validation
    if (!node || !vmid ||!lab_id||!userid) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields"
      });
    }

    //  Get current VM status
    const statusResp = await api.get(
      `/nodes/${node}/qemu/${vmid}/status/current`
    );

    const status = statusResp.data.data.status;

    //  If already stopped
    if (status === "stopped") {
      return res.status(200).json({
        success: true,
        message: "VM is already stopped",
        vmid
      });
    }

    //  Stop VM
    const stopResp = await api.post(
      `/nodes/${node}/qemu/${vmid}/status/stop`
    );

    const upid = stopResp.data.data;

    //  Wait until stop completes (avoid lock issues)
    while (true) {
      const task = await api.get(
        `/nodes/${node}/tasks/${upid}/status`
      );

      if (task.data.data.status === "stopped") break;
      await new Promise(r => setTimeout(r, 2000));
    }
    if(purchased){
    await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_PURCHASED_RUNNING,[false,lab_id,userid])
   } 
    else if(type === 'org'){
      await pool.query(proxmoxQueries.UPDATE_LAUNCH_ORG_LOADING,[true,lab_id,userid,false])
     }
     else if (type === 'sup'){
       await pool.query(proxmoxQueries.UPDATE_LAUNCH_LOADING,[true,vmdetails_id,false])
     }
  else{
    await pool.query(proxmoxQueries.UPDATE_LAUNCH_USER_RUNNING,[false,lab_id,userid])
  }
   return res.status(200).send({
      success: true,
      message: "VM stopped successfully",
      vmid
    });

  } catch (err) {
    console.error(" Error stopping VM:", err.response?.data || err.message);

    // Lock handling
    if (
      err.response?.data?.message?.includes("can't lock file")
    ) {
      return res.status(409).send({
        success: false,
        message: "VM is busy. Please try again shortly."
      });
    }

    return res.status(500).send({
      success: false,
      error: err.response?.data || err.message
    });
  }
};



//check vm status of lab
const checkVMStatus =  async(req,res)=>{
  try {
     const {labId,vmId,type,purchased} = req.body;
     if(!labId ){
      return res.status(404).send({
        success:false,
        message:"Please provide the required fields"
      })
     }
     let result;
     if(type === 'org'){
       result = await pool.query(proxmoxQueries.GET_LAB_ORG_STATUS,[labId,vmId]);
     if(!result.rows.length){
      return res.status(200).send({
        success:false,
        message:"No data found",
        data:[]
      })
     }
     }
     else if(type === 'user'){
      if (purchased){
         result = await pool.query(proxmoxQueries.GET_LAB_USER_PURCHASED_STATUS,[labId,vmId]);
      }
      else{
         result = await pool.query(proxmoxQueries.GET_LAB_USER_STATUS,[labId,vmId]);
      }
      
     if(!result.rows.length){
      return res.status(200).send({
        success:false,
        message:"No data found",
        data:[]
      })
     }
     }
     else{
       result = await pool.query(proxmoxQueries.GET_LAB_STATUS,[labId,vmId]);
     if(!result.rows.length){
      return res.status(200).send({
        success:false,
        message:"No data found",
        data:[]
      })
     }
     }
     
     return res.status(200).send({
      success:true,
      message:"Successfully accessed the lab status",
      data:result.rows[0]
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
//edit vm configurations
const editProxmoxVm = async (req, res) => {
  try {
    const {
      labId,
      vmid,
      title,
      description,
      cpu,
      ram,
      storage,
      storageType,
      node,
      isoimage,
      nicModel,
      networkBridge,
      firewall,
      boot,
      startDate,
      endDate,
    } = req.body;

    if (!node ) {
      return res.status(400).send({ success: false, message: "Missing node or vmid" });
    }

    if(vmid){
       // 1. Check VM status
    const vmStatus = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    const isRunning = vmStatus.data.data.status === 'running';
    // 2. Stop VM if running and we need to modify disk or NIC
    if (isRunning && (storage || networkBridge)) {
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
      
      // Wait for VM to stop before proceeding
      let attempts = 0;
      while (attempts < 20) { // max 20 attempts (~10 sec)
        const statusCheck = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (statusCheck.data.status !== 'running') break;
        await new Promise(r => setTimeout(r, 500)); // wait 0.5s
        attempts++;
      }
    }

    // 3. Build config payload
    const configData = {};
    if (cpu) configData.cores = cpu;
    if (ram) configData.memory = ram;
    if (storage && storageType) configData.scsi0 = `local-lvm:${storage}`;
    if (isoimage && storageType) configData.ide2 = `${storageType}:iso/${isoimage},media=cdrom`;
    if (networkBridge && nicModel) configData.net0 = `${nicModel},bridge=${networkBridge}`;
    if (boot !== undefined) configData.boot = boot ? 'c' : '';

    // 4. Update VM config
    await api.put(`/nodes/${node}/qemu/${vmid}/config`, configData);

    // 5. Enable/disable firewall
    if (firewall !== undefined) {
      await api.put(`/nodes/${node}/qemu/${vmid}/firewall/options`, {
        enable: firewall ? 1 : 0,
      });
    }
    // 6. Optionally restart VM if it was running before
    if (isRunning) {
      await api.post(`/nodes/${node}/qemu/${vmid}/status/start`);
    }
    }
   
    await pool.query('BEGIN');
    await pool.query(proxmoxQueries.UPDATE_LAB_DETAILS,[title,description,startDate,endDate,labId]);
    await pool.query(proxmoxQueries.UPDATE_LAB_CONFIG,[storageType,storage,isoimage,cpu,ram,networkBridge,nicModel,firewall,boot,labId])

    await pool.query('COMMIT');

    return res.status(200).send({
      success: true,
      message: "VM configuration updated successfully"
    });

  } catch (error) {
    console.error("Error editing VM:", error?.response?.data || error.message);
    await pool.query('ROLLBACK');
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error?.response?.data?.errors || error.message
    });
  }
};

//delete the vm
const deleteVmInProxmox = async (req, res) => {
  try {
    const { labId,node, vmid,type } = req.body;
    let deleteResp;
    if(vmid){
       // Step 1: Get VM status
    const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    const isRunning = statusResp.data.data.status === 'running';

    // Step 2: Stop the VM if it's running
    if (isRunning) {
      console.log(`VM ${vmid} is running — stopping before delete...`);
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
      // Wait until it's fully stopped
      let stopped = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000)); // 2s interval
        const checkStatus = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (checkStatus.data.data.status === 'stopped') {
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        return res.status(400).send({
          success: false,
          message: 'VM did not stop in time — aborting delete for safety.',
        });
      }
    }

    // Step 3: Delete VM with purge=1 (full cleanup)

    console.log(`Deleting VM ${vmid} from node ${node}...`);
     deleteResp = await api.delete(`/nodes/${node}/qemu/${vmid}`, {
      params: { purge: 1 },
    });

    }
   
    await pool.query('BEGIN');
    if(type === 'org'){
      await pool.query(proxmoxQueries.DELETE_USER_SINGLEVM_VMID,[labId]);
      await pool.query(proxmoxQueries.DELETE_SINGLEVM_ORG_LAB_vmid,[labId]);
    }
    
    else{
      await pool.query(proxmoxQueries.DELETE_USER_SINGLEVM_VMID,[labId]);
       await pool.query(proxmoxQueries.DELETE_SINGLEVM_ORG_LAB_vmid,[labId])
      await pool.query(proxmoxQueries.DELETE_PROXMOX_LAB,[labId]);
    await pool.query(proxmoxQueries.DELETE_PROXMOX_LAB_CONFIG,[labId]);
    }
    await pool.query('COMMIT');

    
      return res.status(200).send({
        success: true,
        message: `VM ${vmid} deleted successfully (with purge).`,
       
      });

  } catch (error) {
    console.error('Error deleting VM:', error?.response?.data || error.message);
    // await pool.query('ROLLBACK');
    return res.status(500).send({
      success: false,
      message: 'Error deleting VM',
      error: error?.response?.data || error.message,
    });
  }
};

const deleteVMOFProxmox = async(req,res)=>{
  try {
    const { node, vmid } = req.body;
    let deleteResp;
    if(vmid){
       // Step 1: Get VM status
    const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    const isRunning = statusResp.data.data.status === 'running';

    // Step 2: Stop the VM if it's running
    if (isRunning) {
      console.log(`VM ${vmid} is running — stopping before delete...`);
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
      // Wait until it's fully stopped
      let stopped = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000)); // 2s interval
        const checkStatus = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (checkStatus.data.data.status === 'stopped') {
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        return res.status(400).send({
          success: false,
          message: 'VM did not stop in time — aborting delete for safety.',
        });
      }
    }

    // Step 3: Delete VM with purge=1 (full cleanup)

    console.log(`Deleting VM ${vmid} from node ${node}...`);
     deleteResp = await api.delete(`/nodes/${node}/qemu/${vmid}`, {
      params: { purge: 1 },
    });
      return res.status(200).send({
        success:true,
        message:"Successfully deleted the vm"
      })
    }
    return res.status(200).send({
        success:true,
        message:"No Vm to delete"
      })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      message:"Could not delete the proxmox vm"
    })
  }
}

//create a template
const createTemplateInProxmox = async(req,res) =>{
  try {
    const {labId,node, vmid} = req.body;
    console.log(` Checking VM ${vmid} on node ${node}...`);

    //  Get VM status
    const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    if (!statusResp.data?.data) throw new Error("VM not found in Proxmox");

    let vmStatus = statusResp.data.data.status;
    console.log(` Current VM status: ${vmStatus}`);

    //  Stop VM if running
    if (vmStatus === "running") {
      console.log(` VM ${vmid} is running — stopping it now...`);
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);

      // Wait until VM actually stops
      let retries = 0;
      while (retries < 15) { // up to ~15 seconds
        await new Promise(r => setTimeout(r, 1000));
        const check = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        vmStatus = check.data.data.status;
        if (vmStatus === "stopped") break;
        retries++;
      }

      if (vmStatus !== "stopped") {
        throw new Error(`Failed to stop VM ${vmid} after waiting 15 seconds.`);
      }

      console.log(` VM ${vmid} stopped successfully.`);
    }

    // Check VM has a disk
    const configResp = await api.get(`/nodes/${node}/qemu/${vmid}/config`);
    const disks = Object.keys(configResp.data.data).filter(k =>
      k.startsWith("ide") || k.startsWith("scsi") || k.startsWith("sata") || k.startsWith("virtio")
    );
    if (disks.length === 0) throw new Error(`VM ${vmid} has no disk attached — cannot create template.`);

    console.log(` VM has ${disks.length} disk(s): ${disks.join(", ")}`);

    // Verify storage
    const storageResp = await api.get(`/nodes/${node}/storage`);
    const storageList = storageResp.data.data.map(s => s.storage);

    const vmDisk = configResp.data.data[disks[0]];
    const storage = vmDisk.split(":")[0];

    if (!storageList.includes(storage)) {
      throw new Error(`Storage "${storage}" not available on node ${node}.`);
    }

    console.log(` Storage "${storage}" verified.`);

    //  Convert to template
    await pool.query(proxmoxQueries.UPDATE_TEMPLATE_CREATION_PROCESS_STATUS,[true]);
    console.log(`Converting VM ${vmid} to template...`);
    const templateResp = await api.post(`/nodes/${node}/qemu/${vmid}/template`);

    console.log(`Template creation started: ${templateResp.data.data}`);
    const insertTemplate = await pool.query(proxmoxQueries.INSERT_TEMPLATE_INFORMATION,[labId,vmid]);
    if(!insertTemplate.rows.length){
       return res.status(400).send({
        success:false,
        message:"Could not insert template information"
       })
    }
    await pool.query(proxmoxQueries.UPDATE_TEMPLATE_CREATION_PROCESS_STATUS,[false])
    return res.status(200).send({
      success: true,
      message: `VM ${vmid} converted to template successfully.`,
      data: templateResp.data.data,
    });
  } catch (err) {
    console.error(` Template creation failed: ${err.message}`);
    await pool.query(proxmoxQueries.UPDATE_TEMPLATE_CREATION_PROCESS_STATUS,[false])
    return res.status(500).send({ success: false,
       message:'Internal server error' ,
       error:err.message 
      });
  }
}

//get template information
const getTemplateInformation = async(req,res)=>{
  try {
     const {labId} = req.params;
     if(!labId){
      return res.status(404).send({
        success:false,
        message:'Please provide the labid'
      })
     }
     const response = await pool.query(proxmoxQueries.GET_TEMPLATE_INFORMATION,[labId]);
     if(!response.rows.length){
       return res.status(200).send({
        success:false,
        message:"Could not get the data",
        dat:[]
       })
     }
     return res.status(200).send({
      success:true,
      message:"Successfully accessed data",
      data:response.rows[0]
     })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      message:'Internal server error',
      error:error.message
    })
  }
}

//get proxmox singlevm labs on adminid
const getProxmoxSingleVMLabOnUserId = async(req,res)=>{
  try {
    const {userId} = req.params;
    if(!userId){
      return res.status(404).send({
        success:false,
        message:"Please provide the userid",
      })
    }
    const response = await pool.query(proxmoxQueries.GET_SINGLEVM_LAB_USERID,[userId]);
    if(!response.rows.length){
      return res.status(200).send({
        success:true,
        message:"Could not fetch the labs",
        data:[]
      })
    }
  return res.status(200).send({
        success:true,
        message:"Could not fetch the labs",
        data:response.rows
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

//assign lab to org admin
const assignLabToOrgAdmin = async(req,res)=>{
  try {
    const {labId,orgId,startDate,endDate,assigned_by,user_id,userName} = req.body;
  
    if(!labId||!orgId||!startDate||!endDate||!assigned_by||!user_id){
        return res.status(404).send({
          success:false,
          message:"Please provide all the required fields"
        })
    }
    // const { data } = await api.get("/cluster/nextid");
    // const vmId = data.data;
    // if(!vmId){
    //   return res.status(404).send({
    //     success:false,
    //     message:'Vm Id is required'
    //   })
    // }
    const vmName = `vm-${userName.replace(' ','-')}`
    const insertData = await pool.query(proxmoxQueries.INSERT_ORG_ASSIGNMENT,[labId,orgId,startDate,endDate,assigned_by,user_id,vmName]);
    if(!insertData.rows.length){
      return res.status(400).send({
        success:false,
        message:"Could not assign the lab"
      })
    }
    return res.status(200).send({
      success:true,
      message:'Successfully assigned lab',
      data:insertData.rows[0]
    })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      messsage:'Internal server error',
      error:error.message
    })
  }
}

//get org assigned labs
const getOrgAssignedLabs = async (req,res)=>{
  try {
    const {orgId,userId} = req.body;
    if(!orgId||!userId){
      return res.status(404).send({
        success:false,
        message:"Please provide the required fields"
      })
    }
    let results = [];
    const response = await pool.query(proxmoxQueries.GET_SINGLEVM_ORG_LABS,[orgId]);
    if(!response.rows.length){
      return res.status(200).send({
        success:true,
        messsage:"No lab found for the user",
        data:[]
      })
    }
    for (lab of response.rows){
       const getLabDetails = await pool.query(proxmoxQueries.GET_LAB_LABID,[lab.labid]);
      
       results.push({
        ...getLabDetails.rows[0],
        ...lab}
       )
    }
    return res.status(200).send({
      success:true,
      message:'Successfully accessed the labs',
      data:results
    })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      message:'Internal server error',
      error:error.message
    })
  }
}
const getLabAdminsLab = async(req,res)=>{
  try {
     const {userIds} = req.body;
     if(!userIds.length){
       return res.status(400).send({
        success:false,
        message:"Please provide the user ids"
       })
     }
     const getLabAdminsLab = await pool.query(promoxQueries.GET_LABADMINS_LAB,[userIds]);
     return res.status(200).send({
      success:true,
      message:"Successfully accessed labs",
      data:getLabAdminsLab?.rows || []
     })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      message:"Intenal Server Error",
      error:error.message
    })
  }
}
//get single vm proxmox labs
const getSingleVMProxmoxLabs = async (req,res)=>{
  try {
    const {labId} = req.params;
    if(!labId){
      return res.status(404).send({
        success:false,
        message:"Please provide the lab id"
      })
    }
    let result= [];
    const response = await pool.query(proxmoxQueries.GET_LAB_LABID,[labId]);
    if(!response.rows.length){
      return res.status(200).send({
        success:true,
        message:"Could not fetch the lab data",
        data:[]
      })
    }
    const getVmDetails = await pool.query(proxmoxQueries.GET_LAB_CONFIGURATIONS,[response.rows[0].vmdetails_id]);
    result ={
      ...getVmDetails.rows[0],
      ...response.rows[0],
      
    }
    return res.status(200).send({
      success:true,
      message:"Successfully accessed the lab",
      data:result
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

//delete org assigned lab
const deleteOrgAssignedLab = async(req,res)=>{
  try {
     const {labId,orgId,adminId,node,vmid} = req.body;
     console.log(req.body)
  if(!labId || !orgId || !adminId){
    return res.status(400).send({
      success:false,
      message:"Please provide the required fields"
    })
  }
  if(vmid){
    // Step 1: Get VM status
    const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    const isRunning = statusResp.data.data.status === 'running';

    // Step 2: Stop the VM if it's running
    if (isRunning) {
      console.log(`VM ${vmid} is running — stopping before delete...`);
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
      // Wait until it's fully stopped
      let stopped = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000)); // 2s interval
        const checkStatus = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (checkStatus.data.data.status === 'stopped') {
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        return res.status(400).send({
          success: false,
          message: 'VM did not stop in time — aborting delete for safety.',
        });
      }
    }

    // Step 3: Delete VM with purge=1 (full cleanup)
    console.log(`Deleting VM ${vmid} from node ${node}...`);
    const deleteResp = await api.delete(`/nodes/${node}/qemu/${vmid}`, {
      params: { purge: 1 },
    });
  }
  await pool.query('BEGIN');
    await pool.query(proxmoxQueries.DELETE_SINGLEVM_USER_LAB_ORG,[labId,adminId])
   const deleteLab = await pool.query(proxmoxQueries.DELETE_SINGLEVM_ORG_LAB,[labId,orgId,adminId]);
   if(!deleteLab.rows.length){
    return res.status(404).send({
      success:false,
      message:"Could not delete the lab",
    })
   }
   await pool.query('COMMIT');
   return res.status(200).send({
    success:true,
    message:"Successfully deleted the lab",
    data:deleteLab.rows[0]
   })
  } catch (error) {
    await pool.query('ROLLBACK');
    console.log(error);
    return res.status(500).send({
      success:false,
      message:"Internal server error",
      error:error.message
    })
  }
 
}

//update single vm org timings
const updateSingleVMProxmoxOrgTime = async(req,res)=>{
  try {
    const {identifier,labId, startTime,endTime,type} = req.body;
    console.log(req.body)
    if(!identifier||!labId||! startTime||!endTime||!type ){
      return res.status(400).send({
        success:false,
        message:"Please provide the required fields"
      })
    }
    let update;
    if(type === 'org'){
        update = await pool.query(proxmoxQueries.UPDATE_ORG_LAB_TIME,[startTime,endTime,labId,identifier]);
    }
    else{
        update = await pool.query(proxmoxQueries.UPDATE_USER_LAB_TIME,[startTime,endTime,labId,identifier]);
    }
    if(!update.rows.length){
      return res.status(404).send({
        success:false,
        message:"Could not update the lab timings"
      })
    }
    return res.status(200).send({
      success:true,
      message:"Successfully updated the timings",
      data:update.rows[0]
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

//assign single vm lab to user
const assignSingleVmToUser = async(req,res)=>{
 try {
        let { lab,
        userIds,
        assignedBy,
        startDate,
        endDate,
        orgId,
      userName} = req.body;
         // Normalize `userIds` to an array
         userIds = Array.isArray(userIds) ? userIds : [userIds];
         const successfulAssignments = [];
         const errors = [];
 
         for (const user of userIds) {
             const userDetails = await pool.query(proxmoxQueries.GET_USER_DETAILS,[user]);
             const checkAlreadyAssigned = await pool.query(proxmoxQueries.CHECK_ALREADY_ASSIGNED, [user, lab]);
             
             if (checkAlreadyAssigned.rows.length > 0) {
                 throw new Error(`Lab already assigned to ${userDetails.rows[0].name}`)
             }
            const vmName = `vm-${userDetails.rows[0].name.replace(' ','-')}`
             // Insert lab assignment into the database
             const result = await pool.query(proxmoxQueries.INSERT_SINGLEVM_USER_ASSIGNMENT, [
                 lab,
                 user,
                 assignedBy,
                 startDate,
                 endDate,
                 vmName,
                 'direct',
                 null
                 ]);
             if (result.rows.length > 0) {
                 successfulAssignments.push(result.rows[0]);
                 await pool.query('BEGIN');
                     const insertNotification = await pool.query(labQueries.INSERT_NOTIFICATION, ['lab_assigned', 'Lab Assigned', `A new lab has been assigned to you. Lab ID: ${lab}`,'medium', user,[JSON.stringify({
                 labId: lab,
                 assigned_by: assignedBy,
                 assignment_id: result.rows[0]?.id ?? null, 
                 start_date: startDate,
                 end_date: endDate,
                 })] ]);
                 const userSettings  = await pool.query(labQueries.GET_USER_NOTIFICATION_SETTINGS, [user]);
                 if(userSettings.rows.length > 0){
                  const settings = userSettings.rows[0];
                          // ---- EMAIL NOTIFICATIONS ----
                  if (settings.emailnotifications.includes("lab_assigned")) {
                           if (settings.email_digest !== "never" && settings.email_digest === "immediate") {
                             const localTime = nowInTz(settings?.timezone || "UTC");
                             const inQuiet = settings?.quiet_hours_enabled
                               ? isWithinQuietHours(localTime, settings.quiet_start, settings.quiet_end)
                               : false;
                 
                             if (!inQuiet) {
                               const htmlTemplate = path.join(
                                 process.env.EMAIL_TEMPLATE_PATH
                               );
                               const placeholders = await emailPlacehoders(insertNotification.rows[0], lab, await getUserEmail(user));
                               await sendNotificationToMail(htmlTemplate,placeholders);
                               //  Mark email sent AFTER notification is already in DB
                               await markEmailAsSent(insertNotification.rows[0]?.id);
                             }
                           }
                 }
                                     // ---- IN-APP NOTIFICATIONS ----
                 if (settings.inappnotifications.includes("lab_assigned")) {
                           await sendNotification({
                             userId: user,
                             notification: insertNotification.rows[0],
                           });
                 
                           await pool.query(labQueries.INSERT_LAB_NOTIFICATION, [
                             lab,
                             "lab_assigned",
                             endDate,
                             insertNotification.rows[0]?.id,
                           ]);
                 }}
                 await pool.query('COMMIT');
                 
             } else {
                 errors.push({
                     user_id: user,
                     lab_id: lab,
                     message: "Failed to assign the lab",
                 });
             }
         }
 
         return res.status(200).send({
          success:true,
          message:"Successfully assigned",
          data:successfulAssignments
         })
     } catch (error) {
      console.log(error);
      return res.status(500).send({
        success:false,
        message:'Internal server error',
        error:error.message
      })
  }
}

//get single vm proxmox lab of users
const getUserSingleVMProxmoxLab = async(req,res)=>{
   try {
     const {userId} = req.params;
     if(!userId){
      return res.status(404).send({
        success:false,
        message:"Please provide the user ID",
      })
     }
     const getUserLabs = await pool.query(proxmoxQueries.GET_SINGLEVM_USER_LABS,[userId]);
     let results =[];
     for(const lab of getUserLabs.rows){
      const getLabDetails = await pool.query(proxmoxQueries.GET_LAB_LABID,[lab.labid]);
      const getLabConfig = await pool.query(proxmoxQueries.GET_LAB_CONFIGURATIONS,[getLabDetails.rows[0].vmdetails_id]);
      if(!getLabDetails.rows.length){
        return res.status(404).send({
          success:false,
          message:'Could not found lab details'
        })
      }
      results.push({
        ...getLabDetails.rows[0],
        ...getLabConfig.rows[0],
        ...lab,
      })
     }
     if(!getUserLabs.rows.length){
      return res.status(200).send({
        success:false,
        message:"No labs found for user",
        data:[]
      })
     }
     return res.status(200).send({
      success:true,
      message:"Successfully accessed labs",
      data:results
     })
   } catch (error) {
      console.log(error);
      return res.status(500).send({
        success:false,
        message:'Internal server error',
        error:error.message
      })
   }
}

//get single vm proxmox user pruchased labs
const getUserSingleVMPurchasedLab = async(req,res)=>{
      try {
     const {userId} = req.params;
     if(!userId){
      return res.status(404).send({
        success:false,
        message:"Please provide the user ID",
      })
     }
     const getUserLabs = await pool.query(proxmoxQueries.GET_SINGLEVM_USER_PURCHASED_LABS,[userId]);
     
      if(!getUserLabs.rows.length){
      return res.status(200).send({
        success:false,
        message:"No labs found for user",
        data:[]
      })
     }
     let results =[];
     for(const lab of getUserLabs.rows){
      const getLabDetails = await pool.query(proxmoxQueries.GET_LAB_LABID,[lab.labid]);
      const getLabConfig = await pool.query(proxmoxQueries.GET_LAB_CONFIGURATIONS,[getLabDetails.rows[0].vmdetails_id]);
      if(!getLabDetails.rows.length){
        return res.status(404).send({
          success:false,
          message:'Could not found lab details'
        })
      }
      results.push({
        ...getLabDetails.rows[0],
        ...getLabConfig.rows[0],
        ...lab,
        purchased:true
      })
     }
    
     return res.status(200).send({
      success:true,
      message:"Successfully accessed labs",
      data:results
     })
   } catch (error) {
      console.log(error);
      return res.status(500).send({
        success:false,
        message:'Internal server error',
        error:error.message
      })
   }
}

//delete single vm proxmox of users
const deleteSingleVMProxmoxUser = async(req,res)=>{
  try {
    const {labId,userId,purchased,node,vmid} = req.body;
    if(!labId || !userId){
      return res.status(404).send({
        success:false,
        message:"Please provide the required fields"
      })
    }
    if(vmid){
    // Step 1: Get VM status
    const statusResp = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
    const isRunning = statusResp.data.data.status === 'running';

    // Step 2: Stop the VM if it's running
    if (isRunning) {
      console.log(`VM ${vmid} is running — stopping before delete...`);
      await api.post(`/nodes/${node}/qemu/${vmid}/status/stop`);
      // Wait until it's fully stopped
      let stopped = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000)); // 2s interval
        const checkStatus = await api.get(`/nodes/${node}/qemu/${vmid}/status/current`);
        if (checkStatus.data.data.status === 'stopped') {
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        return res.status(400).send({
          success: false,
          message: 'VM did not stop in time — aborting delete for safety.',
        });
      }
    }

    // Step 3: Delete VM with purge=1 (full cleanup)
    console.log(`Deleting VM ${vmid} from node ${node}...`);
    const deleteResp = await api.delete(`/nodes/${node}/qemu/${vmid}`, {
      params: { purge: 1 },
    });
  }
    let response;
    if(purchased){
      response = await pool.query(proxmoxQueries.DELETE_SINGLEVM_USER_PURCHASED_LAB,[labId,userId]);
    }
    else{
      response = await pool.query(proxmoxQueries.DELETE_SINGLEVM_USER_LAB,[labId,userId]);
    }
    
    if(!response.rows.length){
      return res.status(404).send({
        success:false,
        message:"Could not delete the lab"
      })
    }
    return res.status(200).send({
      success:true,
      message:"Successfully deleted lab",
      data:response.rows[0]
    })
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success:false,
      message:'Internal server error',
      error:error.message
    })
  }
}

//create a catalogue of singlevm
const createSingleVmProxmoxCatalogue = async(req,res)=>{
  try {
     const {catalogueName,
        software,
        catalogueType,
        labId,
        level,
        category,
        price} = req.body;
        if(!catalogueName || !software || !catalogueType || !labId || !level || !category ||!price){
          return res.status(404).send({
            success:false,
            message:'Plese provide all the required fields'
          })
        }
      const createCatalogue = await pool.query(proxmoxQueries.CREATE_SINGLEVM_CATALOGUE,[catalogueName,software,catalogueType,level,category,price,labId]);
      if(!createCatalogue.rows.length){
        return res.status(404).send({
          success:false,
          message:"Could not create a catalogue"
        })
      }  
      return res.status(200).send({
        success:true,
        message:'Successfully created a catalogue',
        data:createCatalogue.rows[0]
      })
  } catch (error) {
     console.log(error);
     return res.status(500).send({
      success:false,
      messsage:"Internal server error",
      error:error.message
     })
  }
  
}


module.exports = {
    getStorages,
    getIsos,
    getNetworkBridges,
    getCpuModels,
    getClusterResources,
    uploadIsoFile,
    getNextVmid,
    createSingleVmProxmoxConfig,
    getSingleVmProxmoxLab,
    checkVMStatus,
    createVM,
    editProxmoxVm,
    deleteVmInProxmox,
    createTemplateInProxmox,
    getTemplateInformation,
    getProxmoxSingleVMLabOnUserId,
    assignLabToOrgAdmin,
    getOrgAssignedLabs,
    getSingleVMProxmoxLabs,
    deleteOrgAssignedLab,
    updateSingleVMProxmoxOrgTime,
    assignSingleVmToUser,
    getUserSingleVMProxmoxLab,
    deleteSingleVMProxmoxUser,
    createSingleVmProxmoxCatalogue,
    getUserSingleVMPurchasedLab,
    startVM,
    getTemplatesByNode,
    getIpOfVm,
    createUserVm,
    stopVM,
    deleteVMOFProxmox,
    getLabAdminsLab
}