// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.trace_model');
tvcm.require('tracing.trace_model_settings');

tvcm.unittest.testSuite('tracing.trace_model_settings_test', function() {

  test('process_name_uniqueness_0', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var settings = new tracing.TraceModelSettings(model);
    assertFalse(settings.hasUniqueSettingKey(p1));
  });

  test('process_name_uniqueness_1', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    p1.name = 'Browser';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.hasUniqueSettingKey(p1));
  });

  test('process_name_uniqueness_2', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    p1.name = 'Renderer';
    p2.name = 'Renderer';
    var settings = new tracing.TraceModelSettings(model);
    assertFalse(settings.hasUniqueSettingKey(p1));
    assertFalse(settings.hasUniqueSettingKey(p2));
  });

  test('process_name_uniqueness_3', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    p1.name = 'Renderer';
    p1.labels.push('Google Search');
    p2.name = 'Renderer';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.hasUniqueSettingKey(p1));
    assertTrue(settings.hasUniqueSettingKey(p2));
  });

  test('thread_name_uniqueness_0', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    var t1 = p1.getOrCreateThread(1);
    var t2 = p2.getOrCreateThread(2);
    p1.name = 'Browser';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.hasUniqueSettingKey(t1));
    assertTrue(settings.hasUniqueSettingKey(t2));
  });

  test('thread_name_uniqueness_1', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    var t1 = p1.getOrCreateThread(1);
    var t2 = p2.getOrCreateThread(2);
    p1.name = 'Renderer';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    var settings = new tracing.TraceModelSettings(model);
    assertFalse(settings.hasUniqueSettingKey(t1));
    assertFalse(settings.hasUniqueSettingKey(t2));
  });

  test('process_persistence_when_not_unique', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(p1, 'true_by_default', true));

    settings.setSettingFor(p1, 'true_by_default', false);
    assertFalse(settings.getSettingFor(p1, 'true_by_default', true));

    // Now, clobber the model, and verify that it didn't persist.
    model = new tracing.TraceModel();
    p1 = model.getOrCreateProcess(1);
    settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(p1, 'true_by_default', true));
  });

  test('process_persistence_when_not_unique_with_name', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    p1.name = 'Browser';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(p1, 'true_by_default', true));

    settings.setSettingFor(p1, 'true_by_default', false);
    assertFalse(settings.getSettingFor(p1, 'true_by_default', true));

    // Now, clobber the model, and verify that it persisted.
    model = new tracing.TraceModel();
    p1 = model.getOrCreateProcess(1);
    p1.name = 'Browser';
    settings = new tracing.TraceModelSettings(model);
    assertFalse(settings.getSettingFor(p1, 'true_by_default', true));
  });

  test('thread_persistence_when_not_unique', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    var t1 = p1.getOrCreateThread(1);
    var t2 = p2.getOrCreateThread(2);
    p1.name = 'Renderer';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(t1, 'true_by_default', true));

    settings.setSettingFor(t1, 'true_by_default', false);
    assertFalse(settings.getSettingFor(t1, 'true_by_default', true));

    // Now, clobber the model, and verify that it persisted.
    model = new tracing.TraceModel();
    p1 = model.getOrCreateProcess(1);
    p2 = model.getOrCreateProcess(2);
    t1 = p1.getOrCreateThread(1);
    t2 = p2.getOrCreateThread(2);
    p1.name = 'Renderer';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(t1, 'true_by_default', true));
  });

  test('thread_persistence_when_unique', function() {
    var model = new tracing.TraceModel();
    var p1 = model.getOrCreateProcess(1);
    var p2 = model.getOrCreateProcess(2);
    var t1 = p1.getOrCreateThread(1);
    var t2 = p2.getOrCreateThread(2);
    p1.name = 'Browser';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    var settings = new tracing.TraceModelSettings(model);
    assertTrue(settings.getSettingFor(t1, 'true_by_default', true));

    settings.setSettingFor(t1, 'true_by_default', false);
    assertFalse(settings.getSettingFor(t1, 'true_by_default', true));

    // Now, clobber the model, and verify that it persisted.
    model = new tracing.TraceModel();
    p1 = model.getOrCreateProcess(1);
    p2 = model.getOrCreateProcess(2);
    t1 = p1.getOrCreateThread(1);
    t2 = p2.getOrCreateThread(2);
    p1.name = 'Browser';
    p2.name = 'Renderer';
    t1.name = 'Main';
    t2.name = 'Main';
    settings = new tracing.TraceModelSettings(model);
    assertFalse(settings.getSettingFor(t1, 'true_by_default', true));
  });

});
