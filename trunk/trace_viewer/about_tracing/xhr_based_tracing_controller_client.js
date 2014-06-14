// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
tvcm.require('tvcm.promise');
tvcm.require('about_tracing.tracing_controller_client');

tvcm.exportTo('about_tracing', function() {
  function beginXhr(method, path, data) {
    if (data === undefined)
      data = null;
    return new Promise(function(resolver) {
      var req = new XMLHttpRequest();
      if (method != 'POST' && data !== null)
        throw new Error('Non-POST should have data==null');
      req.open(method, path, true);
      req.onreadystatechange = function(e) {
        if (req.readyState == 4) {
          window.setTimeout(function() {
            if (req.status == 200 && req.responseText != '##ERROR##') {
              resolver.resolve(req.responseText);
            } else {
              resolver.reject(new Error('Error occured at ' + path));
            }
          }, 0);
        }
      };
      req.send(data);
    });
  }

  /**
   * @constructor
   */
  function XhrBasedTracingControllerClient() {
  }

  XhrBasedTracingControllerClient.prototype = {
    __proto__: about_tracing.TracingControllerClient.prototype,

    beginMonitoring: function(monitoringOptions) {
      var monitoringOptionsB64 = btoa(JSON.stringify(monitoringOptions));
      return beginXhr('GET', '/json/begin_monitoring?' + monitoringOptionsB64);
    },

    endMonitoring: function() {
      return beginXhr('GET', '/json/end_monitoring');
    },

    captureMonitoring: function() {
      return beginXhr('GET', '/json/capture_monitoring');
    },

    getMonitoringStatus: function() {
      return beginXhr('GET', '/json/get_monitoring_status').then(
          function(monitoringOptionsB64) {
            return JSON.parse(atob(monitoringOptionsB64));
          });
    },

    getCategories: function() {
      return beginXhr('GET', '/json/categories');
    },

    beginRecording: function(recordingOptions) {
      var recordingOptionsB64 = btoa(JSON.stringify(recordingOptions));
      return beginXhr('GET', '/json/begin_recording?' +
                      recordingOptionsB64);
    },

    beginGetBufferPercentFull: function() {
      return beginXhr('GET', '/json/get_buffer_percent_full');
    },

    endRecording: function() {
      return beginXhr('GET', '/json/end_recording');
    }
  };

  return {
    XhrBasedTracingControllerClient: XhrBasedTracingControllerClient
  };
});
