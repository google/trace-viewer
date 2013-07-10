// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.settings');
base.require('base.unittest');
base.require('tracing.test_utils');

base.unittest.testSuite('base.settings', function() {
  function assertSettingIs(expectedValue, key) {
    assertEquals(expectedValue, base.Settings.get('my_key'),
                 'Expected Settings.' + key + ' to be ' + expectedValue);
  }

  // Old settings versions used to stringify objects instead of putting them
  // into JSON. This test makes sure that these old settings yield the default
  // value instead of strings.
  test('oldStyleSettingYieldsDefaultValue', function() {
    var storage = base.Settings.getAlternativeStorageInstance();
    storage.setItem(base.Settings.namespace_('key'), 'hello world');

    assertEquals('value', base.Settings.get('key', 'value'));
  });

  test('setGetString', function() {
    var settings = new base.Settings();
    settings.set('my_key', 'my_val');
    assertEquals('my_val', settings.get('my_key'));
    // base.Settings() is a singleton
    assertEquals('my_val', base.Settings().get('my_key'));
  });

  test('setGetNumber', function() {
    var settings = new base.Settings();
    settings.set('my_key', 5);
    assertSettingIs(5, 'my_key');
  });

  test('setGetBool', function() {
    var settings = new base.Settings();
    settings.set('my_key', false);
    assertSettingIs(false, 'my_key');
  });

  test('setGetObject', function() {
    var settings = new base.Settings();
    settings.set('my_key', {'hello': 5});
    assertObjectEquals({'hello': 5}, settings.get('my_key'));
  });

  test('setInvalidObject', function() {
    var settings = new base.Settings();
    var obj = {'hello': undefined};
    obj.hello = obj;
    assertThrows(function() {
      settings.set('my_key', obj);
    });
  });

  test('setUndefined', function() {
    var settings = new base.Settings();
    assertThrows(function() {
      settings.set('my_key', undefined);
    });
  });

  test('getUnset', function() {
    var settings = new base.Settings();
    // Undefined should be returned if value isn't set.
    assertSettingIs(undefined, 'my_key');
  });

  test('getDefault', function() {
    var settings = new base.Settings();
    // default_val should be returned if value isn't set.
    assertEquals('default_val', settings.get('my_key', 'default_val'));
  });

  test('setGetPrefix', function() {
    var settings = new base.Settings();
    settings.set('key_a', 'foo', 'my_prefix');
    assertEquals('foo', settings.get('key_a', undefined, 'my_prefix'));
    assertEquals('foo', settings.get('key_a', 'bar', 'my_prefix'));
    assertEquals(undefined, settings.get('key_a'));
    assertEquals('bar', settings.get('key_a', 'bar'));
  });

  test('keys', function() {
    var settings = new base.Settings();
    settings.set('key_a', 'foo');
    settings.set('key_b', 'bar');
    settings.set('key_c', 'baz');
    assertArrayEquals(['key_a', 'key_b', 'key_c'], settings.keys());
  });

  test('keysPrefix', function() {
    var settings = new base.Settings();
    settings.set('key_a', 'foo', 'prefix1');
    settings.set('key_b', 'bar', 'prefix1');
    settings.set('key_c', 'baz', 'prefix1');
    settings.set('key_a', 'foo', 'prefix2');
    settings.set('key_b', 'bar', 'prefix2');
    settings.set('key_C', 'baz', 'prefix2');
    assertArrayEquals(['key_a', 'key_b', 'key_c'], settings.keys('prefix1'));
    assertArrayEquals(['key_C', 'key_a', 'key_b'], settings.keys('prefix2'));
    assertArrayEquals(
        ['prefix1.key_a', 'prefix1.key_b', 'prefix1.key_c',
         'prefix2.key_C', 'prefix2.key_a', 'prefix2.key_b'],
        settings.keys());
  });
});
