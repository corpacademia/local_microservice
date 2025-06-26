const cloudSliceAwsQueries = require('./cloudSliceQueries');
const {LabAssignmentError} = require('../utils/errors.js');

const pool= require('../db/dbconfig');
const express = require('express');



//function to get the files path with matching name
function getMatchingFilePaths(filePaths, files) {
    const fileNames = files.map(f => f.name);
  
    return filePaths.filter(path => {
      const fullFileName = path.split('\\').pop(); // get the filename from path
      const dashIndex = fullFileName.indexOf('-');
      const nameAfterDash = fullFileName.substring(dashIndex + 1); // extract part after first dash
  
      return fileNames.includes(nameAfterDash);
    });
  }



const getAllAwsServices = async () => {
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_ALL_AWS_SERVICES);
        if (!result.rows.length) {
            throw new Error('No AWS services found');
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getAllAwsServices function',error);
    }
};

const createCloudSliceLab = async (createdBy,labData) => {
    const { services, region, startDate, endDate, cleanupPolicy, platform, cloudProvider, title, description, labType, credits,accountType } = labData;
   
    if (!services || !region || !startDate || !endDate || !cleanupPolicy  || !platform || !cloudProvider || !title || !description || !labType || !accountType) {
        throw new Error('Please provide all required fields');
    }
     try {
        const result = await pool.query(cloudSliceAwsQueries.INSERT_LAB_DATA,
            [createdBy,JSON.stringify(services), region, startDate, endDate, cleanupPolicy, platform, cloudProvider, title, description, labType, credits,accountType]);
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in createCloudSliceLab function', error);
    }
}

//create a function to create cloudslice lab with modules
const createCloudSliceLabWithModules = async (labData,filesArray) => {
    try {
        const {createdBy,labConfig,modules} = labData;
        if (!createdBy || !labConfig || !modules) {
            throw new Error('Please provide all required fields');
        }
        const {cloudProvider,description,endDate,labType,platform,region,services,startDate,title} = labConfig;

        if ( !cloudProvider || !description || !endDate || !labType || !platform || !region  || !startDate || !title) {
            throw new Error('Please provide all required fields in labConfig');
        }
        const lab = await pool.query(cloudSliceAwsQueries.INSERT_LAB_DATA_WITH_MODULES,[createdBy,JSON.stringify(services),region,startDate,endDate,platform,cloudProvider,title,description,labType]);
     
        const labId = lab.rows[0].labid;
        if (!labId) {
            throw new Error('Lab creation failed');
        }

        for (const module of modules) {
            const { name, description } = module;
            if (!name || !description) {
                throw new Error('Please provide all required fields in modules');
            }
        
            let totalDuration = 0; // 👈 Initialize total duration
        
            // Pre-calculate exercise durations
            for (const exercise of module.exercises) {
                if (exercise.type === 'lab') {
                    totalDuration += Number(exercise.labExercise?.duration || 0);
                } else if (exercise.type === 'questions') {
                    totalDuration += Number(exercise.duration || 0); // assuming quiz exercise has a `duration`
                }
            }
        
            // Now insert the module with the calculated totalDuration
            const moduleResult = await pool.query(cloudSliceAwsQueries.INSERT_MODULES, [name, description, labId, totalDuration]);
            const moduleId = moduleResult.rows[0].id;
        
            for (const exercise of module.exercises) {
                const type = exercise.type;
                const exercise_result = await pool.query(cloudSliceAwsQueries.INSERT_EXERCISES, [moduleId, type]);
                const exerciseId = exercise_result.rows[0].id;
        
                if (!exerciseId) {
                    throw new Error('Exercise creation failed');
                }
        
                if (type === 'lab') {
                    const { title, duration, instructions, services, files, cleanupPolicy } = exercise.labExercise;
                    if (!duration || !instructions || !services || !files) {
                        throw new Error('Please provide all required fields in lab exercises');
                    }
        
                    await pool.query(cloudSliceAwsQueries.INSERT_LAB_EXERCISES, [
                        exerciseId,
                        duration,
                        instructions,
                        services,
                        getMatchingFilePaths(filesArray, files),
                        title,
                        cleanupPolicy
                    ]);
                }
        
                if (type === 'questions') {
                    for (const question of exercise.questions) {
                        const { title, description, correctAnswer } = question;
                        if (!title || !description || !correctAnswer) {
                            throw new Error('Please provide all required fields in questions');
                        }
        
                        const question_result = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_QUESTIONS, [
                            exerciseId,
                            title,
                            description,
                            correctAnswer,
                            exercise.duration,
                            exercise.title,
                            exercise.marks
                        ]);
        
                        const questionId = question_result.rows[0].id;
                        if (!questionId) {
                            throw new Error('Question creation failed');
                        }
        
                        for (const option of question.options) {
                            const { id, text } = option;
                            let is_correct = question.correctAnswer === id;
        
                            if (!id || !text) {
                                throw new Error('Please provide all required fields in options');
                            }
        
                            const option_result = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_OPTIONS, [
                                questionId,
                                text,
                                id,
                                is_correct
                            ]);
        
                            if (!option_result) {
                                throw new Error('Option creation failed');
                            }
                        }
                    }
                }
            }
        }
        

    } catch (error) {
        console.log(error);
        throw new Error('Error in createCloudSliceLabWithModules function', error);
        
    }
}

