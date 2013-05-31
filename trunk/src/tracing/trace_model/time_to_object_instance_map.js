// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the TimeToObjectInstanceMap class.
 */
base.require('base.range');
base.require('base.sorted_array_utils');

base.exportTo('tracing.trace_model', function() {

  /**
   * Tracks all the instances associated with a given ID over its lifetime.
   *
   * An id can be used multiple times throughout a trace, referring to different
   * objects at different times. This data structure does the bookkeeping to
   * figure out what ObjectInstance is referred to at a given timestamp.
   *
   * @constructor
   */
  function TimeToObjectInstanceMap(createObjectInstanceFunction, parent, id) {
    this.createObjectInstanceFunction_ = createObjectInstanceFunction;
    this.parent = parent;
    this.id = id;
    this.instances = [];
  }

  TimeToObjectInstanceMap.prototype = {
    idWasCreated: function(category, name, ts) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts));
        this.instances[0].creationTsWasExplicit = true;
        return this.instances[0];
      }

      var lastInstance = this.instances[this.instances.length - 1];
      if (ts < lastInstance.deletionTs) {
        throw new Error('Mutation of the TimeToObjectInstanceMap must be ' +
                        'done in ascending timestamp order.');
      }
      lastInstance = this.createObjectInstanceFunction_(
          this.parent, this.id, category, name, ts);
      lastInstance.creationTsWasExplicit = true;
      this.instances.push(lastInstance);
      return lastInstance;
    },

    addSnapshot: function(category, name, ts, args) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts));
      }

      var i = base.findLowIndexInSortedIntervals(
          this.instances,
          function(inst) { return inst.creationTs; },
          function(inst) { return inst.deletionTs - inst.creationTs; },
          ts);

      var instance;
      if (i < 0) {
        instance = this.instances[0];
        if (ts > instance.deletionTs ||
            instance.creationTsWasExplicit) {
          throw new Error(
              'At the provided timestamp, no instance was still alive');
        }

        if (instance.snapshots.length != 0) {
          throw new Error(
              'Cannot shift creationTs forward, ' +
              'snapshots have been added. First snap was at ts=' +
              instance.snapshots[0].ts + ' and creationTs was ' +
              instance.creationTs);
        }
        instance.creationTs = ts;
      } else if (i >= this.instances.length) {
        instance = this.instances[this.instances.length - 1];
        if (ts >= instance.deletionTs) {
          // The snap is added after our oldest and deleted instance. This means
          // that this is a new implicit instance.
          instance = this.createObjectInstanceFunction_(
              this.parent, this.id, category, name, ts);
          this.instances.push(instance);
        } else {
          // If the ts is before the last objects deletion time, then the caller
          // is trying to add a snapshot when there may have been an instance
          // alive. In that case, try to move an instance's creationTs to
          // include this ts, provided that it has an implicit creationTs.

          // Search backward from the right for an instance that was definitely
          // deleted before this ts. Any time an instance is found that has a
          // moveable creationTs
          var lastValidIndex;
          for (var i = this.instances.length - 1; i >= 0; i--) {
            var tmp = this.instances[i];
            if (ts >= tmp.deletionTs)
              break;
            if (tmp.creationTsWasExplicit == false && tmp.snapshots.length == 0)
              lastValidIndex = i;
          }
          if (lastValidIndex === undefined) {
            throw new Error(
                'Cannot add snapshot. No instance was alive that was mutable.');
          }
          instance = this.instances[lastValidIndex];
          instance.creationTs = ts;
        }
      } else {
        instance = this.instances[i];
      }

      return instance.addSnapshot(ts, args);
    },

    get lastInstance() {
      if (this.instances.length == 0)
        return undefined;
      return this.instances[this.instances.length - 1];
    },

    idWasDeleted: function(category, name, ts) {
      if (this.instances.length == 0) {
        this.instances.push(this.createObjectInstanceFunction_(
            this.parent, this.id, category, name, ts));
      }
      var lastInstance = this.instances[this.instances.length - 1];
      if (ts < lastInstance.creationTs)
        throw new Error('Cannot delete a id before it was crated');
      if (lastInstance.deletionTs == Number.MAX_VALUE) {
        lastInstance.wasDeleted(ts);
        return lastInstance;
      }

      if (ts < lastInstance.deletionTs)
        throw new Error('id was already deleted earlier.');

      // A new instance was deleted with no snapshots in-between.
      // Create an instance then kill it.
      lastInstance = this.createObjectInstanceFunction_(
          this.parent, this.id, category, name, ts);
      this.instances.push(lastInstance);
      return lastInstance;
    },

    getInstanceAt: function(ts) {
      var i = base.findLowIndexInSortedIntervals(
          this.instances,
          function(inst) { return inst.creationTs; },
          function(inst) { return inst.deletionTs - inst.creationTs; },
          ts);
      if (i < 0) {
        if (this.instances[0].creationTsWasExplicit)
          return undefined;
        return this.instances[0];
      } else if (i >= this.instances.length) {
        return undefined;
      }
      return this.instances[i];
    }
  };

  return {
    TimeToObjectInstanceMap: TimeToObjectInstanceMap
  };
});
