import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { EJSON } from 'meteor/ejson';
import { Accounts } from 'meteor/accounts-base';
import { Reaction, Hooks, Logger } from "/server/api";
import { eFrappe } from "../";
import bcrypt from "bcrypt";



/*
ServiceConfiguration.configurations.upsert(
  { service: "google" },
  {
    $set: {
      clientId: "42443623448-mn6ntl0dvu27stduntf02cjbe4j2kd19.apps.googleusercontent.com",
      loginStyle: "popup",
      secret: "_I2f7HWv9VTpZNNMXSGznnl9"
    }
  }
);*/




var SHA256 = Package.sha.SHA256;
var bcryptHash = Meteor.wrapAsync(bcrypt.hash);

var getPasswordString = function getPasswordString(password) {                                                         // 32
  if (typeof password === "string") {                                                                                  // 33
    password = SHA256(password);                                                                                       // 34
  } else {                                                                                                             // 35
    // 'password' is an object                                                                                         //
    if (password.algorithm !== "sha-256") {                                                                            // 36
      throw new Error("Invalid password hash algorithm. " + "Only 'sha-256' is allowed.");                             // 37
    }                                                                                                                  // 39
    password = password.digest;                                                                                        // 40
  }                                                                                                                    // 41
  return password;                                                                                                     // 42
};                                                                                                                     // 43
                                                                                                                       //
// Use bcrypt to hash the password for storage in the database.                                                        //
// `password` can be a string (in which case it will be run through                                                    //
// SHA256 before bcrypt) or an object with properties `digest` and                                                     //
// `algorithm` (in which case we bcrypt `password.digest`).                                                            //
//                                                                                                                     //
var hashPassword = function hashPassword(password) {                                                                   // 50
  password = getPasswordString(password);                                                                              // 51
  return bcryptHash(password, Accounts._bcryptRounds);                                                                 // 52
};


const get_cookies_name = function(){
  const cookies_name = ["system_user", "sid", "full_name", "user_id", "user_image"];
  return cookies_name;
}


const reset_cookies = function(cookies){
  const ck = [];
  for (cookie of cookies){
    ck.push(cookie + "=;");
  }

  return ck;
}

const get_user_services_data = function(user){
  const data = {};

  data.id = user.id;
  data.email = user.email;
  data.verified_email = user.verified_email;
  data.name = user.name;
  data.given_name = user.given_name || user.first_name;
  data.family_name = user.family_name || user.last_name;
  data.picture = user.picture || user.avatar_url;
  data.locale = user.locale;
  data.expiresAt = user.expiresAt;
  data.login = user.login;//github
  data.gender = user.gender;

  return data;
}
//console.log("hash password ", Accounts);

const get_frappe_admin_username = function(){
  let FRAPPE_ADMIN_USERNAME;

  if (Meteor.settings && Meteor.settings.frappe) {
     FRAPPE_ADMIN_USERNAME = Meteor.settings.frappe.FRAPPE_ADMIN_USERNAME;
  }

  return FRAPPE_ADMIN_USERNAME || "Administrator";
}


const get_frappe_admin_password = function(){
  let REACTION_AUTH;

  if (Meteor.settings && Meteor.settings.reaction) {
     REACTION_AUTH = Meteor.settings.reaction.REACTION_AUTH;
  }

  return REACTION_AUTH;
}


const check_frappe_result = function(result){
  console.log("on login frappe result: ", result);
  if(result && result.statusCode === 200 && result.data && result.data.error_status !== true){
     return true;
  }if(result && result.statusCode === 200 && !result.data){
    return true;
  }else if(result && result.error_status){
     console.log("error: ", result.data.error_msg, result.data.message);
     throw new Meteor.Error("8888");
  }else{
     console.log("error: ");
     throw new Meteor.Error("8888");
  }

}

const __frappe_login = function(userId, username, password){
  const result = frappe_login.call({userId: userId}, username, password);
  return check_frappe_result(result);
}