const getCloudSliceLabsByCreatedUser = async(userId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_ALL_LABS_ON_CREATED_USER,[userId]);
      
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getCloudSliceLabs function', error);
    }
}

//fetch cloudslice lab by id
const getCloudSliceLabById = async(labId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID,[labId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in getCloudSliceLabById function', error);
    }
}

//update the services on lab id
const updateServicesOnLabId = async(labId,services)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_SERVICES_ON_LABID,[JSON.stringify(services),labId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in updateServicesOnLabId function', error);
    }
}

//GET MODULES ON LABID
const getModulesOnLabId = async(labId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_MODULES_ON_LABID,[labId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in getModulesOnLabId function', error);
    }
}

const getLabExercisesOnModuleId = async(moduleId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_LAB_EXERCISES_ON_MODULEID,[moduleId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getLabExercisesOnModuleId function', error);
    }
}

// MODULES
const getAllModules = async (labId) => {
    const result = await pool.query(cloudSliceAwsQueries.GET_ALL_MODULES,[labId]);
    return result.rows;
  };
  
  const getExercisesByModuleId = async (moduleId) => {
    const result = await pool.query(cloudSliceAwsQueries.GET_MODULE_EXERCISES, [moduleId]);
    return result.rows;
  };
  
  // LABS
  const getLabExercisesByModuleId = async (moduleId) => {
    const result = await pool.query(cloudSliceAwsQueries.GET_LAB_EXERCISES_BY_MODULE, [moduleId]);
    return result.rows;
  };
  
  // QUIZZES
  const getQuizExercisesByModuleId = async (moduleId) => {
    const { rows: exercises } = await pool.query(cloudSliceAwsQueries.GET_QUIZ_EXERCISES_IDS_BY_MODULE, [moduleId]);
    const quizData = [];
  
    for (const ex of exercises) {
      const { rows: questions } = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_EXERCISE_ID, [ex.exercise_id]);
  
      for (const q of questions) {
        const { rows: options } = await pool.query(cloudSliceAwsQueries.GET_OPTIONS_BY_QUESTION_ID, [q.id]);
        q.options = options;
      }
      quizData.push({
        exerciseId: ex.exercise_id,
        questions
      });
    }
    return quizData;
  };

  //update module on id
  const updateModuleOnId = async(moduleData)=>{
     try{
        const {id,title,description,totalduration} = moduleData;
        if (!id || !title || !description || !totalduration) {
            throw new Error('Please provide all required fields in modules');
        }
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_MODULE_ON_ID,[title,description,totalduration,id]);
        return result.rows[0];
     }
     catch(error){
        throw new Error("Error in updateModuleOnId function",error);
     }
  }

  //DELETE MODULE ON ID
  const deleteModuleOnId = async (moduleId) => {
    try {
        const exerciseResult = await pool.query(cloudSliceAwsQueries.GET_ALL_EXERCISES_ON_MODULEID, [moduleId]);

       

        const exercises = exerciseResult.rows;

        for (const exercise of exercises) {
            const exerciseId = exercise.id;

            const questionResult = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_EXERCISE_ID, [exerciseId]);

            for (const question of questionResult.rows) {
                const questionId = question.id;

                // Delete options for each question
                await pool.query(cloudSliceAwsQueries.DELETE_OPTIONS_ON_QUESTION_ID, [questionId]);

                // Delete the question itself
                await pool.query(cloudSliceAwsQueries.DELETE_QUIZ_EXERCISE_ON_ID, [questionId]);
            }

            // Delete lab and quiz exercises
            await pool.query(cloudSliceAwsQueries.DELETE_LAB_EXERCISE_ON_EXERCISE_ID, [exerciseId]);
            await pool.query(cloudSliceAwsQueries.DELETE_QUIZ_EXERCISE_ON_EXERCISE_ID, [exerciseId]);

            // Delete the main exercise
            await pool.query(cloudSliceAwsQueries.DELETE_EXERCISE_ON_ID, [exerciseId]);
        }

        // Finally, delete the module
        const deleteModule = await pool.query(cloudSliceAwsQueries.DELETE_MODULE_ON_ID, [moduleId]);

        if (!deleteModule.rows.length) {
            throw new Error('No module found with this id');
        }

        return deleteModule.rows[0];

    } catch (error) {
        console.error("Detailed error during deleteModuleOnId:", error.message);
        throw new Error(`Error in deleteModuleOnId function: ${error.message}`);
    }
};

