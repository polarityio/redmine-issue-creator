'use strict';

polarity.export = PolarityComponent.extend({
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),
  busy: false,
  error: '',
  subject: '',
  description: '',
  details: Ember.computed.alias('block.data.details'),
  projects: Ember.computed.alias('block.data.details.properties.projects'),
  statuses: Ember.computed.alias('block.data.details.properties.statuses'),
  users: Ember.computed.alias('block.data.details.properties.users'),
  trackers: Ember.computed.alias('block.data.details.properties.trackers'),
  defaultTrackerName: Ember.computed.alias('block.data.details.defaultTrackerName'),
  customFields: Ember.computed.alias('block.data.details.properties.customFields'),
  fieldsShadow: Ember.computed('customFields.[]', 'tracker', function () {
    const selectedTracker = this.get('tracker');
    let fields = [];
    for (let i = 0; i < this.get('customFields.length'); i++) {
      let customField = this.get('customFields')[i];
      // only display custom fields if the custom field is for the selected tracker
      if (customField.trackers.find((tracker) => tracker.id === selectedTracker.id)) {
        let source = {};
        source = Object.assign(source, customField);
        source.fieldIndex = i;
        fields.push(Ember.Object.create(source));
      }
    }
    return fields;
  }),
  trackersShadow: Ember.computed('project', function () {
    const projectTrackers = this.get('project.trackers');
    const defaultTracker = projectTrackers.find((tracker) => tracker.name === this.defaultTrackerName);
    if (defaultTracker) {
      this.set('tracker', defaultTracker);
    } else if (projectTrackers.length > 0) {
      this.set('tracker', projectTrackers[0]);
    }

    return projectTrackers;
  }),
  issue: null,
  project: null,
  status: null,
  user: null,
  tracker: null,
  init: function () {
    this._super(...arguments);
    this.set('description', this.block.entity.value);
    this.set('project', this.projects[this.block.data.details.defaultProjectIndex]);
    this.set('tracker', this.trackers[this.block.data.details.defaultTrackerIndex]);
    this.set('user', this.users[this.block.data.details.defaultAssigneeIndex]);
    this.set('status', this.statuses[this.block.data.details.defaultStatusIndex]);
    for (let fieldIndex = 0; fieldIndex < this.customFields.length; fieldIndex++) {
      let field = this.customFields[fieldIndex];
      if (typeof field.regexp === 'string' && field.regexp.length > 0) {
        try {
          field.compiledRegex = new RegExp(field.regexp);
        } catch (e) {
          console.error('Invalid regex', field.regexp);
        }
      }

      if (
        field.field_format === 'string' &&
        typeof field.default_value === 'string' &&
        field.default_value.length > 0
      ) {
        this.set(`customFields.${fieldIndex}.value`, field.default_value);
      } else if (field.field_format === 'list' && field.multiple === false) {
        const defaultValue = field.possible_values.find((item) => item.value === field.default_value);
        if (defaultValue) {
          this.set(`customFields.${fieldIndex}.value`, Object.assign({}, defaultValue));
        } else {
          this.set(`customFields.${fieldIndex}.value`, {});
        }
      } else if (field.field_format === 'list' && field.multiple === true) {
        const defaultValue = field.possible_values.find((item) => item.value === field.default_value);
        if (defaultValue) {
          this.set(`customFields.${fieldIndex}.value`, [Object.assign({}, defaultValue)]);
        } else {
          this.set(`customFields.${fieldIndex}.value`, []);
        }
      } else {
        this.set(`customFields.${fieldIndex}.value`, '');
      }
    }
  },
  debouncedCustomFieldValidation(field) {
    const fieldIndex = field.fieldIndex;
    const compiledRegex = this.customFields[fieldIndex].compiledRegex;
    if (typeof field.min_length === 'number') {
      if (field.value.length < field.min_length) {
        field.set('validationError', `The ${field.name} field must be at least ${field.min_length} characters long`);
        return;
      }
    }
    if (typeof field.max_length === 'number') {
      if (field.value.length > field.max_length) {
        field.set('validationError', `The ${field.name} field must be less than ${field.max_length} characters long`);
        return;
      }
    }
    if (compiledRegex) {
      if (!compiledRegex.test(field.value)) {
        field.set('validationError', `The ${field.name} field must match the regex ${field.regexp}`);
        return;
      }
    }
    field.set('validationError', '');
  },
  actions: {
    toggleIssueCreator: function () {
      this.toggleProperty('viewIssueCreator');
    },
    validateCustomField: function (field, fieldIndex) {
      Ember.run.debounce(this, this.debouncedCustomFieldValidation, field, fieldIndex, 500);
    },
    createIssue: function () {
      if (this.project === null) {
        return this.setError('You must select a project');
      }

      if (this.tracker === null) {
        return this.setError('You must select a tracker');
      }

      if (this.status === null) {
        return this.setError('You must select a status');
      }

      if (this.subject.length === 0) {
        return this.setError('You must set a subject');
      }

      if (this.user === null) {
        return this.setError('You must assign the issue');
      }

      const customFields = this.get('fieldsShadow');
      let missingRequiredField = false;

      customFields.forEach((field) => {
        if (field.is_required && typeof field.value === 'string' && field.value.trim().length === 0) {
          this.setError(field.set('validationError', `${field.name} field is a required field`));
          missingRequiredField = true;
        } else if (field.is_required && Array.isArray(field.value) && field.value.length === 0) {
          this.setError(field.set('validationError', `${field.name} field is a required field`));
          missingRequiredField = true;
        } else if (field.is_required && typeof field.value === 'object' && Object.keys(field.value).length === 0) {
          this.setError(field.set('validationError', `${field.name} field is a required field`));
          missingRequiredField = true;
        }
      });

      if (missingRequiredField) {
        return;
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

      if (customFields.length > 0) {
        payload.custom_fields = [];
      }
      customFields.forEach((field) => {
        if (field.field_format === 'list' && field.multiple === true) {
          payload.custom_fields.push({
            value: field.value.map((item) => item.value),
            id: field.id
          });
        } else if (field.field_format === 'list' && field.multiple === false) {
          payload.custom_fields.push({
            value: field.value.value,
            id: field.id
          });
        } else {
          payload.custom_fields.push({
            value: field.value,
            id: field.id
          });
        }
      });

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
    console.error(error);
    let formattedError;
    if (typeof error === 'string') {
      formattedError = error;
    } else if (
      typeof error.meta === 'object' &&
      typeof error.meta.body === 'object' &&
      Array.isArray(error.meta.body.errors) &&
      error.meta.body.errors.length > 0
    ) {
      formattedError = error.meta.body.errors[0];
    } else if (typeof error.meta === 'object' && typeof error.meta.detail === 'string') {
      formattedError = error.meta.detail;
    } else {
      formattedError = JSON.stringify(error, null, 2);
    }
    this.set('error', formattedError);
  },
  setBusyStatus(status) {
    this.set('busy', status);
  }
});
