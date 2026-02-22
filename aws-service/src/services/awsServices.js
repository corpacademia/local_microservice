const { spawn } = require("child_process");
const  awsQueries  = require('./awsQueries');
const pool = require('../dbconfig/db');
const path = require('path');



const executePythonScript = async (scriptName, args = []) => {
  return new Promise((resolve, reject) => {
    console.log('args:',args)
    const pythonProcess = spawn("python", [path.resolve(__dirname,scriptName), ...args]);
    let result = "";
    let errorResult = "";

    pythonProcess.stdout.on("data", (data) => {
      console.log(data.toString())
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.log(data.toString())
      errorResult += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        console.log(result.trim())
        resolve(result.trim());
      } else {
        console.log(errorResult.trim())
        reject(errorResult.trim());
      }
    });

    // Optional: Timeout for script execution
    // setTimeout(() => {
    //   pythonProcess.kill();
    //   reject("Python script execution timed out.");
    // }, 30000); // 30 seconds timeout
  });
};

const executeIamScript = async (scriptName, ...args) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [path.resolve(__dirname, scriptName), ...args]);

    let result = "";
    let errorResult = "";

    pythonProcess.stdout.on("data", (data) => {
      console.log(data.toString());
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(data.toString());
      errorResult += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(result.trim());
      } else {
        reject(errorResult.trim());
      }
    });
  });
};


// EC2 Terraform Execution
const ec2Terraform = async (cloudPlatform) => {
  try {
    // Ensure the correct path to the script
    const scriptPath = path.resolve(__dirname, "../terraformScripts/EC2.py");

    // Execute the Python script
    const result = await executePythonScript(scriptPath);


    return { success: true, message: "EC2 Terraform script executed successfully", result };
  } catch (error) {
    console.error("Error executing EC2 Terraform script:", error.message);

    return {
      success: false,
      message: "EC2 Terraform execution failed",
      error: error.message,
    };
  }
};

// Run Terraform Script
const runTf = async (lab_id) => {
  try {
    // Ensure the correct path to the script
    const scriptPath = path.resolve(__dirname, "../terraformScripts/terra.py");

    // Execute the Python script with lab_id as an argument
    const result = await executePythonScript(scriptPath, [lab_id]);


    return { success: true, message: "Terraform script executed successfully", result };
  } catch (error) {
    console.error("Error executing Terraform script:", error.message);

    return {
      success: false,
      message: "Terraform execution failed",
      error: error.message,
    };
  }
};

const createIamUser = async (...args) => {
  try {
    if (args.length < 2) {
      throw new Error("Please provide at least a username and one service.");
    }

    const scriptPath = path.resolve(__dirname, "../terraformScripts/iamUser.py");
    
    const result = await executeIamScript(scriptPath, ...args);
    return {
      success: true,
      message: "Terraform script executed successfully",
      result
    };

  } catch (error) {
    throw new Error(`Error executing Terraform script: ${error.message}`);
  }
};
//edit the aws services
const editAwsServices = async(...args) =>{
   try {
    if (args.length < 2) {
      throw new Error("Please provide at least a username and  service.");
    }
    const scriptPath = path.resolve(__dirname,'../terraformScripts/editAwsServices.py');
    const result = await executeIamScript(scriptPath, ...args)
    return {
      success:true,
      message:"Terraform script executed successfully",
      result
    }
   } catch (error) {
     console.log(error);
     throw new Error(`Error executing edit services: ${error.message}`)
   }
}

//add the aws services
const addAwsServices = async(...args) =>{
  try {
   if (args.length < 2) {
     throw new Error("Please provide at least a username and  service.");
   }
   const scriptPath = path.resolve(__dirname,'../terraformScripts/addAwsServices.py');
   const result = await executeIamScript(scriptPath, ...args);
   return {
     success:true,
     message:"Terraform script executed successfully",
     result
   }
  } catch (error) {
    console.log(error);
    throw new Error(`Error executing edit services: ${error.message}`)
  }
}

//delete iam account
const deleteIamAccount = async(...args) =>{
  try {
   if (args.length < 1) {
     throw new Error("Please provide at least a username and  service.");
   }
   const scriptPath = path.resolve(__dirname,'../terraformScripts/deleteIamAccount.py');
   const result = await executeIamScript(scriptPath, ...args);
   return {
     success:true,
     message:"Terraform script executed successfully",
     result
   }
  } catch (error) {
    console.log(error);
    throw new Error(`Error executing edit services: ${error.message}`)
  }
}