//delete exercise and its content
const deleteExerciseOnId = async(exerciseId)=>{
    try {
        const exerciseResult = await pool.query(cloudSliceAwsQueries.GET_EXERCISE_ON_ID, [exerciseId]);
        if (!exerciseResult.rows.length) {
            throw new Error('No exercise found with this id');
        }
        const exercise = exerciseResult.rows[0];
        if(exercise.type === 'lab'){
            await pool.query(cloudSliceAwsQueries.DELETE_LAB_EXERCISE_ON_EXERCISE_ID,[exerciseId]);
        }
        else if(exercise.type === 'questions'){
            const questionResult = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_EXERCISE_ID, [exerciseId]);
            // if (!questionResult.rows.length) {
            //     throw new Error('No questions found for this exercise');
            // }
            const questions = questionResult.rows;
            for (const question of questions) {
                const questionId = question.id;
                await pool.query(cloudSliceAwsQueries.DELETE_OPTIONS_ON_QUESTION_ID, [questionId]);
                await pool.query(cloudSliceAwsQueries.DELETE_QUIZ_EXERCISE_ON_EXERCISE_ID, [questionId]);
            }
           
    }
    const exerciseDelete = await pool.query(cloudSliceAwsQueries.DELETE_EXERCISE_ON_ID,[exerciseId]);
    if (!exerciseDelete.rows.length) {
        throw new Error('No exercise found with this id');
    }
    return exerciseDelete.rows[0];
} catch (error) {
        console.log(error);
        throw new Error('Error in deleteExerciseOnId function', error);
        
    }
}

  //update headings of exercises on exercise id
  const updateExerciseMainContentOnId = async(exerciseData)=>{
    try {
        let quiz_exercise = null;
        const {description,type,duration,title,id} = exerciseData;
        const exercise =  await pool.query(cloudSliceAwsQueries.UPDATE_EXERCISE_ON_ID,[type,id]);
        if (!exercise.rows.length) {
            throw new Error('No exercise found with this id');
        }
        const lab_exercise = await pool.query(cloudSliceAwsQueries.UPDATE_LAB_EXERCISE_ON_EXERCISE_ID,[title,duration,id]);
        if (!lab_exercise.rows.length) {
             quiz_exercise = await pool.query(cloudSliceAwsQueries.UPDATE_QUIZ_EXERCISE_ON_EXERCISE_ID,[title,description,duration,id]);
            if (!quiz_exercise.rows.length) {
                throw new Error('No exercise found with this id');
            }
        }
        return {
            exercise: exercise.rows[0],
            lab_exercise: lab_exercise.rows[0] ? lab_exercise.rows[0] : null,
            quiz_exercise: quiz_exercise ? quiz_exercise.rows[0] : null
        }
    } catch (error) {
        throw new Error("Error in updateExerciseMainContentOnId function",error);
        
    }
  }

  //UPDATE LAB_EXERCISE CONTENT ON EXERCISE ID
  const updateLabExerciseContentOnExerciseId = async(exerciseData,filesArray)=>{
    try {
        const {exerciseId,instructions,services,cleanupPolicy,existingFiles} = exerciseData;
        console.log(exerciseData)
        const allFiles = [ ...(filesArray ?? []), ...(JSON.parse(existingFiles )?? []) ];
        if (!exerciseId || !instructions || !services  || !cleanupPolicy) {
            throw new Error('Please provide all required fields in lab exercises');
        }
        const lab_exercise = await pool.query(cloudSliceAwsQueries.UPDATE_LAB_EXERCISE_CONTENT_ON_EXERCISE_ID,[instructions,JSON.parse(services),allFiles,cleanupPolicy,exerciseId]);
        if (!lab_exercise.rows.length) {
            throw new Error('No lab exercise found with this id');
        }
        return lab_exercise.rows[0];

    } catch (error) {
        console.log(error);
        throw new Error("Error in updateLabExerciseContentOnExerciseId function",error);
    }
  }

  //update the quiz exercise content on exercise id
  const updateQuizExerciseContentOnExerciseId = async (exerciseData) => {
    try {
        const { exerciseId, questions, duration } = exerciseData;
        if (!exerciseId || !questions) {
            throw new Error('Please provide all required fields in quiz exercises');
        }

        const validQuestionIds = new Set();

        for (const question of questions) {
            const questionResult = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_QUESTION_ID, [question.id]);

            if (questionResult.rows.length) {
                // Existing question
                const { description, duration, id, options, text } = question;
                validQuestionIds.add(question.id);

                const quiz_exercise = await pool.query(cloudSliceAwsQueries.UPDATE_QUIZ_EXERCISECONTENT_ON_EXERCISE_ID, [text, description, duration, exerciseId]);
                if (!quiz_exercise.rows.length) {
                    throw new Error('No quiz exercise found with this id');
                }

                // Delete options that are not in the incoming data
                const optionResultFromDatabase = await pool.query(cloudSliceAwsQueries.GET_OPTIONS_BY_QUESTION_ID, [question.id]);
                if (optionResultFromDatabase.rows.length) {
                    const existingOptions = optionResultFromDatabase.rows;
                    for (const existingOption of existingOptions) {
                        const isPresent = options.find(o => o.option_id === existingOption.option_id);
                        if (!isPresent) {
                            await pool.query(cloudSliceAwsQueries.DELETE_OPTIONS_ON_OPTION_ID, [existingOption.option_id]);
                        }
                    }
                }

                for (const option of options) {
                    const optionResult = await pool.query(cloudSliceAwsQueries.GET_OPTIONS_BY_ID, [option.option_id]);
                    if (optionResult.rows.length) {
                        const { is_correct, text } = option;
                        const quiz_option = await pool.query(cloudSliceAwsQueries.UPDATE_QUIZ_OPTION_ON_ID, [text, is_correct, option.option_id]);
                        if (!quiz_option.rows.length) {
                            throw new Error('No quiz option found with this id');
                        }
                    } else {
                        const quiz_option = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_OPTIONS, [question.id, option.text, option.option_id, option.is_correct]);
                        if (!quiz_option.rows.length) {
                            throw new Error('No quiz option found with this id');
                        }
                    }
                }
            } else {
                // New question
                const quiz_exercise = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_QUESTIONS, [exerciseId, question.text, question.description, "", duration, "", question.marks]);
                console.log('quiz inserted', quiz_exercise);
                if (!quiz_exercise.rows.length) {
                    throw new Error('No quiz exercise found with this id');
                }

                const questionId = quiz_exercise.rows[0].id;
                validQuestionIds.add(questionId);

                for (const option of question.options) {
                    const quiz_option = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_OPTIONS, [questionId, option.text, option.option_id, option.is_correct]);
                    console.log('option inserted', quiz_option.rows[0]);
                    if (!quiz_option.rows.length) {
                        throw new Error('No quiz option found with this id');
                    }
                }
            }
        }

        // Delete questions and their options if they are no longer present
        const questionResult = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_EXERCISE_ID, [exerciseId]);
        if (questionResult.rows.length) {
            for (const question of questionResult.rows) {
                if (!validQuestionIds.has(question.id)) {
                    await pool.query(cloudSliceAwsQueries.DELETE_OPTIONS_ON_QUESTION_ID, [question.id]);
                    await pool.query(cloudSliceAwsQueries.DELETE_QUIZ_EXERCISE_ON_ID, [question.id]);
                }
            }
        }
    } catch (error) {
        console.log(error);
        throw new Error("Error in updateQuizExerciseContentOnExerciseId function");
    }
};

  

  //create a module
  const createModule = async (moduleData) => {
    const { title, description, labId , totalduration } = moduleData;
    if (!title || !description || !labId || !totalduration) {
      throw new Error('Please provide all required fields in modules');
    }
    try {
      const result = await pool.query(cloudSliceAwsQueries.INSERT_MODULES, [title, description, labId,totalduration]);
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error('Error in createModule function', error);
    }
  }

  //create the exercise
  const createExercise = async (type,moduleId) => {
    if (!moduleId || !type) {
      throw new Error('Please provide all required fields in exercises');
    }
    try {
      const result = await pool.query(cloudSliceAwsQueries.INSERT_EXERCISES, [moduleId, type]);
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error('Error in createExercise function', error);
    }
  }

  //create exercise content
  const createExerciseContent = async(title,exerciseData)=>{
    try {
        const {duration,exerciseId,questions} = exerciseData;
        if (!duration || !exerciseId || !questions) {
            throw new Error('Please provide all required fields in quiz exercises');
        }
        for(const question of questions){
            const {description,marks,options,text} = question;
            if (!description || !marks || !options || !text) {
                throw new Error('Please provide all required fields in quiz exercises');
            }
        const quiz_exercise = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_QUESTIONS,[exerciseId,text,description,"",duration,title,marks]);
        for(const option of options){
            const quiz_option = await pool.query(cloudSliceAwsQueries.INSERT_QUIZ_OPTIONS,[quiz_exercise.rows[0].id,option.text,option.option_id,option.is_correct]);
            if (!quiz_option.rows.length) {
                throw new Error('No quiz option found with this id');
            }
        }}
    } catch (error) {
        console.log(error);
        throw new Error('Error in createExerciseContent function', error);
    }
  }

  //create lab exercise content
  const createLabExercise = async (exerciseData,filesArray) => {
     try{
        console.log(exerciseData,filesArray)
        const {exerciseId,duration,instructions,services,title,cleanupPolicy} = exerciseData;
        if (!exerciseId || !duration || !instructions || !services || !title || !cleanupPolicy) {
            throw new Error('Please provide all required fields in lab exercises');
        }
        const lab_exercise = await pool.query(cloudSliceAwsQueries.INSERT_LAB_EXERCISES,[exerciseId,duration,instructions,JSON.parse(services),filesArray,title,cleanupPolicy]);
        if (!lab_exercise.rows.length) {
            throw new Error('No lab exercise found with this id');
        }
        return lab_exercise.rows[0];
     }
        catch(error){
            console.log(error.message);
            throw new Error('Error in createLabExercise function', error);
        }
  }

  //delete cloudslicelab completely
  const deleteCloudSliceLab = async (labId) => {
    try {
      //delete the lab assigned for users
      const userAssignment = await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_ASSIGNMENT,[labId]);
      if (!userAssignment) {
        throw new Error('No lab found with this id');
      }
        //delete the lab assigned for organization
        const orgAssignment = await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_ORG_ASSIGNMENT,[labId]);
        if (!orgAssignment) {
            throw new Error('No lab found with this id');
        }
      //delete the lab
    const lab = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID, [labId]);
      
      if (!lab.rows.length) {
        throw new Error('No lab found with this id');
      }
      if (lab.rows[0].modules === 'with-modules') {
        const modules = await pool.query(cloudSliceAwsQueries.GET_MODULES_ON_LABID, [labId]);
        // if (!modules.rows.length) {
        //   throw new Error('No modules found with this lab id');
        // }
  
        for (const module of modules.rows) {
          const moduleId = module.id;
          const exercises = await pool.query(cloudSliceAwsQueries.GET_ALL_EXERCISES_ON_MODULEID, [moduleId]);
  
          for (const exercise of exercises.rows) {
            const exerciseId = exercise.id;
            if (exercise.type === 'lab') {
              await pool.query(cloudSliceAwsQueries.DELETE_LAB_EXERCISE_ON_EXERCISE_ID, [exerciseId]);
              const deleteUserStatus =  await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_LAB_EXERCISE_STATUS,[moduleId,exerciseId]);
              
            } else if (exercise.type === 'questions') {
                await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_QUIZ_EXERCISE_STATUS,[moduleId,exerciseId])
              const questionResult = await pool.query(cloudSliceAwsQueries.GET_QUESTIONS_BY_EXERCISE_ID, [exerciseId]);
  
              for (const question of questionResult.rows) {
                const questionId = question.id;
                await pool.query(cloudSliceAwsQueries.DELETE_OPTIONS_ON_QUESTION_ID, [questionId]);
                await pool.query(cloudSliceAwsQueries.DELETE_QUIZ_EXERCISE_ON_ID, [questionId]);
              }
            }
  
            await pool.query(cloudSliceAwsQueries.DELETE_EXERCISE_ON_ID, [exerciseId]);
          }
  
          await pool.query(cloudSliceAwsQueries.DELETE_MODULE_ON_ID, [moduleId]);
        }
      }
        //delete the lab
        await pool.query(cloudSliceAwsQueries.DELETE_CLOUD_SLICE_LAB_ON_ID, [labId]);
      return lab.rows[0];
    } catch (error) {
      console.error(error);
      throw new Error(`Error in deleteCloudSliceLab function: ${error.message}`);
    }
  };
  
