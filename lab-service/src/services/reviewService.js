const pool = require('../db/dbConfig');
const queries = require('../services/labQueries');
const cookie =  require('cookie');
const axios = require('axios');

const getUserData = async(userId,sessionToken)=>{
  try {
    if(!userId){
      throw new Error("Please Provide the user id")
    }
    const getUserData = await axios.post(`${process.env.BACKEND_URL}/api/v1/user_ms/getuserdata/${userId}`,{},{
       headers: {
        Cookie: `session_token=${sessionToken}`
      }
    }
    );
    if(!getUserData.data.response){
      throw new Error("No user is found with this user id");
    }
    return getUserData.data.response.user;
  } catch (error) {
    throw error
  }
}

//insert the review
const insertReview =async (req,res)=>{
    try {
        const {labId,userId,rating,comment} = req.body;
        if(!labId || !userId || !rating || !comment){
            return res.status(400).send({
                success:false,
                message:"Please Provide the required fields"
            })
        }
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        const userData = await getUserData(userId,sessionToken);
        const insert = await pool.query(queries.INSERT_REVIEW,[labId,userId,userData.name,rating,comment]);
        if(!insert.rows.length === 0){
           return res.status(404).send({
                success:false,
                message:"Could not insert the review"
            })
        }
        return res.status(200).send({
            success:true,
            message:'Successfully inserted the review',
            data:insert.rows[0]
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

//get the reviews
const getReviews = async(req,res)=>{
    try {
        const {labId} = req.body;
        if(!labId ){
            return res.status(400).send({
                success:false,
                message:"Please Provide All Required Fields"
            })
        }
        const getData = await pool.query(queries.GET_REVIEWS,[labId]);
        if(!getData.rows.length){
            return res.status(200).send({
              success:false,
              message:"No reviews found",
              data:[]
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully accessed reviews",
            data:getData.rows
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

//delete review
const deleteReview = async(req,res)=>{
    try {
        const {reviewId} = req.params;
        if(!reviewId){
            return res.status(400).send({
                success:true,
                messsage:"Please Provide the Id"
            })
        }
        const deleteReview = await pool.query(queries.DELETE_REVIEW,[reviewId]);
        if(deleteReview.rows.length === 0){
            return res.status(404).send({
                success:false,
                message:"Could not delete the review"
            })
        }
        return res.status(200).send({
            success:true,
            message:"Successfully deleted the review",
            data:deleteReview.rows[0]
        })

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success:false,
            message:"Internal Server Error",
            error:error.message
        })
    }
}

module.exports = {
    insertReview,
    getReviews,
    deleteReview
}