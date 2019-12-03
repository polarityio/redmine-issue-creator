'use strict';

polarity.export = PolarityComponent.extend({
  timezone: Ember.computed('Intl', function() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  busy: false,
  error: '',
  subject: '',
  description: '',
  projects: Ember.computed.alias('block.data.details.projects'),
  statuses: Ember.computed.alias('block.data.details.statuses'),
  users: Ember.computed.alias('block.data.details.users'),
  trackers: Ember.computed.alias('block.data.details.trackers'),
  issue: null,
  project: null,
  status: null,
  user: null,
  tracker: null,
  init: function() {
    this._super(...arguments);
    this.set('description', this.block.entity.value);
  },
  actions: {
    createIssue: function() {
      if(this.project === null){
        return this.setError('You must select a project');
      }

      if(this.tracker === null){
        return this.setError('You must select a tracker');
      }

      if(this.status === null){
        return this.setError('You must select a status');
      }

      if(this.subject.length === 0){
        return this.setError('You must set a subject');
      }

      if(this.user === null){
        return this.setError('You must assign the issue');
      }

      this.setBusyStatus(true);
      this.setError('');
      this.set('issue', null);
      let payload = {
        project_id: this.project.id,
        status_id: this.status.id,
        assigned_to_id: this.user.id,
        description: this.description,
        tracker_id: this.tracker.id,
        subject: this.subject
      };

      this.sendIntegrationMessage(payload)
        .then((issue) => {
          this.set('issue', issue);
        })
        .catch((err) => {
          this.setError(err);
        })
        .finally(() => {
          this.setBusyStatus(false);
        });
    }
  },
  setError(error) {
    let formattedError;
    if (typeof error === 'string') {
      formattedError = error;
    } else if (typeof error.detail === 'string') {
      formattedError = error.detail;
    } else {
      formattedError = JSON.stringify(error, null, 2);
    }
    this.set('error', formattedError);
  },
  setBusyStatus(status) {
    this.set('busy', status);
  }
});