//update the cloud slice lab
const updateCloudSliceLab = async(labid,labData)=>{
    try {
        const {title,description,status,region,startDate,endDate,cleanupPolicy,credits,modules} = labData;
        if (!title || !description || !status || !region || !startDate || !endDate || !modules) {
            throw new Error('Please provide all required fields in labConfig');
        }
        if(modules === 'with-modules'){
            const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_WITH_MODULES,[title,description,status,region,startDate,endDate,labid]);
            if (!result.rows.length) {
                throw new Error('No lab found with this id');
            }
            return result.rows[0];
        }
        else if(modules === 'without-modules'){
            const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_WITHOUT_MODULES,[title,description,status,region,startDate,endDate,cleanupPolicy,credits,labid]);
            if (!result.rows.length) {
                throw new Error('No lab found with this id');
            }
            return result.rows[0];
        }
    } catch (error) {
        console.log(error.message);
        throw new Error('Error in updateCloudSliceLab function', error);
        
    }
}

//GET COUNT OF ALL LABS
const getCount = async () => {
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_COUNT);
        if (!result.rows.length) {
            throw new Error('No count found');
        }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in getCount function', error);
    }
}

//organization assignment
const cloudSliceLabOrgAssignment = async(labId,organizationId,userId,isPublic)=>{
    try {
        if(isPublic){
            const catalogueUpdate = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB,[true,labId]);
            if (!catalogueUpdate.rows.length) {
                throw new Error('No lab found with this id');
            }
        }
        if(organizationId === 'none'){
             return true
        }
        const checkOrgAssignment = await pool.query(cloudSliceAwsQueries.CHECK_LAB_EXISTS,[organizationId,labId]);
        if (checkOrgAssignment.rows.length) {
           throw new LabAssignmentError("Lab already assigned", checkOrgAssignment.rows[0]);
        }
        const result = await pool.query(cloudSliceAwsQueries.INSERT_ORG_ASSIGNMENT,[labId,organizationId,userId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
    } catch (error) {
        throw error;
        
    }
}

//GET ALL LABS FROM ORGANIZATION ASSIGNMENT
const getAllLabsFromOrgAssignment = async(organizationId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_ALL_LABS_FROM_ORGANIZATION_ASSIGNMENT,[organizationId]);
       
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getAllLabsFromOrgAssignment function', error);
        
    }
}

