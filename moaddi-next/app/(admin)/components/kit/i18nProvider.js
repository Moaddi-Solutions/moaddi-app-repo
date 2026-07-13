// Minimal english i18nProvider for ra-core (replaces ra-language-english +
// polyglot, which shipped with the MUI react-admin bundle). Only the ra.*
// keys the headless core actually emits are mapped; unknown keys fall back
// to the `_` default or a humanized last segment.

const messages = {
  "ra.action.add": "Add",
  "ra.action.back": "Back",
  "ra.action.cancel": "Cancel",
  "ra.action.clear_input_value": "Clear value",
  "ra.action.confirm": "Confirm",
  "ra.action.create": "Create",
  "ra.action.delete": "Delete",
  "ra.action.edit": "Edit",
  "ra.action.refresh": "Refresh",
  "ra.action.remove": "Remove",
  "ra.action.save": "Save",
  "ra.action.search": "Search",
  "ra.action.show": "Show",
  "ra.action.undo": "Undo",
  "ra.auth.auth_check_error": "Please login to continue",
  "ra.auth.logout": "Logout",
  "ra.auth.sign_in": "Sign in",
  "ra.auth.sign_in_error": "Authentication failed, please retry",
  "ra.auth.username": "Username",
  "ra.auth.password": "Password",
  "ra.message.error": "A client error occurred and your request couldn't be completed.",
  "ra.message.invalid_form": "The form is not valid. Please check for errors",
  "ra.message.loading": "Loading",
  "ra.message.no": "No",
  "ra.message.not_found": "Either you typed a wrong URL, or you followed a bad link.",
  "ra.message.yes": "Yes",
  "ra.navigation.no_results": "No results found",
  "ra.navigation.page_out_of_boundaries": "Page number %{page} out of boundaries",
  "ra.navigation.previous": "Previous",
  "ra.navigation.next": "Next",
  "ra.notification.canceled": "Action cancelled",
  "ra.notification.created": "Element created",
  "ra.notification.data_provider_error": "dataProvider error. Check the console for details.",
  "ra.notification.deleted": "Element deleted |||| %{smart_count} elements deleted",
  "ra.notification.http_error": "Server communication error",
  "ra.notification.item_doesnt_exist": "Element does not exist",
  "ra.notification.logged_out": "Your session has ended, please reconnect.",
  "ra.notification.not_authorized": "You're not authorized to access this resource.",
  "ra.notification.updated": "Element updated |||| %{smart_count} elements updated",
  "ra.page.create": "Create %{name}",
  "ra.page.dashboard": "Dashboard",
  "ra.page.edit": "%{name} %{recordRepresentation}",
  "ra.page.empty": "No %{name} yet.",
  "ra.page.error": "Something went wrong",
  "ra.page.invite": "Do you want to add one?",
  "ra.page.list": "%{name}",
  "ra.page.loading": "Loading",
  "ra.page.not_found": "Not Found",
  "ra.page.show": "%{name} %{recordRepresentation}",
  "ra.validation.email": "Must be a valid email",
  "ra.validation.maxLength": "Must be %{max} characters or less",
  "ra.validation.maxValue": "Must be %{max} or less",
  "ra.validation.minLength": "Must be %{min} characters at least",
  "ra.validation.minValue": "Must be at least %{min}",
  "ra.validation.number": "Must be a number",
  "ra.validation.oneOf": "Must be one of: %{options}",
  "ra.validation.regex": "Must match a specific format (regexp): %{pattern}",
  "ra.validation.required": "Required",
  "ra.validation.unique": "Must be unique",
};

const humanize = (key) => {
  const last = String(key).split(".").pop();
  const words = last
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const interpolate = (template, options = {}) =>
  template.replace(/%\{(\w+)\}/g, (match, name) =>
    options[name] != null ? String(options[name]) : match,
  );

const translate = (key, options = {}) => {
  let template = messages[key];
  if (template == null) {
    if (options._ != null) return interpolate(String(options._), options);
    return humanize(key);
  }
  if (template.includes("||||")) {
    const [singular, plural] = template.split("||||").map((part) => part.trim());
    template = Number(options.smart_count) === 1 || options.smart_count == null ? singular : plural;
  }
  return interpolate(template, options);
};

const i18nProvider = {
  translate,
  changeLocale: () => Promise.resolve(),
  getLocale: () => "en",
};

export default i18nProvider;
