// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('ui.container_that_decorates_its_children');

base.unittest.testSuite('ui.container_that_decorates_its_children', function() { // @suppress longLineCheck

  function createChild() {
    var span = document.createElement('span');
    span.decorated = false;
    return span;
  }

  /**
   * @constructor
   */
  var SimpleContainer = ui.define('simple-container',
                                  ui.ContainerThatDecoratesItsChildren);

  SimpleContainer.prototype = {
    __proto__: ui.ContainerThatDecoratesItsChildren.prototype,

    decorateChild_: function(child) {
      assertFalse(child.decorated);
      child.decorated = true;
    },

    undecorateChild_: function(child) {
      assertTrue(child.decorated);
      child.decorated = false;
    }
  };

  test('add', function() {
    var container = new SimpleContainer();
    container.appendChild(createChild());
    container.appendChild(createChild());
    container.appendChild(createChild());
    assertTrue(container.children[0].decorated);
    assertTrue(container.children[1].decorated);
    assertTrue(container.children[2].decorated);
  });

  test('clearUsingTextContent', function() {
    var c0 = createChild();
    var container = new SimpleContainer();
    container.appendChild(c0);
    container.textContent = '';
    assertFalse(c0.decorated);
  });

  test('clear', function() {
    var c0 = createChild();
    var container = new SimpleContainer();
    container.appendChild(c0);
    container.clear();
    assertFalse(c0.decorated);
  });

  test('insertNewBefore', function() {
    var c0 = createChild();
    var c1 = createChild();
    var container = new SimpleContainer();
    container.appendChild(c1);
    container.insertBefore(c0, c1);
    assertTrue(c0.decorated);
    assertTrue(c1.decorated);
  });

  test('insertExistingBefore', function() {
    var c0 = createChild();
    var c1 = createChild();
    var container = new SimpleContainer();
    container.appendChild(c1);
    container.appendChild(c0);
    container.insertBefore(c0, c1);
    assertTrue(c0.decorated);
    assertTrue(c1.decorated);
  });

  test('testReplace', function() {
    var c0 = createChild();
    var c1 = createChild();
    var container = new SimpleContainer();
    container.appendChild(c0);
    container.replaceChild(c1, c0);
    assertFalse(c0.decorated);
    assertTrue(c1.decorated);
  });

});
