const pool = require('../dbconfig/db');
const {hashPassword,comparePassword,signJwt,verifyToken} = require('../helper/authHelper');
const userQueries = require('../services/userQueries');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 
const crypto = require("crypto");
const {
    nowInTz,
    isWithinQuietHours,
    markEmailAsSent,
    fetchAllUsersSettings,
    fetchPendingNotificationsForUser,
    getUserEmail,
    emailPlacehoders
} = require('../services/emailNotificationService');
const handlebars = require('handlebars');
const { sendNotification } = require('../socket');

const sendNotificationToMail = async (template, placeholders) => {
 
  // Load HTML template
  const htmlTemplate = fs.readFileSync(template, 'utf8');

  // Compile with Handlebars
  const compiledTemplate = handlebars.compile(htmlTemplate);

  // Render with placeholders
  const populatedTemplate = compiledTemplate(placeholders);

  // Configure mail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: placeholders.email,
    subject: placeholders.subject || placeholders.title,
    html: populatedTemplate
  };

  await transporter.sendMail(mailOptions);
};

const generateSecurePassword = async(length = 8)=> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.<>?";
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

const signupService = async (name, email, password,organization,isNewOrganization) => {
    try {
       const existingUser = await pool.query(userQueries.getUserByEmailQuery, [email]);
    if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists ');
   }
    const existingOrgUser = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
    if (existingOrgUser.rows.length > 0) {
    throw new Error('User with this email already exists in the organization');
    }
        const hashedPassword = await hashPassword(password);
        let result;
        if (!isNewOrganization) {
    if (!organization) {
          result = await pool.query(userQueries.insertRandomUserQuery,[name, email, hashedPassword, null, null, null])
      // optionally handle or throw
    } else if (organization.org_admin !== null) {
      // Regular user being added to an existing org
      result = await pool.query(
        userQueries.insertUserQuery,
        [name, email, hashedPassword, organization.org_admin, organization.organization_name, organization.org_type, organization.id]
      );
    }
  } else {
    // New organization — insert the admin user
    result = await pool.query(
      userQueries.insertAdminUserQuery,
      [name, email, hashedPassword, organization.organization_name, organization.org_type, 'orgsuperadmin', organization.id]
    );
  }
  
  //send mail to organiztion admin
   const userSettings = await pool.query(userQueries.GET_USER_NOTIFICATION_SETTINGS, [organization.org_admin]);
        if (userSettings.rowCount > 0) {
           const settings = userSettings.rows[0];
           const adminMail = await getUserEmail(organization.org_admin);
           const insertNotification = await pool.query(userQueries.INSERT_NOTIFICATION, ['user_registered', 'User Registration', `A new user:${name} has registered, Approval/Rejection is Pending `,'medium', organization.org_admin,[JSON.stringify({
                           email:email,
                           name:name,
                           userId:result.rows[0].id
                           })] ]);
                           //Email Notification
        if(settings.emailnotifications.includes('user_registered')){
          const htmlTemplate = path.join('C:\\Users\\Admin\\Desktop\\golab_project\\Client\\public\\templates\\notification-email-template.html')
       await sendNotificationToMail(htmlTemplate,{
              title: 'User Registered Notification',
              priority: 'medium',
              // icon: 'https://example.com/icon.png',
              message: `${name} User registered successfully,approve the user`,
              metadata: {
               name:name,
               email:email,
               organization:organization.organization_name,
              },
              actionUrl: 'https://app.golabing.ai/login',
              actionText: 'Approve/Reject Now',
              formattedDate: new Date().toLocaleString(),
              notificationType: 'user_registered',
              unsubscribeUrl: 'https://example.com/unsubscribe',
              preferencesUrl: 'https://example.com/preferences',
              email:adminMail,
       })}
               // ---- IN-APP NOTIFICATIONS ----
       if (settings.inappnotifications.includes("user_registered")) {
                                       await sendNotification({
                                         userId: organization.org_admin,
                                         notification: insertNotification.rows[0],
                                       });
                             
                                      //  await pool.query(labQueries.INSERT_LAB_NOTIFICATION, [
                                      //    lab,
                                      //    "lab_assigned",
                                      //    endDate,
                                      //    insertNotification.rows[0]?.id,
                                      //  ]);
          }}
        
  
        // 3. Prepare email HTML
 const templatePath = path.join(
  'C:/Users/Admin/Desktop/golab_project/Client/public/templates/email-template.html'
);
let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

const placeholders = {
  name,
  email,
  password, // send raw password to user (consider security implications)
  loginUrl: 'https://app.golabing.ai/' // or dynamically generate
};

for (const key in placeholders) {
  const regex = new RegExp(`{{${key}}}`, 'g');
  htmlTemplate = htmlTemplate.replace(regex, placeholders[key]);
}
      // 4. Configure mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
  from:process.env.EMAIL_USER,
  to: email,
  subject: 'Your GoLabing.ai Account Credentials',
  html: htmlTemplate
};