//delete the permissions allocated to the iam account
const deletePermissions = async(...args)=>{
      try {
        if (args.length < 1) {
          throw new Error("Please provide  a username.");
        }
        const scriptPath = path.resolve(__dirname,'../terraformScripts/deletePermissions.py');
        const result = await executeIamScript(scriptPath, ...args)
        return {
          success:true,
          message:"Terraform script executed successfully",
          result
        }
      } catch (error) {
        console.log(error);
        throw new Error(`Error executing deleting services: ${error.message}`)
      }
}


// Instance to Data Processing
const instanceToData = async (lab_id) => {
  return await executePythonScript("../terraformScripts/instanceToData.py", [lab_id]);
};

// Determine the table name based on the cloud provider
const getTableByCloud = (cloud) => {
    switch (cloud.toLowerCase()) {
      case "aws":
        return "ec2_instance";
      case "azure":
        return "azure_vm";
      default:
        return null;
    }
  };
  
  // Fetch instance data with validation and query execution
  const fetchInstances = async (cloud, cpu, ram) => {
    if (!cloud || !cpu || !ram) {
      throw new Error("Missing required parameters (cloud, cpu, ram)");
    }
  
    const table = getTableByCloud(cloud);
    if (!table) {
      throw new Error("Unsupported cloud platform. Choose 'aws' or 'azure'");
    }
  
    // Replace `{table}` in query with the actual table name
    const query = awsQueries.GET_INSTANCES_QUERY.replace("{table}", table);
    
    const { rows } = await pool.query(query, [cpu.toString(), ram.toString()]);
    return rows;
  };

  const getProviderDetails = (provider) => {
    const providerMapping = {
        aws: { table: 'ec2_instance', column: 'instanceName' },
        azure: { table: 'azure_vm', column: 'instance' }
    };
    return providerMapping[provider.toLowerCase()] || null;
};

const fetchInstanceDetails = async (provider, instance, cpu, ram) => {
    const providerDetails = getProviderDetails(provider);
    if (!providerDetails) {
        throw new Error("Invalid provider. Supported providers: AWS, Azure.");
    }

    let query = queries.GET_INSTANCES_QUERY_FOR_PRICING
        .replace("{table}", providerDetails.table)
        .replace("{column}", providerDetails.column);

    const result = await pool.query(query, [instance, cpu, ram]);

    return result.rows[0] || null;
};

const executeVmToGoldenImage = async (instance_id, lab_id) => {
  return new Promise((resolve, reject) => {
      console.log("🟡 vmToGoldenImage execution started...");

      const pythonProcess = spawn("python", [path.resolve(__dirname,"../terraformScripts/vm_goldenImage.py"), instance_id, lab_id]);

      let result = "";
      let errorOutput = "";

      // Capture standard output (stdout)
      pythonProcess.stdout.on("data", (data) => {
          result += data.toString(); // Accumulate script's output
          console.log(`🟢 stdout: ${data.toString()}`);
      });

      // Capture errors (stderr)
      pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
          console.error(`🔴 stderr: ${data.toString()}`);
      });

      // Handle script completion
      pythonProcess.on("close", (code) => {
          console.log(`⚡ Process exited with code ${code}`);

          if (code === 0) {
              try {
                  // const parsedResult = JSON.parse(result);
                  resolve({ success: true, data: result });
              } catch (parseError) {
                  reject({
                      success: false,
                      message: "Failed to parse Python script output",
                      rawOutput: result,
                      error: parseError.message,
                  });
              }
          } else {
              reject({
                  success: false,
                  message: "VmToGoldenImage script execution failed",
                  error: errorOutput.trim() || "Unknown error",
              });
          }
      });
  });
};

const goldenToInstanceLogic = async (instanceType, amiId, noInstance, terminationPeriod) => {
  try {
    console.log("Executing GoldenImageToInstance script...");
    const args = [instanceType, amiId, noInstance, terminationPeriod];

    const result = await executePythonScript("../terraformScripts/golden_instance.py", args);
    
    return { success: true, message: "GoldenImageToInstance script executed successfully", result };
  } catch (error) {
    return { success: false, message: "GoldenImageToInstance script execution failed", error: error.message };
  }
};

const goldenToInstanceForNewCatalogueLogic = async (instanceType, amiId, storageSize, labId, prevLabId) => {
  try {
    console.log("Executing GoldenImageToInstanceForNewCatalogue script...");
    const scriptPath = "../terraformScripts/goldenToInstanceForNewCatalogue.py";
    const args = [instanceType, amiId, storageSize, labId, prevLabId];
    const result = await executePythonScript(scriptPath, args);
    
    return { success: true, message: "GoldenImageToInstanceForNewCatalogue script executed successfully", result };
  } catch (error) {
    return { success: false, message: "GoldenImageToInstanceForNewCatalogue script execution failed", error: error.message };
  }
};


