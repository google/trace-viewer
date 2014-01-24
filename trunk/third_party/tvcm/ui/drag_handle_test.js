// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('ui.drag_handle');

base.unittest.testSuite('ui.drag_handle', function() {
  var createDragHandle = function() {
    var el = document.createElement('div');
    el.style.border = '1px solid black';
    el.style.width = '200px';
    el.style.height = '200px';
    el.style.display = '-webkit-flex';
    el.style.webkitFlexDirection = 'column';

    var upperEl = document.createElement('div');
    upperEl.style.webkitFlex = '1 1 auto';

    var lowerEl = document.createElement('div');
    lowerEl.style.height = '100px';

    var dragHandle = new ui.DragHandle();
    dragHandle.target = lowerEl;

    el.appendChild(upperEl);
    el.appendChild(dragHandle);
    el.appendChild(lowerEl);
    el.upperEl = upperEl;
    el.dragHandle = dragHandle;
    el.lowerEl = lowerEl;

    el.getLowerElHeight = function() {
      return parseInt(getComputedStyle(this.lowerEl).height);
    };
    return el;
  };

  test('instantiate', function() {
    this.addHTMLOutput(createDragHandle());
  });

  test('applyDelta', function() {
    var el = createDragHandle();
    document.body.appendChild(el);

    var dragHandle = el.dragHandle;
    var oldHeight = el.getLowerElHeight();
    dragHandle.applyDelta_(10);
    assertEquals(oldHeight + 10, el.getLowerElHeight());

    document.body.removeChild(el);
  });

  test('classNameMutation', function() {
    var el = createDragHandle();

    var styleEl = document.createElement('style');
    styleEl.textContent =
        '.mode-a { height: 100px; } .mode-b { height: 50px; }';
    document.head.appendChild(styleEl);

    document.body.appendChild(el);

    var dragHandle = el.dragHandle;
    el.lowerEl.className = 'mode-a';
    assertEquals(100, el.getLowerElHeight());

    dragHandle.applyDelta_(10);
    assertEquals(110, el.getLowerElHeight());

    // Change the class, which should restore the layout
    // to the default sizing for mode-b
    el.lowerEl.className = 'mode-b';
    dragHandle.forceMutationObserverFlush_();
    assertEquals(50, el.getLowerElHeight());

    dragHandle.applyDelta_(10);
    assertEquals(60, el.getLowerElHeight());

    // Restore the class-a, which should restore the layout
    // to sizing when we were changed.
    el.lowerEl.className = 'mode-a';
    dragHandle.forceMutationObserverFlush_();
    assertEquals(110, el.getLowerElHeight());

    document.head.removeChild(styleEl);
    document.body.removeChild(el);
  });
});
