// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.trace_model.object_instance');
tvcm.require('tracing.analysis.generic_object_view');

tvcm.unittest.testSuite('tracing.analysis.generic_object_view_test', function() { // @suppress longLineCheck
  var GenericObjectView = tracing.analysis.GenericObjectView;

  test('undefinedValue', function() {
    var view = new GenericObjectView();
    view.object = undefined;
    assertEquals('undefined', view.children[0].dataElement.textContent);
  });

  test('nullValue', function() {
    var view = new GenericObjectView();
    view.object = null;
    assertEquals('null', view.children[0].dataElement.textContent);
  });

  test('stringValue', function() {
    var view = new GenericObjectView();
    view.object = 'string value';
    assertEquals('"string value"', view.children[0].textContent);
  });

  test('jsonObjectStringValue', function() {
    var view = new GenericObjectView();
    view.object = '{"x": 1}';
    assertEquals(1, view.children.length);
    assertEquals(4, view.children[0].children.length);
  });

  test('jsonArraStringValue', function() {
    var view = new GenericObjectView();
    view.object = '[1,2,3]';
    assertEquals(3, view.children.length);
  });

  test('booleanValue', function() {
    var view = new GenericObjectView();
    view.object = false;
    assertEquals('false', view.children[0].dataElement.textContent);
  });

  test('numberValue', function() {
    var view = new GenericObjectView();
    view.object = 3.14159;
    assertEquals('3.14159', view.children[0].textContent);
  });

  test('objectSnapshotValue', function() {
    var view = new GenericObjectView();

    var i10 = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'name', 10);
    var s10 = i10.addSnapshot(10, {foo: 1});

    view.object = s10;
    assertTrue(view.children[0].dataElement instanceof
               tracing.analysis.ObjectSnapshotLink);
  });

  test('objectInstanceValue', function() {
    var view = new GenericObjectView();

    var i10 = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'name', 10);
    var s10 = i10.addSnapshot(10, {foo: 1});

    view.object = i10;
    assertTrue(view.children[0].dataElement instanceof
               tracing.analysis.ObjectInstanceLink);
  });

  test('instantiate_emptyArrayValue', function() {
    var view = new GenericObjectView();
    view.object = [];
    this.addHTMLOutput(view);
  });

  test('instantiate_twoValueArrayValue', function() {
    var view = new GenericObjectView();
    view.object = [1, 2];
    this.addHTMLOutput(view);
  });

  test('instantiate_twoValueBArrayValue', function() {
    var view = new GenericObjectView();
    view.object = [1, {x: 1}];
    this.addHTMLOutput(view);
  });

  test('instantiate_arrayValue', function() {
    var view = new GenericObjectView();
    view.object = [1, 2, 'three'];
    this.addHTMLOutput(view);
  });

  test('instantiate_arrayWithSimpleObjectValue', function() {
    var view = new GenericObjectView();
    view.object = [{simple: 'object'}];
    this.addHTMLOutput(view);
  });

  test('instantiate_arrayWithComplexObjectValue', function() {
    var view = new GenericObjectView();
    view.object = [{complex: 'object', field: 'two'}];
    this.addHTMLOutput(view);
  });

  test('instantiate_objectValue', function() {
    var view = new GenericObjectView();
    view.object = {
      'entry_one': 'entry_one_value',
      'entry_two': 2,
      'entry_three': [3, 4, 5]
    };
    this.addHTMLOutput(view);
  });
});