const deleteLabService = async (labId, instanceId, amiId, userId,purchased) => {
  try {
    if (!labId  || !userId) {
      console.error("ID is required");
    }
    // Execute Python script to delete VM from the cloud
    const scriptPath = "../terraformScripts/deleteInstance.py";
    await executePythonScript(scriptPath, [instanceId, amiId]);

    // Execute database queries
    if(purchased){
    await pool.query(awsQueries.DELETE_PURCHASED_LAB_ASSIGNMENTS, [labId, userId]);
    await pool.query(awsQueries.DELETE_CLOUD_ASSIGNED_INSTANCE, [labId, userId]);
    }
    else{
    await pool.query(awsQueries.DELETE_LAB_ASSIGNMENTS, [labId, userId]);
    await pool.query(awsQueries.DELETE_CLOUD_ASSIGNED_INSTANCE, [labId, userId]);
    }
  
    return { success: true, message: "Lab deleted successfully" };
  } catch (error) {
    console.log(error)
    throw error;
  }
};
const deleteBatchLabService = async (labId, instanceId, amiId, userId) => {
  try {
    if (!labId  || !userId) {
      console.error("ID is required");
    }
    // Execute Python script to delete VM from the cloud
    const scriptPath = "../terraformScripts/deleteInstance.py";
    await executePythonScript(scriptPath, [instanceId, amiId]);

    return { success: true, message: "Lab deleted successfully" };
  } catch (error) {
    console.log(error)
    throw error;
  }
}
const deleteSuperLabService = async (labId, instanceId, amiId) => {
  try {
    if (!labId) {
      throw new Error("Lab ID is required");
    }

    // Execute Python script to delete VM from the cloud
    const scriptPath = "../terraformScripts/deleteInstance.py";
    await executePythonScript(scriptPath, [instanceId, amiId]);

    // Execute database queries
    await pool.query(awsQueries.DELETE_AMI_INFORMATION, [labId]);
    await pool.query(awsQueries.DELETE_INSTANCES, [labId]);
    await pool.query(awsQueries.DELETE_LAB_CONFIGURATIONS, [labId]);
    await pool.query(awsQueries.DELETE_LAB_BATCH, [labId]);
    await pool.query(awsQueries.DELETE_LAB_ASSIGNMENTS_SUPER, [labId]);
    await pool.query(awsQueries.DELETE_CREATE_LAB, [labId]);

    return { success: true, message: "Lab deleted successfully" };
  } catch (error) {
    throw error;
  }
};

const executeJWTScript = (osName, instanceId, hostname, password) => {
  return new Promise((resolve, reject) => {
      const scriptPath = '../terraformScripts/jwttoken.py'
      const args = [osName, instanceId, hostname, password];
      const process = spawn("python", [path.resolve(__dirname,scriptPath), ...args]);

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
          output += data.toString();
      });

      process.stderr.on("data", (data) => {
          errorOutput += data.toString();
      });

      process.on("close", (code) => {
          if (code === 0) {
              resolve(output.trim());
          } else {
              reject(`JWT script failed with code ${code}: ${errorOutput}`);
          }
      });

      process.on("error", (err) => {
          reject(`Failed to start JWT script: ${err.message}`);
      });
  });
};

const handleLaunchSoftwareOrStopService = async (osName, instanceId, hostname, password) => {
  try {
      const jwtToken = await executeJWTScript(osName, instanceId, hostname, password);
      return {
          success: true,
          message: "Connected to Guacamole and opened in browser",
          result:jwtToken,
      };
  } catch (error) {
      console.log(error)
      throw new Error(`Could not Launch or Stop software: ${error.message}`);
  }
};

const executeDecryptPasswordScript = (labId, publicIp, instanceId) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../terraformScripts/decrypt_password.py");
    const args = [labId, publicIp, instanceId];

    const pythonProcess = spawn("python", [scriptPath, ...args]);

    let outputData = "";
    let errorData = "";

    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString();
      console.log("Decrypted Password:", outputData.trim());
    });

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
      console.error("Decrypt Password script error:", errorData.trim());
    });

    pythonProcess.on("close", (code) => {
      console.log(`Decrypt Password script exited with code ${code}`);
      if (code === 0) {
        resolve(outputData.trim()); // Resolves when script execution succeeds
      } else {
        reject(new Error(`Script exited with code ${code}: ${errorData.trim()}`));
      }
    });

    pythonProcess.on("error", (err) => {
      console.error(`Failed to start Decrypt Password script: ${err.message}`);
      reject(err);
    });
  });
};

