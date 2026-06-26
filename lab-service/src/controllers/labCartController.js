const cartServices = require('../services/labCartService')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const cookie = require('cookie');
const axios = require('axios');
const cartQueries = require('../services/labCartQueries');
const proxmoxQueries = require('../services/promoxQueries')
const pool = require('../db/dbConfig');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const labQueries = require('../services/labQueries');
const { jsPDF } = require("jspdf"); // if using pdfkit instead, I can rewrite
const {autoTable} = require("jspdf-autotable");
const { send } = require('process');
const { sendNotification } = require('../socket');
const Instamojo = require('../utility/instamojo')
require('dotenv').config;
const crypto = require('crypto');

const api = require('../config/proxmoxApi');
const purchaseQueries = require('../services/purchaseQueries');
const { createTheExtensionRequest, subscriptionPurchase } = require('../services/purchaseService');
const labCartQueries = require('../services/labCartQueries');
const { assign } = require('nodemailer/lib/shared');
const { Cashfree, CFEnvironment } = require("cashfree-pg");
const { createTemplateInProxmoxAccount, createTemplateInCloudSliceAccountAws } = require('../services/proxmoxService');

const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY)

// // normalize in case it's wrapped in .default
// if (autoTable.default) {
//   autoTable = autoTable.default;
// }

//get the user name
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
const getUsersData = async(userId)=>{
  if(!userId) throw new Error("Please provide the userid")
  let user;
   user = await pool.query(labCartQueries.GET_USER_DATA,[userId]);
   if(!user.rows.length){
    user = await pool.query(labCartQueries.GET_ORG_USER_DATA,[userId]);
    if(!user.rows.length) throw new Error("User not found")
    return user.rows[0]
   }
   return user.rows[0]
}

const sendLabNotification = async ({
  userId,
  labId,
  type,
  title,
  message,
  severity = "medium"
}) => {
  try {

    const userSettings = await pool.query(
      labQueries.GET_USER_NOTIFICATION_SETTINGS,
      [userId]
    );

    if (userSettings.rowCount === 0) return;

    const settings = userSettings.rows[0];

    if (!settings.inappnotifications.includes(type)) return;

    const notificationResult = await pool.query(
      labQueries.INSERT_NOTIFICATION,
      [type, title, message, severity, userId, null]
    );

    if (notificationResult.rows.length > 0) {

      await pool.query(
        labQueries.INSERT_LAB_NOTIFICATION,
        [labId, type, null, notificationResult.rows[0].id]
      );

      sendNotification({
        userId,
        notification: notificationResult.rows[0]
      });

    }

  } catch (error) {
    console.error("Notification helper error:", error.message);
  }
};

//create a new cart item
const createCartItem = async (req, res) => {
    try {
        const { labId, name, description, duration, price,currency, quantity,userId,credsId,availability,number_hours_day } = req.body;
        console.log(req.body);
        if (!labId || !name || !price || !userId || !duration || !quantity || !currency)  {
            return res.status(400).send({ 
               success: false,
               message: 'labId, name, price, userId, duration and quantity are required fields.' 
            });
        }
        const newCartItem = await cartServices.createCartItem(labId, name, description, duration, price,currency, quantity, userId,credsId,availability,number_hours_day);
        if (!newCartItem) {
            return res.status(404).send({ success: false, message: 'Failed to create cart item.' });
        }

        return res.status(201).send({ success: true, data: newCartItem });
    } catch (error) {
        console.error('Error creating cart item:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.',error: error.message });
    }
}     

//get cart items by user id
const getCartItemsByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).send({ success: false, message: 'User ID is required.' });
        }
        const cartItems = await cartServices.getCartItemsByUserId(userId);
        if (!cartItems || cartItems.length === 0) {
            return res.status(200).send({ success: true, message: 'No cart items found for this user.', data: [] });
        }
        return res.status(200).send({ success: true,message:"Successfully retrieved cart items", data: cartItems });
    } catch (error) {
        console.error('Error getting cart items:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.', error: error.message });
    }
}

//delete a cart item
const deleteCartItem = async (req, res) => {
    try {
        const cartItemId = req.params.cartItemId;
        if (!cartItemId) {
            return res.status(400).send({ success: false, message: 'Cart item ID is required.' });
        }
        const deletedCartItem = await cartServices.deleteCartItem(cartItemId);
        if (!deletedCartItem) {
            return res.status(404).send({ success: false, message: 'Cart item not found.' });
        }
        return res.status(200).send({ success: true, message: 'Cart item deleted successfully.', data: deletedCartItem });
    } catch (error) {
        console.error('Error deleting cart item:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.', error: error.message });
    }
}

//delete all cart items of a user
const deleteCartItemsOnUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).send({ success: false, message: 'User ID is required.' });
        }
        const deletedCartItems = await cartServices.deleteCartItemsOnUserId(userId);
        if (!deletedCartItems || deletedCartItems.length === 0) {
            return res.status(404).send({ success: false, message: 'No cart items found for this user.' });
        }
        return res.status(200).send({ success: true, message: 'All cart items deleted successfully.', data: deletedCartItems });
    } catch (error) {
        console.error('Error deleting cart items:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.', error: error.message });
    }
}

//update the cart item
const updateCartItem = async (req, res) => {
    try {
        const { duration, quantity ,defaultDuration,price,defaulthours,number_hours_day} = req.body;
        const cartItemId = req.params.cartItemId;
        if (!duration || !quantity || !cartItemId || !price) {
            return res.status(400).send({ success: false, message: 'Duration, quantity,price and cart item ID are required.' });
        }
        let totalPrice;
        const totalHours = duration * (number_hours_day || 1);
        const baseHours = defaultDuration * (defaulthours || 1);
        if (totalHours <= baseHours) {
            totalPrice = quantity * price;
        } else {
            const multiplier = totalHours / baseHours;
            totalPrice = multiplier * quantity * price;
        }
       totalPrice = Number(totalPrice.toFixed(2));
        const updatedCartItem = await cartServices.updateCartItem(duration, quantity,totalPrice, cartItemId,number_hours_day);
        if (!updatedCartItem) {
            return res.status(404).send({ success: false, message: 'Cart item not found.' });
        }
        return res.status(200).send({ success: true, message: 'Cart item updated successfully.', data: updatedCartItem });
    } catch (error) {
        console.error('Error updating cart item:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.', error: error.message });
    }
}

const saveCartToDatabase = async (userId, cartItems) => {
  const result = await pool.query(
    cartQueries.INSERT_CART_DETAILS,
    [userId, JSON.stringify(cartItems)]
  );
  return result.rows[0].id;
};