// 5. Send mail
try {
  await transporter.sendMail(mailOptions);
  console.log('Email sent to:', email);
} catch (err) {
  console.error('Failed to send email:', err);
  // Optionally log error or notify admin
}
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

//send the email verification link
const sendVerificationEmail = async (email,type) =>{
  try {
    if(type !== 'reset'){
          const existingUser = await pool.query(userQueries.getUserByEmailQuery, [email]);
    if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists ');
   }
    const existingOrgUser = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
    if (existingOrgUser.rows.length > 0) {
    throw new Error('User with this email already exists in the organization');
    }
    }
   
   // Generate 6-digit random code
   const generateCode =  Math.floor(100000 + Math.random() * 900000).toString(); 

    const htmlTemplate = process.env.htmlTemplatePath;
    if (!fs.existsSync(htmlTemplate)) {
      throw new Error('Email template not found');
    }
    const templateContent = fs.readFileSync(htmlTemplate, 'utf8');
    // 2. Replace placeholders in the template
    const placeholders = {
      email,
      verificationCode: generateCode
    };
    let emailContent = templateContent;
    for (const key in placeholders) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      emailContent = emailContent.replace(regex, placeholders[key]);
    } 

    // 3. Configure mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });


    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification',
      html: emailContent
    };

    // 4. Send the email
    await transporter.sendMail(mailOptions);
    const result = await pool.query(userQueries.insertVerificationCode, [email, generateCode]);
    if (result.rows.length === 0) {
      throw new Error('Failed to insert verification code into database');
    }
    return true;
  } catch (error) {
    throw error;
  }
}

//verify the email verification code
const verifyEmailCode = async (email, code) => {
  try {
    const result = await pool.query(userQueries.getVerificationCode, [email, code]);
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }
    const deleted = await pool.query(userQueries.deleteVerificationCode, [email, code]);
    if (deleted.rows.length === 0) {
      throw new Error('Failed to delete verification code');
    }
    return true;
  } catch (error) {
    throw error;
  }
};
//reset password
const resetPassword = async(email,newPassword)=>{
  try {
    let updatePassword;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    updatePassword = await pool.query(userQueries.updateUserPassword,[hashedPassword,email]);
    if(!updatePassword.rows.length){
      updatePassword = await pool.query(userQueries.updateOrgUserPassword,[hashedPassword,email]);
      if(!updatePassword.rows.length)
        throw new Error("Failed to update the password")
  } 
     if(settings.emailnotifications.includes('password_reset')){
          const htmlTemplate = path.join('C:\\Users\\Admin\\Desktop\\golab_project\\Client\\public\\templates\\notification-email-template.html')
       await sendNotificationToMail(htmlTemplate,{
              title: 'Password Reset Notification',
              priority: 'medium',
              // icon: 'https://example.com/icon.png',
              message: `${name} User registered successfully,approve the user`,
              metadata: {
               name:name,
               email:email,
               organization:organization.organization_name,
              },
              actionUrl: 'https://app.golabing.ai/login',
              actionText: 'Login Now',
              formattedDate: new Date().toLocaleString(),
              notificationType: 'password_reset',
              unsubscribeUrl: 'https://example.com/unsubscribe',
              preferencesUrl: 'https://example.com/preferences',
              email:email,
       })}
   return updatePassword;
    }catch (error) {
        throw error;
      }
    }

