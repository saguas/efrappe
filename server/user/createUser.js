import { Meteor } from "meteor/meteor";
import { Random } from 'meteor/random';
import { Accounts } from 'meteor/accounts-base';
import { Reaction, Hooks, Logger } from "/server/api";
import { merge, uniqWith } from "lodash";
import { eFrappe } from "../";



const get_frappe_url_update_password = function(){
  return eFrappe.get_frappe_url() + "/api/method/frappe.core.doctype.user.user.update_password";
}


const frappe_update_password = function(headers, new_password, key, old_password){
  try {
    const result = HTTP.call("POST", get_frappe_url_update_password(), {headers: headers, params: {new_password: new_password, key: key, old_password: old_password}, data:{efrappe:{origin: "efrappe"}}});
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "User password not updated.", error_status: true, error_msg: e}};
  }
}



const get_frappe_url_create_user = function(){
  return eFrappe.get_frappe_url() + "/api/resource/User";
}


const frappe_create_user = function(data, headers){
  try {
    const result = HTTP.call("POST", get_frappe_url_create_user(), {headers: headers, data: data});
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "User Not Created.", error_status: true, error_msg: e}};
  }
}


//create frappe insert user
if (Hooks) {
  Hooks.Events.add("onCreateUser", (user, options) => {
      const group = Reaction.getShopId();
      console.log("onCreateUser options: ", options);
      console.log("onCreateUser user: ", user);
      console.log("onCreateUser shopId: ", group);
      if(options.services && options.services.anonymous === true)
        return user;

      //create frappe insert user
      //POST http://frappe.local:8000/api/resource/User
      //generate random key with length 32
      const reset_password_key = Random.secret(32);
      const email = user.emails[0].address;
      const name = email.split("@")[0];
      const data = {
                    "first_name": name,
                    "last_name": name,
                    "email": email,
                    "username": user.username || name,
                    "send_welcome_email": false,
                    "reset_password_key": reset_password_key,
                    "user_type": "Website User"
                   };

     //we needd login as Administrator
     const adminuser = eFrappe.get_frappe_admin_username();
     const adminpass = eFrappe.getPasswordString(eFrappe.get_frappe_admin_password());
     const login_result = eFrappe.frappe_login_only(adminuser, adminpass);
     const headers = {Cookie: login_result.headers["set-cookie"]};
     //here call frappe rest api
     frappe_create_user(data, headers);
     //here call POST: frappe.core.doctype.user.user.update_password
     frappe_update_password(headers, options.password.digest, reset_password_key);

     //make logout
     const result = eFrappe.frappe_logout_only.call({userId: null}, headers.Cookie);

     return user;
  });
}



const createUser = function(email, pwd, username) {
  Logger.info("Starting createFrappeUser");
  let options = {email: email, username: username};
  const domain = Reaction.getRegistryDomain();
  let defaultUserRoles = ["guest", "account/profile", "product", "tag", "index", "cart/checkout", "cart/completed"];
  let accountId;

  const shopId = Reaction.getShopId();

  if(pwd){
    options.password = pwd;
  }

  options = Hooks.Events.run("beforeCreateFrappeUser", options);

  // we're checking again to see if this user was created but not specifically for this shop.
  if (Meteor.users.find({
    "emails.address": options.email
  }).count() === 0) {
    accountId = Accounts.createUser(options);
  } else {
     // this should only occur when existing admin creates a new shop
     Logger.info("Not creating frappe user, already exists");
     return "";
  }

  if(options.password){
    Logger.info("Creating frappe user with password.");
  }else {
    // send verification email to admin
    try {
      // if server is not confgured. Error in configuration
      // are caught, but user can't ever login.
      //Accounts.sendVerificationEmail(accountId);
      Accounts.sendEnrollmentEmail(accountId);
    } catch (error) {
      Logger.warn(
        "Unable to send admin account verification email.", error);
    }
  }

  // we don't use accounts/addUserPermissions here because we may not yet have permissions
  //defaultUserRoles = defaultUserRoles.concat(["guest", 'product', 'tag', 'index', 'cart/checkout', 'cart/completed', 'reaction-social']);
  //defaultUserRoles = defaultUserRoles.concat(["guest"]);
  Roles.setUserRoles(accountId, _.uniq(defaultUserRoles), shopId);
  // // the reaction owner has permissions to all sites by default
  //Roles.setUserRoles(accountId, _.uniq(defaultUserRoles), Roles.GLOBAL_GROUP);

  // run hooks on new user object
  const user = Meteor.users.findOne(accountId);
  Hooks.Events.run("afterCreateFrappeUser", user);
  return accountId;

}

const changeFrappePassword = function(userId, newpwd){
  Logger.info("Starting change frappe password");
  //return Accounts.changePassword(oldpwd, newpwd);
  return Accounts.setPassword(userId, newpwd);
}


export default {

  createUser: createUser,
  changePassword: changeFrappePassword

}