//delete organization assignment lab
const deleteOrgAssignmentLab = async(labId,organizationId)=>{
    try {
         const userAssignment = await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_ASSIGNMENT,[labId]);
        const result = await pool.query(cloudSliceAwsQueries.DELETE_ORG_ASSIGNMENT_ON_ID_ORGID,[labId,organizationId]);
         if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        //delete user assigned labs
        const lab = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID, [labId]);
      
      if (!lab.rows.length) {
        throw new Error('No lab found with this id');
      }
      if (lab.rows[0].modules === 'with-modules') {
        const modules = await pool.query(cloudSliceAwsQueries.GET_MODULES_ON_LABID, [labId]);
        for(const module of modules.rows){
            const moduleId = module.id;
            const exercises = await pool.query(cloudSliceAwsQueries.GET_ALL_EXERCISES_ON_MODULEID, [moduleId]);
            for(const exercise of exercises.rows){
                const exerciseId = exercise.id;
                if (exercise.type === 'lab'){
                    const deleteUserStatus =  await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_LAB_EXERCISE_STATUS,[moduleId,exerciseId]);
                }
                else if (exercise.type === 'questions'){
                    await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_QUIZ_EXERCISE_STATUS,[moduleId,exerciseId])
                }
                
            }
        }
      }
       
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in deleteOrgAssignmentLab function', error);
        
    }
}

