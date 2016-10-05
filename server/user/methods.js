import { Meteor } from "meteor/meteor";
import { createUser, changePassword } from "./createUser.js";
import { Reaction, Logger } from "/server/api";




const getErrorResult = function(error){
  Logger.warn(error);
  return result = {
    saved: false,
    error: error
  };
}


Meteor.methods(
  {
    createFrappeUser: function (email, pwd, username) {
      check(email, String);
      check(pwd, String);
      check(username, String);
      this.unblock();

      const shopId = Reaction.getShopId();
      const permissions = ["admin"];
      if(!Roles.userIsInRole(this.userId, permissions, shopId)){
        const error = "User does not have permissions to create Frappe User.";
        return getErrorResult(error);
      }
      const create = createUser.bind(this);
      return create(email, pwd, username);
    },
    changeFrappePassword: function (userId, newpwd) {
      check(userId, String);
      check(newpwd, String);
      this.unblock();

      const shopId = Reaction.getShopId();
      const permissions = ["admin"];
      if(!Roles.userIsInRole(this.userId, permissions, shopId)){
        const error = "User does not have permissions to change User Password for Frappe.";
        return getErrorResult(error);
      }

      const change = changePassword.bind(this);
      return change(userId, newpwd);
    },
    logoutFromFrappe: function(useremail){
      check(useremail, String);
      this.unblock();

      console.log("useremail ", useremail);
      const shopId = Reaction.getShopId();
      const permissions = ["admin"];
      //set for that user profile.frappe_logout = false
      if(!Roles.userIsInRole(this.userId, permissions, shopId)){
        const error = "User does not have permissions to logout other user.";
        return getErrorResult(error);
      }

      const userdoc = Meteor.users.findOne({"emails.address": {"$in": [useremail]}});
      Meteor.users.update({_id: userdoc._id}, {$set:{"profile.frappe_login": false}});
    }
});
