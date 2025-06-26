module.exports = {
    GET_ALL_AWS_SERVICES:`SELECT * FROM awsservices`,
    INSERT_LAB_DATA:`INSERT INTO cloudslicelab(createdby,services, region, startDate, endDate, cleanupPolicy, platform, provider, title, description, modules,credits,accounttype) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    INSERT_ORG_ASSIGNMENT:`INSERT INTO cloudsliceorgassignment(labid,orgid,assigned_by) VALUES($1,$2,$3) RETURNING *`,
    INSERT_LAB_DATA_WITH_MODULES:`INSERT INTO cloudslicelab(createdby,services, region, startDate, endDate, platform, provider, title, description, modules) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    
    INSERT_MODULES:`INSERT INTO modules(name,description,lab_id,totalduration) VALUES($1,$2,$3,$4) RETURNING *`,
    INSERT_EXERCISES:`INSERT INTO exercises(module_id,type) VALUES($1,$2) RETURNING *`,
    INSERT_LAB_EXERCISES:`INSERT INTO lab_exercises(exercise_id,estimated_duration,instructions,services,files,title,cleanuppolicy) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    INSERT_QUIZ_QUESTIONS:`INSERT INTO questions(exercise_id,question_text,description,correct_answer,estimated_duration,title,marks) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    INSERT_QUIZ_OPTIONS:`INSERT INTO options(question_id,option_text,option_id,is_correct) VALUES($1,$2,$3,$4) RETURNING *`,
    INSERT_CLOUDSLICE_USER_ASSIGNMENT:`INSERT INTO cloudsliceuserassignment(labid,user_id,assigned_by,start_date,end_date) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    INSERT_INTO_QUIZ_EXERCISE_STATUS:`INSERT INTO cloudsliceuserquizexercisestatus(module_id,exercise_id,total_questions,correct,incorrect,score,status,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    INSERT_INTO_LAB_EXERCISE_STATUS_USER:`INSERT INTO cloudsliceuserlabexercisestatus (module_id,exercise_id,isrunning,status,completed_in,user_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,

    UPDATE_INTO_QUIZ_EXERCISE_STATUS:`UPDATE INTO cloudsliceuserquizexercisestatus SET total_questions=$1,correct=$2,incorrect=$3,score=$4,status=$5 where module_id=$6 and exercise=$7 and user_id=$7 RETURNING *`,
    UPDATE_INTO_LAB_EXERCISE_STATUS_USER:`UPDATE INTO cloudsliceuserlabexercisestatus SET isrunning=$1,status=$2,completed_in=$3 where module_id=$4 and exercise=$5 and user_id=$6 RETURNING *`,

    GET_USER_QUIZ_EXERCISE_STATUS:`SELECT * FROM cloudsliceuserquizexercisestatus WHERE module_id = $1 AND user_id = $2`,
    GET_USER_LAB_EXERCISE_STATUS:`SELECT * From cloudsliceuserlabexercisestatus WHERE module_id = $1 AND user_id = $2`,

    GET_USER_QUIZ_EXERCISE_STATUS_EX:`SELECT * FROM cloudsliceuserquizexercisestatus WHERE module_id = $1 AND exercise_id=$2 AND user_id = $3`,
    GET_USER_LAB_EXERCISE_STATUS_EX:`SELECT * From cloudsliceuserlabexercisestatus WHERE module_id = $1 AND exercise_id=$2 AND user_id = $3`,

    GET_ALL_LABS_ON_CREATED_USER:`SELECT * FROM cloudslicelab where createdby = $1`,
    GET_ALL_LABS_FROM_ORGANIZATION_ASSIGNMENT:`SELECT * FROM cloudsliceorgassignment where orgid = $1`,
    CHECK_LAB_EXISTS:`SELECT * FROM cloudsliceorgassignment where orgid = $1 AND labid = $2`,
    GET_LABS_ON_ID:`SELECT * FROM cloudslicelab where labid = $1`,
    GET_ALL_CLOUDSLICE_LABS:`SELECT * FROM cloudslicelab`,
    GET_USER_ASSIGNED_LABS:`SELECT * FROM cloudsliceuserassignment where user_id = $1`,
    UPDATE_SERVICES_ON_LABID:`UPDATE cloudslicelab SET services = $1 WHERE labid = $2 RETURNING *`,
    GET_MODULES_ON_LABID:`SELECT * FROM modules WHERE lab_id = $1`,
    GET_LAB_EXERCISES_ON_MODULEID:`SELECT 
  e.*, 
  le.*
FROM 
  exercises e
LEFT JOIN 
  lab_exercises le 
ON 
  e.id = le.exercise_id
WHERE 
  e.module_id = $1;
`,

  // MODULES
  GET_ALL_MODULES: `
    SELECT id, name AS title,totalduration, description FROM modules WHERE lab_id = $1
  `,
  GET_MODULE_EXERCISES: `
    SELECT 
      e.id, e.type,
      COALESCE(l.title, q.title) AS title,
      COALESCE(l.estimated_duration, q.estimated_duration) AS duration,
      COALESCE( q.description) AS description
    FROM exercises e
    LEFT JOIN lab_exercises l ON l.exercise_id = e.id
    LEFT JOIN questions q ON q.exercise_id = e.id
    WHERE e.module_id = $1
    ORDER BY e.created_at;
  `,

  // LAB
  GET_LAB_EXERCISES_BY_MODULE: `
    SELECT le.*, e.id AS exercise_id
    FROM exercises e
    JOIN lab_exercises le ON le.exercise_id = e.id
    WHERE e.module_id = $1
  `,

  // QUIZ
  GET_QUIZ_EXERCISES_IDS_BY_MODULE: `
    SELECT e.id AS exercise_id
    FROM exercises e
    WHERE e.module_id = $1 AND e.type = 'questions'
  `,
  GET_QUESTIONS_BY_EXERCISE_ID: `
    SELECT id, question_text AS text,description,estimated_duration AS duration FROM questions WHERE exercise_id = $1
  `,
  GET_QUESTIONS_BY_QUESTION_ID:`SELECT * from questions WHERE id = $1`,
  GET_OPTIONS_BY_QUESTION_ID: `
    SELECT option_text AS text, is_correct,option_id FROM options WHERE question_id = $1
  `,
  GET_OPTIONS_BY_ID:`SELECT * FROM options WHERE option_id = $1`,
  GET_EXERCISE_ON_ID:`SELECT * FROM exercises WHERE id = $1`,
  UPDATE_MODULE_ON_ID:`UPDATE modules SET name = $1, description = $2, totalduration = $3 WHERE id = $4 RETURNING *`,

  UPDATE_CLOUDSLICELAB_WITH_MODULES:`UPDATE cloudslicelab SET title=$1,description=$2,status=$3,region=$4,startdate=$5,enddate=$6 where labid=$7 RETURNING *`,
  UPDATE_CLOUDSLICELAB_WITHOUT_MODULES:`UPDATE cloudslicelab SET title=$1,description=$2,status=$3,region=$4,startdate=$5,enddate=$6,cleanuppolicy=$7,credits=$8 where labid=$9 RETURNING *`,

  DELETE_CLOUD_SLICE_LAB_ON_ID:`DELETE FROM cloudslicelab WHERE labid = $1 RETURNING *`,

  DELETE_MODULE_ON_ID:`DELETE FROM modules WHERE id = $1 RETURNING *`,
  DELETE_EXERCISE_ON_MODULE_ID:`DELETE FROM exercises WHERE module_id = $1 RETURNING *`,
  DELETE_EXERCISE_ON_ID:`DELETE FROM exercises WHERE id = $1 RETURNING *`,

  DELETE_LAB_EXERCISE_ON_EXERCISE_ID:`DELETE FROM lab_exercises WHERE exercise_id = $1 RETURNING *`,
  DELETE_QUIZ_EXERCISE_ON_EXERCISE_ID:`DELETE FROM questions WHERE exercise_id = $1 RETURNING *`,
  DELETE_QUIZ_EXERCISE_ON_ID:`DELETE FROM questions WHERE id = $1 RETURNING *`,
  DELETE_OPTIONS_ON_QUESTION_ID:`DELETE FROM options WHERE question_id = $1 RETURNING *`,
  DELETE_OPTIONS_ON_OPTION_ID:`DELETE FROM options WHERE option_id = $1 RETURNING *`,
  DELETE_ORG_ASSIGNMENT_ON_ID_ORGID:`DELETE FROM cloudsliceorgassignment WHERE labid= $1 and orgid=$2 RETURNING *`,
  GET_ALL_EXERCISES_ON_MODULEID:`SELECT * FROM exercises WHERE module_id = $1`,
  DELETE_CLOUDSLICE_USER_ASSIGNMENT:`DELETE FROM cloudsliceuserassignment WHERE labid = $1  RETURNING *`,
  DELETE_CLOUD_SLICE_USER_ASSIGNMENT_ON_LABID_USERID:`DELETE FROM cloudsliceuserassignment WHERE labid = $1 and user_id = $2 RETURNING *`,
  DELETE_CLOUDSLICE_USER_LAB_EXERCISE_STATUS:`DELETE FROM cloudsliceuserlabexercisestatus WHERE module_id = $1 and exercise_id=$2  RETURNING *`,
  DELETE_CLOUDSLICE_USER_QUIZ_EXERCISE_STATUS:`DELETE FROM cloudsliceuserquizexercisestatus WHERE module_id = $1 and exercise_id=$2  RETURNING *`,

  DELETE_CLOUDSLICE_USER_LAB_EXERCISE_STATUS_INDIVIDUAL:`DELETE FROM cloudsliceuserlabexercisestatus WHERE module_id = $1 and exercise_id=$2 AND user_id=$3 RETURNING *`,
  DELETE_CLOUDSLICE_USER_QUIZ_EXERCISE_STATUS_INDIVIDUAL:`DELETE FROM cloudsliceuserquizexercisestatus WHERE module_id = $1 and exercise_id=$2 and user_id=$3 RETURNING *`,

  DELETE_CLOUDSLICE_ORG_ASSIGNMENT:`DELETE FROM cloudsliceorgassignment WHERE labid = $1  RETURNING *`,
  UPDATE_EXERCISE_ON_ID:`UPDATE exercises SET type = $1 WHERE id = $2 RETURNING *`,
  UPDATE_LAB_EXERCISE_ON_EXERCISE_ID:`UPDATE lab_exercises SET title=$1, estimated_duration=$2 where exercise_id = $3 RETURNING *`,
  UPDATE_QUIZ_EXERCISE_ON_EXERCISE_ID:`UPDATE questions SET title=$1, description=$2, estimated_duration=$3 where exercise_id = $4 RETURNING *`,
  UPDATE_QUIZ_EXERCISECONTENT_ON_EXERCISE_ID:`UPDATE questions SET question_text=$1, description=$2, estimated_duration=$3 where exercise_id = $4 RETURNING *`,
  UPDATE_QUIZ_OPTION_ON_ID:`UPDATE options SET option_text=$1, is_correct=$2 WHERE option_id = $3 RETURNING *`,

  //update exercise main content
  UPDATE_LAB_EXERCISE_CONTENT_ON_EXERCISE_ID:`UPDATE lab_exercises SET instructions=$1, services=$2, files=$3,  cleanuppolicy=$4 WHERE exercise_id = $5 RETURNING *`,
  //update the catalogue in cloudslicelab
  UPDATE_CLOUDSLICELAB:`UPDATE cloudslicelab set catalogue=$1 where labid=$2 RETURNING *`,
  UPDATE_CLOUDSLICELAB_STATUS:`UPDATE cloudslicelab set status=$1 ,launched=$2 where labid=$3 and  createdby=$4 RETURNING *`,
  UPDATE_CLOUDSLICELAB_ORG_STATUS:`UPDATE cloudsliceorgassignment set status=$1 ,launched=$2 where labid=$3 and orgid=$4 Returning *`,
  UPDATE_CLOUDSLICELAB_USER_STATUS:'UPDATE cloudsliceuserassignment set status=$1, launched=$2 where labid=$3 and user_id=$4 Returning *',
  UPDATE_CLOUDSLICELAB_USER_RUNNING:`UPDATE cloudsliceuserassignment set isrunning=$1 where labid=$2 and user_id=$3 Returning *`,
  UPDATE_CLOUDSLICELAB_USER_TIMES:`UPDATE cloudsliceuserassignment set start_date=$1,end_date=$2 where labid=$3 and user_id=$4 RETURNING *`
}