//assign cloudslice lab for users
const cloudSliceLabUserAssignment = async (data) => {
    try {
        let { lab, userId, assign_admin_id, start_date, end_date } = data;
        userId = Array.isArray(userId) ? userId : [userId];
      if (!lab || !userId || !assign_admin_id || !start_date || !end_date) {
        throw new Error('Please provide all required fields in lab assignment');
      }
  
      const insertedRows = [];
      for (const user of userId) {
        const result = await pool.query(
          cloudSliceAwsQueries.INSERT_CLOUDSLICE_USER_ASSIGNMENT,
          [lab, user, assign_admin_id, start_date, end_date]
        );
  
        if (!result.rows.length) {
          throw new Error('No lab found with this id');
        }
  
        insertedRows.push(result.rows[0]);
      }
  
      return insertedRows;
  
    } catch (error) {
      console.log(error);
      throw new Error('Error in cloudSliceLabUserAssignment function');
    }
  };
  
//GET THE LAB IDS OF USER ASSIGNMENT 
const getAllLabsFromUserAssignment = async(userId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_USER_ASSIGNED_LABS,[userId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
       const labIds = result.rows.map(row => row.labid);
       let allLabs = [] ;
       for(const labId of labIds){
        const result = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID,[labId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
       allLabs.push(result.rows[0]);
       }
       return allLabs;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getAllLabsFromUserAssignment function', error);
        
    }
}

//GET THE LAB IDS OF USER ASSIGNMENT 
const getAllLabDetailsForOrgAssignment = async(orgId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_ALL_LABS_FROM_ORGANIZATION_ASSIGNMENT,[orgId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
       const labIds = result.rows.map(row => row.labid);
       let allLabs = [] ;
       for(const labId of labIds){
        const result = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID,[labId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
       allLabs.push(result.rows[0]);
       }
       return allLabs;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getAllLabsFromUserAssignment function', error);
        
    }
}

//get user assigned lab status
const getUserAssignedLabStatus = async(userId)=>{
    try {
        if(!userId){
            throw new Error("Please Provide the user id")
        }
        const result = await pool.query(cloudSliceAwsQueries.GET_USER_ASSIGNED_LABS,[userId])
        if(!result.rows.length){
            throw new Error("No lab is found with this user id");
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error("Could not get the user lab status")
    }
}

//DELETE CLOUDSLICE LAB FOR USER WIHT USERID AND LABID
const deleteCloudSliceLabForUser = async(labId,userId)=>{
    try {
        if(!labId || !userId) {
            throw new Error('Please provide all required fields in lab assignment');
        }
        const result = await pool.query(cloudSliceAwsQueries.DELETE_CLOUD_SLICE_USER_ASSIGNMENT_ON_LABID_USERID,[labId,userId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
         const lab = await pool.query(cloudSliceAwsQueries.GET_LABS_ON_ID, [labId]);
      
      if (!lab.rows.length) {
        throw new Error('No lab found with this id');
      }
      if (lab.rows[0].modules === 'with-modules') {
        const modules = await pool.query(cloudSliceAwsQueries.GET_MODULES_ON_LABID, [labId]);
        for(const module of modules.rows){
            const moduleId = module.id;
            const exercises = await pool.query(cloudSliceAwsQueries.GET_ALL_EXERCISES_ON_MODULEID, [moduleId]);
            for(const exercise of exercises.rows){
                const exerciseId = exercise.id;
                if (exercise.type === 'lab'){
                    const deleteUserStatus =  await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_LAB_EXERCISE_STATUS_INDIVIDUAL,[moduleId,exerciseId,userId]);
                }
                else if (exercise.type === 'questions'){
                    await pool.query(cloudSliceAwsQueries.DELETE_CLOUDSLICE_USER_QUIZ_EXERCISE_STATUS_INDIVIDUAL,[moduleId,exerciseId,userId])
                }
                
            }
        }
      }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error('Error in deleteCloudSliceLabForUser function', error);
    }
}


//update cloudslice quiz data for user
const updateCloudSliceQuizData = async(moduleId,userId,exerciseId,data)=>{
    try {
        const {score,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,} = data;
        if (!userId || !moduleId || !score || !totalQuestions || !correctAnswers ) {
            throw new Error('Please provide all required fields in lab assignment');
        }
        const isExists = await pool.query(cloudSliceAwsQueries.GET_USER_QUIZ_EXERCISE_STATUS_EX,[moduleId,exerciseId,userId]);
        if(isExists.rows.length){
            const result = await pool.query(cloudSliceAwsQueries.UPDATE_INTO_QUIZ_EXERCISE_STATUS,[totalQuestions,correctAnswers,incorrectAnswers,score,'completed',moduleId,exerciseId,userId]);
            if (!result.rows.length) {
                throw new Error('No lab found with this id');
            }
            return result.rows[0];  
        }
        else{
            const result = await pool.query(cloudSliceAwsQueries.INSERT_INTO_QUIZ_EXERCISE_STATUS,[moduleId,exerciseId,totalQuestions,correctAnswers,incorrectAnswers,score,'completed',userId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
        }
        
    } catch (error) {
        console.log(error);
        throw new Error('Error in updateCloudSliceQuizData function', error);
    }
}

//GET USER QUIZ EXERCISE STATUS
const getUserQuizExerciseStatus = async(moduleId,userId)=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_USER_QUIZ_EXERCISE_STATUS,[moduleId,userId]);
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error('Error in getUserQuizExerciseStatus function', error);
    }
}

//get user lab exercise status
const getUserLabExerciseStatus =  async(moduleId,userId)=>{
    try {
        const result = await pool.query (cloudSliceAwsQueries.GET_USER_LAB_EXERCISE_STATUS,[moduleId,userId]);
        if(!result.rows.length){
            throw new Error("No lab found with this id");
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error("Error in getting lab exercise status",error.message)
    }
}

//update cloudslice lab status
const updateCloudSliceLabStatus = async(data)=>{
     try {
        const {labId,createdBy,status,launched} = data;
        if(!labId || !createdBy || !status || !launched){
            throw new Error("Please Provide all the required fields")
        }
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_STATUS,[status,launched,labId,createdBy]);
        if(!result.rows.length){
            throw new Error("No lab found with this id")
        }
        return result.rows[0];
     } catch (error) {
        console.log(error)
       throw new Error("Errror in updating",error.message)
     }
}
//update cloudslice lab running state
const updateCloudSliceLabRunningState = async(data)=>{
    try {
        console.log(data)
        const {labId, userId ,isRunning } = data;
        if(!labId || !userId){
            throw new Error('Please provide the labid or userid')
        }
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_USER_RUNNING,[isRunning,labId,userId])
        if (!result.rows.length) {
            throw new Error('No lab found with this id');
        }
        return result.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error("Error in updating:",error.message);
    }
}

//update cloudslice lab status for org assigned
const updateCloudSliceLabStatusOfOrg = async(data)=>{
    try {
       const {labId,orgId,status,launched} = data;
       if(!labId || !orgId || !status || !launched){
           throw new Error("Please Provide all the required fields")
       }
       const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_ORG_STATUS,[status,launched,labId,orgId]);
       if(!result.rows.length){
           throw new Error("No lab found with this id")
       }
       return result.rows[0];
    } catch (error) {
       console.log(error)
      throw new Error("Errror in updating",error.message)
    }
}
//update lab status of user assigned labs
const updateCloudSliceLabOfUser = async(status,launched,labId,userId)=>{
    try {
        if(!labId || !userId){
            throw new Error("Please Provide the id");
        }
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_USER_STATUS,[status,launched,labId,userId]);
        return result.rows[0]
    } catch (error) {
        console.log(error);
        throw new Error("Error in updating",error.message);
    }
}

