import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { EJSON } from 'meteor/ejson';
import { Reaction, Hooks, Logger } from "/server/api";
import { eFrappe } from "../";



const get_frappe_admin_username = function(){
  let FRAPPE_ADMIN_USERNAME;

  if (Meteor.settings && Meteor.settings.frappe) {
     FRAPPE_ADMIN_USERNAME = Meteor.settings.frappe.FRAPPE_ADMIN_USERNAME;
  }

  return FRAPPE_ADMIN_USERNAME || "Administrator";
}


Accounts.validateLoginAttempt((opts) => {
    console.log("on validateLoginAttempt opts: ", opts);
    if(opts.type === "password" && opts.allowed && opts.methodName === "login" && opts.user){
         let shopid = Reaction.getShopId();
         const isadmin = _.find(opts.user.roles[shopid], function(a){return a === "admin"});
         let password = /*opts.methodArguments[0].password.digest*/"8950388";
         let username = opts.methodArguments[0].user.email;
         if(isadmin){
            username = get_frappe_admin_username();
         }
         console.log("on login user: ", username);
         console.log("on login password: ", password);
         const result = frappe_login.call({userId: opts.user._id}, username, password);
         console.log("on login frappe result: ", result);
         if(result && result.statusCode === 200 && result.data.error_status !== true){
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
     }else if(!opts.allowed){
      return false;
     }
    return true;
});

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

Accounts.onLogout((opts) => {
    console.log("on logout opts: ", opts);
    if (opts.user && opts.user.profile && opts.user.profile.frappe_login){
      const result = frappe_logout.call({userId: opts.user._id});
      console.log("on logout from frappe result: ", result);
      return result;
    }else{
      console.log("Not logged out from frappe.");
    }

    //if(result.headers)
      //Meteor.users.update({_id: opts.user._id}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
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
  try {
    //const result = _frappe_logout.call(this, cookies);
    //Meteor.users.update({_id: this.userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
    //return result;
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
    if(result.headers["set-cookie"])
      Meteor.users.update({_id: userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": false}});
    return result;
  } catch (e) {
    // Got a network error, time-out or HTTP error in the 400 or 500 range.
    return {data:{message: "Not Logged Out", error_status: true, error_msg: e}};
  }
}

const frappe_login = function(user, pwd){
  try {
    const result = HTTP.call("POST", get_frappe_url_login(),
                         {params: {usr: user, pwd: pwd}});
    Meteor.users.update({_id:this.userId}, {$set:{"profile.cookies": result.headers["set-cookie"], "profile.frappe_login": true}});
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

eFrappe.frappeLogin = frappe_login;
eFrappe.frappeLogout = frappe_logout;
eFrappe.get_frappe_url = get_frappe_url;
