module.exports = {
  name: 'Redmine Issue Creator',
  acronym: 'RED',
  description: 'Create issues for supported indicators in the Redmine Project management software',
  entityTypes: ['IPv4', 'MD5', 'SHA1', 'SHA256', 'domain', 'email', 'url', 'IPv6', 'IPv4CIDR'],
  onDemandOnly: true,
  logging: { level: 'info' },
  defaultColor: 'light-purple',
  block: {
    component: {
      file: './components/redmine.js'
    },
    template: {
      file: './templates/redmine.hbs'
    }
  },
  styles: ['./styles/redmine.less'],
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: ''
  },
  options: [
    {
      key: 'url',
      name: 'Redmine Server URL',
      description:
        'The URL for your Redmine instance to include the schema (i.e., https://) and port (e.g., https://redmine:8080) as necessary',
      type: 'text',
      default: '',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'adminApiKey',
      name: 'Redmine Administrator REST API Key',
      description:
        'A REST API Key for your Redmine administrator.  This key is used to retrieve user, status, project, and tracker information when the integration first starts.  The Admin API Key is not used for creating issues.  >> Please restart the integration after modifying this option.  This option should be set to "Only admins can view and edit"',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'apiKey',
      name: 'Redmine User REST API Key',
      description:
        'The REST API Key used to authenticate to your Redmine instance.  The user associated with this key will be the creator of the new issue.  This option should be set to "Users can view and edit"',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'validProjects',
      name: 'Available Projects',
      description:
        'Comma delimited list of project names that are available to add issues to. Project names are case sensitive. If left blank all available projects will be listed.  The integration must be restarted after making changes to this option.  This open must be set to "Only admins can view and edit"',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'defaultProject',
      name: 'Default Project Name',
      description: 'The default project to create your new issue in.  The project name is case sensitive.',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'defaultTracker',
      name: 'Default Tracker Name',
      description:
        'The default tracker type for your new issue (e.g., Bug, Support, Incident).  The tracker name is case sensitive.',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'defaultStatus',
      name: 'Default Status Name',
      description:
        'The default status type for your new issue (e.g., New, In Progress, Resolved).  The status name is case sensitive.',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'defaultAssignee',
      name: 'Default Assignee Login',
      description:
        "The default assignee for your new issue.  You should specify a user's login for this option.  The login value is case sensitive.",
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