const getDecryptPasswordFromCloudService = async (labId, publicIp, instanceId) => {
  try {
    // Execute the decrypt password script
    const result = await executeDecryptPasswordScript(labId, publicIp, instanceId);
    return {
      success: true,
      message: "Decrypt Password script executed successfully",
      result,
    };
  } catch (error) {
    console.error("Error decrypting password:", error.message);

    return {
      success: false,
      message: "Could not decrypt password",
      error: error.message,
    };
  }
};

const executeGenerateNewIpScript = (instanceId) => {
  return new Promise((resolve, reject) => {
      const scriptPath = path.resolve("../terraformScripts/generateNewIp.py");
      const args = [instanceId];
      const pythonProcess = spawn("python", [path.resolve(__dirname,scriptPath), ...args]);

      let result = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
          result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
      });

      pythonProcess.on("close", (code) => {
          if (code === 0) {
              resolve(result.trim());
          } else {
              reject(`Generate New IP script failed with code ${code}: ${errorOutput}`);
          }
      });

      pythonProcess.on("error", (err) => {
          reject(`Failed to start Generate New IP script: ${err.message}`);
      });
  });
};

const getNewIpFromCloudService = async (instanceId) => {
  try {
      const result = await executeGenerateNewIpScript(instanceId);
      return {
          success: true,
          message: "Get public IP script executed successfully",
          result,
      };
  } catch (error) {
      throw new Error(`Could not generate new IP: ${error.message}`);
  }
};

const executeUserDecryptPasswordScript = (userId, publicIp, instanceId) => {
  return new Promise((resolve, reject) => {
      const scriptPath = path.resolve("../terrafromScripts/userDecryptPassword.py");
      const args = [userId, publicIp, instanceId];
      const pythonProcess = spawn("python", [path.resolve(__dirname,scriptPath), ...args]);

      let result = "";
      let errorOutput = "";

      pythonProcess.stdout.on("data", (data) => {
          result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
      });

      pythonProcess.on("close", (code) => {
          if (code === 0) {
              resolve(result.trim());
          } else {
              reject(`User Decrypt Password script failed with code ${code}: ${errorOutput}`);
          }
      });

      pythonProcess.on("error", (err) => {
          reject(`Failed to start User Decrypt Password script: ${err.message}`);
      });
  });
};

const getUserDecryptPasswordFromCloudService = async (userId, publicIp, instanceId) => {
  try {
      const result = await executeUserDecryptPasswordScript(userId, publicIp, instanceId);
      return {
          success: true,
          message: "Decrypt Password script executed successfully",
          result,
      };
  } catch (error) {
      throw new Error(`Could not decrypt password: ${error.message}`);
  }
};

const updateAssessmentStorageService = async (instanceId, newVolumeSize, labId) => {
  try {
      const result = await executePythonScript(instanceId, newVolumeSize);

      // Update the database with new storage size
      await pool.query("UPDATE createlab SET storage = $1 WHERE lab_id = $2", [newVolumeSize, labId]);

      return {
          success: true,
          message: "Edit instance script executed successfully",
          result,
      };
  } catch (error) {
      throw new Error(`Could not edit instance: ${error.message}`);
  }
};

const createCloudAssignedInstance = async (name, ami_id, user_id, lab_id, instance_type, start_date, end_date,batch,batch_id) => {
  if (!name || !ami_id || !user_id || !lab_id || !instance_type || !start_date || !end_date) {
      throw new Error("Missing required parameters");
  }

  const scriptPath = "../terraformScripts/launchInstance.py";
  const args = [name, ami_id, user_id, lab_id, instance_type, start_date, end_date,batch,batch_id];

  return await executePythonScript(scriptPath, args);
};

// const startLabService = async (aws_access_key, aws_secret_key) => {
//   if (!aws_access_key || !aws_secret_key) {
//       throw new Error("Missing required AWS credentials");
//   }

//   const scriptPath = "./python_scripts.py/cloudvms/orgaws_acc.py";
//   const args = [aws_access_key, aws_secret_key];

//   return await executePythonScript(scriptPath, args);
// };

// const stopLabService = async (aws_access_key, aws_secret_key) => {
//   if (!aws_access_key || !aws_secret_key) {
//       throw new Error("Missing required AWS credentials");
//   }

//   const scriptPath = "./python_scripts.py/cloudvms/orgaws_acc.py";
//   const args = [aws_access_key, aws_secret_key];