const loginService = async (email, password) => {
    try {
        let userResult = await pool.query(userQueries.getUserByEmailQuery, [email]);

        if (userResult.rows.length === 0) {
            userResult = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
        }

        if (userResult.rows.length === 0) {
            return { success: false, message: "User not found" };
        }

        const user = userResult.rows[0];
        if(user.status === 'pending' || user.status === 'rejected'){
          throw new Error('Either you are not approved or rejected');
        }
        // Compare password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return { success: false, message: "Invalid Password" };
        }

        // Update Last Active Date
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        
        const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];
        
        const lastActiveDate = `${day} ${monthNames[month]} ${year} ${hours}:${minutes}:${seconds}`;
        
        const updateQuery = user.admin_id || user.admin_id === null
            ? userQueries.updateOrgUserLastActiveQuery 
            : userQueries.updateUserLastActiveQuery;

        const updateResult = await pool.query(updateQuery, [lastActiveDate, email]);

        if (!updateResult.rows[0]) {
            return { success: false, message: "Could not update last active" };
        }

        // Generate JWT Token
        const token = signJwt(user.id);

        return { success: true, user, token };
    } catch (error) {
        throw error;
    }

  };
//user approve status
const userApprove = async(userId,admin,status)=>{
  try {
    const updateApproveStatus = await pool.query(userQueries.updateUserApproval,[status,admin.id,userId]);
    console.log(updateApproveStatus)
    return updateApproveStatus;
  } catch (error) {
    throw error;
  }
}

const logoutService = async (email) => {
    try {
      const userStatus = await pool.query(userQueries.updateUserStatusOnLogout, [email]);
      if (!userStatus.rows[0]) {
        const orgUserStatus = await pool.query(userQueries.updateOrgUserStatusOnLogout, [email]);
        if (!orgUserStatus.rows[0]) {
          return { success: false, message: "User not found" };
        }
        
      }
      return {success:true,message:"User logged out successfully"};
    } catch (error) {
      throw error;
    }
  }

const getAllUsers = async () => {
    const userResult = await pool.query(userQueries.getAllUsers);
    const orgUserResult = await pool.query(userQueries.getAllOrgUsers);
    const result = [...userResult.rows, ...orgUserResult.rows];
    return result;
};

