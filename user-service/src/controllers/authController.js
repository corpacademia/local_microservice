const { Pool } = require('pg');       
const {hashPassword , comparePassword,signJwt,verifyToken} = require('../helper/authHelper');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const userServices = require('../services/userServices');


dotenv.config();

// const pool = new Pool({
//   user: process.env.user,
//   host: process.env.host,
//   database:process.env.database,
//   password:process.env.password,
//   port: process.env.port,
// });


const signupController = async (req, res) => {
    try {
        const { name, email, password , organization,isNewOrganization } = req.body;
        if(!name|| !email || !password  ){
          return res.status(404).send({
            success:false,
            message:"Please Provide All the required fields"
          })
        }
        const user = await userServices.signupService(name, email, password,organization,isNewOrganization);

        if (!user) {
            return res.status(405).send({
                success: false,
                message: "Error occurred in storing data",
            });
        }

        return res.status(200).send({
            success: true,
            result: user,
            message: "Successfully inserted data",
        });
    } catch (error) {
      console.log("error",error)
        return res.status(500).send({
            success: false,
            message: "Could not insert the data",
            error: error.message,
        });
    }
};

//send email verification link
const sendVerificationEmail = async (req,res) => {
  try {
    const {email} = req.body;
    const result = await userServices.sendVerificationEmail(email);
    if (!result) {
      return res.status(400).send({
        success: false,
        message: result.message
      });
    }
    return res.status(200).send({
      success: true,
      message: "Verification email sent successfully"
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Could not send verification email",
      error: error.message
    });
  }
}

//verify the email code
const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await userServices.verifyEmailCode(email, code);
    if (!result) {
      return res.status(400).send({
        success: false,
        message: "Invalid or expired verification code"
      });
    }
    return res.status(200).send({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    console.log(error)
    return res.status(500).send({
      success: false,
      message: "Could not verify email",
      error: error.message
    });
  }
};

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ success: false, message: "Email or Password is missing" });
        }

        const result = await userServices.loginService(email, password);

        if (!result.success) {
            return res.status(result.message === "User not found" ? 404 : 401).send({
                success: false,
                message: result.message
            });
        }
        // Set the JWT token in an HTTP-only cookie
        res.cookie("session_token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.status(200).send({
            success: true,
            message: "Successfully Logged In",
            result: result.user
        });

    } catch (error) {
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};



const getAllUsers = async (req, res) => {
    try {
        const users = await userServices.getAllUsers();
        if (!users || users.length === 0) {
            return res.status(204).send({
                success: false,
                message: 'No users are available',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Successfully accessed users',
            data: users,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Could not access the users',
            error,
        });
    }
};
const addUser = async (req, res) => {
    try {
        const user = await userServices.addUser(req.body);

        if (!user) {
            return res.status(204).send({
                success: false,
                message: 'Could not add user',
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Successfully added user',
            data: user,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Could not add the user',
            error: error.message,
            detail: error.detail,
        });
    }
};
const getUserData = async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = await userServices.getUserData(userId);

        if (!userData) {
            return res.status(404).send({ 
                success: false, 
                message: 'User not found in both tables' 
            });
        }

        return res.status(200).send({
            success: true,
            message: 'Successfully accessed user data',
            response: userData,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Could not access the user data',
            error: error.message,
        });
    }
};
const logoutController = async(req,res)=>{
    try{

      const result = await userServices.logoutService(req.body.email);
     
      if(!result.success){
          return res.status(400).send({
              success:false,
              message:result.message
          })

      }

        res.clearCookie("session_token")
        return res.status(200).send({
            success:true,
            message:"Successfully logged out",
        })
    }
    catch(error){
      console.log("error",error)
        return res.status(500).send({
            success:false,
            message:"Could not log out",
            error,
        })
    }               
}


const updateUserOrganization = async (req, res) => {
    try {
        const { userId, values } = req.body;
        const updatedUser = await userServices.updateUserOrganization(userId, values);

        return res.status(200).send({
            success: true,
            message: 'Successfully updated',
            data: updatedUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: error.message || 'Could not update the field',
        });
    }
};