//   return await executePythonScript(scriptPath, args);
// };

const getCloudAssignedInstanceService = async (user_id, lab_id) => {
  try {
    if (!user_id || !lab_id) {
      throw new Error("Missing required parameters: user_id and lab_id");
    }

    // Execute the query
    const response = await pool.query(awsQueries.GET_CLOUD_ASSIGNED_INSTANCE, [user_id, lab_id]);

    // Check if instance exists
    if (!response.rows.length) {
      return null;
    }

    return response.rows[0];

  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
};

const checkCloudAssignedInstanceLaunchedService = async (lab_id, user_id) => {
  try {
    if (!lab_id || !user_id) {
      throw new Error("Missing required parameters: lab_id and user_id");
    }

    // Execute the query
    const response = await pool.query(awsQueries.CHECK_CLOUD_ASSIGNED_INSTANCE_LAUNCHED, [lab_id, user_id]);
   
    // Check if instance exists
    if (!response.rows.length) {
      return null;
    }

    return response.rows[0];

  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
};

const checkLabCloudInstanceLaunchedService = async (lab_id,type) => {
  try {
    if (!lab_id) {
      throw new Error("Missing required parameter: lab_id");
    }
    // Execute the query
    const response = await pool.query(awsQueries.CHECK_LAB_CLOUD_INSTANCE_LAUNCHED, [lab_id]);

    // Check if instance exists
    if (!response.rows.length) {
      return null;
    }

    return response.rows[0];

  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }
};

const stopInstanceService = async (instance_id) => {
  return new Promise((resolve, reject) => {
    if (!instance_id) {
      return reject(new Error("Instance ID is required"));
    }

    console.log("Stopping instance:", instance_id);

    const scriptPath = "../terraformScripts/stopInstance.py";
    const args = [instance_id];

    const pythonProcess = spawn("python", [path.resolve(__dirname,scriptPath), ...args]);

    let result = "";
    let errorOutput = "";

    // Capture the script's output
    pythonProcess.stdout.on("data", (data) => {
      console.log("Output produced");
      result += data.toString();
      console.log(`stdout: ${data}`);
    });

    // Capture errors
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(`stderr: ${data}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, message: "Stop Instance script executed successfully", result: result.trim() });
      } else {
        reject(new Error(`Stop Instance script failed with code ${code}. Error: ${errorOutput.trim()}`));
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Error starting Stop Instance process: ${err.message}`));
    });
  });
};


const restartInstanceService = async (instance_id, user_type) => {
  return new Promise((resolve, reject) => {
    if (!instance_id || !user_type) {
      return reject(new Error("Instance ID and User Type are required"));
    }

    console.log("Restarting instance:", instance_id);

    const scriptPath = "../terraformScripts/restartInstance.py";
    const args = [instance_id, user_type];

    const pythonProcess = spawn("python", [path.resolve(__dirname,scriptPath), ...args]);

    let result = "";
    let errorOutput = "";

    // Capture script output
    pythonProcess.stdout.on("data", (data) => {
      console.log("Output produced");
      result += data.toString();
      console.log(`stdout: ${data}`);
    });

    // Capture errors
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(`stderr: ${data}`);
    });

    // Handle process completion
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, message: "Restart Instance script executed successfully", result: result.trim() });
      } else {
        reject(new Error(`Restart Instance script failed with code ${code}. Error: ${errorOutput.trim()}`));
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Error starting Restart Instance process: ${err.message}`));
    });
  });
};

// const labProgress = async()=>{
//   try {
//      return progress;
//   } catch (error) {
//     throw new Error(`Lab progress error: ${error.message}`);
//   }
// }

module.exports = {
  ec2Terraform,
  runTf,
  instanceToData,
  fetchInstances ,
  fetchInstanceDetails,
  executeVmToGoldenImage,
  goldenToInstanceLogic,
  goldenToInstanceForNewCatalogueLogic,
  deleteLabService,
  deleteSuperLabService,
  handleLaunchSoftwareOrStopService,
  getDecryptPasswordFromCloudService,
  getNewIpFromCloudService,
  getUserDecryptPasswordFromCloudService,
  updateAssessmentStorageService,
  createCloudAssignedInstance,
  // startLabService,
  // stopLabService,
  getCloudAssignedInstanceService,
  checkCloudAssignedInstanceLaunchedService,
  checkLabCloudInstanceLaunchedService,
  stopInstanceService,
  restartInstanceService,
  createIamUser,
  editAwsServices,
  deletePermissions,
  addAwsServices,
  deleteIamAccount,
  deleteBatchLabService
};