//update user cloudslice lab times
const updateUserCloudSliceLabTimes = async(startDate,endDate,labId,userId)=>{
    try {
        if(!startDate || !endDate || !labId || !userId){
            throw new Error("Please provide all the fields")
        }
        const result = await pool.query(cloudSliceAwsQueries.UPDATE_CLOUDSLICELAB_USER_TIMES,[startDate,endDate,labId,userId]);
        if(!result.rows.length){
            throw new Error("No lab found to update")
        }
        return result.rows[0]
    } catch (error) {
        console.log(error);
        throw new Error("Error in updating the time",error.message);
    }
}

//get all cloudslice labs
const getAllCloudSliceLabs = async()=>{
    try {
        const result = await pool.query(cloudSliceAwsQueries.GET_ALL_CLOUDSLICE_LABS);
        if(!result.rows.length){
            throw new Error("No lab is found");
        }
        return result.rows;
    } catch (error) {
        console.log(error);
        throw new Error("Error in getting the cloudslice labs",error.message);
    }
}

//insert lab status of user
const addLabStatusOfUser = async(data)=>{
    try {
        const {module_id,exercise_id,isrunning,status,completed_in,user_id} = data;
        if(!module_id || !exercise_id || !status  || !user_id){
            throw new Error("Please provide required fields")
        }
        const isExist = await pool.query(cloudSliceAwsQueries.GET_USER_LAB_EXERCISE_STATUS_EX,[module_id,exercise_id,user_id]);
        if(isExist.rows.length){
            const result = await pool.query(cloudSliceAwsQueries.UPDATE_INTO_LAB_EXERCISE_STATUS_USER,[isrunning,status,completed_in,module_id,exercise_id,user_id]);
            if(!result.rows.length){    
                throw new Error("No exercise found with this id")
            }
            return result.rows[0];
        }
        else{
             const result = await pool.query(cloudSliceAwsQueries.INSERT_INTO_LAB_EXERCISE_STATUS_USER,[module_id,exercise_id,isrunning,status,completed_in,user_id]);
        if(!result.rows.length){
            throw new Error("No exercise found with this id")
        }
        return result.rows[0];
        }
       
    } catch (error) {
        console.log(error);
        throw new Error('Error in storing the lab status of user',error.message);
    }
}

