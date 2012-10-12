// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('test_utils');
base.require('timeline_model');
base.require('timeline_selection');
base.require('tracks.timeline_thread_track');
base.require('tracks.timeline_counter_track');

/**
 * @fileoverview Helper functions for use in analysis tests.
 */

base.exportTo('tracing', function() {

    var TimelineSelection = tracing.TimelineSelection;

    var newSliceNamed = test_utils.newSliceNamed;
    var newSliceCategory = test_utils.newSliceCategory;

    function createReferenceData(withCategory) {
      var model = new tracing.TimelineModel();
      var p1 = model.getOrCreateProcess(1);
      var t1 = p1.getOrCreateThread(1);
      if (withCategory)
        t1.pushSlice(newSliceCategory('foo', 'b', 0, 0.002));
      else
        t1.pushSlice(newSliceNamed('b', 0, 0.002));
      t1.pushSlice(newSliceNamed('b', 0, 0.002));
      t1.pushSlice(newSliceNamed('c', 0, 0.002));

      var ctr1 = p1.getOrCreateCounter('foo', 'ctr1');
      ctr1.seriesNames.push('bytesallocated', 'bytesfree');
      ctr1.seriesColors.push(0, 1);
      ctr1.timestamps.push(0, 10, 20);
      ctr1.samples.push(0, 25, 10, 15, 20, 5);

      var ctr2 = p1.getOrCreateCounter('foo', 'ctr2');
      ctr2.seriesNames.push('bytesallocated', 'bytesfree');
      ctr2.seriesColors.push(0, 1);
      ctr2.timestamps.push(0, 10, 20);
      ctr2.samples.push(0, 25, 10, 15, 20, 5);

      var t1track = new tracks.TimelineThreadTrack();
      t1track.thread = t1;
      var ctr1track = new tracks.TimelineCounterTrack();
      ctr1track.counter = ctr1;

      var ctr2track = new tracks.TimelineCounterTrack();
      ctr2track.counter = ctr2;

      decorateTrackWithTestHelpers(t1track);

      return {model: model,
              t1track: t1track,
              ctr1track: ctr1track,
              ctr2track: ctr2track};
    }

    function decorateTrackWithTestHelpers(track) {
      track.selectByTitle = function(title, selection) {
        track.addAllObjectsMatchingFilterToSelection(
            new tracing.TimelineTitleFilter(title), selection);
      }
    }

    return {
      createReferenceData: createReferenceData,
      decorateTrackWithTestHelpers: decorateTrackWithTestHelpers
    };
});

