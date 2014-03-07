// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('cc.util');

tvcm.require('tvcm.quad');
tvcm.require('tvcm.rect');

tvcm.unittest.testSuite('cc.util_test', function() {
  test('nameConvert', function() {
    assertEquals('_foo', cc.convertNameToJSConvention('_foo'));
    assertEquals('foo_', cc.convertNameToJSConvention('foo_'));
    assertEquals('foo', cc.convertNameToJSConvention('foo'));
    assertEquals('fooBar', cc.convertNameToJSConvention('foo_bar'));
    assertEquals('fooBarBaz', cc.convertNameToJSConvention('foo_bar_baz'));
  });

  test('objectConvertNested', function() {
    var object = {
      un_disturbed: true,
      args: {
        foo_bar: {
          a_field: 7
        }
      }
    };
    var expected = {
      un_disturbed: true,
      args: {
        fooBar: {
          aField: 7
        }
      }
    };
    cc.preInitializeObject(object);
    assertObjectEquals(expected, object);
  });

  test('arrayConvert', function() {
    var object = {
      un_disturbed: true,
      args: [
        {foo_bar: 7},
        {foo_bar: 8}
      ]
    };
    var expected = {
      un_disturbed: true,
      args: [
        {fooBar: 7},
        {fooBar: 8}
      ]
    };
    cc.preInitializeObject(object);
    assertObjectEquals(expected, object);
  });

  test('quadCoversion', function() {
    var object = {
      args: {
        some_quad: [1, 2, 3, 4, 5, 6, 7, 8]
      }
    };
    cc.preInitializeObject(object);
    assertTrue(object.args.someQuad instanceof tvcm.Quad);
  });

  test('quadConversionNested', function() {
    var object = {
      args: {
        nested_field: {
          a_quad: [1, 2, 3, 4, 5, 6, 7, 8]
        },
        non_nested_quad: [1, 2, 3, 4, 5, 6, 7, 8]
      }
    };
    cc.preInitializeObject(object);
    assertTrue(object.args.nestedField.aQuad instanceof tvcm.Quad);
    assertTrue(object.args.nonNestedQuad instanceof tvcm.Quad);
  });

  test('rectCoversion', function() {
    var object = {
      args: {
        some_rect: [1, 2, 3, 4]
      }
    };
    cc.preInitializeObject(object);
    assertTrue(object.args.someRect instanceof tvcm.Rect);
  });

  test('rectCoversionNested', function() {
    var object = {
      args: {
        nested_field: {
          a_rect: [1, 2, 3, 4]
        },
        non_nested_rect: [1, 2, 3, 4]
      }
    };
    cc.preInitializeObject(object);
    assertTrue(object.args.nestedField.aRect instanceof tvcm.Rect);
    assertTrue(object.args.nonNestedRect instanceof tvcm.Rect);
  });
});
