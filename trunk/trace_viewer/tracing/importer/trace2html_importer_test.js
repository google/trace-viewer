// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.importer.trace2html_importer');

tvcm.unittest.testSuite('tracing.importer.trace2html_importer_test', function() { // @suppress longLineCheck
  test('simple', function() {
    var html_lines = [
      '<!DOCTYPE HTML>',
      '<script id="viewer-data" type="application/json">',
      btoa('hello'),
      '</script>',
      '<script id="viewer-data" type="application/json">',
      btoa('world'),
      '</script>',
      '</html>'
    ];
    var html_text = html_lines.join('\n');
    assertTrue(tracing.importer.Trace2HTMLImporter.canImport(html_text));

    var m = new tracing.TraceModel();
    var imp = new tracing.importer.Trace2HTMLImporter(m, html_text);
    var subTracesAsBuffers = imp.extractSubtraces();
    var subTracesAsStrings = subTracesAsBuffers.map(function(buffer) {
      var str = '';
      var ary = new Uint8Array(buffer);
      for (var i = 0; i < ary.length; i++)
        str += String.fromCharCode(ary[i]);
      return str;
    });
    assertArrayEquals(['hello', 'world'], subTracesAsStrings);
  });
});
