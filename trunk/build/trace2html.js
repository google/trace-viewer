// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

var g_timelineViewEl;

(function() {
  var styleEl = document.createElement('style');
  var lines = [
    'html, body {',
    '  box-sizing: border-box;',
    '  overflow: hidden;',
    '  margin: 0px;',
    '  padding: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '}',
    '#timeline-view {',
    '  width: 100%;',
    '  height: 100%;',
    '}'
  ];
  styleEl.textContent = lines.join('\n');
  document.head.appendChild(styleEl);
})();

document.addEventListener('DOMContentLoaded', function() {
  g_timelineViewEl = new tracing.TimelineView();
  g_timelineViewEl.id = 'timeline-view';
  document.body.appendChild(g_timelineViewEl);

  var traces = [];
  var viewerDataScripts = document.querySelectorAll('#viewer-data');
  for (var i = 0; i < viewerDataScripts.length; i++) {
    var text = viewerDataScripts[i].textContent;
    // Trim leading newlines off the text. They happen during writing.
    while (text[0] == '\n')
      text = text.substring(1);
    traces.push(atob(text));
  }

  var m = new tracing.TraceModel();
  var p = m.importTracesWithProgressDialog(traces, true);
  p.then(
      function() {
        g_timelineViewEl.model = m;
        g_timelineViewEl.tabIndex = 1;
        g_timelineViewEl.viewTitle = document.title;
        if (g_timelineViewEl.timeline)
          g_timelineViewEl.timeline.focusElement = g_timelineViewEl;
      },
      function(err) {
        var overlay = new tvcm.ui.Overlay();
        overlay.textContent = tvcm.normalizeException(err).message;
        overlay.title = 'Import error';
        overlay.visible = true;
      });
});
