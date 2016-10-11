import { Meteor } from "meteor/meteor";
import { EJSON } from 'meteor/ejson';
import { Tracker } from 'meteor/tracker';
import { eFrappe } from "../../lib";
import { Router } from "/client/api";



Router.Hooks.onEnter("efrappe/desk", function(ctx){
  console.log("enter /reaction/desk ctx: ", ctx);
  //location.href="http://localhost:8888/desk";
  location.href=`${location.origin}/desk`;
});

/*
//observe every path change!
Tracker.autorun(function() {
  FlowRouter.watchPathChange();
  var currentContext = FlowRouter.current();
  // do anything with the current context
  // or anything you wish
  if(currentContext.path == "/reaction/desk"){
    location.href="http://loclahost:8888/desk";
  }
});

*/



const get_cookies_name = function(){
  const cookies_name = ["system_user", "sid", "full_name", "user_id", "user_image"];
  return cookies_name;
}

const set_cookies = function(cookies){
  for (cookie of cookies){
    document.cookie = cookie;
  }
}

const reset_cookies = function(cookies){
  for (cookie of cookies){
    document.cookie = cookie + "=;";
  }
}

//Meteor.call("frappeLogin", "Administrator", "8950388", function (error, result) {console.log("result frappe login ", result)});
const frappeLogin = function(user, pwd, callback){
  Meteor.call("frappeLogin", user, pwd, function (error, result) {

    if(error){
      console.log("error in frappe login ", error);
      const error_obj = {data:{message: "Not Logged In", error_status: true, error_msg: error}};
      if (callback)
        return callback(error_obj);
      return error_obj;
    };
    console.log("result frappe login ", result);
    set_cookies(result.headers["set-cookie"]);
    if (callback)
      return callback(result);
  });
}

const frappeLogout = function(cookies, callback){
  Meteor.call("frappeLogout", cookies, function (error, result) {

    if(error){
      console.log("error in frappe logout ", error);
      const error_obj = {data:{message: "Not Logged Out", error_status: true, error_msg: error}};
      if (callback)
        return callback(error_obj);
      return error_obj;
    };
    console.log("result frappe logout ", result);
    set_cookies(result.headers["set-cookie"]);
    if (callback)
      return callback(result);
  });
}

Tracker.autorun(function () {
  const user = Meteor.user();
  if(user){
    const profile = user.profile;
    if (profile && profile.cookies){
      set_cookies(profile.cookies);
    }else{
      set_cookies(get_cookies_name());
    }

    /*if(profile && profile.frappe_login === false){
      Meteor.logout();
    }*/
  }
});



eFrappe.frappeLogin = frappeLogin;
eFrappe.frappeLogout = frappeLogout;
