// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.trace_model.time_to_object_instance_map');
base.require('tracing.trace_model.object_instance');

base.unittest.testSuite('tracing.trace_model.time_to_object_instance_map',
                        function() {
      var createObjectInstance = function(parent, id, category, name,
                                      creationTs) {
        return new tracing.trace_model.ObjectInstance(
            parent, id, category, name, creationTs);
      };

      test('timeToObjectInstanceMap', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        m.addSnapshot('cat', 'name', 10, 'a1');
        m.addSnapshot('cat', 'name', 20, 'a2');
        m.idWasDeleted('cat', 'name', 30);
        m.addSnapshot('cat', 'name', 40, 'b');

        assertEquals(2, m.instances.length);

        var i0 = m.getInstanceAt(0);
        var i10 = m.getInstanceAt(10);
        assertEquals(i10, i0);

        assertNotUndefined(i10);
        assertEquals(2, i10.snapshots.length);
        assertEquals('a1', i10.snapshots[0].args);
        assertEquals('a2', i10.snapshots[1].args);

        assertEquals(30, i10.deletionTs);

        var i15 = m.getInstanceAt(15);
        assertEquals(i10, i15);

        var i20 = m.getInstanceAt(20);
        assertEquals(i10, i20);

        var i30 = m.getInstanceAt(30);
        assertUndefined(i30);

        var i35 = m.getInstanceAt(35);
        assertUndefined(i35);

        var i40 = m.getInstanceAt(40);
        assertNotUndefined(i40);
        assertNotEquals(i10, i40);
        assertEquals(1, i40.snapshots.length);
        assertEquals(40, i40.creationTs);
        assertEquals(Number.MAX_VALUE, i40.deletionTs);

        var i41 = m.getInstanceAt(41);
        assertEquals(i41, i40);
      });

      test('timeToObjectInstanceMapsBoundsLogic', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        m.addSnapshot('cat', 'name', 10, 'a1');
        m.addSnapshot('cat', 'name', 20, 'a2');
        m.idWasDeleted('cat', 'name', 30);
        m.addSnapshot('cat', 'name', 40, 'b');
        m.addSnapshot('cat', 'name', 41, 'b');

        m.instances.forEach(function(i) { i.updateBounds(); });

        var iA = m.getInstanceAt(10);
        assertEquals(10, iA.bounds.min);
        assertEquals(30, iA.bounds.max);

        var iB = m.getInstanceAt(40);
        assertEquals(40, iB.bounds.min);
        assertEquals(41, iB.bounds.max);
      });

      test('earlySnapshot', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var i10 = m.idWasCreated('cat', 'name', 10, 'a1');
        m.idWasDeleted('cat', 'name', 20);

        assertThrows(function() {
          m.addSnapshot('cat', 'name', 5, 'a1');
        });
        assertEquals(10, i10.creationTs);
        assertEquals(20, i10.deletionTs);
      });

      test('earlySnapshotWithImplicitCreate', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var i10 = m.idWasDeleted('cat', 'name', 20);
        m.addSnapshot('cat', 'name', 5, 'a1');
        assertEquals(5, i10.creationTs);
        assertEquals(20, i10.deletionTs);
      });

      test('getInstanceBeforeCreationImplicitCreate', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var i10 = m.idWasCreated('cat', 'name', 10, 'a1');
        m.idWasDeleted('cat', 'name', 20);
        assertEquals(undefined, m.getInstanceAt(5));
      });

      test('getInstanceBeforeCreationImplicitCreateWithSnapshot', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var s5 = m.addSnapshot('cat', 'name', 5, 'a1');
        var i10 = m.idWasDeleted('cat', 'name', 20);
        assertEquals(i10, m.getInstanceAt(5));
      });

      test('successiveDeletions', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var i20 = m.idWasDeleted('cat', 'name', 20);
        var i30 = m.idWasDeleted('cat', 'name', 30);
        var i40 = m.idWasDeleted('cat', 'name', 40);
        assertEquals(20, i20.creationTs);
        assertEquals(false, i20.creationTsWasExplicit);
        assertEquals(20, i20.deletionTs);
        assertEquals(true, i20.deletionTsWasExplicit);

        assertEquals(30, i30.creationTs);
        assertEquals(false, i30.creationTsWasExplicit);
        assertEquals(30, i30.deletionTs);
        assertEquals(true, i30.deletionTsWasExplicit);


        assertEquals(40, i40.creationTs);
        assertEquals(false, i40.creationTsWasExplicit);
        assertEquals(40, i40.deletionTs);
        assertEquals(true, i40.deletionTsWasExplicit);
      });

      test('snapshotAfterDeletion', function() {
        var m = new tracing.trace_model.TimeToObjectInstanceMap(
            createObjectInstance, {}, 7);
        var i10 = m.idWasCreated('cat', 'name', 10, 'a1');
        m.idWasDeleted('cat', 'name', 20);

        var s25 = m.addSnapshot('cat', 'name', 25, 'a1');
        var i25 = s25.objectInstance;

        assertEquals(10, i10.creationTs);
        assertEquals(20, i10.deletionTs);
        assertNotEquals(i10, i25);
        assertEquals(25, i25.creationTs);
        assertEquals(Number.MAX_VALUE, i25.deletionTs);
      });
    });
