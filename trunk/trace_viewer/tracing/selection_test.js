// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.timeline_viewport');
tvcm.require('tracing.test_utils');
tvcm.require('tracing.trace_model');
tvcm.require('tracing.selection');
tvcm.require('tracing.tracks.slice_track');

tvcm.unittest.testSuite('tracing.selection_test', function() {
  test('selectionObject', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var t1 = p1.getOrCreateThread(1);
    t1.sliceGroup.pushSlice(
        new tracing.trace_model.ThreadSlice('', 'a', 0, 1, {}, 3));
    t1.sliceGroup.pushSlice(
        new tracing.trace_model.ThreadSlice('', 'a', 0, 5, {}, 1));

    var sel = new tracing.Selection();
    sel.push(t1.sliceGroup.slices[0]);

    assertEquals(1, sel.bounds.min);
    assertEquals(4, sel.bounds.max);
    assertEquals(t1.sliceGroup.slices[0], sel[0]);

    sel.push(t1.sliceGroup.slices[1]);
    assertEquals(1, sel.bounds.min);
    assertEquals(6, sel.bounds.max);
    assertEquals(t1.sliceGroup.slices[1], sel[1]);

    sel.clear();
    assertEquals(0, sel.length);
  });

  test('shiftedSelection', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var t1 = p1.getOrCreateThread(1);
    t1.sliceGroup.pushSlice(
        new tracing.trace_model.ThreadSlice('', 'a', 0, 1, {}, 3));
    t1.sliceGroup.pushSlice(
        new tracing.trace_model.ThreadSlice('', 'a', 0, 5, {}, 1));

    var viewport = new tracing.TimelineViewport();
    var track = new tracing.tracks.SliceTrack(viewport);
    viewport.modelTrackContainer = track;
    track.slices = t1.sliceGroup.slices;

    viewport.rebuildEventToTrackMap();


    var sel = new tracing.Selection();
    sel.push(t1.sliceGroup.slices[0]);

    var shifted = sel.getShiftedSelection(track.viewport, 1);
    assertEquals(1, shifted.length);
    assertEquals(t1.sliceGroup.slices[1], shifted[0]);
  });
});