const addUser = async (userData) => {
   try {
    const { name, email,password, role, organization } = userData.formData;
    const { id } = userData.user;
    const [orgName,orgType,orgId]= organization.split(',').map(val=>val.trim());
     const existingUser = await pool.query(userQueries.getUserByEmailQuery, [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists ');
  }
  const existingOrgUser = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
  if (existingOrgUser.rows.length > 0) {
    throw new Error('User with this email already exists in the organization');
  }
    const hashedPassword = await hashPassword(password);

    const result = await pool.query(userQueries.addUser, [
        name,
        email,
        hashedPassword,
        role,
        orgName,
        orgType,
        orgId,
        id,
    ]);
 // 3. Prepare email HTML
 const templatePath = path.join(
  'C:/Users/Admin/Desktop/golab_project/Client/public/templates/email-template.html'
);
let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

const placeholders = {
  name,
  email,
  password, // send raw password to user (consider security implications)
  loginUrl: 'https://d3q8q5ntrgsj3v.cloudfront.net/' // or dynamically generate
};

for (const key in placeholders) {
  const regex = new RegExp(`{{${key}}}`, 'g');
  htmlTemplate = htmlTemplate.replace(regex, placeholders[key]);
}

// 4. Configure mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
  from:process.env.EMAIL_USER,
  to: email,
  subject: 'Your GoLabing.ai Account Credentials',
  html: htmlTemplate
};

// 5. Send mail
try {
  await transporter.sendMail(mailOptions);
  console.log('Email sent to:', email);
} catch (err) {
  console.error('Failed to send email:', err);
  // Optionally log error or notify admin
}
    return result.rows[0];
   } catch (error) {
      console.log(error);
      throw new Error("Could not add the user")
   }
   
};
//bulk add user

 const bulkAddUser = async (users, orgId, id, orgName, orgType, role) => {
  try {
    const results = [];

    for (const user of users) {
      const { name, email } = user;

      if (!name || !email) {
        console.warn(`Skipping invalid user: ${JSON.stringify(user)}`);
        continue;
      }

      const existingUser = await pool.query(userQueries.getUserByEmailQuery, [email]);
      if (existingUser.rows.length > 0) {
        console.warn(`User with email ${email} already exists`);
        continue;
      }

      const existingOrgUser = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
      if (existingOrgUser.rows.length > 0) {
        console.warn(`User with email ${email} already exists in org`);
        continue;
      }

      // Generate password
      const plainPassword = await generateSecurePassword();

      //  Hash the password before storing
      const hashedPassword = await hashPassword(plainPassword);
       
      let result;
      await pool.query("BEGIN");
      //  Insert into DB
      if(user?.role === 'user' || role === 'user'){
         result = await pool.query(userQueries.addToOrg, [
        name,
        email,
        hashedPassword,
        user?.role || role,
        orgName,
        orgType,
        orgId,
        id,
        'inactive'
      ]);
      }
      else{
         result = await pool.query(userQueries.addUsers, [
        name,
        email,
        hashedPassword,
        user?.role || role,
        orgName,
        orgType,
        orgId,
        id,
        'inactive'
      ]);
      }
      

      // Prepare email template
       const templatePath = path.join(
        'C:/Users/Admin/Desktop/golab_project/Client/public/templates/email-template.html'
      );
      let htmlTemplate = fs.readFileSync(templatePath, "utf8");

      const placeholders = {
        name,
        email,
        password: plainPassword, // send raw password to user
        loginUrl: "https://d3q8q5ntrgsj3v.cloudfront.net/",
      };

      for (const key in placeholders) {
        const regex = new RegExp(`{{${key}}}`, "g");
        htmlTemplate = htmlTemplate.replace(regex, placeholders[key]);
      }

      // Send email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your GoLabing.ai Account Credentials",
        html: htmlTemplate,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log( `Email sent to: ${email}`);
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err.message);
      }

      results.push(result.rows[0]);
    }
    await pool.query('COMMIT');
    return results;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error in bulkAddUser:", error);
    throw new Error("Could not add users");
  }
};

const getUserData = async (userId) => {
    let user = await pool.query(userQueries.getUserById, [userId]);

    if (!user.rows[0]) {
        user = await pool.query(userQueries.getOrgUserById, [userId]);
        if (!user.rows[0]) return null;
    }

    const stats = await pool.query(userQueries.getUserStats, [userId]);
    const certifications = await pool.query(userQueries.getUserCertifications, [userId]);

    return {
        user: user.rows[0],
        stats: stats.rows[0] || {},
        certifications: certifications.rows.map(row => row.certificationname),
    };
};

const updateUserOrganization = async (userId, values) => {
  if (!values || typeof values !== 'string') {
      throw new Error('Invalid input values');
  }

  const [orgName, type, orgId] = values.split(',').map(val => val.trim());

  if (!userId || !orgName || !type || !orgId) {
      throw new Error('Some field is missing');
  }

  try {
      const user = await pool.query(userQueries.getUserById, [userId]);
      if (user.rows.length > 0) {
          const update = await pool.query(userQueries.updateUserOrganizationDetails, [orgName, type, orgId, userId]);
          return update.rows.length > 0 ? update.rows[0] : null;
      }

      const orgUser = await pool.query(userQueries.getOrgUserById, [userId]);
      if (orgUser.rows.length > 0) {
          const update = await pool.query(userQueries.updateUserOrganizationOfOrg, [orgName, type, orgId, userId]);
          return update.rows.length > 0 ? update.rows[0] : null;
      }

      throw new Error('User not found');
  } catch (error) {
      console.error('Error updating user organization:', error);
      throw error;
  }
};


