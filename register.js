import { Reaction } from "/server/api";

// Register package as ReactionCommerce package
Reaction.registerPackage({
  label: "Frappe E-Commerce",
  name: "efrappe",
  icon: "fa fa-vine",
  autoEnable: true,
  registry: [
    {
      provides: "dashboard",
      label: "E-Frappe",
      description: "Frappe Channel configuration",
      icon: "fa fa-gear",
      priority: 2,
      container: "utilities",
      permissions: [{
        label: "E-Frappe",
        permission: "dashboard/efrappe"
      }]
    },
    {
      route: "/desk",
      name: "efrappe/desk",
      workflow: "coreWorkflow",
      provides: "shortcut",
      label: "Desk",
      icon: "fa fa-desktop",
      priority: 1
    },
    {
      route: "index",
      name: "index",
      template: "products"
    }
  ]
});