const  generateLabImage = async (
  labName,
  imageName = 'base-image.jpg',
  options 
)=> {
   const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Load background or fallback gradient
  const imagePath = path.join(__dirname, imageName);
  if (fs.existsSync(imagePath)) {
    const background = await loadImage(imagePath);
    ctx.drawImage(background, 0, 0, 800, 600);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#003366');
    gradient.addColorStop(1, '#00BFFF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
  }

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  let y = 40;

  // Category (top-left)
  ctx.textAlign = 'left';
  ctx.font = '16px Arial';
  ctx.fillText(options.category, 30, y);

  // Org Name (centered)
  ctx.textAlign = 'center';
  y += 40;
  ctx.font = 'bold 20px Arial';
  ctx.fillText(options.orgName, 400, y);

  // Title (e.g., "singleVM Catalogue")
  y += 40;
  ctx.font = 'bold 28px Arial';
  ctx.fillText(options.title, 400, y);

  // Lab Name
  y += 50;
  ctx.font = 'bold 32px Arial';
  ctx.fillText(labName, 400, y);

  // Duration
  y += 40;
  ctx.font = '20px Arial';
  ctx.fillText(`Course Duration : ${options.duration}`, 400, y);

  // Yellow box with level
  y += 40;
  const levelText = `Course Level : ${options.level}`;
  ctx.font = '18px Arial';
  const boxWidth = ctx.measureText(levelText).width + 40;
  const boxHeight = 35;
  ctx.fillStyle = '#FFEB3B';
  ctx.fillRect(400 - boxWidth / 2, y, boxWidth, boxHeight);

  ctx.fillStyle = '#000';
  ctx.fillText(levelText, 400, y + 24);

  // "By" Line
  y += 70;
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`by ${options.by}`, 400, y);

  // Save Image
  const fileName = `${labName.replace(/\s+/g, '_')}.png`;
  const outputPath = path.join(__dirname, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return `https://1b2029cb858f.ngrok-free.app/generated/${fileName}`;
}

//create a stripe checkout for extension
// const extensionStripeCheckout = async(req,res)=>{
//   try {  
//     let {
//             purchased_id,
//             lab_id,
//             lab_title,
//             org_id,
//             org_name,
//             admin_id,
//             admin_name,
//             additional_days,
//             additional_users,reason,payment} = req.body;
      
//     const user = await getUsersData(admin_id);

//     const customer = await stripe.customers.create({
//       name: user.name,
//       email: user.email,
//     });
//   const generatedImageUrls = generateLabImage(lab_title, 'template.png',{
   
//     // category: item.category,
//     orgName: org_name,
//     duration:additional_days || 'Not specified',
//     // level: item.level,
//     // by: item.by,
  
//   })
//     const line_items = [ {
//       price_data: {
//         currency: payment.currency,
//         product_data: { name: lab_title,images:[generatedImageUrls] },
//         unit_amount: Math.round(parseFloat(payment.total) * 100),
//       },
//       quantity: 1,
//     }]
//     payment = JSON.stringify(payment);
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items,
//       mode: 'payment',
//       billing_address_collection: 'required',
//       phone_number_collection: { enabled: true },
//       consent_collection: {
//         terms_of_service: 'required',  // <-- this is required
//       },
//       custom_text: {
//         submit: { message: "Access Lab Now" },
//         terms_of_service_acceptance: {
//           message: "I agree to the Terms of Service"
//         }
//       },
//       success_url: `${process.env.FRONTEND_URL}/dashboard/my-purchases`,
//       cancel_url: `${process.env.FRONTEND_URL}`,
//       client_reference_id: admin_id, 
//       metadata: {
//         purchased_id,
//             lab_id,
//             lab_title,
//             org_id,
//             org_name,
//             admin_id,
//             admin_name,
//             additional_days,
//             additional_users,reason,
//             payment,
//             checkout_type:"EXTENSION_PURCHASE"
//       },
//       customer: customer.id,
//       allow_promotion_codes: true,
//       payment_intent_data: {
//         receipt_email: user.email,
//         metadata: {
//         purchased_id,
//             lab_id,
//             lab_title,
//             org_id,
//             org_name,
//             admin_id,
//             admin_name,
//             additional_days,
//             additional_users,reason,payment,
//             checkout_type:"EXTENSION_PURCHASE"
//       },
//       description: `Purchase of lab by user: ${user.name}`, 
//       }
//     });
//    return res.status(200).send({ success: true, sessionId: session.id });
//   } catch (error) {
//      console.error('Stripe checkout error:', error);
//     return res.status(500).send({ success: false, message: 'Internal server error.' });
//   }
// }
const extensionCashfreeCheckout = async (req, res) => {
  try {
    let {
      purchased_id,
      lab_id,
      lab_title,
      org_id,
      org_name,
      admin_id,
      admin_name,
      additional_days,
      additional_users,
      reason,
      payment,
    } = req.body;
    const user = await getUsersData(admin_id);

    //  Generate image (same as before)
    const generatedImageUrls = generateLabImage(
      lab_title,
      "template.png",
      {
        orgName: org_name,
        duration: additional_days || "Not specified",
      }
    );

    //  Unique order id
    const orderId = `order_${Date.now()}`;

    //  Convert payment to string (optional)
    const paymentString = JSON.stringify(payment);
    //  Create order payload
    const orderPayload = {
      order_id: orderId,
      order_amount: Number(payment.total.toFixed(2)),
      order_currency: payment.currency.toUpperCase(),

      customer_details: {
        customer_id: admin_id,
        customer_name: user?.name,
        customer_email: user?.email,
        customer_phone: user?.phone || "9999999999",
      },

      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/dashboard/my-purchases`,
      },

      //  IMPORTANT: must be map<string,string>
      order_tags: {
        purchased_id: String(purchased_id),
        lab_id: String(lab_id),
        lab_title: String(lab_title),
        org_id: String(org_id || ""),
        org_name: String(org_name || ""),
        admin_id: String(admin_id),
        admin_name: String(admin_name || ""),
        additional_days: String(additional_days || ""),
        additional_users: String(additional_users || ""),
        reason: String(reason || ""),
       total: String(Number(payment.total.toFixed(2))),
        checkout_type: "EXTENSION_PURCHASE",
      },
    };

    //  Call Cashfree API
   const response = await cashfree.PGCreateOrder(orderPayload);

    //  Return session id for frontend
    return res.status(200).send({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Cashfree checkout error:", error.response?.data || error);
    return res.status(500).send({
      success: false,
      message: "Cashfree order creation failed",
    });
  }
};

//subscription checkout
const subscriptionCheckout = async(req,res)=>{
  try {
    const {data}  = req.body;
    const { key,
        planName,
        planTier,
        billingCycle,
        monthly_price,
        annual_monthly_price,
        annual_discount,
        features,
        usage,
        user,
        planId,
        total} = data
        orderId = `plan_${Date.now()}`
    const planPayload = {
       order_id : orderId,
       order_amount : Number(data.total.toFixed(2)),
       order_currency:"INR",

       customer_details : {
        customer_id: data?.user.id,
        customer_name: data?.user?.name,
        customer_email: data?.user?.email,
        customer_phone: data?.user?.phone || "9999999999",
       },
       order_meta: {
        return_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
      },
     order_tags: {
      key: String(key),
      planName: String(planName),
      planTier: String(planTier),
      billingCycle: String(billingCycle),

      monthly_price: String(monthly_price),
      annual_monthly_price: String(annual_monthly_price),
      annual_discount: String(annual_discount),
      planId: String(planId),
      userId: String(user?.id), 
      orgId:String(user?.org_id),
      organization:String(user?.organization),  
      total: String(total),

      checkout_type: "PLAN_PURCHASE"
    }
    }

     //  Call Cashfree API
   const response = await cashfree.PGCreateOrder(planPayload);

    //  Return session id for frontend
    return res.status(200).send({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: planId,
    });
  } catch (error) { 
    console.log("Cashfree checkout error:",error.response?.data || error);
    return res.status(500).send({
      success: false,
      message: "Cashfree order creation failed",
    });
  }
}

// const stripeCheckout = async (req, res) => {
//   try {
//     const { userId, cartItems,org } = req.body;
//     if (!userId || !cartItems || cartItems.length === 0) {
//       return res.status(400).send({ success: false, message: 'User ID and cart items are required.' });
//     }
//     const cookies = cookie.parse(req.headers.cookie || '');
//     const sessionToken = cookies.session_token;
//     const user = await getUserData(userId,sessionToken);
//     // Save cart and get cart_id
//     const cartId = await saveCartToDatabase(userId, cartItems);
//     const generatedImageUrls = await Promise.all(
//     cartItems.map(item => generateLabImage(item.name, 'template.png',{
   
//     category: item.category,
//     orgName: 'CorpAcademia iTechnovations',
//     duration:item.duration || 'Not specified',
//     level: item.level,
//     by: item.by,
  
//   }))
// );
//     const line_items = cartItems.map((item,index) => ({
//       price_data: {
//         currency: item.currency?.toLowerCase(),
//         product_data: { name: item.name,images:[generatedImageUrls[index]] },
//         unit_amount: Math.round(parseFloat(item.price) * 100),
//       },
//       quantity: 1,
//     }));
    
//     const customer = await stripe.customers.create({
//       name: user.name,
//       email: user.email,
//     });
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items,
//       mode: 'payment',
//       billing_address_collection: 'required',
//       phone_number_collection: { enabled: true },
//       consent_collection: {
//         terms_of_service: 'required',  // <-- this is required
//       },
//       custom_text: {
//         submit: { message: "Access Lab Now" },
//         terms_of_service_acceptance: {
//           message: "I agree to the Terms of Service"
//         }
//       },
//       success_url: `${process.env.FRONTEND_URL}/dashboard/${org ? "my-purchases" : "my-labs"}`,
//       cancel_url: `${process.env.FRONTEND_URL}`,
//       client_reference_id: userId, 
//       metadata: {
//         user_id: userId,
//         cart_id: cartId.toString() ,
//         org,
//         checkout_type:"LAB_PURCHASE"
//       },
//       customer: customer.id,
//       allow_promotion_codes: true,
//       payment_intent_data: {
//         receipt_email: user.email,
//         metadata: {
//         user_id: userId,
//         cart_id: cartId.toString(),
//         org,
//         checkout_type:"LAB_PURCHASE"
//       },
//       description: `Purchase of ${cartItems.length} ${cartItems.length > 1 ? 'labs ' :'lab '}by user: ${user.name}`, 
//   }
//     });
//     return res.status(200).send({ success: true, sessionId: session.id });
//   } catch (error) {
//     console.error('Stripe checkout error:', error);
//     return res.status(500).send({ success: false, message: 'Internal server error.' });
//   }
// };
//insert payment details and assign the lab to user

//cashfree checkout page
const cashfreeCheckout = async (req, res) => {
  try {
    const { userId, cartItems, org } = req.body;

    if (!userId || !cartItems || cartItems.length === 0) {
      return res.status(400).send({
        success: false,
        message: "User ID and cart items are required",
      });
    }

    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionToken = cookies.session_token;

    const user = await getUserData(userId, sessionToken);

    // For any cart item whose `type` is missing/undefined, look it up from
    // proxmoxcluster_lab. This happens because proxmox-cluster labs are not in
    // getAllLabCatalogues so proceedToCheckout sets type=undefined for them.
    // All other lab types already have type set by the standard catalogue lookup.
    for (const item of cartItems) {
      if (!item.type && item.lab_id) {
        const pxRes = await pool.query(
          `SELECT 'proxmox-cluster' AS type FROM proxmoxcluster_lab WHERE labid = $1 LIMIT 1`,
          [item.lab_id]
        );
        if (pxRes.rows.length) {
          item.type = 'proxmox-cluster';
        }
      }
    }

    const cartId = await saveCartToDatabase(userId, cartItems);


    const totalAmount = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.totalAmount),
      0
    );

    const orderId = `order_${Date.now()}`;

    const request = {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: "INR",

      customer_details: {
        customer_id: userId,
        customer_name: user?.name,
        customer_email: user?.email,
        customer_phone: user?.phone || "9999999999",
      },

      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/dashboard/${
          org ? "my-purchases" : "my-labs"
        }`,
      },
    order_tags: {
      user_id: userId,
      cart_id: cartId,
      org: org.toString(),
      checkout_type: "LAB_PURCHASE"
    }
    };
    console.log(request)
    //FIXED LINE
    const response = await cashfree.PGCreateOrder(request);

    return res.status(200).send({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });

  } catch (error) {
    console.error("Cashfree checkout error:", error);
    return res.status(500).send({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

//template creation in other account
const templateCheckout = async (req, res) => {
  try {
    const { userId, orgId, seats,cartItems, org,targetCredentialId,sourceCredentialId } = req.body;
    if (!userId || !cartItems || cartItems.length === 0) {
      return res.status(400).send({
        success: false,
        message: "User ID and cart items are required",
      });
    }

    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionToken = cookies.session_token;

    const user = await getUserData(userId, sessionToken);
    
    const totalAmount = cartItems.price;

    const orderId = `order_${Date.now()}`;

    const request = {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: "INR",

      customer_details: {
        customer_id: userId,
        customer_name: user?.name,
        customer_email: user?.email,
        customer_phone: user?.phone || "9999999999",
      },

      order_meta: {
      return_url: `${process.env.FRONTEND_URL}/dashboard/labs/${cartItems?.proxmoxType === 'singlevm-proxmox' ? 'cloud-vms' : (cartItems?.type === 'cloudslice-template') ? 'cloud-slices' : 'cluster' }`,
    },
      order_tags: {
      user_id: String(userId),
      labId: String(cartItems?.lab_id || ""),
      orgId: String(orgId || ""),
      node: String(cartItems?.node || ""),
      vmid: String(cartItems?.vmId || ""),
      org: String(org || ""),
      total: String(totalAmount || 0),
      type:String(cartItems?.proxmoxType || cartItems?.type ||""),

      id: String(orderId || ""),
      sourceCredentialId:String(sourceCredentialId || ""),
      targetCredentialId:String(targetCredentialId || ""),
      seats:String(seats || 0),
      checkout_type: "TEMPLATE_CREATION"
    }
    };
    console.log(request)
    //FIXED LINE
    const response = await cashfree.PGCreateOrder(request);

    return res.status(200).send({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });

  } catch (error) {
    console.error("Cashfree checkout error:", error);
    return res.status(500).send({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// const insertPaymentAndAssignLab = async (session) => {
  
//     const userId = session.metadata.user_id;
//     const cartId = session.metadata.cart_id;
//     const org = session.metadata.org === 'true';
//     const user = await getUsersData(userId);
//     try {
//       await pool.query('BEGIN');
//       // Get original cart items from DB
//       const cartResult = await pool.query(cartQueries.GET_CART_DATA, [cartId]);
//       const cartItems = cartResult.rows[0].cart_data;

//       for (const item of cartItems) {
//         const {  lab_id, quantity,duration,type,user_id ,name,price,creds_id,hoursPerDay} = item;
       
//         const deleteCart = await pool.query(cartQueries.DELETE_CARTS,[lab_id,userId]);
//         const insertPayment = await pool.query(cartQueries.INSERT_PAYMENT, [
//           userId,
//           session.id,
//           session.payment_intent,
//           price,
//           session.currency,
//           session.payment_status,
//           session.customer_details.email,
//           lab_id,
//           duration,
//           org ? user?.org_id : null
//         ]);
        
//         const userSettings = await pool.query(labQueries.GET_USER_NOTIFICATION_SETTINGS, [user_id]);
//               if (userSettings.rowCount > 0) {
//               const settings = userSettings.rows[0];
//               if (!settings.inappnotifications.includes('payment_received')) continue;
//         const insertNotification = await pool.query(labQueries.INSERT_NOTIFICATION,['payment_received','Payment Recieved',`Payment recieved ${session.currency}:${price} from ${session.customer_details.email}`,'medium',user_id,null]);
//         if(insertNotification.rows.length > 0){
//           const labNotification =  await pool.query(labQueries.INSERT_LAB_NOTIFICATION,[lab_id,'payment_recieved',null,insertNotification.rows[0].id]);
          
//           sendNotification({
//             userId: user_id,
//             notification: insertNotification.rows[0]
//           });
//         }
//       }
//         const paymentId = insertPayment.rows[0].id;
//         let insertLab;
//         if(org && user?.org_id){
//           insertLab = await pool.query(cartQueries.CREATE_SINGLEAWS_LAB_PURCHASE,[
//               lab_id,user?.id,user?.org_id,user?.organization,user_id,duration,quantity,duration,'active',paymentId,name,type
//             ])
//         }
//         if(type === 'cloudslice'){
//           if(org){
//             if(insertLab.rowCount > 0){
//                assignLab = await pool.query(purchaseQueries.INSERT_ORG_ASSIGNMENT,[
//               lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab?.rows[0]?.purchased_id
//              ])
//             }
//           }
//           else{
//             insertLab = await pool.query(cartQueries.INSERT_ASSINGLAB_CLOUDSLICE_AWS, [
//           lab_id,
//           userId,
//           duration,
//           paymentId,
//         ]);
//           }
        
//         const addEnrolled = await pool.query(cartQueries.INSERT_CLOUDSLICE_AWS_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
       
//         await sendLabNotification({
//           user_id,
//           lab_id,
//           type:"lab_assigned",
//           title:"Lab Assigned",
//           message:`${name} lab Assigned to ${user.name}`,
//           severity:"medium"
//         })
        
//         }
//         else if(type === 'singlevm-aws'){
//           if(org){
//               if(insertLab.rowCount > 0){
//               assignLab = await pool.query(purchaseQueries.INSERT_LAB_BATCH,[lab_id,user?.id,user?.org_id,user_id,duration,true,insertLab.rows[0].purchased_id]);
//             }
//           }
//           else{
//             insertLab = await pool.query(cartQueries.INSERT_ASSIGNLAB_SINGLEVM_AWS, [
//           lab_id,
//           userId,
//           paymentId,
//           duration,
//           hoursPerDay
//           ]);
//           }
          
//         const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_AWS_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
//           await sendLabNotification({
//           user_id,
//           lab_id,
//           type:"lab_assigned",
//           title:"Lab Assigned",
//           message:`${name} lab Assigned to ${user.name}`,
//           severity:"medium"
//         })
//         }
//         else if (type === 'singlevm-proxmox'){
//           const vmName = user.name.replace(' ','-');
//           if(org){
//             assignLab = await pool.query(purchaseQueries.INSERT_SINGLEVMPROXMOX_ORG_ASSIGNMENT,[lab_id,user?.org_id,duration,user_id,user?.id,vmName,true,insertLab.rows[0].purchased_id]);
//           }
//           else{
//              insertLab = await pool.query(cartQueries.INSERT_ASSINGLAB_SINGLEVM_PROXMOX_PURCHASED, [
//           lab_id,
//           userId,
//           duration,
//           paymentId,
//           vmName,
//           hoursPerDay
//         ]);
//           }
           
//         const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_PROXMOX_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
//          await sendLabNotification({
//           user_id,
//           lab_id,
//           type:"lab_assigned",
//           title:"Lab Assigned",
//           message:`${name} lab Assigned to ${user.name}`,
//           severity:"medium"
//         })
//         }
//         else if(type === 'singlevmdatacenter'){
//            if(org && user?.org_id){
//               const assignCreds = await pool.query(labQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_LAB,[user?.org_id,lab_id,quantity]);
//               assignLab = await pool.query(labQueries.INSERT_DATACENTER_VM_ORGASSIGNMENT_PURCHASED,[lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab.rows[0].purchased_id]);
//            }
//            else{
//             const assignCreds = await pool.query(labQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER,[user?.id,lab_id]);
//             if(!assignCreds.rows.length > 0) throw new Error("Error in assigning credentials")
//             insertLab = await pool.query(labCartQueries.CREATE_SINGLEVM_DATACENTER_PURCHASE,[lab_id,user?.id,user_id,assignCreds.rows[0].id,paymentId,duration,hoursPerDay]);
//            }
//             const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_DATACENTER_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
//          await sendLabNotification({
//           user_id,
//           lab_id,
//           type:"lab_assigned",
//           title:"Lab Assigned",
//           message:`${name} lab Assigned to ${user.name}`,
//           severity:"medium"
//         })
//         }
//         else if(type === 'vmclusterdatacenter'){
//           if(org && user?.org_id){
//              const assignCreds = await pool.query(labQueries.UPDATE_USER_GROUP_CREDS_TO_PURCHASED_LAB,[user?.org_id,lab_id,quantity,user_id]);
//              assingLab = await pool.query(labQueries.INSERT_VMCLUSTER_DATACENTER_PURCHASED_ORG_ASSIGNMENT,[lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab.rows[0].purchased_id]);
//           }
//           else{
//             const assignCreds = await pool.query(labQueries.UPDATE_USER_GROUP_CREDS_TO_RANDOM_USER,[user?.id,lab_id]);
//              if(!assignCreds.rows.length > 0) throw new Error("Error in assigning credentials")
//             insertLab = await pool.query(labQueries.INSERT_INTO_PURCHASED_USERASSIGNMENT,[lab_id,user?.id,user_id,duration,assignCreds.rows[0].id,true,paymentId])
//           }
//           const addEnrolled = await pool.query(cartQueries.INSERT_VMCLUSTER_DATACENTER_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
//          await sendLabNotification({
//           user_id,
//           lab_id,
//           type:"lab_assigned",
//           title:"Lab Assigned",
//           message:`${name} lab Assigned to ${user.name}`,
//           severity:"medium"
//         })
//         }
//       }

//       await pool.query("COMMIT");
//     } catch (err) {
//       await pool.query("ROLLBACK")
//       console.error('Webhook processing error:', err);
//     }
    
// };

const insertPaymentAndAssignLab = async (paymentData) => {
  //  Only process successful payments
  if (paymentData.payment.payment_status !== "SUCCESS") {
    console.log("Ignoring non-success payment:", paymentData.payment.payment_status);
    return;
  }

  //  Extract metadata (make sure you pass this while creating order)
  const meta = paymentData.order.order_tags || {};

  const userId = meta.user_id;
  const cartId = meta.cart_id;
  const org = meta.org === "true";
  console.log("paymentData:",paymentData)
  if (!userId || !cartId) {
    console.error("Missing metadata in payment:", meta);
    return;
  }

  const user = await getUsersData(userId);

  try {
    await pool.query("BEGIN");

    // Get cart items
    const cartResult = await pool.query(cartQueries.GET_CART_DATA, [cartId]);
    const cartItems = cartResult.rows[0]?.cart_data || [];
    for (const item of cartItems) {
      const {
        lab_id,
        quantity,
        duration,
        type,
        user_id,
        name,
        price,
        hoursPerDay,
      } = item;

      //  Remove cart item
      await pool.query(cartQueries.DELETE_CARTS, [lab_id, userId]);

      //  Insert payment (Cashfree fields)
      const insertPayment = await pool.query(cartQueries.INSERT_PAYMENT, [
        userId,
        paymentData.order.order_id,
        paymentData.payment.cf_payment_id,
        price,
        paymentData.payment.payment_currency,
        paymentData.payment.payment_status,
        paymentData.customer_details?.customer_email || paymentData.customer_details?.email,
        lab_id,
        duration,
        org ? user?.org_id : null,
      ]);

      //  Notifications
      const userSettings = await pool.query(
        labQueries.GET_USER_NOTIFICATION_SETTINGS,
        [user_id]
      );

      if (userSettings.rowCount > 0) {
        const settings = userSettings.rows[0];

        if (settings.inappnotifications.includes("payment_received")) {
          const insertNotification = await pool.query(
            labQueries.INSERT_NOTIFICATION,
            [
              "payment_received",
              "Payment Received",
              `Payment received ${paymentData.payment.payment_currency}:${price} from ${
                paymentData.customer_details?.customer_email ||
                paymentData.customer_details?.email
              }`,
              "medium",
              user_id,
              null,
            ]
          );

          if (insertNotification.rows.length > 0) {
            await pool.query(labQueries.INSERT_LAB_NOTIFICATION, [
              lab_id,
              "payment_received",
              null,
              insertNotification.rows[0].id,
            ]);

            sendNotification({
              userId: user_id,
              notification: insertNotification.rows[0],
            });
          }
        }
      }

      const paymentId = insertPayment.rows[0].id;
      let insertLab;
      let assignLab;

        if(org && user?.org_id){
          insertLab = await pool.query(cartQueries.CREATE_SINGLEAWS_LAB_PURCHASE,[
              lab_id,user?.id,user?.org_id,user?.organization,user_id,duration,quantity,duration,'active',paymentId,name,type
            ]);
            await pool.query(cartQueries.UPDATE_CATALOGUES_PLAN,[1,user?.org_id,'active'])
        }
        if(type === 'cloudslice'){
          if(org){
            if(insertLab.rowCount > 0){
               assignLab = await pool.query(purchaseQueries.INSERT_ORG_ASSIGNMENT,[
              lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab?.rows[0]?.purchased_id
             ])
            }
          }
          else{
            insertLab = await pool.query(cartQueries.INSERT_ASSINGLAB_CLOUDSLICE_AWS, [
          lab_id,
          userId,
          duration,
          paymentId,
        ]);
          }
        const addEnrolled = await pool.query(cartQueries.INSERT_CLOUDSLICE_AWS_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
       
        await sendLabNotification({
          user_id,
          lab_id,
          type:"lab_assigned",
          title:"Lab Assigned",
          message:`${name} lab Assigned to ${user.name}`,
          severity:"medium"
        })
        
        }
        else if(type === 'singlevm-aws'){
          if(org){
              if(insertLab.rowCount > 0){
              assignLab = await pool.query(purchaseQueries.INSERT_LAB_BATCH,[lab_id,user?.id,user?.org_id,user_id,duration,true,insertLab.rows[0].purchased_id]);
            }
          }
          else{
            insertLab = await pool.query(cartQueries.INSERT_ASSIGNLAB_SINGLEVM_AWS, [
          lab_id,
          userId,
          paymentId,
          duration,
          hoursPerDay
          ]);
          }
          
        const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_AWS_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
          await sendLabNotification({
          user_id,
          lab_id,
          type:"lab_assigned",
          title:"Lab Assigned",
          message:`${name} lab Assigned to ${user.name}`,
          severity:"medium"
        })
        }
        else if (type === 'singlevm-proxmox'){
          const vmName = user.name.replace(' ','-');
          if(org){
            assignLab = await pool.query(purchaseQueries.INSERT_SINGLEVMPROXMOX_ORG_ASSIGNMENT,[lab_id,user?.org_id,duration,user_id,user?.id,vmName,true,insertLab.rows[0].purchased_id]);
          }
          else{
             insertLab = await pool.query(cartQueries.INSERT_ASSINGLAB_SINGLEVM_PROXMOX_PURCHASED, [
          lab_id,
          userId,
          duration,
          paymentId,
          vmName,
          hoursPerDay
        ]);
          }
           
        const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_PROXMOX_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
         await sendLabNotification({
          user_id,
          lab_id,
          type:"lab_assigned",
          title:"Lab Assigned",
          message:`${name} lab Assigned to ${user.name}`,
          severity:"medium"
        })
        }
        else if(type === 'singlevmdatacenter'){
           if(org && user?.org_id){
              const assignCreds = await pool.query(labQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_LAB,[user?.org_id,lab_id,quantity]);
              assignLab = await pool.query(labQueries.INSERT_DATACENTER_VM_ORGASSIGNMENT_PURCHASED,[lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab.rows[0].purchased_id]);
           }
           else{
            const assignCreds = await pool.query(labQueries.UPDATE_SINGLEVM_DATACENTER_CREDS_ASSIGNMENT_FOR_RANDOM_USER,[user?.id,lab_id]);
            if(!assignCreds.rows.length > 0) throw new Error("Error in assigning credentials")
            insertLab = await pool.query(labCartQueries.CREATE_SINGLEVM_DATACENTER_PURCHASE,[lab_id,user?.id,user_id,assignCreds.rows[0].id,paymentId,duration,hoursPerDay]);
           }
            const addEnrolled = await pool.query(cartQueries.INSERT_SINGLEVM_DATACENTER_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
         await sendLabNotification({
          user_id,
          lab_id,
          type:"lab_assigned",
          title:"Lab Assigned",
          message:`${name} lab Assigned to ${user.name}`,
          severity:"medium"
        })
        }
        else if(type === 'vmclusterdatacenter'){
          if(org && user?.org_id){
             const assignCreds = await pool.query(labQueries.UPDATE_USER_GROUP_CREDS_TO_PURCHASED_LAB,[user?.org_id,lab_id,quantity,user_id]);
             assingLab = await pool.query(labQueries.INSERT_VMCLUSTER_DATACENTER_PURCHASED_ORG_ASSIGNMENT,[lab_id,user?.org_id,user?.id,user_id,duration,true,insertLab.rows[0].purchased_id]);
          }
          else{
            const assignCreds = await pool.query(labQueries.UPDATE_USER_GROUP_CREDS_TO_RANDOM_USER,[user?.id,lab_id]);
             if(!assignCreds.rows.length > 0) throw new Error("Error in assigning credentials")
            insertLab = await pool.query(labQueries.INSERT_INTO_PURCHASED_USERASSIGNMENT,[lab_id,user?.id,user_id,duration,assignCreds.rows[0].id,true,paymentId])
          }
          const addEnrolled = await pool.query(cartQueries.INSERT_VMCLUSTER_DATACENTER_PURCHASED_LAB_ENROLLMENTS,[1,lab_id])
         await sendLabNotification({
          user_id,
          lab_id,
          type:"lab_assigned",
          title:"Lab Assigned",
          message:`${name} lab Assigned to ${user.name}`,
          severity:"medium"
        })
        }
        else if(type === 'proxmox-cluster'){
          // Proxmox Cluster lab purchase — create org assignment.
          // We use user?.org_id directly (not the org flag) so that both
          // orgsuperadmin (org=true) AND labadmin (org=false but has org_id) work.
          const orgIdToUse = (org && user?.org_id);

          if(orgIdToUse){
            // Get purchased_id from insertLab if available (org flag was true)
            const purchasedId = insertLab?.rows?.[0]?.purchased_id || null;

            // Check if org assignment already exists (avoid duplicate key error)
            const existingAssign = await pool.query(
              `SELECT id FROM proxmoxcluster_org_assignment WHERE labid=$1 AND orgid=$2 LIMIT 1`,
              [lab_id, orgIdToUse]
            );

            if(!existingAssign.rows.length){
              assignLab = await pool.query(
                `INSERT INTO proxmoxcluster_org_assignment
                   (labid, orgid, assigned_by, status, purchased, purchased_id, startdate, enddate)
                 VALUES ($1, $2, $3, 'available', true, $4,
                         NOW(), NOW() + ($5 * INTERVAL '1 day'))
                 RETURNING *`,
                [lab_id, orgIdToUse, user?.id, purchasedId, Number(duration) || 30]
              );
              console.log(`[proxmoxCluster] org assignment created for lab=${lab_id} org=${orgIdToUse}`);
            } else {
              console.log(`[proxmoxCluster] org assignment already exists for lab=${lab_id} org=${orgIdToUse}`);
            }
          }
          else{
            const assignLab = await pool.query(cartQueries.INSERT_ASSIGNLAB_PROXMOX_CLUSTER_PURCHASED,[lab_id,user?.id,Number(duration),hoursPerDay,paymentId]);
            const vmConfigsRes = await pool.query(cartQueries.GET_VM_CONFIGS_BY_LAB, [lab_id]);
          if (!vmConfigsRes.rows.length) {
              return res.status(404).json({ success: false, message: 'No VM configurations found for this lab' });
          }
          const vmConfigs = vmConfigsRes.rows;
          for (const vmConfig of vmConfigs) {
                              await pool.query(cartQueries.INSERT_USER_VM, [
                                  assignLab.rows[0].id,
                                  lab_id,
                                  user?.id,
                                  vmConfig.id,
                                  vmConfig.vm_label,
                                  null,   // proxmox_vmid — filled at launch time
                                  null,   // vmname      — filled at launch time
                                  vmConfig.node,
                                  vmConfig.protocol,
                                  vmConfig.username,
                                  vmConfig.password
                              ]);
                          }
          }
          // Only increment remaining if the lab has a defined seat limit (not unlimited = -1)
          await pool.query(
            `UPDATE proxmoxcluster_lab
             SET remaining = remaining + $1
             WHERE labid = $2 AND remaining <> -1`,
            [quantity, lab_id]
          );
          await pool.query(`
            UPDATE proxmoxcluster_lab
            SET total_enrollments = total_enrollments + $1
            WHERE labid = $2`,
            [quantity,lab_id]
            )

          await sendLabNotification({
            user_id,
            lab_id,
            type:  'lab_assigned',
            title: 'Lab Assigned',
            message: `${name} lab assigned to ${user?.name || user_id}`,
            severity: 'medium'
          });
        }
      }

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Cashfree webhook processing error:", err);
  }
};

// const handleStripeWebhook = async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }
//   if (event.type !== 'checkout.session.completed') {
//     return res.status(200).json({ received: true });
//   }

//   const session = event.data.object;
//   const type = session.metadata.checkout_type;

//   try {
//     await pool.query("BEGIN");
//     if (type === "LAB_PURCHASE") {
//       await insertPaymentAndAssignLab(session);
//     }
//     else if (type === "EXTENSION_PURCHASE") {
//       await createTheExtensionRequest(session);
//     }

//     await pool.query("COMMIT");

//     return res.status(200).json({ success: true });

//   } catch (error) {
//     await pool.query("ROLLBACK");
//     return res.status(500).json({ error: error.message });
//   }
// };
//get the transaction details



const handleCashfreeWebhook = async (req, res) => {
  try {
   
    //  Cashfree headers
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    //  IMPORTANT: raw body required (use express.raw for this route)
    const rawBody = req.body;

    //  Create expected signature
    const signedPayload = timestamp + rawBody;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
      .update(signedPayload)
      .digest("base64");

    //  Reject if signature mismatch
    if (signature !== expectedSignature) {
      return res.status(400).send("Invalid signature");
    }

    //  Parse JSON AFTER verification
    const event = JSON.parse(rawBody);

    // Cashfree event structure
    const paymentData = event.data;
     if (paymentData?.refund) {
      const refund = paymentData.refund;
      await pool.query(labCartQueries.UPDATE_PAYMENT_REFUND,[refund.refund_amount,refund.refund_status,refund.refund_id,refund.order_id]);
    }
    //  Only process SUCCESS payments
    if (paymentData.payment?.payment_status !== "SUCCESS") {
      return res.status(200).json({ received: true });
    }
    
    //  Get metadata (same as Stripe metadata)
    const meta = paymentData.order.order_tags || {};
    const type = meta.checkout_type;
    const labType = meta.type;
    await pool.query("BEGIN");

    if (type === "LAB_PURCHASE") {
      await insertPaymentAndAssignLab(paymentData);
    } else if (type === "EXTENSION_PURCHASE") {
      await createTheExtensionRequest(paymentData);
    }
    else if(type === "PLAN_PURCHASE"){
      await subscriptionPurchase(paymentData);
    }
    else if(type === "TEMPLATE_CREATION"){
        if(labType === 'cloudslice-template' ){
            await createTemplateInCloudSliceAccountAws(paymentData)
        }
        else{
        await createTemplateInProxmoxAccount(paymentData)
      }
    }

    await pool.query("COMMIT");

    return res.status(200).json({ success: true });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Cashfree webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// const getTransactionDetails = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       status,
//       search,
//       start_date,
//       end_date,
//     } = req.query;

//     const stripeLimit = parseInt(limit, 10);
//     let allPaymentIntents = [];
//     let hasMore = true;
//     let startingAfter = null;

//     while (hasMore) {
//     const params = {
//       limit: 100,
//       expand: ['data.customer'],
//     };

//     if (startingAfter) {
//       params.starting_after = startingAfter; 
//     }

//     const response = await stripe.paymentIntents.list(params);

//     allPaymentIntents = allPaymentIntents.concat(response.data);
//     hasMore = response.has_more;

//     if (hasMore) {
//       startingAfter = response.data[response.data.length - 1].id;
//     }
//     }
//     // Apply filters
//     let filteredIntents = allPaymentIntents;

//     if (status) {
//       filteredIntents = filteredIntents.filter(pi => pi.status === status);
//     }

//     if (search) {
//       filteredIntents = filteredIntents.filter(pi => {
//         const customerName = typeof pi.customer === "object" ? pi.customer?.name : "";
//         const customerEmail = typeof pi.customer === "object" ? pi.customer?.email : "";
//         return (
//           pi.id.includes(search) ||
//           customerName?.toLowerCase().includes(search.toLowerCase()) ||
//           customerEmail?.toLowerCase().includes(search.toLowerCase())
//         );
//       });
//     }

//     if (start_date && end_date) {
//       const start = new Date(start_date).getTime() / 1000;
//       const end = new Date(end_date).getTime() / 1000;
//       filteredIntents = filteredIntents.filter(pi => pi.created >= start && pi.created <= end);
//     }

//     // Manual pagination
//     const startIndex = (page - 1) * stripeLimit;
//     const endIndex = startIndex + stripeLimit;
//     const paginatedIntents = filteredIntents.slice(startIndex, endIndex);

//     // Map to response
//       const transactions = await Promise.all(
//         paginatedIntents.map(async (pi) => {
//           let charge = null;
//           let refunds = [];

//           if (pi.latest_charge) {
//             charge = await stripe.charges.retrieve(pi.latest_charge, {
//               expand: ['refunds'],
//             });
//             refunds = charge.refunds?.data || [];
//           }

//           // Determine transaction status
//           let transactionStatus = pi.status; // default = payment intent status
//           if (refunds.length > 0) {
//             // Look at the latest refund only
//             const latestRefund = refunds[refunds.length - 1];
//             transactionStatus = latestRefund.status === "succeeded" ? "refunded" : latestRefund.status;
//           }
//            // Handle failed payments
//           if (charge && charge.status === "failed") {
//             transactionStatus = "failed";
//           }
//           return {
//             id: pi.id,
//             customer_name: typeof pi.customer === "object" ? pi.customer?.name : null,
//             customer_email: typeof pi.customer === "object" ? pi.customer?.email : null,
//             amount: pi.amount_received,
//             currency: pi.currency.toUpperCase(),
//             status: transactionStatus, // 👈 fixed
//             created: new Date(pi.created * 1000).toLocaleString(),
//             payment_method: pi.payment_method,
//             receipt_url: charge?.receipt_url || null,
//             refund_details: refunds.map(r => ({
//               refund_id: r.id,
//               amount: r.amount,
//               status: r.status,
//               created: new Date(r.created * 1000).toLocaleString(),
//             })),
//           };
//         })
//       );

//     // Pagination metadata
//     const pagination = {
//       currentPage: parseInt(page, 10),
//       totalPages: Math.ceil(filteredIntents.length / stripeLimit),
//       totalItems: filteredIntents.length,
//       itemsPerPage: stripeLimit,
//     };

//     return res.status(200).send({
//       success: true,
//       message: 'Transaction details retrieved successfully.',
//       data: transactions,
//       pagination,
//     });
//   } catch (error) {
//     console.error('Error getting transaction details:', error);
//     return res.status(500).send({
//       success: false,
//       message: 'Internal server error.',
//       error: error.message,
//     });
//   }
// };
const getTransactionDetails = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      start_date,
      end_date,
      orgId
    } = req.query;
    console.log("Orgid:",orgId)
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM payments WHERE 1=1`;
    const values = [];
  if (orgId !== "undefined") {
   values.push(orgId.trim());
    query += ` AND org_id = $${values.length}`;
  }

    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    if (search) {
      values.push(`%${search}%`);
      query += ` AND (
        id::text ILIKE $${values.length} OR
        email ILIKE $${values.length}
      )`;
    }

    if (start_date && end_date) {
      values.push(start_date, end_date);
      query += ` AND created_at BETWEEN $${values.length - 1} AND $${values.length}`;
    }
    const countResult = await pool.query(query,values);
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(Number(limit), offset);
    const result = await pool.query(query, values);
    
    // Count query
    // const countResult = await pool.query(
    //   `SELECT COUNT(*) FROM payments`
    // );

    return res.status(200).send({
      success: true,
      data:  result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows.length / limit),
        totalItems: parseInt(countResult.rows.length),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: error.message });
  }
};

const exportTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, start_date, end_date } = req.query;

    const skip = (page - 1) * limit;

    // Build Stripe params (only supported ones)
    let params = { limit: 100 }; // fetch more so filtering works
    if (start_date && end_date) {
      params.created = {
        gte: Math.floor(new Date(start_date).getTime() / 1000),
        lte: Math.floor(new Date(end_date).getTime() / 1000),
      };
    }

    const paymentIntents = await stripe.paymentIntents.list(params);

    // Transform
    let transactions = await Promise.all(
      paymentIntents.data.map(async (pi) => {
        const charge = pi.latest_charge
          ? await stripe.charges.retrieve(pi.latest_charge)
          : null;

        return {
          id: pi.id,
          customer: typeof pi.customer === "object" ? pi.customer?.name : pi.customer,
          amount: (pi.amount_received / 100).toFixed(2),
          currency: pi.currency.toUpperCase(),
          status: pi.status,
          created: new Date(pi.created * 1000).toLocaleString(),
          receipt_url: charge?.receipt_url || "-",
        };
      })
    );

    // Apply backend filters
    if (status) {
      transactions = transactions.filter((t) => t.status === status);
    }
    if (search) {
      transactions = transactions.filter(
        (t) =>
          (t.customer && t.customer.toLowerCase().includes(search.toLowerCase())) ||
          t.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Manual pagination
    const paginated = transactions.slice(skip, skip + parseInt(limit));

    // Generate PDF
    const doc = new jsPDF();
    doc.text(`Transactions Report (Page ${page})`, 14, 15);

    autoTable(doc, {
      startY: 25,
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
      head: [["ID", "Customer", "Amount", "Currency", "Status", "Created", "Receipt"]],
      body: paginated.map((t) => [
        t.id,
        t.customer || "-",
        t.amount,
        t.currency,
        t.status,
        t.created,
        "", // empty, link added below
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 73, 94] },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const url = paginated[data.row.index].receipt_url;
          if (url && url !== "-") {
            doc.setTextColor(0, 0, 255);
            doc.textWithLink("View Receipt", data.cell.x + 2, data.cell.y + 6, { url });
            doc.setTextColor(0, 0, 0);
          }
        }
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Export transactions error:", error);
    res.status(500).json({ error: "Failed to export transactions" });
  }
};
// const userTransactions = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       status,
//       search,
//       start_date,
//       end_date,
//     } = req.query;
//     const userId = req.params.userId;
//     if (!userId) {
//       return res.status(400).json({ error: "User ID is required" });
//     }
//     const stripeLimit = parseInt(limit, 10);

//     // Fetch all PaymentIntents
//     let allPaymentIntents = [];
//     let hasMore = true;
//     let startingAfter = null;

//     while (hasMore) {
//     const params = {
//       limit: 100,
//       expand: ['data.customer'],
//     };

//     if (startingAfter) {
//       params.starting_after = startingAfter; 
//     }

//     const response = await stripe.paymentIntents.list(params);

//     allPaymentIntents = allPaymentIntents.concat(response.data);
//     hasMore = response.has_more;

//     if (hasMore) {
//       startingAfter = response.data[response.data.length - 1].id;
//     }
//     }
//     // Filter by userId in metadata
//     let filteredIntents = allPaymentIntents.filter(
//       (pi) => pi.metadata?.user_id === userId
//     );
//     // Extra filters
//     if (status) {
//       filteredIntents = filteredIntents.filter((pi) => pi.status === status);
//     }

//     if (search) {
//       filteredIntents = filteredIntents.filter((pi) => {
//         const customerName =
//           typeof pi.customer === "object" ? pi.customer?.name : "";
//         const customerEmail =
//           typeof pi.customer === "object" ? pi.customer?.email : "";
//         return (
//           pi.id.includes(search) ||
//           customerName?.toLowerCase().includes(search.toLowerCase()) ||
//           customerEmail?.toLowerCase().includes(search.toLowerCase())
//         );
//       });
//     }

//     if (start_date && end_date) {
//       const start = new Date(start_date).getTime() / 1000;
//       const end = new Date(end_date).getTime() / 1000;
//       filteredIntents = filteredIntents.filter(
//         (pi) => pi.created >= start && pi.created <= end
//       );
//     }

//     // Manual pagination
//     const startIndex = (page - 1) * stripeLimit;
//     const endIndex = startIndex + stripeLimit;
//     const paginatedIntents = filteredIntents.slice(startIndex, endIndex);

//     // Build transactions with product details
//     const transactions = await Promise.all(
//       paginatedIntents.map(async (pi) => {
//         const charge = pi.latest_charge
//           ? await stripe.charges.retrieve(pi.latest_charge,{ expand: ['refunds'] })
//           : null;
//         //get the refund details
//         const refunds = charge?.refunds?.data || [];
//         let transactionStatus = pi.status; // default = payment intent status
//           if (refunds.length > 0) {
//             // Look at the latest refund only
//             const latestRefund = refunds[refunds.length - 1];
//             transactionStatus = latestRefund.status === "succeeded" ? "refunded" : latestRefund.status;
//           }
//            // Handle failed payments
//         if (charge && charge.status === "failed") {
//           transactionStatus = "failed";
//         }
//         //  Get Checkout Session for this payment intent
//         const sessions = await stripe.checkout.sessions.list({
//           payment_intent: pi.id,
//           expand: ['data.line_items'],
//           limit: 1, // only one session per PaymentIntent
//         });

//         const products =
//           sessions.data[0]?.line_items?.data.map((item) => ({
//             name: item.description,
//             quantity: item.quantity,
//             amount_subtotal: item.amount_subtotal,
//             amount_total: item.amount_total,
//             currency: item.currency,
//           })) || [];

//         return {
//           id: pi.id,
//           customer_name:
//             typeof pi.customer === "object" ? pi.customer?.name : null,
//           customer_email:
//             typeof pi.customer === "object" ? pi.customer?.email : null,
//           amount: pi.amount_received,
//           currency: pi.currency.toUpperCase(),
//           status: transactionStatus,
//           created: new Date(pi.created * 1000).toLocaleString(),
//           payment_method: pi.payment_method,
//           receipt_url: charge?.receipt_url || null,
//           description: pi.description || "No description provided",
//           products, 
//         };
//       })
//     );
//     // Pagination metadata
//     const pagination = {
//       currentPage: parseInt(page, 10),
//       totalPages: Math.ceil(filteredIntents.length / stripeLimit),
//       totalItems: filteredIntents.length,
//       itemsPerPage: stripeLimit,
//     };

//     return res.status(200).send({
//       success: true,
//       message: "Transaction details retrieved successfully.",
//       data: transactions,
//       pagination,
//     });
//   } catch (error) {
//     console.error("Error getting transaction details:", error);
//     return res.status(500).send({
//       success: false,
//       message: "Internal server error.",
//       error: error.message,
//     });
//   }
// };


//insert free lab
const userTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      start_date,
      end_date,
    } = req.query;

    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT * FROM payments WHERE user_id = $1`;
    let values = [userId];

    // Status filter
    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    // Search (FIXED UUID issue)
    if (search) {
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(search);

      if (isUUID) {
        values.push(search);
        query += ` AND payment_id = $${values.length}`;
      } else {
        values.push(`%${search}%`);
        query += ` AND (
          email ILIKE $${values.length} OR
          order_id::text ILIKE $${values.length}
        )`;
      }
    }

    // Date filter
    if (start_date && end_date) {
      values.push(start_date, end_date);
      query += ` AND created_at BETWEEN $${values.length - 1} AND $${values.length}`;
    }

    // Pagination
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limitNum, offset);

    const result = await pool.query(query, values);

    //  Count query (IMPORTANT)
    let countQuery = `SELECT COUNT(*) FROM payments WHERE user_id = $1`;
    let countValues = [userId];

    if (status) {
      countValues.push(status);
      countQuery += ` AND status = $${countValues.length}`;
    }

    if (search) {
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(search);

      if (isUUID) {
        countValues.push(search);
        countQuery += ` AND payment_id = $${countValues.length}`;
      } else {
        countValues.push(`%${search}%`);
        countQuery += ` AND (
          email ILIKE $${countValues.length} OR
          order_id::text ILIKE $${countValues.length}
        )`;
      }
    }

    if (start_date && end_date) {
      countValues.push(start_date, end_date);
      countQuery += ` AND created_at BETWEEN $${countValues.length - 1} AND $${countValues.length}`;
    }

    const countResult = await pool.query(countQuery, countValues);
    
    //  Map response (similar to Stripe structure)
    const transactions = result.rows.map((row) => ({
      id: row.id,
      customer_name: row.customer_name || null,
      customer_email: row.email || null,
      amount: row.amount_paid,
      currency: row.currency || "INR",
      status: row.status,
      created: new Date(row.created_at).toLocaleString(),
      payment_method: row.payment_method,
      receipt_url: row.receipt_url || null,
      description: row.description || "No description provided",
      products: row.products || [], // if you store JSON
      refund_status:row.refund_status,
      refund_amount:row.refund_amount,
      refund_id:row.refund_id
    }));
    return res.status(200).send({
      success: true,
      message: "Transaction details retrieved successfully.",
      data: transactions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(countResult.rows[0].count / limitNum),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: limitNum,
      },
    });

  } catch (error) {
    console.error("Error getting transaction details:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const insertFreeLab = async (req, res) => {
  try {
    const { labId, userId, duration, labType,userName,number_hours_day } = req.body;

    if (!labId || !userId || !duration || !labType ||!userName) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (labType === "cloudslice") {
      // Insert lab assignment
      const insertLab = await pool.query(
        cartQueries.INSERT_ASSINGLAB_CLOUDSLICE_AWS,
        [labId, userId, duration, null]
      );

      // 
      await pool.query(
        cartQueries.INSERT_CLOUDSLICE_AWS_PURCHASED_LAB_ENROLLMENTS,
        [1, labId]
      );

      // Fetch user notification settings
      const userSettings = await pool.query(
        labQueries.GET_USER_NOTIFICATION_SETTINGS,
        [userId]
      );

      if (userSettings.rowCount > 0) {
        const settings = userSettings.rows[0];
        if (
          settings.inappnotifications &&
          settings.inappnotifications.includes("lab_assigned")
        ) {
          // Get lab and user details for notification text
          const labResult = await pool.query(labQueries.GET_CLOUDSLICE_LABS_LABID, [labId]);
          const user = await getUserData(userId,sessionToken);
          const labName = labResult.rows?.[0]?.name || "Lab";
          const userName = user?.name || "User";

          // Insert notification (make sure your SQL uses RETURNING *)
          const insertNotification = await pool.query(
            labQueries.INSERT_NOTIFICATION,
            [
              "lab_assigned",
              "Lab Assigned",
              `${labName} lab assigned to ${userName}`,
              "medium",
              userId,
              null,
            ]
          );

          if (insertNotification.rowCount > 0) {
            const notificationId = insertNotification.rows[0].id;

            await pool.query(labQueries.INSERT_LAB_NOTIFICATION, [
              labId,
              "lab_assigned",
              null,
              notificationId,
            ]);

            sendNotification({
              userId: userId,
              notification: insertNotification.rows[0],
            });
          }
        }
      }
    }
    else if (labType === "singlevm-proxmox") {

      // const { data } = await api.get("/cluster/nextid");
      // const vmId = data.data;
      const username = userName.replace(' ','-')
      // Insert lab assignment
      await pool.query('BEGIN');
      const insertLab = await pool.query(
        cartQueries.INSERT_ASSINGLAB_SINGLEVM_PROXMOX_PURCHASED,
        [labId, userId, duration, null,username,number_hours_day]
      );

      // 
      await pool.query(
        cartQueries.INSERT_SINGLEVM_PROXMOX_PURCHASED_LAB_ENROLLMENTS,
        [1, labId]
      );

      // Fetch user notification settings
      const userSettings = await pool.query(
        labQueries.GET_USER_NOTIFICATION_SETTINGS,
        [userId]
      );

      if (userSettings.rowCount > 0) {
        const settings = userSettings.rows[0];
        if (
          settings.inappnotifications &&
          settings.inappnotifications.includes("lab_assigned")
        ) {
          // Get lab and user details for notification text
          const labResult = await pool.query(proxmoxQueries.GET_LAB_DETAILS, [labId]);
          const user = await getUserData(userId,sessionToken);
          const labName = labResult.rows?.[0]?.name || "Lab";
          const userName = user?.name || "User";

          // Insert notification (make sure your SQL uses RETURNING *)
          const insertNotification = await pool.query(
            labQueries.INSERT_NOTIFICATION,
            [
              "lab_assigned",
              "Lab Assigned",
              `${labName} lab assigned to ${userName}`,
              "medium",
              userId,
              null,
            ]
          );

          if (insertNotification.rowCount > 0) {
            const notificationId = insertNotification.rows[0].id;

            await pool.query(labQueries.INSERT_LAB_NOTIFICATION, [
              labId,
              "lab_assigned",
              null,
              notificationId,
            ]);
            
            sendNotification({
              userId: userId,
              notification: insertNotification.rows[0],
            });
          }
        }
      }
    }
   await pool.query('COMMIT');
    return res.status(200).send({
      success: true,
      message: "Successfully Enrolled",
    });
  } catch (error) {
    console.error(error);
    await pool.query('ROLLBACK');
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = {
    createCartItem,
    getCartItemsByUserId,
    deleteCartItem,
    updateCartItem,
    deleteCartItemsOnUserId,
    cashfreeCheckout,
    insertPaymentAndAssignLab,
    getTransactionDetails,
    exportTransactions,
    userTransactions,
    insertFreeLab,
    extensionCashfreeCheckout,
    handleCashfreeWebhook,
    getUsersData,
    subscriptionCheckout,
    templateCheckout
}