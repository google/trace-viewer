// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.timeline_viewport');
tvcm.require('tracing.tracks.drawing_container');
tvcm.require('tracing.tracks.ruler_track');

tvcm.unittest.testSuite('tracing.tracks.ruler_track_test', function() {
  test('instantiate', function() {
    var div = document.createElement('div');
    this.addHTMLOutput(div);

    var viewport = new tracing.TimelineViewport(div);
    var drawingContainer = new tracing.tracks.DrawingContainer(viewport);
    div.appendChild(drawingContainer);

    var track = tracing.tracks.RulerTrack(viewport);
    drawingContainer.appendChild(track);
    drawingContainer.invalidate();

    var dt = new tracing.TimelineDisplayTransform();
    dt.setPanAndScale(0, track.clientWidth / 1000);
    track.viewport.setDisplayTransformImmediately(dt);
  });
});
