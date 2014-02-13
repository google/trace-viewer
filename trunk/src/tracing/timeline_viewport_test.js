// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.timeline_viewport');

tvcm.unittest.testSuite('tracing.timeline_viewport_test', function() {
  test('memoization', function() {

    var vp = new tracing.TimelineViewport(document.createElement('div'));

    var slice = { guid: 1 };

    vp.modelTrackContainer = {
      addEventsToTrackMap: function(eventToTrackMap) {
        eventToTrackMap.addEvent(slice, 'track');
      },
      addEventListener: function() {}
    };

    assertUndefined(vp.trackForEvent(slice));
    vp.rebuildEventToTrackMap();

    assertEquals('track', vp.trackForEvent(slice));
  });
});
