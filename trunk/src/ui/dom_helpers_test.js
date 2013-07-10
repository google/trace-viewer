// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('ui.dom_helpers');

base.unittest.testSuite('ui.dom_helpers', function() {

  test('simpleSpanAndDiv', function() {
    var divEl = ui.createDiv({
      className: 'a-div-class', parent: document.body
    });
    var testText = 'some span text';
    var spanEl = ui.createSpan({
      className: 'a-span-class',
      textContent: testText,
      parent: divEl
    });
    var eltInDocument = document.querySelector('.a-div-class>.a-span-class');
    assertEquals(eltInDocument.textContent, testText);
    eltInDocument.parentElement.removeChild(eltInDocument);
  });

  test('checkboxFromDefaults', function() {
    var target = {foo: undefined};
    var cb = ui.createCheckBox(target, 'foo', 'myCheckBox', false, 'Foo');
    assertEquals(false, target.foo);
  });

  test('checkboxFromSettings', function() {
    base.Settings.set('myCheckBox', true);
    var target = {foo: undefined};
    var cb = ui.createCheckBox(target, 'foo', 'myCheckBox', false, 'Foo');
    assertEquals(true, target.foo);
  });

  test('checkboxChanged', function() {
    var target = {foo: undefined};
    var cb = ui.createCheckBox(target, 'foo', 'myCheckBox', false, 'Foo');
    cb.checked = true;

    assertEquals(true, base.Settings.get('myCheckBox', undefined));
    assertEquals(true, target.foo);
  });

  test('selectorSettingsAlreaySet', function() {
    base.Settings.set('myScale', 0.25);

    var target = {
      scale: 314
    };
    var sel = ui.createSelector(
        target, 'scale',
        'myScale', 0.375,
        [{label: '6.25%', value: 0.0625},
         {label: '12.5%', value: 0.125},
         {label: '25%', value: 0.25},
         {label: '37.5%', value: 0.375},
         {label: '50%', value: 0.5},
         {label: '75%', value: 0.75},
         {label: '100%', value: 1},
         {label: '200%', value: 2}
        ]);
    assertEquals(0.25, target.scale);
    assertEquals(2, sel.selectedIndex);
  });

  test('selectorSettingsDefault', function() {
    var target = {
      scale: 314
    };
    var sel = ui.createSelector(
        target, 'scale',
        'myScale', 0.375,
        [{label: '6.25%', value: 0.0625},
         {label: '12.5%', value: 0.125},
         {label: '25%', value: 0.25},
         {label: '37.5%', value: 0.375},
         {label: '50%', value: 0.5},
         {label: '75%', value: 0.75},
         {label: '100%', value: 1},
         {label: '200%', value: 2}
        ]);
    assertEquals(0.375, target.scale);
    assertEquals(3, sel.selectedIndex);
  });

  test('selectorSettingsChanged', function() {
    var target = {
      scale: 314
    };
    var sel = ui.createSelector(
        target, 'scale',
        'myScale', 0.375,
        [{label: '6.25%', value: 0.0625},
         {label: '12.5%', value: 0.125},
         {label: '25%', value: 0.25},
         {label: '37.5%', value: 0.375},
         {label: '50%', value: 0.5},
         {label: '75%', value: 0.75},
         {label: '100%', value: 1},
         {label: '200%', value: 2}
        ]);
    assertEquals(0.375, sel.selectedValue);
    sel.selectedValue = 0.75;
    assertEquals(0.75, target.scale);
    assertEquals(0.75, sel.selectedValue);
    assertEquals(0.75, base.Settings.get('myScale', undefined));
  });
});
