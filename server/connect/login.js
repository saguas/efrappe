import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { EJSON } from 'meteor/ejson';
import { Accounts } from 'meteor/accounts-base';
import { Reaction, Hooks, Logger } from "/server/api";
import { eFrappe } from "../";
import bcrypt from "bcrypt";


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
    ck.push[cookie + "=;"];
  }

  return ck;
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


Accounts.validateLoginAttempt((opts) => {
    console.log("on validateLoginAttempt opts: ", opts);
    if(opts.type === "password" && opts.allowed && (opts.methodName === "login" || opts.methodName === "createUser") && opts.user){
         let shopid = Reaction.getShopId();
         const isadmin = _.find(opts.user.roles[shopid], function(a){return a === "admin"});
         let password = opts.methodArguments[0].password.digest;
         let username;
         if(opts.methodArguments[0].user){
           username = opts.methodArguments[0].user.email;
         }else if(opts.methodArguments[0].email){
           username = opts.methodArguments[0].email;
         }

         if(isadmin){
            username = get_frappe_admin_username();
         }
         const result = frappe_login.call({userId: opts.user._id}, username, password);
         console.log("on login frappe result: ", result);
         if(result && result.statusCode === 200 && result.data && result.data.error_status !== true){
            //if success return opts else throw an error
            //opts.user.profile.frappe_login = true;
            //error on frappe login
            return true;
         }else if(result && result.error_status){
            console.log("error: ", result.data.error_msg, result.data.message);
            throw new Meteor.Error("8888");
         }else{
            console.log("error: ");
            throw new Meteor.Error("8888");
         }
     }if(opts.type === "resume" && opts.allowed && opts.methodName === "login" && opts.user && opts.user.profile.frappe_login == false){
       console.log("user was logged out with frappe_login = false!");
       //return false;
       throw new Meteor.Error("6565", "User was logged out by frappe logout.");
     }else if(!opts.allowed){
      return false;
     }
    return true;
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
    const result = HTTP.call("POST", get_frappe_url_logout(), {headers: headers, data:{efrappe:{origin: "efrappe"}}});
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
    const result = HTTP.call("POST", get_frappe_url_logout(), {headers: headers, data:{efrappe:{origin: "efrappe"}}});
    */
    const userId = this.userId;
    const result = frappe_logout_only.call(this, cookies);
    if(result && result.headers && result.headers["set-cookie"]){
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
    }else{
      const cookies = reset_cookies(get_cookies_name());
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": cookies, "profile.frappe_login": false}});
    }
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
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged In", error_status: true, error_msg: e}};
  }
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
