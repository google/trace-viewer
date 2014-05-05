// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.trace_model');
tvcm.require('tracing.importer.importer');
tvcm.require('tracing.importer.simple_line_reader');
tvcm.require('tvcm.base64');

tvcm.exportTo('tracing.importer', function() {

  function Trace2HTMLImporter(model, events) {
    this.importPriority = 0;
    this.events_ = events;
  }

  function _extractEventsFromHTML(text, produce_result) {
    var failure = {ok: false};
    if (produce_result === undefined)
      produce_result = true;

    if (/^<!DOCTYPE HTML>/.test(text) == false)
      return failure;
    var r = new tracing.importer.SimpleLineReader(text);

    // Try to find viewer-data...
    var subtraces = [];
    while (true) {
      if (!r.advanceToLineMatching(
          /^<script id="viewer-data" type="application\/json">$/))
        break;

      r.beginSavingLines();
      if (!r.advanceToLineMatching(/^<\/script>$/))
        return failure;

      var raw_events = r.endSavingLinesAndGetResult();

      // Drop off first and last event as it contains the </script> tag.
      raw_events = raw_events.slice(1, raw_events.length - 1);
      var data64 = raw_events.join('\n');
      var buffer = new ArrayBuffer(
          tvcm.Base64.getDecodedBufferLength(data64));
      var len = tvcm.Base64.DecodeToTypedArray(data64, new DataView(buffer));
      subtraces.push(buffer.slice(0, len));
    }
    if (subtraces.length == 0)
      return failure;
    return {
      ok: true,
      subtraces: produce_result ? subtraces : undefined
    };
  }

  Trace2HTMLImporter.canImport = function(events) {
    return _extractEventsFromHTML(events, false).ok;
  };

  Trace2HTMLImporter.prototype = {
    __proto__: tracing.importer.Importer.prototype,

    extractSubtraces: function() {
      return _extractEventsFromHTML(this.events_, true).subtraces;
    },

    importEvents: function() {
    }
  };


  tracing.TraceModel.registerImporter(Trace2HTMLImporter);


  return {
    Trace2HTMLImporter: Trace2HTMLImporter
  };
});
