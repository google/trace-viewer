// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.ui.list_view');

tvcm.unittest.testSuite('tvcm.ui.list_view_test', function() {
  var ListView = tvcm.ui.ListView;

  test('instantiate', function() {
    var view = new ListView();
    var i1 = view.addItem('item 1');
    var i2 = view.addItem('item 2');
    var i3 = view.addItem('item 3');
    this.addHTMLOutput(view);
  });

  test('programmaticSelection', function() {
    var view = new ListView();
    var i1 = view.addItem('item 1');
    var i2 = view.addItem('item 2');
    var i3 = view.addItem('item 3');

    i2.selected = true;
    assertTrue(i2.hasAttribute('selected'));
    i3.selected = true;
    assertFalse(i2.hasAttribute('selected'));
    assertTrue(i3.hasAttribute('selected'));
  });

  test('selectionEvents', function() {
    var view = new ListView();
    var didSelectionChange = 0;
    view.addEventListener('selection-changed', function() {
      didSelectionChange = true;
    });
    var i1 = view.addItem('item 1');
    var i2 = view.addItem('item 2');
    var i3 = view.addItem('item 3');

    didSelectionChange = false;
    i2.selected = true;
    assertTrue(didSelectionChange);

    didSelectionChange = false;
    view.removeChild(i2);
    assertTrue(didSelectionChange);
  });
});
