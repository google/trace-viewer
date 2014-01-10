// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview ProfilingView glues the View control to
 * TracingController.
 */
base.requireTemplate('about_tracing.profiling_view');
base.requireStylesheet('ui.trace_viewer');
base.require('about_tracing.tracing_ui_client');
base.require('base.promise');
base.require('base.key_event_manager');
base.require('tracing.timeline_view');
base.require('ui');
base.require('ui.info_bar');
base.require('ui.overlay');

/*
 * Here is where we bring in modules that are used in about:tracing UI only.
 */
base.require('tracing.importer');
base.require('cc');
base.require('tcmalloc');
base.require('system_stats');
base.require('gpu');

base.exportTo('about_tracing', function() {
  function readFile(file) {
    return new Promise(function(resolver) {
      var reader = new FileReader();
      var filename = file.name;
      reader.onload = function(data) {
        resolver.resolve(data.target.result);
      };
      reader.onerror = function(err) {
        resolver.reject(err);
      }

      var is_binary = /[.]gz$/.test(filename) || /[.]zip$/.test(filename);
      if (is_binary)
        reader.readAsArrayBuffer(file);
      else
        reader.readAsText(file);
    });
  }

  /**
   * ProfilingView
   * @constructor
   * @extends {HTMLUnknownElement}
   */
  var ProfilingView = ui.define('x-profiling-view');

  ProfilingView.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.appendChild(base.instantiateTemplate('#profiling-view-template'));

      this.timelineView_ = this.querySelector('x-timeline-view');
      this.infoBarGroup_ = this.querySelector('x-info-bar-group');

      ui.decorate(this.infoBarGroup_, ui.InfoBarGroup);
      ui.decorate(this.timelineView_, tracing.TimelineView);

      // Detach the buttons. We will reattach them to the timeline view.
      // TODO(nduca): Make <timeline-view> have a <content select="x-buttons">
      // that pulls in any buttons.
      var buttons = this.querySelector('x-timeline-view-buttons');
      buttons.parentElement.removeChild(buttons);
      this.timelineView_.leftControls.appendChild(buttons);
      this.initButtons_(buttons);

      base.KeyEventManager.instance.addListener(
          'keypress', this.onKeypress_, this);

      this.initDragAndDrop_();

      this.tracingRequestImpl_ = about_tracing.tracingRequest;
      this.isRecording_ = false;
      this.isMonitoring_ = false;
      this.activeTrace_ = undefined;

      window.onMonitoringStateChanged = function (is_monitoring) {
        this.onMonitoringStateChanged_(is_monitoring);
      }.bind(this);
    },

    // Detach all document event listeners. Without this the tests can get
    // confused as the element may still be listening when the next test runs.
    detach_: function() {
      this.detachDragAndDrop_();
    },

    get isRecording() {
      return this.isRecording_;
    },

    get isMonitoring() {
      return this.isMonitoring_;
    },

    set tracingRequestImpl(tracingRequestImpl) {
      this.tracingRequestImpl_ = tracingRequestImpl;
    },

    beginRecording: function() {
      if (this.isRecording_)
        throw new Error('Already recording');
      if (this.isMonitoring_)
        throw new Error('Already monitoring');
      this.isRecording_ = true;
      var buttons = this.querySelector('x-timeline-view-buttons');
      buttons.querySelector('#monitor-checkbox').disabled = true;
      buttons.querySelector('#monitor-checkbox').checked = false;
      var resultPromise = about_tracing.beginRecording(this.tracingRequestImpl_);
      resultPromise.then(
          function(data) {
            this.isRecording_ = false;
            buttons.querySelector('#monitor-checkbox').disabled = false;
            this.setActiveTrace('trace.json', data, false);
          }.bind(this),
          function(err) {
            this.isRecording_ = false;
            buttons.querySelector('#monitor-checkbox').disabled = false;
            if (err instanceof about_tracing.UserCancelledError)
              return;
            ui.Overlay.showError('Error while recording', err);
          }.bind(this));
      return resultPromise;
    },

    checkMonitoringCheckbox_: function(enabled) {
      var buttons = this.querySelector('x-timeline-view-buttons');
      buttons.querySelector('#record-button').disabled = enabled;
      buttons.querySelector('#capture-button').disabled = !enabled;
      buttons.querySelector('#monitor-checkbox').checked = enabled;
    },

    beginMonitoring: function() {
      if (this.isRecording_)
        throw new Error('Already recording');
      if (this.isMonitoring_)
        throw new Error('Already monitoring');
      var buttons = this.querySelector('x-timeline-view-buttons');
      this.checkMonitoringCheckbox_(true);
      var resultPromise =
        about_tracing.beginMonitoring(this.tracingRequestImpl_);
      resultPromise.then(
          function(data) {
          }.bind(this),
          function(err) {
            this.checkMonitoringCheckbox_(false);
            if (err instanceof about_tracing.UserCancelledError)
              return;
            ui.Overlay.showError('Error while monitoring', err);
          }.bind(this));
      return resultPromise;
    },

    endMonitoring: function() {
      if (this.isRecording_)
        throw new Error('Already recording');
      if (!this.isMonitoring_)
        throw new Error('Monitoring is disabled');
      var buttons = this.querySelector('x-timeline-view-buttons');
      this.checkMonitoringCheckbox_(false);
      var resultPromise =
        about_tracing.endMonitoring(this.tracingRequestImpl_);
      resultPromise.then(
          function(data) {
          }.bind(this),
          function(err) {
            if (err instanceof about_tracing.UserCancelledError)
              return;
            ui.Overlay.showError('Error while monitoring', err);
          }.bind(this));
      return resultPromise;
    },

    captureMonitoring: function() {
      if (!this.isMonitoring_)
        throw new Error('Monitoring is disabled');
      var resultPromise =
        about_tracing.captureMonitoring(this.tracingRequestImpl_);
      resultPromise.then(
          function(data) {
            this.setActiveTrace('trace.json', data, true);
          }.bind(this),
          function(err) {
            if (err instanceof about_tracing.UserCancelledError)
              return;
            ui.Overlay.showError('Error while monitoring', err);
          }.bind(this));
      return resultPromise;
    },

    onMonitoringStateChanged_: function(is_monitoring) {
      this.isMonitoring_ = is_monitoring;
      var buttons = this.querySelector('x-timeline-view-buttons');
      buttons.querySelector('#monitor-checkbox').checked = is_monitoring;
    },

    onKeypress_: function(event) {
      if (document.activeElement.nodeName === 'INPUT')
        return;

      if (!this.isRecording &&
          event.keyCode === 'r'.charCodeAt(0)) {
        this.beginRecording();
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    },

    get timelineView() {
      return this.timelineView_;
    },

    ///////////////////////////////////////////////////////////////////////////

    clearActiveTrace: function() {
      this.saveButton_.disabled = true;
      this.activeTrace_ = undefined;
    },

    setActiveTrace: function(filename, data) {
      this.activeTrace_ = {
        filename: filename,
        data: data
      };

      this.infoBarGroup_.clearMessages();
      this.saveButton_.disabled = false;
      this.timelineView_.viewTitle = filename;

      var m = new tracing.TraceModel();
      var p = m.importTracesWithProgressDialog([data], true);
      p.then(
          function() {
            this.timelineView_.model = m;
          }.bind(this),
          function(err) {
            ui.Overlay.showError('While importing: ', err);
          }.bind(this));
    },

    ///////////////////////////////////////////////////////////////////////////

    initButtons_: function(buttons) {
      buttons.querySelector('#record-button').addEventListener(
          'click', function() {
            this.beginRecording();
          }.bind(this));

      buttons.querySelector('#monitor-checkbox').addEventListener(
          'click', function() {
            if (buttons.querySelector('#monitor-checkbox').checked)
              this.beginMonitoring();
            else
              this.endMonitoring();
          }.bind(this));

      buttons.querySelector('#capture-button').addEventListener(
          'click', function() {
            this.captureMonitoring();
          }.bind(this));
      buttons.querySelector('#capture-button').disabled = true;

      buttons.querySelector('#load-button').addEventListener(
          'click', this.onLoadClicked_.bind(this));

      this.saveButton_ = buttons.querySelector('#save-button');
      this.saveButton_.addEventListener('click',
                                        this.onSaveClicked_.bind(this));
      this.saveButton_.disabled = true;
    },

    onSaveClicked_: function() {
      // Create a blob URL from the binary array.
      var blob = new Blob([this.activeTrace_.data],
                          {type: 'application/octet-binary'});
      var blobUrl = window.webkitURL.createObjectURL(blob);

      // Create a link and click on it. BEST API EVAR!
      var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
      link.href = blobUrl;
      link.download = this.activeTrace_.filename;
      link.click();
    },

    onLoadClicked_: function() {
      var inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.multiple = false;

      var changeFired = false;
      inputElement.addEventListener(
          'change',
          function(e) {
            if (changeFired)
              return;
            changeFired = true;

            var file = inputElement.files[0];
            readFile(file).then(
                function(data) {
                  this.setActiveTrace(file.name, data);
                }.bind(this),
                function(err) {
                  ui.Overlay.showError('Error while loading file: ' + err);
                });
          }.bind(this), false);
      inputElement.click();
    },

    ///////////////////////////////////////////////////////////////////////////

    initDragAndDrop_: function() {
      this.dropHandler_ = this.dropHandler_.bind(this);
      this.ignoreDragEvent_ = this.ignoreDragEvent_.bind(this);
      document.addEventListener('dragstart', this.ignoreDragEvent_, false);
      document.addEventListener('dragend', this.ignoreDragEvent_, false);
      document.addEventListener('dragenter', this.ignoreDragEvent_, false);
      document.addEventListener('dragleave', this.ignoreDragEvent_, false);
      document.addEventListener('dragover', this.ignoreDragEvent_, false);
      document.addEventListener('drop', this.dropHandler_, false);
    },

    detachDragAndDrop_: function() {
      document.removeEventListener('dragstart', this.ignoreDragEvent_);
      document.removeEventListener('dragend', this.ignoreDragEvent_);
      document.removeEventListener('dragenter', this.ignoreDragEvent_);
      document.removeEventListener('dragleave', this.ignoreDragEvent_);
      document.removeEventListener('dragover', this.ignoreDragEvent_);
      document.removeEventListener('drop', this.dropHandler_);
    },

    ignoreDragEvent_: function(e) {
      e.preventDefault();
      return false;
    },

    dropHandler_: function(e) {
      if (this.isAnyDialogUp_)
        return;

      e.stopPropagation();
      e.preventDefault();

      var files = e.dataTransfer.files;
      if (files.length !== 1) {
        ui.Overlay.showError('1 file supported at a time.');
        return;
      }

      readFile(files[0]).then(
          function(data) {
            this.setActiveTrace(files[0].name, data);
          }.bind(this),
          function(err) {
            ui.Overlay.showError('Error while loading file: ' + err);
          });
      return false;
    }
  };

  return {
    ProfilingView: ProfilingView
  };
});
