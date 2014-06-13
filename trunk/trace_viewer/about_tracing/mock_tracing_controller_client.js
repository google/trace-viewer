// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('about_tracing.tracing_controller_client');

tvcm.exportTo('about_tracing', function() {
  function MockTracingControllerClient() {
    this.requests = [];
    this.nextRequestIndex = 0;
    this.allowLooping = false;
  }

  MockTracingControllerClient.prototype = {
    __proto__: about_tracing.TracingControllerClient.prototype,

    expectRequest: function(method, generateResponse) {
      var generateResponseCb;
      if (typeof generateResponse === 'function') {
        generateResponseCb = generateResponse;
      } else {
        generateResponseCb = function() {
          return generateResponse;
        };
      }

      this.requests.push({
        method: method,
        generateResponseCb: generateResponseCb});
    },

    _request: function(method, args) {
      return new Promise(function(resolver) {
        var requestIndex = this.nextRequestIndex;
        if (requestIndex >= this.requests.length)
          throw new Error('Unhandled request');
        if (!this.allowLooping) {
          this.nextRequestIndex++;
        } else {
          this.nextRequestIndex = (this.nextRequestIndex + 1) %
              this.requests.length;
        }

        var req = this.requests[requestIndex];
        assertEquals(req.method, method);
        var resp = req.generateResponseCb(args);
        resolver.resolve(resp);
      }.bind(this));
    },

    assertAllRequestsHandled: function() {
      if (this.allowLooping)
        throw new Error('Incompatible with allowLooping');
      assertTrue(this.nextRequestIndex == this.requests.length);
    },

    beginMonitoring: function(monitoringOptions) {
      return this._request('beginMonitoring', monitoringOptions);
    },

    endMonitoring: function() {
      return this._request('endMonitoring');
    },

    captureMonitoring: function() {
      return this._request('captureMonitoring');
    },

    getMonitoringStatus: function() {
      return this._request('getMonitoringStatus');
    },

    getCategories: function() {
      return this._request('getCategories');
    },

    beginRecording: function(recordingOptions) {
      return this._request('beginRecording', recordingOptions);
    },

    beginGetBufferPercentFull: function() {
      return this._request('beginGetBufferPercentFull');
    },

    endRecording: function() {
      return this._request('endRecording');
    }
  };

  return {
    MockTracingControllerClient: MockTracingControllerClient
  };
});
