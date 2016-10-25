import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { Reaction, Logger, MethodHooks } from "/server/api";



//Product

MethodHooks.after("products/createProduct", function (options) {

  Logger.warn("MethodHooks after products/createProduct", options);

  return true;

});


MethodHooks.after("products/cloneProduct", function (options) {

  Logger.warn("MethodHooks after products/cloneProduct", options);

  return true;

});

MethodHooks.after("products/deleteProduct", function (options) {

  Logger.warn("MethodHooks after products/deleteProduct", options);

  return true;

});


MethodHooks.after("products/updateProductField", function (options) {

  Logger.warn("MethodHooks after products/updateProductField", options);

  return true;

});

MethodHooks.after("products/updateProductPosition", function (options) {

  Logger.warn("MethodHooks after products/updateProductposition", options);

  return true;

});


//variant


MethodHooks.after("products/createVariant", function (options) {

  Logger.warn("MethodHooks after products/createVariant", options);

  return true;

});

MethodHooks.after("products/cloneVariant", function (options) {

  Logger.warn("MethodHooks after products/cloneVariant", options);

  return true;

});


MethodHooks.after("products/updateVariant", function (options) {

  Logger.warn("MethodHooks after products/updateVariant", options);

  return true;

});

MethodHooks.after("products/deleteVariant", function (options) {

  Logger.warn("MethodHooks after products/deleteVariant", options);

  return true;

});

MethodHooks.after("products/updateVariantPosition", function (options) {

  Logger.warn("MethodHooks after products/updateVariantPosition", options);

  return true;

});


//Tags

MethodHooks.after("products/removeProductTags", function (options) {

  Logger.warn("MethodHooks after products/removeProductTags", options);

  return true;

});

MethodHooks.after("products/updateProductTags", function (options) {

  Logger.warn("MethodHooks after products/updateProductTags", options);

  return true;

});


//handle

MethodHooks.after("products/setHandle", function (options) {

  Logger.warn("MethodHooks after products/setHandle", options);

  return true;

});

MethodHooks.after("products/setHandleTag", function (options) {

  Logger.warn("MethodHooks after products/setHandleTag", options);

  return true;

});

//META

MethodHooks.after("products/updateMetaFields", function (options) {

  Logger.warn("MethodHooks after products/updateMetaFields", options);

  return true;

});

MethodHooks.after("products/removeMetaFields", function (options) {

  Logger.warn("MethodHooks after products/removeMetaFields", options);

  return true;

});


//Others

MethodHooks.after("products/publishProduct", function (options) {

  Logger.warn("MethodHooks after products/publishProduct", options);

  return true;

});

MethodHooks.after("products/toggleVisibility", function (options) {

  Logger.warn("MethodHooks after products/toggleVisibility", options);

  return true;

});