const updateUserRole = async (userId, role) => {
  if (!userId || !role) {
    throw new Error("User ID and role are required");
  }

  // Check if the user exists in the main users table
  const existingUser = await pool.query(userQueries.getUserById, [userId]);
  if (existingUser.rows.length > 0) {
    const result = await pool.query(userQueries.UPDATE_USER_ROLE, [role, userId]);
    return result.rows[0];
  }

  // If not found, check in organization_users
  const existingOrgUser = await pool.query(userQueries.getOrgUserById, [userId]);
  if (existingOrgUser.rows.length > 0) {
    const result = await pool.query(userQueries.UPDATE_ORG_USER_ROLE, [role, userId]);
    return result.rows[0];
  }

  throw new Error("User not found in either users or organization_users table");
};

  const getTokenAndGetUserDetails = async (token) => {
    if (!token) throw new Error("No token provided");
    const decoded = verifyToken(token);
    const userId = decoded._id;
  
    let result = await pool.query(userQueries.GET_USER_BY_ID, [userId]);
    if (result.rows.length > 0) return result.rows[0];
  
    result = await pool.query(userQueries.GET_ORG_USER_BY_ID, [userId]);
    if (result.rows.length > 0) return result.rows[0];
  
    throw new Error("User not found");
  };
  
  const updateUserDetails = async (id, name, email, password ,status,role) => {
    if (!id) throw new Error("User ID is required");
    let result = await pool.query(userQueries.GET_USER_BY_ID, [id]);
    if (result.rows.length > 0) {
      const existingUser = result.rows[0];
      if (password && (await bcrypt.compare(password, existingUser.password)))
        throw new Error("New password cannot be same as the old password");
      const query = password
        ? userQueries.UPDATE_USER
        : userQueries.UPDATE_USER_NO_PASSWORD;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10),status,role, id]
        : [name, email,status,role, id];
  
      result = await pool.query(query, values);
      return result.rows[0];
    }
  
    result = await pool.query(userQueries.GET_ORG_USER_BY_ID, [id]);
    if (result.rows.length > 0) {
      const existingUser = result.rows[0];
      if (password && (await bcrypt.compare(password, existingUser.password)))
        throw new Error("New password cannot be same as the old password");
  
      const query = password
        ? userQueries.UPDATE_ORG_USER
        : userQueries.UPDATE_ORG_USER_NO_PASSWORD;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10), status,role,id ]
        : [name, email,status,role, id,];
  
      result = await pool.query(query, values);
      return result.rows[0];
    }
  
    throw new Error("User not found");
  };
  
  const getUsersFromOrganization = async (orgId) => {
    const [usersResult, orgUsersResult] = await Promise.all([
      pool.query(userQueries.GET_USERS_FROM_ORG, [orgId]),
      pool.query(userQueries.GET_ORG_USERS_ORGID, [orgId]),
    ]);
  
    const users = [...usersResult.rows, ...orgUsersResult.rows];
    if (users.length === 0) throw new Error("No users found for this organization");
  
    return users;
  };
  
  const deleteUsers = async (orgId, userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0)
      throw new Error("Invalid or missing userIds array");
  
    await pool.query("BEGIN");
  
    const deletedUsers = await pool.query(userQueries.DELETE_USERS, [userIds, orgId]);
    const deletedUserIds = deletedUsers.rows.map((row) => row.id);
    const remainingUserIds = userIds.filter((id) => !deletedUserIds.includes(id));
    let deletedOrgUsers = [];
    if (remainingUserIds.length > 0) {
      deletedOrgUsers = await pool.query(userQueries.DELETE_ORG_USERS, [remainingUserIds, orgId]);
    }
  
    await pool.query("COMMIT");
  
    return { deletedUserIds, deletedOrgUsers: deletedOrgUsers.rows.map((row) => row.id) };
  };
  
  const deleteRandomUsers = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error("Invalid or missing userIds array");
    }

    try {
        // Delete users from the main 'users' table
        const deletedUsers = await pool.query(userQueries.DELETE_RANDOM_USERS, [userIds]);
        const deletedUserIds = deletedUsers.rows.map(row => row.id);

        // Find remaining users that were not deleted
        const remainingUserIds = userIds.filter(id => !deletedUserIds.includes(id));

        let deletedOrgUsers = [];
        if (remainingUserIds.length > 0) {
            const deletedOrgResponse = await pool.query(userQueries.DELETE_RANDOM_ORG_USERS, [remainingUserIds]);
            deletedOrgUsers = deletedOrgResponse.rows.map(row => row.id);
        }

        return {
            deletedUserIds,
            deletedOrgUsers
        };
    } catch (error) {
        console.error("Error deleting users:", error);
        throw new Error("Failed to delete users");
    }
};


  // Add Organization User
