// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.selection');
tvcm.require('tracing.trace_model.event');
tvcm.require('tracing.trace_model.object_collection');
tvcm.require('tracing.timeline_viewport');
tvcm.require('tracing.tracks.drawing_container');
tvcm.require('tracing.tracks.object_instance_track');

tvcm.unittest.testSuite('tracing.tracks.object_instance_track_test', function() { // @suppress longLineCheck
  var Selection = tracing.Selection;
  var ObjectInstanceTrack = tracing.tracks.ObjectInstanceTrack;
  var Viewport = tracing.TimelineViewport;

  var createObjects = function() {
    var objects = new tracing.trace_model.ObjectCollection({});
    objects.idWasCreated('0x1000', 'cc', 'Frame', 10);
    objects.addSnapshot('0x1000', 'cc', 'Frame', 10, 'snapshot-1');
    objects.addSnapshot('0x1000', 'cc', 'Frame', 25, 'snapshot-2');
    objects.addSnapshot('0x1000', 'cc', 'Frame', 40, 'snapshot-3');
    objects.idWasDeleted('0x1000', 'cc', 'Frame', 45);

    objects.idWasCreated('0x1001', 'skia', 'Picture', 20);
    objects.addSnapshot('0x1001', 'skia', 'Picture', 20, 'snapshot-1');
    objects.idWasDeleted('0x1001', 'skia', 'Picture', 25);
    return objects;
  };

  test('instantiate', function() {
    var objects = createObjects();
    var frames = objects.getAllInstancesByTypeName()['Frame'];
    frames[0].snapshots[1].selectionState =
        tracing.trace_model.SelectionState.SELECTED;

    var div = document.createElement('div');
    this.addHTMLOutput(div);

    var viewport = new Viewport(div);
    var drawingContainer = new tracing.tracks.DrawingContainer(viewport);
    div.appendChild(drawingContainer);

    var track = ObjectInstanceTrack(viewport);
    drawingContainer.invalidate();
    drawingContainer.appendChild(track);

    track.heading = 'testBasic';
    track.objectInstances = frames;
    var dt = new tracing.TimelineDisplayTransform();
    dt.xSetWorldBounds(0, 50, track.clientWidth);
    track.viewport.setDisplayTransformImmediately(dt);
  });

  test('selectionHitTestingWithThreadTrack', function() {
    var objects = createObjects();
    var frames = objects.getAllInstancesByTypeName()['Frame'];

    var track = ObjectInstanceTrack(new Viewport());
    track.objectInstances = frames;

    // Hit outside range
    var selection = new Selection();
    track.addIntersectingItemsInRangeToSelectionInWorldSpace(
        8, 8.1, 0.1, selection);
    assertEquals(0, selection.length);

    // Hit the first snapshot, via pixel-nearness.
    selection = new Selection();
    track.addIntersectingItemsInRangeToSelectionInWorldSpace(
        9.98, 9.99, 0.1, selection);
    assertEquals(1, selection.length);
    assertTrue(selection[0] instanceof tracing.trace_model.ObjectSnapshot);

    // Hit the instance, between the 1st and 2nd snapshots
    selection = new Selection();
    track.addIntersectingItemsInRangeToSelectionInWorldSpace(
        20, 20.1, 0.1, selection);
    assertEquals(1, selection.length);
    assertTrue(selection[0] instanceof tracing.trace_model.ObjectInstance);
  });

  test('addItemNearToProvidedEventToSelection', function() {
    var objects = createObjects();
    var frames = objects.getAllInstancesByTypeName()['Frame'];

    var track = ObjectInstanceTrack(new Viewport());
    track.objectInstances = frames;

    var instance = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'n', 10);

    assertDoesNotThrow(function() {
      track.addItemNearToProvidedEventToSelection(instance, 0, undefined);
    });
  });
});