Accounts.validateLoginAttempt((opts) => {
    console.log("on validateLoginAttempt opts: ", opts);
    console.log("on validateLoginAttempt methodArguments ", opts.methodArguments);

    if(!opts.allowed){
      return false;
    }

    if (opts.user){
      if(opts.type === "password"){
          if(opts.methodName === "login" || opts.methodName === "createUser"){
               const shopid = Reaction.getShopId();
               const isadmin = _.find(opts.user.roles[shopid], function(a){return a === "admin"});
               const password = opts.methodArguments[0].password.digest;
               let username;
               if(opts.methodArguments[0].user){
                 username = opts.methodArguments[0].user.email;
               }else if(opts.methodArguments[0].email){
                 username = opts.methodArguments[0].email;
               }

               if(isadmin){
                  username = get_frappe_admin_username();
               }
               return __frappe_login(opts.user._id, username, password);

           }else if(opts.methodName === "resetPassword"){
               const shopid = Reaction.getShopId();
               const password = opts.methodArguments[1].digest;
               let email = opts.user.emails[0].address;
               const isadmin = _.find(opts.user.roles[shopid], function(a){return a === "admin"});

               if(isadmin){
                  email = get_frappe_admin_username();
               }

               //const userId = opts.user._id;
               //headers.Cookie = reset_cookies(get_cookies_name());

               try{

                 const headers = frappe_login_admin_only();
                 const result = HTTP.call("POST", get_frappe_url_resetPassword(), {params: {"email": email, "new_password": password}, headers: headers, data:{efrappe:{origin: "efrappe"}}});
                 console.log("result in validation resetpassword from frappe ", result);

                 //make logout
                 frappe_logout_only.call({userId: null}, headers.Cookie);

                 //login new user in frappe.
                 return __frappe_login(opts.user._id, email, password);

                 //return true;
               }catch(e){
                 console.log("validateLoginAttempt resetPassWord: Error. ", e);
                 throw new Meteor.Error("6566", "Reset Password Error.");
               }
           }
         }else if(opts.type === "resume"){

            if(opts.methodName === "login" && opts.user.profile.frappe_login == true){
             //Here frappe session timeout, we need to logout from reaction.
              const userId = opts.user._id;
              //if empty emails probably is anonymous user.
              if (opts.user.emails.length === 0)
                return true;

              const userdoc = Meteor.users.findOne({_id:userId}, {fields:{"profile.cookies":1}});

              if (!userdoc)//if not cookie then no login was made
                return false;

              const headers = {};
              let cookie = userdoc.profile.cookies;

              if(!cookie)
                cookie = reset_cookies(get_cookies_name());
                //return false;

              headers.Cookie = cookie;
              try{
                const result = HTTP.call("GET", get_frappe_url_logged_user(), {headers: headers, data:{efrappe:{origin: "efrappe"}}});
                //console.log("result in validation login get logged user ", result, result.content.session_expired);
                console.log("result in validation login get logged user ", result, result.data.session_expired);
                //const result_content = EJSON.parse(result.content);
                //const session_expired = result_content.session_expired || 0;
                const session_expired = result.data.session_expired || 0;
                if (result && (result.statusCode !== 200 || session_expired == 1))
                  throw new Meteor.Error("6565", "User was logged out by frappe logout.");

                return true;
              }catch(e){
                console.log("validateLoginAttempt: Error in get logged user. ", e);
                throw new Meteor.Error("6565", "User was logged out by frappe logout.");
              }

           }else if(opts.methodName === "login" && opts.user.profile.frappe_login == false){
             console.log("user was logged out with frappe_login = false!");
             //return false;
             throw new Meteor.Error("6565", "User was logged out by frappe logout.");
           }
        }else if(opts.type === "google"){
          const user = opts.user.services.google;
          const data = get_user_services_data(user);

          //login admin
          /*const adminuser = get_frappe_admin_username();
          const adminpass = getPasswordString(get_frappe_admin_password());

          const login_result = frappe_login_only(adminuser, adminpass);
          const headers = {Cookie: login_result.headers["set-cookie"]};*/

          //login admin
          const headers = frappe_login_admin_only();

          //get services login token
          const tokenObj = frappe_services_login(headers, "google");


          const token = tokenObj.data.message;
          console.log("token from frappe ", tokenObj, token);
          //logout admin
          const result = frappe_logout_only.call({userId: null}, headers.Cookie);

          //login as oauth_user
          const login_services_result = frappe_login_oauth_user(data, "google", token, 1);

          //check_frappe_result(login_services_result);

          const userId = opts.user._id;
          //const login_token = login_services_result.data.login_token;

          //const login_token_result = frappe_login_via_token(login_token);

          //check_frappe_result(login_token_result);

          /*const headerss = {};
          headerss.Cookie = login_services_result.headers["set-cookie"];

          const result_logged_user = HTTP.call("GET", get_frappe_url_logged_user(), {headers: headerss, data:{efrappe:{origin: "efrappe"}}});
          //console.log("result in validation login get logged user ", result, result.content.session_expired);
          console.log("result in validation login get logged user ", result_logged_user);
          */

          //update user cookies
          if(login_services_result.headers && login_services_result.headers["set-cookie"]){
            Meteor.users.update({_id: userId}, {$set:{"profile.cookies": login_services_result.headers["set-cookie"], "profile.frappe_login": true}});
          }

          return true;


        }else if(opts.type === "twitter"){
          /*************************************

            NOTE: Not implemented in frappe!

          **************************************/
          const user = opts.user.services.twitter;
          const data = get_user_services_data(user);

          //login admin
          const adminuser = get_frappe_admin_username();
          const adminpass = getPasswordString(get_frappe_admin_password());

          const login_result = frappe_login_only(adminuser, adminpass);
          const headers = {Cookie: login_result.headers["set-cookie"]};

          //get services login token
          const tokenObj = frappe_services_login(headers, "twitter");


          const token = tokenObj.data.message;
          console.log("token from frappe ", tokenObj, token);
          //logout admin
          const result = frappe_logout_only.call({userId: null}, headers.Cookie);

          //const state = {"token": token};
          const login_services_result = frappe_login_oauth_user(data, "twitter", token, 1);

          check_frappe_result(login_services_result);

          const userId = opts.user._id;

          if(login_services_result.headers && login_services_result.headers["set-cookie"]){
            Meteor.users.update({_id: userId}, {$set:{"profile.cookies": login_services_result.headers["set-cookie"], "profile.frappe_login": true}});
          }

          return true;

        }else if(opts.type === "facebook"){
          const user = opts.user.services.facebook;
          const data = get_user_services_data(user);

          //login admin
          const adminuser = get_frappe_admin_username();
          const adminpass = getPasswordString(get_frappe_admin_password());

          const login_result = frappe_login_only(adminuser, adminpass);
          const headers = {Cookie: login_result.headers["set-cookie"]};

          //get services login token
          const tokenObj = frappe_services_login(headers, "facebook");


          const token = tokenObj.data.message;
          console.log("token from frappe ", tokenObj, token);
          //logout admin
          const result = frappe_logout_only.call({userId: null}, headers.Cookie);

          //const state = {"token": token};
          const login_services_result = frappe_login_oauth_user(data, "facebook", token, 1);

          check_frappe_result(login_services_result);

          const userId = opts.user._id;

          if(login_services_result.headers && login_services_result.headers["set-cookie"]){
            Meteor.users.update({_id: userId}, {$set:{"profile.cookies": login_services_result.headers["set-cookie"], "profile.frappe_login": true}});
          }

          return true;

        }else if(opts.type === "github"){
          /*************************************

            NOTE: Not implemented in reaction yet!

          **************************************/
          const user = opts.user.services.github;
          const data = get_user_services_data(user);

          //login admin
          const adminuser = get_frappe_admin_username();
          const adminpass = getPasswordString(get_frappe_admin_password());

          const login_result = frappe_login_only(adminuser, adminpass);
          const headers = {Cookie: login_result.headers["set-cookie"]};

          //get services login token
          const tokenObj = frappe_services_login(headers, "github");


          const token = tokenObj.data.message;
          console.log("token from frappe ", tokenObj, token);
          //logout admin
          const result = frappe_logout_only.call({userId: null}, headers.Cookie);

          //const state = {"token": token};
          const login_services_result = frappe_login_oauth_user(data, "github", token, 1);

          check_frappe_result(login_services_result);

          const userId = opts.user._id;

          if(login_services_result.headers && login_services_result.headers["set-cookie"]){
            Meteor.users.update({_id: userId}, {$set:{"profile.cookies": login_services_result.headers["set-cookie"], "profile.frappe_login": true}});
          }

          return true;

        }
    }

    return true;


    //return true;
});

