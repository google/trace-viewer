// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the ObjectSnapshot and ObjectHistory classes.
 */
base.require('base.range');
base.require('base.sorted_array_utils');
base.require('tracing.trace_model.object_snapshot');

base.exportTo('tracing.trace_model', function() {
  var ObjectSnapshot = tracing.trace_model.ObjectSnapshot;

  /**
   * An object with a specific id, whose state has been snapshotted several
   * times.
   *
   * @constructor
   */
  function ObjectInstance(parent, id, category, name, creationTs) {
    this.parent = parent;
    this.id = id;
    this.category = category;
    this.name = name;
    this.creationTs = creationTs;
    this.creationTsWasExplicit = false;
    this.deletionTs = Number.MAX_VALUE;
    this.deletionTsWasExplicit = false;
    this.selected = false;
    this.colorId = 0;
    this.bounds = new base.Range();
    this.snapshots = [];
    this.hasImplicitSnapshots = false;
  }

  ObjectInstance.prototype = {
    __proto__: Object.prototype,

    get typeName() {
      return this.name;
    },

    addSnapshot: function(ts, args) {
      if (ts < this.creationTs)
        throw new Error('Snapshots must be >= instance.creationTs');
      if (ts >= this.deletionTs)
        throw new Error('Snapshots cannot be added after ' +
                        'an objects deletion timestamp.');

      var lastSnapshot;
      if (this.snapshots.length > 0) {
        lastSnapshot = this.snapshots[this.snapshots.length - 1];
        if (lastSnapshot.ts == ts)
          throw new Error('Snapshots already exists at this time!');
        if (ts < lastSnapshot.ts) {
          throw new Error(
              'Snapshots must be added in increasing timestamp order');
        }
      }

      var snapshotConstructor =
          tracing.trace_model.ObjectSnapshot.getConstructor(this.name);
      var snapshot = new snapshotConstructor(this, ts, args);
      this.snapshots.push(snapshot);
      return snapshot;
    },

    wasDeleted: function(ts) {
      var lastSnapshot;
      if (this.snapshots.length > 0) {
        lastSnapshot = this.snapshots[this.snapshots.length - 1];
        if (lastSnapshot.ts > ts)
          throw new Error(
              'Instance cannot be deleted at ts=' +
              ts + '. A snapshot exists that is older.');
      }
      this.deletionTs = ts;
      this.deletionTsWasExplicit = true;
    },

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    preInitialize: function() {
      for (var i = 0; i < this.snapshots.length; i++)
        this.snapshots[i].preInitialize();
    },

    /**
     * See ObjectSnapshot constructor notes on object initialization.
     */
    initialize: function() {
      for (var i = 0; i < this.snapshots.length; i++)
        this.snapshots[i].initialize();
    },

    getSnapshotAt: function(ts) {
      if (ts < this.creationTs) {
        if (this.creationTsWasExplicit)
          throw new Error('ts must be within lifetime of this instance');
        return this.snapshots[0];
      }
      if (ts > this.deletionTs)
        throw new Error('ts must be within lifetime of this instance');

      var snapshots = this.snapshots;
      var i = base.findLowIndexInSortedIntervals(
          snapshots,
          function(snapshot) { return snapshot.ts; },
          function(snapshot, i) {
            if (i == snapshots.length - 1)
              return snapshots[i].objectInstance.deletionTs;
            return snapshots[i + 1].ts - snapshots[i].ts;
          },
          ts);
      if (i < 0) {
        // Note, this is a little bit sketchy: this lets early ts point at the
        // first snapshot, even before it is taken. We do this because raster
        // tasks usually post before their tile snapshots are dumped. This may
        // be a good line of code to re-visit if we start seeing strange and
        // confusing object references showing up in the traces.
        return this.snapshots[0];
      }
      if (i >= this.snapshots.length)
        return this.snapshots[this.snapshots.length - 1];
      return this.snapshots[i];
    },

    updateBounds: function() {
      this.bounds.reset();
      this.bounds.addValue(this.creationTs);
      if (this.deletionTs != Number.MAX_VALUE)
        this.bounds.addValue(this.deletionTs);
      else if (this.snapshots.length > 0)
        this.bounds.addValue(this.snapshots[this.snapshots.length - 1].ts);
    },

    shiftTimestampsForward: function(amount) {
      this.creationTs += amount;
      if (this.deletionTs != Number.MAX_VALUE)
        this.deletionTs += amount;
      this.snapshots.forEach(function(snapshot) {
        snapshot.ts += amount;
      });
    }
  };

  ObjectInstance.nameToConstructorMap_ = {};
  ObjectInstance.register = function(name, constructor) {
    if (ObjectInstance.nameToConstructorMap_[name])
      throw new Error('Constructor already registerd for ' + name);
    ObjectInstance.nameToConstructorMap_[name] = constructor;
  };

  ObjectInstance.unregister = function(name) {
    delete ObjectInstance.nameToConstructorMap_[name];
  };

  ObjectInstance.getConstructor = function(name) {
    if (ObjectInstance.nameToConstructorMap_[name])
      return ObjectInstance.nameToConstructorMap_[name];
    return ObjectInstance;
  };

  return {
    ObjectInstance: ObjectInstance
  };
});
