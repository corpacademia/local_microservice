
const cloudSliceAwsService = require('../services/cloudSliceAwsService');

const {LabAssignmentError} = require('../utils/errors');

const getAllAwsServices = async(req,res)=>{
    try {
        const result = await cloudSliceAwsService.getAllAwsServices();
        if(!result.length){
            return res.status(404).send({
                success:false,
                message:"No aws services found"
            })
        }
            return res.status(200).send({
                success:true,
                message:"Successfully fetched all aws services",
                data:result
            })
        
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:true,
            message:"Internal server error",
            error :error.message
        })
    }
}

//create cloud slice lab
const createCloudSliceLab = async(req,res)=>{
    try {
        const {createdBy,labData} = req.body;
        if(!labData){
            return res.status(400).send({
                success:false,
                message:"Please provide lab data"
            })
        }
        const result = await cloudSliceAwsService.createCloudSliceLab(createdBy,labData);
        if(!result){
            return res.status(400).send({
                success:false,
                message:"Failed to create cloud slice lab"
            })
        }
        return res.status(201).send({
            success:true,
            message:"Successfully created cloud slice lab",
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

const createCloudSliceLabWithModules = async(req,res)=>{
    try {
        const labData = JSON.parse(req.body.data);
    const files = req.files.map(file=>file.path);
    const filesArray = files.length > 0 ? files : null;
    const createLab = await cloudSliceAwsService.createCloudSliceLabWithModules(labData,filesArray);
    
    return res.status(201).send({
        success:true,
        message:"Successfully created cloud slice lab with modules",
        data:createLab
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

    const getCloudSliceLabByCreatedUserId = async(req,res)=>{
        try {
            const userId = req.query.userId;
            if(!userId){
                return res.status(400).send({
                    success:false,
                    message:"Please provide user id"
                })
            }
            const result = await cloudSliceAwsService.getCloudSliceLabsByCreatedUser(userId);
            if(!result.length){
                return res.status(404).send({
                    success:false,
                    message:"No cloud slice labs found"
                })
            }
            return res.status(200).send({
                success:true,
                message:"Successfully fetched all cloud slice labs",
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

// get cloud slice lab by id
const getCloudSliceLabById = async(req,res)=>{
    try {
        const {labId} = req.params;
        if(!labId){
            return res.status(400).send({
                success:false,
                message:"Please provide lab id"
            })
        }
        const result = await cloudSliceAwsService.getCloudSliceLabById(labId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched cloud slice lab",
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

//update the services on lab id
const updateServicesOnLabId = async(req,res)=>{
    const {labId} = req.params;
    const {services} = req.body;
    if(!labId){
        return res.status(400).send({
            success:false,
            message:"Please provide lab id"
        })
    }
    if(!services){
        return res.status(400).send({
            success:false,
            message:"Please provide services"
        })
    }
    try {
        const result = await cloudSliceAwsService.updateServicesOnLabId(labId,services);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated services on cloud slice lab",
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

//get modules on lab id
const getModulesOnLabId = async(req,res)=>{
    const {labId} = req.params;
    if(!labId){
        return res.status(400).send({
            success:false,
            message:"Please provide lab id"
        })
    }
    try {
        const result = await cloudSliceAwsService.getModulesOnLabId(labId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No modules found with this lab id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched modules on cloud slice lab",
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

//get lab exercises on module id
const getLabExercisesOnModuleId = async(req,res)=>{
    const {moduleId} = req.params;
    if(!moduleId){
        return res.status(400).send({
            success:false,
            message:"Please provide module id"
        })
    }
    try {
        const result = await cloudSliceAwsService.getLabExercisesOnModuleId(moduleId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No lab exercises found with this module id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched lab exercises on module",
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


// MODULES
const getAllModules = async (req, res) => {
    try {
        const { sliceId } = req.params;
      const modules = await cloudSliceAwsService.getAllModules(sliceId);
      for (const mod of modules) {
        const exercises = await cloudSliceAwsService.getExercisesByModuleId(mod.id);
        mod.exercises = exercises;
      }
      if(!modules.length) {
        return res.status(404).send({
          success: false,
          message: "No modules found"
        });
      }
      return res.status(200).send({
        success: true,
        message: "Modules fetched successfully",
        data: modules
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  };
  
  // LAB EXERCISES
  const getLabExercises = async (req, res) => {
    const { moduleId } = req.params;
    try {
      const result = await cloudSliceAwsService.getLabExercisesByModuleId(moduleId);
      if(!result.length) {
        return res.status(404).send({
          success: false,
          message: "No lab exercises found for this module"
        });
      }
      return res.status(200).send({
        success: true,
        message: "Lab exercises fetched successfully",
        data: result
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  };
  
  // QUIZ EXERCISES
  const getQuizExercises = async (req, res) => {
    const { moduleId } = req.params;
    try {
      const result = await cloudSliceAwsService.getQuizExercisesByModuleId(moduleId);
      if(!result.length) {
        return res.status(404).send({
          success: false,
          message: "No quiz exercises found for this module"
        });
      }
      return res.status(200).send({
        success: true,
        message: "Quiz exercises fetched successfully",
        data: result
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  };
  
//update module on id
const updateModuleOnId = async(req,res)=>{
    try {
        const moduleData =  req.body;
        if(!moduleData) {
            return res.status(400).send({
                success:false,
                message:"Please provide module data"
            })
        }
        const result = await cloudSliceAwsService.updateModuleOnId(moduleData);
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated module",
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

//delete module on id
const deleteModuleOnId = async(req,res)=>{
    try {
        const {moduleId} = req.params;
        if(!moduleId){
            return res.status(400).send({
                success:false,
                message:"Please provide module id"
            })
        }
        const result = await cloudSliceAwsService.deleteModuleOnId(moduleId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No module found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted module",
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

//update exercise main content on id
const updateExerciseMainContentOnId = async(req,res)=>{
    try {
        const  moduleData  = req.body;

        if(!moduleData) {
            return res.status(400).send({
                success:false,
                message:"Please provide module data"
            })
        }
        const result = await cloudSliceAwsService.updateExerciseMainContentOnId(moduleData);
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated module",
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

//delete exercise on id
const deleteExerciseOnId = async(req,res)=>{  
    try {
        const exerciseId = req.params.exerciseId;
        if(!exerciseId){
            return res.status(400).send({
                success:false,
                message:"Please provide exercise id"
            })
        }
        const result = await cloudSliceAwsService.deleteExerciseOnId(exerciseId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No exercise found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted exercise",
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

  //update lab_exercise on exercise id
  const updateLabExerciseOnExerciseId = async(req,res)=>{
    try {
        const exerciseData = req.body;
        const files = req.files.map(file=>file.path);
        const filesArray = files.length > 0 ? files : null;
        if(!exerciseData){
            return res.status(400).send({
                success:false,
                message:"Please provide exercise data"
            })
        }
        const result = await cloudSliceAwsService.updateLabExerciseContentOnExerciseId(exerciseData,filesArray);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No exercise found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated exercise",
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

//update quiz exercise on exercise id
const updateQuizExerciseOnExerciseId = async(req,res)=>{
    try {
        const exerciseData = req.body;
        if(!exerciseData){
            return res.status(400).send({
                success:false,
                message:"Please provide exercise data"
            })
        }
        const result = await cloudSliceAwsService.updateQuizExerciseContentOnExerciseId(exerciseData);
        // if(!result){
        //     return res.status(404).send({
        //         success:false,
        //         message:"No exercise found with this id"
        //     })
        // }
        return res.status(200).send({
            success:true,
            message:"Successfully updated exercise",
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

//create a module
const createModule = async(req,res)=>{
    try {
        const moduleData = req.body;
        if(!moduleData) {
            return res.status(400).send({
                success:false,
                message:"Please provide module data"
            })
        }
        const result = await cloudSliceAwsService.createModule(moduleData);
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created module",
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

//create a exercise
const createExercise = async(req,res)=>{
    try {
        const {type , moduleId} = req.body;
        if(!type || !moduleId) {
            return res.status(400).send({
                success:false,
                message:"Please provide exercise data"
            })
        }
        const result = await cloudSliceAwsService.createExercise(type,moduleId);
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created exercise",
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

//create a quiz exercie content
const createQuizExerciseContent = async(req,res)=>{
    try {
        const {title,quizData} = req.body;
        if(!title || !quizData) {
            return res.status(400).send({
                success:false,
                message:"Please provide quiz data"
            })
        }
        const result = await cloudSliceAwsService.createExerciseContent(title,quizData);
        // if (!result ) {
        //     return res.status(404).send({
        //         success: false,
        //         message: "No module found with this id"
        //     });
        // }
        return res.status(200).send({
            success:true,
            message:"Successfully created quiz exercise content",
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
const createLabExercise = async(req,res)=>{
    try {
        const exerciseData =req.body;
        const files = req.files.map(file=>file.path);
        const filesArray = files.length > 0 ? files : null;
        if(!exerciseData) {
            return res.status(400).send({
                success:false,
                message:"Please provide exercise data"
            })
        }
        const result = await cloudSliceAwsService.createLabExercise(exerciseData,filesArray);
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully created lab exercise",
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

//delete cloudslice lab
const deleteCloudSliceLab = async(req,res)=>{
    try {
        const labId = req.params.labId;
        
        if(!labId){
            return res.status(400).send({
                success:false,
                message:"Please provide lab id"
            })
        }
        const result = await cloudSliceAwsService.deleteCloudSliceLab(labId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted cloud slice lab",
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

//update cloud slice lab 
const updateCloudSliceLab = async(req,res)=>{
    try {
        const labid = req.params.labId;
        const labData = req.body;
        if(!labData) {
            return res.status(400).send({
                success:false,
                message:"Please provide lab data"
            })
        }
        const result = await cloudSliceAwsService.updateCloudSliceLab(labid,labData);
        console.log(result)
        if (!result ) {
            return res.status(404).send({
                success: false,
                message: "No module found with this id"
            });
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated cloud slice lab",
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

//cloudslice organization assignment
const cloudSliceOrgAssignment = async(req,res)=>{
    try {
        const {sliceId,organizationId,userId,isPublic} = req.body;
        if(!sliceId || !organizationId  || !userId){
            return res.status(400).send({
                success:false,
                message:"Please provide lab id and organization id"
            })
        }
        const result = await cloudSliceAwsService.cloudSliceLabOrgAssignment(sliceId,organizationId,userId,isPublic);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully assigned cloud slice lab to organization",
            data:result
        })
    } catch (error) {
        // console.log(error)
        if (error instanceof LabAssignmentError) {
        return res.status(409).send({
        success: false,
        message: error.message,
        error: error.data
        });
    }
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//get cloud slice labs assigned to organization
const getCloudSliceLabAssignedToOrg = async(req,res)=>{
    try {
        const orgId = req.params.orgId;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide organization id"
            })
        }
        const result = await cloudSliceAwsService.getAllLabsFromOrgAssignment(orgId);
        if(!result){
            return res.status(404).send({
                success:success,
                message:"No labs assigned to this organization",
                data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched cloud slice lab assigned to organization",
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


//delete cloud slice lab assigned to organization
const deleteCloudSliceLabAssignedToOrg = async(req,res)=>{
    try {
        const id = req.params.id;
        const {orgId} = req.body;
        if(!id){
            return res.status(400).send({
                success:false,
                message:"Please provide id"
            })
        }
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide organization id"
            })
        }
        const result = await cloudSliceAwsService.deleteOrgAssignmentLab(id,orgId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted cloud slice lab assigned to organization",
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

//assign cloud slice lab to users
const assignCloudSliceLabToUsers = async(req,res)=>{
    try {
        const data = req.body;
        if(!data){
            return res.status(400).send({
                success:false,
                message:"Please provide lab id and organization id"
            })
        }
        const result = await cloudSliceAwsService.cloudSliceLabUserAssignment(data);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully assigned cloud slice lab to organization",
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

//get user assigned labs
const getUserAssignedCloudSliceLabs = async(req,res)=>{
    try {
        const userId = req.params.userId;
        if(!userId){
            return res.status(400).send({
                success:false,
                message:"Please provide user id"
            })
        }
        const result = await cloudSliceAwsService.getAllLabsFromUserAssignment(userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched cloud slice lab assigned to user",
            data:result
        })
    } catch (error) {
        console.log(error.message);
        return res.status(500).send({
            success:false,
            message:"Internal server error",
            error:error.message
        })
    }
}

//get lab details for organization assignment
const getAllLabDetailsForOrgAssigned = async(req,res)=>{
    try {
        const orgId = req.params.orgId;
        if(!orgId){
            return res.status(400).send({
                success:false,
                message:"Please provide the organization id"
            })
        }
        const result = await cloudSliceAwsService.getAllLabDetailsForOrgAssignment(orgId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No labs found for this organization"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the lab details",
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

//get user assigned lab status
const getUserAssignedLabStatus = async(req,res)=>{
    try {
        const userId = req.params.userId;
        if(!userId){
            return res.status(400).send({
                success:false,
                message:"Please provide user id"
            })
        }
        const result = await cloudSliceAwsService.getUserAssignedLabStatus(userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched cloud slice lab assigned to user",
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

//delete user assigned labs on user id and labid
const deleteUserAssignedCloudSliceLabs = async(req,res)=>{
    try {
        const {userId,labId} = req.body;
        if(!userId){
            return res.status(400).send({
                success:false,
                message:"Please provide user id"
            })
        }
        if(!labId){
            return res.status(400).send({
                success:false,
                message:"Please provide lab id"
            })
        }
        const result = await cloudSliceAwsService.deleteCloudSliceLabForUser(labId,userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted cloud slice lab assigned to user",
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

//update the quiz data for the user
const updateQuizExerciseStatusOfUser = async(req,res)=>{
    try {
        const exerciseId = req.params.exerciseId;
        const {data,moduleId,userId} = req.body;
        if(!exerciseId || !data || !moduleId || !userId){
            return res.status(400).send({
                success:false,
                message:"Please provide exercise id and data"
            })
        }
        const result = await cloudSliceAwsService.updateCloudSliceQuizData(moduleId,userId,exerciseId,data);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated quiz exercise status",
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

//get user quiz data
const getUserQuizData = async(req,res)=>{
    try {
        const {moduleId,userId} = req.body;
        if(!moduleId || !userId){
            return res.status(400).send({
                success:false,
                message:"Please provide module id and exercise id"
            })
        }
        const result = await cloudSliceAwsService.getUserQuizExerciseStatus(moduleId,userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched quiz exercise status",
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

//get user lab status data
const  getUserLabExerciseStatus = async(req,res)=>{
    try {
        const {moduleId,userId} = req.body;
        if(!moduleId || !userId){
            return res.status(400).send({
                success:false,
                message:"Please provide module id and exercise id"
            })
        }
        const result = await cloudSliceAwsService.getUserLabExerciseStatus(moduleId,userId);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No cloud slice lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully fetched quiz exercise status",
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

//update the cloudslice lab status
const updateCloudSliceLabStatus = async(req,res)=>{
    try {
        const data = req.body;
        if(!data){
            return res.status(400).send({
                success:false,
                message:"Please Provide the data",
            })
        }
        const result = await cloudSliceAwsService.updateCloudSliceLabStatus(data)
        console.log(result)
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No lab found"
            })
            
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the lab",
            data:result
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not update the status",
            error:error.message
        })
    }
   

}

//update the cloudslice lab status of org
const updateCloudSliceLabStatusOfOrg = async(req,res)=>{
    try {
        const data = req.body;
        if(!data){
            return res.status(400).send({
                success:false,
                message:"Please Provide the data",
            })
        }
        const result = await cloudSliceAwsService.updateCloudSliceLabStatusOfOrg(data);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No lab found"
            })
            
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the lab",
            data:result
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success:false,
            message:"Could not update the status",
            error:error.message
        })
    }
   

}

//update status of cloudslicelab of user
const updateCloudSliceLabOfUser = async(req,res)=>{
    try {
        const {status,launched,labId,userId} = req.body;
        if(!status || !labId || !userId){
            throw new Error("Please Provide the details")
        }
        const response = await cloudSliceAwsService.updateCloudSliceLabOfUser(status,launched,labId,userId);
        if(!response){
            return res.status(404).send({
                success:false,
                messge:"No lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the user status",
            data:response
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Could not update the user lab status",
            error:error.message
        })
    }
}
//update running state of cloudslicelab of user
const updateCloudSliceLabRunningStateOfUser = async(req,res)=>{
    try {
        const data = req.body;
        if( !data){
            throw new Error("Please Provide the details")
        }
        const response = await cloudSliceAwsService.updateCloudSliceLabRunningState(data);
        if(!response){
            return res.status(404).send({
                success:false,
                messge:"No lab found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the user status",
            data:response
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Could not update the user lab status",
            error:error.message
        })
    }
}

//update cloudsliceuserlab times
const updateUserCloudSliceLabTimes = async(req,res)=>{
    try {
        const {startDate,endDate,labId,userId} = req.body;
        const result = await cloudSliceAwsService.updateUserCloudSliceLabTimes(startDate,endDate,labId,userId);
        if(!result){
            return res.status(404).send(
                {
                    success:false,
                    message:"Could not update the status"
                }
            )
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the lab time",
            data:result
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal servicer error",
            error:error.message
        })
    }
}

//get all cloudslice labs
const getAllCloudSliceLabs = async(req,res)=>{
    try {
        const result = await cloudSliceAwsService.getAllCloudSliceLabs();
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No lab is found"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed the labs",
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

//add lab status of user
const addLabStatusOfUser = async(req,res)=>{
    try {
        const data = req.body;
        if(!data){
            return res.status(400).send({
                success:false,
                message:"Please provide the required data"
            })
        }
        const result = await cloudSliceAwsService.addLabStatusOfUser(data);
        if(!result){
            return res.status(404).send({
                success:false,
                message:"No exercise found with this id"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully updated the status",
            data:result
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Successfully updated the status",
            error:error.message
        })
    }
}

module.exports = {
    getAllAwsServices,
    createCloudSliceLab,
    createCloudSliceLabWithModules,
    getCloudSliceLabByCreatedUserId,
    getCloudSliceLabById,
    updateServicesOnLabId,
    getModulesOnLabId,
    getLabExercisesOnModuleId,
    getAllModules,
  getLabExercises,
  getQuizExercises,
  updateModuleOnId,
  deleteModuleOnId,
  updateExerciseMainContentOnId,
  deleteExerciseOnId,
  updateLabExerciseOnExerciseId,
  updateQuizExerciseOnExerciseId,
  createModule,
  createExercise,
  createQuizExerciseContent,
  createLabExercise,
  deleteCloudSliceLab,
  updateCloudSliceLab,
    cloudSliceOrgAssignment,
    getCloudSliceLabAssignedToOrg,
    deleteCloudSliceLabAssignedToOrg,
    assignCloudSliceLabToUsers,
    getUserAssignedCloudSliceLabs,
    deleteUserAssignedCloudSliceLabs,
    updateQuizExerciseStatusOfUser,
    getUserQuizData,
    updateCloudSliceLabStatus,
    updateCloudSliceLabStatusOfOrg,
    getUserAssignedLabStatus,
    updateCloudSliceLabOfUser,
    getAllLabDetailsForOrgAssigned,
    updateUserCloudSliceLabTimes,
    getAllCloudSliceLabs,
    updateCloudSliceLabRunningStateOfUser,
    addLabStatusOfUser,
    getUserLabExerciseStatus
}