// const addOrganizationUser = async (userData) => {
//     const { name, email, password, role, admin_id ,organization,org_id,organization_type} = userData;
//     const hashedPassword = await bcrypt.hash(password, 10);
    
//     const result = await pool.query(userQueries.ADD_ORG_USER, [name, email, hashedPassword, role, admin_id,organization,org_id,organization_type]);
//     return result.rows[0];
//   };


const addOrganizationUser = async (userData) => {
  try {
    const { name, email, password, role, admin_id, organization, org_id, organization_type } = userData;
    
  const existingUser = await pool.query(userQueries.getUserByEmailQuery, [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists ');
  }
  const existingOrgUser = await pool.query(userQueries.getOrgUserByEmailQuery, [email]);
  if (existingOrgUser.rows.length > 0) {
    throw new Error('User with this email already exists in the organization');
  }
  // 1. Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  await pool.query('BEGIN');
  // 2. Insert into database
  let result;
  if (role === 'user' || role === 'trainer' ){
    result = await pool.query(userQueries.ADD_ORG_USER, [
    name,
    email,
    hashedPassword,
    role,
    admin_id,
    organization,
    org_id,
    organization_type
  ]);
  }
  else{
    result = await pool.query(userQueries.addUser, [
    name,
    email,
    hashedPassword,
    role,
    organization,
    organization_type,
    org_id,
    admin_id,
  ]);
  if(role === 'orgsuperadmin'){
    const userId = result.rows[0].id;
    await pool.query(userQueries.UPDATE_ORGANIZATION_ADMIN,[userId,org_id])
  }
  }
   
  const newUser = result.rows[0];

  // 3. Prepare email HTML
  const templatePath = path.join(
    'C:/Users/Admin/Desktop/golab_project/Client/public/templates/email-template.html'
  );
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

  const placeholders = {
    name,
    email,
    password, // send raw password to user (consider security implications)
    loginUrl: 'https://d3q8q5ntrgsj3v.cloudfront.net/' // or dynamically generate
  };

  for (const key in placeholders) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlTemplate = htmlTemplate.replace(regex, placeholders[key]);
  }

  // 4. Configure mail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from:process.env.EMAIL_USER,
    to: email,
    subject: 'Your GoLabing.ai Account Credentials',
    html: htmlTemplate
  };

  // 5. Send mail
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent to:', email);
  } catch (err) {
    console.error('Failed to send email:', err);
    // Optionally log error or notify admin
  }
  await pool.query('COMMIT');
  return newUser;

  } catch (error) {
    await pool.query('ROLLBACK');
    console.log(error);
    throw new Error(error.message || "Could not add organization user");
  }
}

  // Get Organization Users
  const getOrganizationUsers = async (org_id) => {
    const result = await pool.query(userQueries.GET_ORG_USERS, [org_id]);
    return result.rows;
  };
  
  // Update User (Checks both users and organization_users)
  const updateUser = async (id, userData) => {
    const { name, email, role, status ,password} = userData;
    const userResult = await pool.query(userQueries.GET_USER_BY_ID, [id]);
    if (userResult.rows.length > 0) {
      if (password && (await bcrypt.compare(password, existingUser.password)))
        throw new Error("New password cannot be same as the old password");
  
      const query = password
        ? userQueries.UPDATE_USER
        : userQueries.UPDATE_USER_NO_PASSWORD;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10),status,role, id]
        : [name, email,status,role, id];
  
      result = await pool.query(query, values);
      return result.rows[0];
}
  
    const orgUserResult = await pool.query(userQueries.GET_ORG_USER_BY_ID, [id]);
    if (orgUserResult.rows.length > 0) {
      const existingUser = orgUserResult.rows[0];
      if (password && (await bcrypt.compare(password, existingUser.password)))
        throw new Error("New password cannot be same as the old password");
  
      const query = password
        ? userQueries.UPDATE_ORG_USER
        : userQueries.UPDATE_ORG_USER_NO_PASSWORD;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10), status,role,id ]
        : [name, email,status,role, id,];
  
      result = await pool.query(query, values);
      return result.rows[0];
    }
  
    throw new Error("User not found in both tables");
  };
  
  // Insert Multiple Users
  const insertUsers = async (users, organization, admin_id, organization_type) => {
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await pool.query(userQueries.INSERT_USERS, [
        user.userId, hashedPassword, organization, admin_id, organization_type
      ]);
    }
  };

  //update user profile
  const updateUserProfile = async ( id, name, email, password, phone, location, profilephoto,currentPassword) => {
  try {
    console.log("Updating user profile with:", { id, name, email, password, phone, location, profilephoto,currentPassword });
    if (!id || !name || !email) {
      throw new Error("Please provide the required fields");
    }
    if (phone === undefined || phone === '' ) {
      phone = null;
    }
    if (location === undefined || location === '') {
      location = null;
    }
    const userResult = await pool.query(userQueries.GET_USER_BY_ID, [id]);
    if (userResult.rows.length > 0) {
      const existingUser = userResult.rows[0];

      // Use existing profile photo if none provided
      const finalProfilePhoto = profilephoto ?? existingUser.profilephoto;
      if(currentPassword && !(await bcrypt.compare(currentPassword, existingUser.password))){
        throw new Error("Current password is incorrect");
      }
      if (password && (await bcrypt.compare(password, existingUser.password))) {
        throw new Error("New password cannot be same as the old password");
      }

      const query = password
        ? userQueries.updateUserProfile
        : userQueries.updateUserProfileWithNoPassword;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10), phone, location, finalProfilePhoto, id]
        : [name, email, phone , location, finalProfilePhoto, id];

      const result = await pool.query(query, values);
      return result.rows[0];
    }

    // If not found in users table, check organization_users
    const orgUserResult = await pool.query(userQueries.GET_ORG_USER_BY_ID, [id]);
    if (orgUserResult.rows.length > 0) {
      const existingUser = orgUserResult.rows[0];
      const finalProfilePhoto = profilephoto ?? existingUser.profilephoto;

      if (password && (await bcrypt.compare(password, existingUser.password))) {
        throw new Error("New password cannot be same as the old password");
      }

      const query = password
        ? userQueries.updateUserProfileOrg
        : userQueries.updateUserProfileWithNoPasswordOrg;
      const values = password
        ? [name, email, await bcrypt.hash(password, 10), phone, location, finalProfilePhoto, id]
        : [name, email, phone, location, finalProfilePhoto, id];

      const result = await pool.query(query, values);
      return result.rows[0];
    }

    throw new Error("User not found");
  } catch (error) {
    console.log(error);
    throw error;
  }
};


module.exports = { 
    signupService,
    loginService,
    getAllUsers,
    addUser,
    getUserData, 
    updateUserOrganization,
    updateUserRole,
  getTokenAndGetUserDetails,
  updateUserDetails,
  getUsersFromOrganization,
  deleteUsers,
  addOrganizationUser,
  getOrganizationUsers,
  updateUser,
  insertUsers,
  logoutService,
  deleteRandomUsers,
  updateUserProfile,
  sendVerificationEmail,
  verifyEmailCode,
  bulkAddUser,
  userApprove,
  resetPassword
 };