module.exports = {
    getAllAwsServices,
    createCloudSliceLab,
    createCloudSliceLabWithModules,
    getCloudSliceLabsByCreatedUser,
    getCloudSliceLabById,
    updateServicesOnLabId,
    getModulesOnLabId,
    getLabExercisesOnModuleId,
    getAllModules,
  getExercisesByModuleId,
  getLabExercisesByModuleId,
  getQuizExercisesByModuleId,
  updateModuleOnId,
  deleteModuleOnId,
  updateExerciseMainContentOnId,
  deleteExerciseOnId,
  updateLabExerciseContentOnExerciseId,
  updateQuizExerciseContentOnExerciseId,
  createModule,
  createExercise,
  createExerciseContent,
  createLabExercise,
  deleteCloudSliceLab,
  updateCloudSliceLab,
  getCount,
  cloudSliceLabOrgAssignment,
  getAllLabsFromOrgAssignment,
  deleteOrgAssignmentLab,
  cloudSliceLabUserAssignment,
  getAllLabsFromUserAssignment,
  deleteCloudSliceLabForUser,
  updateCloudSliceQuizData,
  getUserQuizExerciseStatus,
  updateCloudSliceLabStatus,
  updateCloudSliceLabStatusOfOrg,
  getUserAssignedLabStatus,
  updateCloudSliceLabOfUser,
  getAllLabDetailsForOrgAssignment,
  updateUserCloudSliceLabTimes,
  getAllCloudSliceLabs,
  updateCloudSliceLabRunningState,
  addLabStatusOfUser,
  getUserLabExerciseStatus
}

