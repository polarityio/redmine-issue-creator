module.exports = {
  name: 'Redmine Issue Creator',
  acronym: 'RED',
  pdescription: 'Searches issues for supported indicators in the Redmine Project management software',
  entityTypes: ['ipv4', 'hash', 'domain', 'email'],
  logging: { level: 'info' },
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
    proxy: '',
    /**
     * If set to false, the integration will ignore SSL errors.  This will allow the integration to connect
     * to the server without valid SSL certificates.  Please note that we do NOT recommending setting this
     * to false in a production environment.
     */
    rejectUnauthorized: true
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
      key: 'apiKey',
      name: 'Redmine REST APIKey',
      description:
        'The REST API Key used to authenticate to your Redmine instance. If left blank, no authentication will be used when communicating with the specified Redmine instance',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    }
    // {
    //   key: 'project',
    //   name: 'Default Project',
    //   description: 'The name of a single project to search.  If left blank, all projects will be searched.',
    //   default: '',
    //   type: 'text',
    //   userCanEdit: true,
    //   adminOnly: false
    // }
  ]
};