//If some validateLoginAttempt fail and we aready made login to frappe, logout from frappe.
Accounts.onLoginFailure((opts) => {
    console.log("onLoginFailure opts: ", opts);
    if(opts.type === "password" && !opts.allowed && opts.methodName === "login" && opts.user && opts.error.error !== "8888"){
      const userdoc = Meteor.users.findOne({_id: opts.user._id}, {fields:{"profile.frappe_login":1}});
      console.log("frappe_login ", userdoc);
      if(userdoc && userdoc.profile.frappe_login){
        const result = frappe_logout.call({userId: opts.user._id});
        console.log("onLoginFailure from frappe result: ", result);
      }

    }
});

//When we logout from reaction we need to logout from frappe.
Accounts.onLogout((opts) => {
  console.log("on logout opts: ", opts);
  if(opts && opts.user && opts.user.profile && opts.user.profile.frappe_login == true){
    const userId = opts.user._id;
    //userdoc = Meteor.users.findOne({_id:userId}, {fields:{"profile.cookies":1}});
    console.log("userId on logout is", userId);
    const result = frappe_logout.call({userId: userId});
    //console.log("onlogout result of frappe is ", result);
    /*if(result && result.headers["set-cookie"]){
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
    }else{
      const cookies = reset_cookies(get_cookies_name());
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": cookies, "profile.frappe_login": false}});
    }*/
    /*const headers = {};
    const cookie;
    userdoc = Meteor.users.findOne({_id:userId}, {fields:{"profile.cookies":1}});
    if (!userdoc)//if not cookie then no login was made
      return {data:{message: "Not Logged Out. User not loggin in.", error_status: false}};
    cookie = userdoc.profile.cookies;
    headers.Cookie = cookie;
    const result = HTTP.call("POST", get_frappe_url_logout(), {headers: headers, frappe:{efrappe:{origin: "efrappe"}}});
    if(result.headers["set-cookie"]){
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
    }else{
      const cookies = reset_cookies(get_cookies_name());
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": cookies, "profile.frappe_login": false}});
    }*/
  }
});

