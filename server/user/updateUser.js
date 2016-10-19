import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { Reaction, Logger, MethodHooks } from "/server/api";


MethodHooks.after("cart/setShipmentAddress", function (options) {
  // if cart/submit had an error we won't copy cart to Order
    // and we'll throw an error.
    Logger.warn("MethodHooks after cart/setShipmentAddress", options);
    // Default return value is the return value of previous call in method chain
    // or an empty object if there's no result yet.
    const result = options.result || {};
    if (typeof options.error === "undefined") {
      let username;
      const usernameParts = options.arguments[1].fullName.split(" ");
      if(usernameParts.length > 1){
        let lastnameIndex = usernameParts.length - 1;
        username = `${usernameParts[0]} ${usernameParts[lastnameIndex]}`;
      }else{
        username = usernameParts[0];
      }
      Meteor.users.update({_id: Meteor.userId()}, {$set: {username: username}});
    }

    return result;
});