const updateUserRole = async (req, res) => {
    try {
      const { userId, role } = req.body;
      const updatedUser = await userServices.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).send({ success: false, message: "User not found" });
      }
      res.status(200).send({ success: true, message: "User role updated", data: updatedUser });
    } catch (error) {
      console.log("error", error);
      res.status(400).send({ success: false, message: error.message });
    }
  };
  
  const getTokenAndGetUserDetails = async (req, res, next) => {
    try {
      const token = req.cookies.session_token || req.headers.authorization;
      req.userData = await userServices.getTokenAndGetUserDetails(token);
      next();
    } catch (error) {
      res.status(401).send({ success: false, message: error.message });
    }
  };
  
  const updateUserController = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password ,status ,role} = req.body;
      const updatedUser = await userServices.updateUserDetails(id, name, email, password ,status,role);
      res.status(200).send({ success: true, message: "User updated successfully", data: updatedUser });
    } catch (error) {
      console.log("error",error)
      res.status(400).send({ success: false, message:error.message,error:error.message });
    }
  };
  
  const getUsersFromOrganization = async (req, res) => {
    try {
      const { orgId } = req.params;
      const users = await userServices.getUsersFromOrganization(orgId);
      return res.status(200).send({ success: true, message: "Users retrieved successfully", data: users });
    } catch (error) {
      console.log("error",error)
      return res.status(404).send({ success: false, message:"Error in getting user details",error: error.message });
    }
  };
  
  const deleteUsers = async (req, res) => {
    try {
      const { orgId, userIds } = req.body;
      const deletedData = await userServices.deleteUsers(orgId, userIds);
      res.status(200).send({ success: true, message: "Users deleted successfully", data: deletedData });
    } catch (error) {
      res.status(400).send({ success: false, message: error.message });
    }
  };
const deleteRandomUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const deletedData = await userServices.deleteRandomUsers(userIds);
    res.status(200).send({ success: true, message: "Users deleted successfully", data: deletedData });
  } catch (error) {
    res.status(400).send({ success: false, message: error.message });
  }
}

  


// Controller: Add Organization User
const addOrganizationUser = async (req, res) => {
    try {
      const user = await userServices.addOrganizationUser(req.body);
      return res.status(200).send({
        success: true,
        message: "Successfully stored the user data",
        data: user,
      });
    } catch (error) {
      console.error("Error adding organization user:", error);
      return res.status(500).send({
        success: false,
        message: "Error in database",
        error: error.message,
      });
    }
  };
  
  // Controller: Get Organization Users
  const getOrganizationUser = async (req, res) => {
    try {
      const users = await userServices.getOrganizationUsers(req.body.admin_id);
      
      if (!users.length) {
        return res.status(404).send({
          success: false,
          message: "No users found for this admin",
        });
      }
      return res.status(200).send({
        success: true,
        message: "Successfully retrieved users",
        data: users,
      });
    } catch (error) {
      console.error("Error fetching organization users:", error);
      return res.status(500).send({
        success: false,
        message: "Error in database",
        error: error.message,
      });
    }
  };
  
  // Controller: Update User
  const updateUser = async (req, res) => {
    try {
      const result = await userServices.updateUser(req.params.id, req.body);
      return res.status(200).send({
        success: true,
        message: "successfully updated user",
        data:result
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(error.message.includes("not found") ? 404 : 500).send({
        success: false,
        message: error.message,
      });
    }
  };
  
  // Controller: Insert Users
  const insertUsers = async (req, res) => {
    try {
      await userServices.insertUsers(req.body.users, req.body.organization, req.body.admin_id, req.body.organization_type);
      return res.status(201).send({
        success: true,
        message: "Successfully inserted users",
      });
    } catch (error) {
      console.error("Error inserting users:", error);
      return res.status(500).send({
        success: false,
        message: "Could not store users",
        error: error.message,
      });
    }
  };
  
  // Controller: Update User Profile
  const updateUserProfile = async (req, res) => {
    try {
      const {id , name, email, password, phone, location } = req.body;
      const profilePhoto = req.files[0] ? req.files[0].path : null;
      const updatedUser = await userServices.updateUserProfile(id, name, email, password, phone, location, profilePhoto);
      if (!updatedUser) {
        return res.status(404).send({
          success: true,
          message: "User not found",
          data:[]
        });
      }
      return res.status(200).send({
        success: true,
        message: "Successfully updated user profile",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user profile:", error.message);
      return res.status(500).send({
        success: false,
        message: "Could not update user profile",
        error: error.message,
      });
    }
   }

module.exports={
    signupController,
    loginController,
    getAllUsers,
    addUser,
    getUserData,
    updateUserOrganization,
    updateUserRole,
    getTokenAndGetUserDetails,
    getUsersFromOrganization,
    updateUserController, 
    getUsersFromOrganization, 
    deleteUsers,
    logoutController,
    addOrganizationUser,
    getOrganizationUser,
    updateUser,
    insertUsers,
    deleteRandomUsers,
    updateUserProfile,
    sendVerificationEmail,
    verifyEmailCode
}