/*if(Hooks){
  //on meteor login, login into frappe
  Hooks.Events.add("onLogin", (opts) => {
     let group = Reaction.getShopId();
     console.log("on login type: ", opts.type);
     //console.log("on login opts: ", opts);
     if(opts.type === "password"){
         console.log("on login user: ", opts.methodArguments[0].user.email);
         console.log("on login password: ", opts.methodArguments[0].password.digest);
         const result = frappe_login.call({userId: opts.user._id},opts.methodArguments[0].user.email, opts.methodArguments[0].password.digest);
         console.log("on login frappe result: ", result);
         if(result && result.statusCode === 200 && result.data.error_status !== true){
          //if success return opts else throw an error
            return opts
         }else if(result && result.error_status){
            console.log("error: ", result.data.error_msg, result.data.message);
            //throw error
         }else{
            console.log("error: ");
            //throw error
         }
     }
     return opts;
  });
}*/


const get_frappe_url = function(){

  if (Meteor.settings && Meteor.settings.frappe) {
      const frappe_url = Meteor.settings.frappe.FRAPPE_URL || "http://localhost";
      return frappe_url;
  }

  return "http://localhost";
  //const json = Assets.getText("custom/data/tablesMap.json");
  //const frappe_url = EJSON.parse(json);

}

const get_frappe_url_logout = function(){
  return get_frappe_url() + "/api/method/logout";
}

const get_frappe_url_login = function(){
  return get_frappe_url() + "/api/method/login";
}

const get_frappe_url_logged_user = function(){
  //return get_frappe_url() + "/api/method/frappe.auth.get_logged_user";
  return get_frappe_url() + "/api/method/refrappe.utils.users.get_logged_user";
}

const get_frappe_url_resetPassword = function(){
  //return get_frappe_url() + "/api/method/frappe.auth.get_logged_user";
  return get_frappe_url() + "/api/method/refrappe.utils.users.reset_password";
}


const get_frappe_url_services_login = function(){
  //return get_frappe_url() + "/api/method/frappe.auth.get_logged_user";
  return get_frappe_url() + "/api/method/refrappe.utils.integration.getIntegrationToken";
}

const get_frappe_login_oauth_user = function(){
  //return get_frappe_url() + "/api/method/frappe.auth.get_logged_user";
  return get_frappe_url() + "/api/method/frappe.www.login.login_oauth_user";
}


const get_frappe_login_via_token = function(){
  //return get_frappe_url() + "/api/method/frappe.auth.get_logged_user";
  return get_frappe_url() + "/api/method/frappe.www.login.login_via_token";
}

const frappe_login_via_token = function(login_token){
  try {
    const result = HTTP.call("GET", get_frappe_login_via_token(), {params: {login_token: login_token}});
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Frappe Integration login_via_token error.", error_status: true, error_msg: e}};
  }
}

const frappe_login_oauth_user = function(data, provider, state, generate_login_token){
  try {
    //const result = HTTP.call("GET", get_frappe_login_oauth_user(), {params: {data: EJSON.stringify(data), provider: provider, state: EJSON.stringify(state)}, data:{efrappe:{origin: "efrappe"}}});
    data.efrappe = {origin: "efrappe"};
    const result = HTTP.call("GET", get_frappe_login_oauth_user(), {params: {data: EJSON.stringify(data), provider: provider, state: EJSON.stringify(state), generate_login_token: generate_login_token}});
    check_frappe_result(result);
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Frappe Integration login_oauth_user error.", error_status: true, error_msg: e}};
  }
}


