// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.find_control');

tvcm.unittest.testSuite('tracing.find_control_test', function() {
  /*
   * Just enough of the Timeline to support the tests below.
   */
  var FakeTimeline = tvcm.ui.define('div');

  FakeTimeline.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.addAllObjectsMatchingFilterToSelectionReturnValue = [];

      this.selection = new tracing.Selection();
      this.highlight = new tracing.Selection();
      this.keyHelp = '<keyHelp>';

      // Put some simple UI in for testing purposes.
      var noteEl = document.createElement('div');
      noteEl.textContent = 'FakeTimeline:';
      this.appendChild(noteEl);

      this.statusEl_ = document.createElement('div');
      this.appendChild(this.statusEl_);
      this.refresh_();
    },

    refresh_: function() {
      var status;
      if (this.model)
        status = 'model=set';
      else
        status = 'model=undefined';
      this.statusEl_.textContent = status;
    },

    addAllObjectsMatchingFilterToSelection: function(filter, selection) {
      var n = this.addAllObjectsMatchingFilterToSelectionReturnValue.length;
      for (var i = 0; i < n; i++) {
        selection.push(
            this.addAllObjectsMatchingFilterToSelectionReturnValue[i]);
      }
    },

    setHighlightAndClearSelection: function(highlight) {
      this.highlight = highlight;
    }
  };

  test('instantiate', function() {
    var ctl = new tracing.FindControl();
    ctl.controller = {
      findNext: function() {
      },

      findPrevious: function() {
      },

      reset: function() {},

      filterHits: ['a', 'b'],

      currentHitIndex: 0
    };

    this.addHTMLOutput(ctl);
  });

  test('findControllerNoTimeline', function() {
    var controller = new tracing.FindController();
    controller.findNext();
    controller.findPrevious();
  });

  test('findControllerEmptyHit', function() {
    var timeline = new FakeTimeline();
    var controller = new tracing.FindController();
    controller.timeline = timeline;

    timeline.selection = new tracing.Selection();
    timeline.highlight = new tracing.Selection();
    controller.findNext();
    assertArrayShallowEquals([], timeline.selection);
    assertArrayShallowEquals([], timeline.highlight);
    controller.findPrevious();
    assertArrayShallowEquals([], timeline.selection);
    assertArrayShallowEquals([], timeline.highlight);
  });

  test('findControllerOneHit', function() {
    var timeline = new FakeTimeline();
    var controller = new tracing.FindController();
    controller.timeline = timeline;

    timeline.addAllObjectsMatchingFilterToSelectionReturnValue = [1];
    controller.filterText = 'asdf';

    assertArrayShallowEquals([], timeline.selection);
    assertArrayShallowEquals([1], timeline.highlight);
    controller.findNext();
    assertArrayShallowEquals([1], timeline.selection);
    assertArrayShallowEquals([1], timeline.highlight);
    controller.findNext();
    assertArrayShallowEquals([1], timeline.selection);
    assertArrayShallowEquals([1], timeline.highlight);
    controller.findPrevious();
    assertArrayShallowEquals([1], timeline.selection);
    assertArrayShallowEquals([1], timeline.highlight);
  });

  test('findControllerMultipleHits', function() {
    var timeline = new FakeTimeline();
    var controller = new tracing.FindController();
    controller.timeline = timeline;

    timeline.addAllObjectsMatchingFilterToSelectionReturnValue = [1, 2, 3];
    controller.filterText = 'asdf';

    // Loop through hits then when we wrap, try moving backward.
    assertArrayShallowEquals([], timeline.selection);
    assertArrayShallowEquals([1, 2, 3], timeline.highlight);
    controller.findNext();
    assertArrayShallowEquals([1], timeline.selection);
    controller.findNext();
    assertArrayShallowEquals([2], timeline.selection);
    controller.findNext();
    assertArrayShallowEquals([3], timeline.selection);
    controller.findNext();
    assertArrayShallowEquals([1], timeline.selection);
    controller.findPrevious();
    assertArrayShallowEquals([3], timeline.selection);
    controller.findPrevious();
    assertArrayShallowEquals([2], timeline.selection);
    assertArrayShallowEquals([1, 2, 3], timeline.highlight);
  });

  test('findControllerChangeFilterAfterNext', function() {
    var timeline = new FakeTimeline();
    var controller = new tracing.FindController();
    controller.timeline = timeline;

    timeline.addAllObjectsMatchingFilterToSelectionReturnValue = [1, 2, 3];
    controller.filterText = 'asdf';

    // Loop through hits then when we wrap, try moving backward.
    controller.findNext();
    timeline.addAllObjectsMatchingFilterToSelectionReturnValue = [4];
    controller.filterText = 'asdfsf';
    controller.findNext();
    assertArrayShallowEquals([4], timeline.selection);
  });

  test('findControllerSelectsAllItemsFirst', function() {
    var timeline = new FakeTimeline();
    var controller = new tracing.FindController();
    controller.timeline = timeline;

    timeline.addAllObjectsMatchingFilterToSelectionReturnValue = [1, 2, 3];
    controller.filterText = 'asdfsf';
    assertArrayShallowEquals([], timeline.selection);
    assertArrayShallowEquals([1, 2, 3], timeline.highlight);
    controller.findNext();
    assertArrayShallowEquals([1], timeline.selection);
    controller.findNext();
    assertArrayShallowEquals([2], timeline.selection);
    assertArrayShallowEquals([1, 2, 3], timeline.highlight);
  });

  test('findControllerWithRealTimeline', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var t1 = p1.getOrCreateThread(1);
    t1.sliceGroup.pushSlice(new tracing.trace_model.ThreadSlice(
        '', 'a', 0, 1, {}, 3));

    var timeline = new tracing.TimelineTrackView();
    timeline.model = model;

    var controller = new tracing.FindController();
    controller.timeline = timeline;

    // Test find with no filterText.
    controller.findNext();

    // Test find with filter txt.
    controller.filterText = 'a';
    assertArrayEquals([], timeline.selection);
    assertArrayEquals(t1.sliceGroup.slices, timeline.highlight);

    controller.findNext();
    assertEquals(1, timeline.selection.length);
    assertEquals(t1.sliceGroup.slices[0], timeline.selection[0]);

    controller.filterText = 'xxx';
    assertEquals(0, timeline.highlight.length);
    assertEquals(0, timeline.selection.length);
    controller.findNext();
    assertEquals(0, timeline.selection.length);
    controller.findNext();
    assertEquals(0, timeline.selection.length);
  });
});
