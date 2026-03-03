module.exports = {
    CREATE_CART_ITEM:`INSERT INTO cart_items (labid,name,description,duration,price,quantity,user_id,defaultduration,defaultprice) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    INSERT_PAYMENT:`INSERT INTO payments (
                    user_id,
                    session_id,
                    payment_intent_id,
                    amount_paid,
                    currency,
                    status,
                    email,
                    labid,
                    duration,
                    org_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9,$10) RETURNING *`,
    CREATE_SINGLEAWS_LAB_PURCHASE:`INSERT INTO lab_batch_purchased(lab_id,admin_id,org_id,org_name,configured_by,number_of_days,number_of_users,expiry_date,status,payment_id,lab_title)
                                  VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() + ($8 * INTERVAL '1 day'),$9,$10,$11) RETURNING *`,
    INSERT_ASSIGNLAB_SINGLEVM_AWS:`INSERT INTO singlevm_aws_purchased_labs (labid, user_id, payment_id,  duration) VALUES ($1, $2, $3, $4) RETURNING *`,
    INSERT_ASSINGLAB_CLOUDSLICE_AWS:`INSERT INTO cloudslice_purchased_labs (labid,user_id,duration,payment_id) VALUES($1,$2,$3,$4) RETURNING *`,
    INSERT_ASSINGLAB_SINGLEVM_PROXMOX_PURCHASED:`INSERT INTO singlevmproxmox_purchased_labs (labid,user_id,duration,payment_id,vmname) VALUES($1,$2,$3,$4,$5) RETURNING *`,
    INSERT_CART_DETAILS:`INSERT INTO carts (user_id, cart_data) VALUES ($1, $2) RETURNING id`,

    INSERT_SINGLEVM_AWS_PURCHASED_LAB_ENROLLMENTS:`UPDATE  createlab set total_enrollments=total_enrollments + $1 where lab_id=$2`,
    INSERT_CLOUDSLICE_AWS_PURCHASED_LAB_ENROLLMENTS:`UPDATE  cloudslicelab set total_enrollments=total_enrollments + $1 where labid=$2`,
    INSERT_SINGLEVM_PROXMOX_PURCHASED_LAB_ENROLLMENTS:`UPDATE  singlevmproxmox_lab set total_enrollments=total_enrollments + $1 where labid=$2`,


    GET_CART_ITEMS_BY_USER_ID:`SELECT * FROM cart_items WHERE user_id = $1`,
    GET_CART_DATA:`SELECT cart_data FROM carts WHERE id = $1`,
    GET_USER_DATA:`SELECT * FROM users WHERE id=$1 `,
    GET_ORG_USER_DATA:` SELECT * FROM organization_users WHERE id=$1`,
    //remove the cart item
    DELETE_CART_ITEM: `DELETE FROM cart_items WHERE id = $1 RETURNING *`,
    //delete all cart items of a user
    DELETE_CART_ITEMS_ON_USER_ID: `DELETE FROM cart_items WHERE user_id = $1 RETURNING *`,
    DELETE_CARTS:`DELETE FROM cart_items WHERE labid=$1 AND user_id=$2 RETURNING *`,

    //update the cart item
    UPDATE_CART_ITEM:`UPDATE cart_items set duration = $1,quantity = $2,price=$3 where id = $4 RETURNING *`
}