const frappe_services_login = function(headers, provider){
  try {
    const result = HTTP.call("GET", get_frappe_url_services_login(), {headers: headers, params: {provider: provider}, data:{efrappe:{origin: "efrappe"}}});
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Frappe Integration getIntegrationToken error.", error_status: true, error_msg: e}};
  }
}


const frappe_logout = function(cookies){
  //try {
    /*
    const headers = {};
    let cookie = cookies;
    const userId = this.userId;
    if(!cookie){
      userdoc = Meteor.users.findOne({_id:userId}, {fields:{"profile.cookies":1}});
      if (!userdoc)//if not cookie then no login was made
        return {data:{message: "Not Logged Out. User not loggin in.", error_status: false}};
      cookie = userdoc.profile.cookies;
    }
    headers.Cookie = cookie;
    const result = HTTP.call("POST", get_frappe_url_logout(), {headers: headers, frappe:{efrappe:{origin: "efrappe"}}});
    */
    const userId = this.userId;
    const result = frappe_logout_only.call(this, cookies);
    console.log("logout result ", result);
    const resetcookies = reset_cookies(get_cookies_name());
    Meteor.users.update({_id: userId}, {$set:{"profile.cookies": resetcookies, "profile.frappe_login": false}});
    /*if(result && result.headers && result.headers["set-cookie"]){
      //Meteor.users.update({_id: userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
      const cookies = reset_cookies(get_cookies_name());
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": cookies, "profile.frappe_login": false}});
    }else{
      const cookies = reset_cookies(get_cookies_name());
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": cookies, "profile.frappe_login": false}});
    }*/
    return result;
  /*} catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged Out", error_status: true, error_msg: e}};
  }*/
}

const frappe_login = function(user, pwd){
  try {
    //const result = HTTP.call("POST", get_frappe_url_login(), {params: {usr: user, pwd: pwd}});
    const result = frappe_login_only(user, pwd);
    if(result && result.headers && result.headers["set-cookie"]){
      Meteor.users.update({_id:this.userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": true}});
    }
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged In", error_status: true, error_msg: e}};
  }
}


const frappe_logout_only = function(cookies){
  try {
    const headers = {};
    let cookie = cookies;
    if(!cookie){
      const userId = this.userId;
      userdoc = Meteor.users.findOne({_id:userId}, {fields:{"profile.cookies":1}});
      if (!userdoc)//if not cookie then no login was made
        return {data:{message: "Not Logged Out. User not loggin in.", error_status: false}};
      cookie = userdoc.profile.cookies;
    }
    headers.Cookie = cookie;
    const result = HTTP.call("POST", get_frappe_url_logout(), {headers: headers, data:{efrappe:{origin: "efrappe"}}});
    check_frappe_result(result);
    return result;
  }catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged Out", error_status: true, error_msg: e}};
  }

}

const frappe_login_only = function(user, pwd){
  try {
    const result = HTTP.call("POST", get_frappe_url_login(), {params: {usr: user, pwd: pwd}});
    //Meteor.users.update({_id:this.userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": true}});
    check_frappe_result(result);
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged In", error_status: true, error_msg: e}};
  }
}


const frappe_login_admin_only= function(){
  //we needd login as Administrator
  const adminuser = eFrappe.get_frappe_admin_username();
  const adminpass = eFrappe.getPasswordString(eFrappe.get_frappe_admin_password());
  const result = eFrappe.frappe_login_only(adminuser, adminpass);
  const headers = {Cookie: result.headers["set-cookie"]};

  return headers;
}


Meteor.methods(
  {
    frappeLogin: function (user, pwd) {
      check(user, String);
      check(pwd, String);
      this.unblock();
      const login = frappe_login.bind(this);
      return login(user, pwd);
    },
    frappeLogout: function(cookies){
      check(cookies, Match.Maybe([String]));
      this.unblock();
      const logout = frappe_logout.bind(this);
      return logout(cookies);
    }
});

eFrappe.get_frappe_admin_password = get_frappe_admin_password;
eFrappe.get_frappe_admin_username = get_frappe_admin_username;
eFrappe.frappeLogin = frappe_login;
eFrappe.frappe_login_only = frappe_login_only;
eFrappe.frappeLogout = frappe_logout;
eFrappe.frappe_logout_only = frappe_logout_only;
eFrappe.get_frappe_url = get_frappe_url;
eFrappe.hashPassword = hashPassword;
eFrappe.getPasswordString = getPasswordString;
