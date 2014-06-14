// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
tvcm.require('tvcm.promise');
tvcm.require('about_tracing.tracing_controller_client');
tvcm.require('about_tracing.inspector_connection');

tvcm.exportTo('about_tracing', function() {
  function createResolvedPromise(data) {
    var promise = new Promise(function(resolver) {
      if (data)
        resolver.resolve(data);
      else
        resolver.resolve();
    });
    return promise;
  }

  /**
   * Controls tracing using the inspector's FrontendAgentHost APIs.
   *
   * @constructor
   */
  function InspectorTracingControllerClient() {
    this.recording_ = false;
    this.bufferUsage_ = 0;
    this.conn_ = about_tracing.InspectorConnection.instance;
    this.currentTraceTextChunks_ = undefined;
  }

  InspectorTracingControllerClient.prototype = {
    __proto__: about_tracing.TracingControllerClient.prototype,

    beginMonitoring: function(monitoringOptions) {
      throw new Error('Not implemented');
    },

    endMonitoring: function() {
      throw new Error('Not implemented');
    },

    captureMonitoring: function() {
      throw new Error('Not implemented');
    },

    getMonitoringStatus: function() {
      return createResolvedPromise({
        isMonitoring: false,
        categoryFilter: '',
        useSystemTracing: false,
        useContinuousTracing: false,
        useSampling: false
      });
    },

    getCategories: function() {
      return createResolvedPromise(JSON.stringify(['a', 'b', 'c']));
    },

    beginRecording: function(recordingOptions) {
      if (this.recording_)
        throw new Error('Already recording');
      this.recording_ = 'starting';
      var res = this.conn_.req(
          'Tracing.start',
          { bufferUsageReportingInterval: 1000});
      res = res.then(
          function ok() {
            this.conn_.setNotificationListener(
                'Tracing.bufferUsage',
                this.onBufferUsageUpdateFromInspector_.bind(this));
            this.recording_ = true;
          }.bind(this),
          function error() {
            this.recording_ = false;
          }.bind(this));
      return res;
    },

    onBufferUsageUpdateFromInspector_: function(params) {
      this.bufferUsage_ = params.value;
    },

    beginGetBufferPercentFull: function() {
      var that = this;
      return new Promise(function(resolver) {
        setTimeout(function() {
          resolver.resolve(that.bufferUsage_);
        }, 100);
      });
    },

    onDataCollected_: function(messageString) {
      if (typeof messageString !== 'string')
        throw new Error('Invalid data');
      var key = '"params": { "value": [ ';
      var keyBeginIndex = messageString.indexOf(key);
      if (keyBeginIndex == -1)
        throw new Error('Malformed response');

      var expectedEndKey = ' ] } }';
      var actualEndString = messageString.substring(
          messageString.length - expectedEndKey.length);
      if (actualEndString !== expectedEndKey)
        throw new Error('Expected end key not found');

      var dataStartIndex = keyBeginIndex + key.length;
      var data = messageString.substring(
          dataStartIndex, messageString.length - expectedEndKey.length);
      if (this.currentTraceTextChunks_.length > 1)
        this.currentTraceTextChunks_.push(',');
      this.currentTraceTextChunks_.push(data);
    },

    endRecording: function() {
      if (this.recording_ === false)
        return createResolvedPromise();

      if (this.recording_ !== true)
        throw new Error('Cannot end');

      this.currentTraceTextChunks_ = ['['];
      this.conn_.setNotificationListener(
          'Tracing.dataCollected', this.onDataCollected_.bind(this));

      var clearListeners = function() {
        this.conn_.setNotificationListener(
            'Tracing.bufferUsage', undefined);
        this.conn_.setNotificationListener(
            'Tracing.tracingComplete', undefined);
        this.conn_.setNotificationListener(
            'Tracing.dataCollected', undefined);
      }.bind(this);

      this.recording_ = 'stopping';
      return new Promise(function(endRecordingDoneResolver) {
        function tracingComplete() {
          clearListeners();
          this.recording_ = false;
          this.currentTraceTextChunks_.push(']');
          var traceText = this.currentTraceTextChunks_.join('');
          this.currentTraceTextChunks_ = undefined;
          endRecordingDoneResolver.resolve(traceText);
        }

        function tracingFailed(err) {
          clearListeners();
          this.recording_ = false;
          endRecordingDoneResolver.reject(err);
        }

        this.conn_.setNotificationListener(
            'Tracing.tracingComplete', tracingComplete.bind(this));
        this.conn_.req('Tracing.end', {}).then(
            function end(data) {
              // Nothing happens here. We're really waiting for
              // Tracing.tracingComplete.
            }.bind(this),
            tracingFailed.bind(this));
      }.bind(this));
    }
  };

  return {
    InspectorTracingControllerClient: InspectorTracingControllerClient
  };
});
