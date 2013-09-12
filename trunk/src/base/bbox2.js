// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview 2D bounding box computations.
 */
base.require('base.gl_matrix');
base.require('base.rect');

base.exportTo('base', function() {

  /**
   * Tracks a 2D bounding box.
   * @constructor
   */
  function BBox2() {
    this.isEmpty_ = true;
    this.min_ = undefined;
    this.max_ = undefined;
  };

  BBox2.prototype = {
    __proto__: Object.prototype,

    reset: function() {
      this.isEmpty_ = true;
      this.min_ = undefined;
      this.max_ = undefined;
    },

    get isEmpty() {
      return this.isEmpty_;
    },

    addBBox2: function(bbox2) {
      if (bbox2.isEmpty)
        return;
      this.addVec2(bbox2.min_);
      this.addVec2(bbox2.max_);
    },

    clone: function() {
      var bbox = new BBox2();
      bbox.addBBox2(this);
      return bbox;
    },

    /**
     * Adds x, y to the range.
     */
    addXY: function(x, y) {
      if (this.isEmpty_) {
        this.max_ = vec2.create();
        this.min_ = vec2.create();
        vec2.set(this.max_, x, y);
        vec2.set(this.min_, x, y);
        this.isEmpty_ = false;
        return;
      }
      this.max_[0] = Math.max(this.max_[0], x);
      this.max_[1] = Math.max(this.max_[1], y);
      this.min_[0] = Math.min(this.min_[0], x);
      this.min_[1] = Math.min(this.min_[1], y);
    },

    /**
     * Adds value_x, value_y in the form [value_x,value_y] to the range.
     */
    addVec2: function(value) {
      if (this.isEmpty_) {
        this.max_ = vec2.create();
        this.min_ = vec2.create();
        vec2.set(this.max_, value[0], value[1]);
        vec2.set(this.min_, value[0], value[1]);
        this.isEmpty_ = false;
        return;
      }
      this.max_[0] = Math.max(this.max_[0], value[0]);
      this.max_[1] = Math.max(this.max_[1], value[1]);
      this.min_[0] = Math.min(this.min_[0], value[0]);
      this.min_[1] = Math.min(this.min_[1], value[1]);
    },

    addQuad: function(quad) {
      this.addVec2(quad.p1);
      this.addVec2(quad.p2);
      this.addVec2(quad.p3);
      this.addVec2(quad.p4);
    },

    get minVec2() {
      if (this.isEmpty_)
        return undefined;
      return this.min_;
    },

    get maxVec2() {
      if (this.isEmpty_)
        return undefined;
      return this.max_;
    },

    get sizeAsVec2() {
      if (this.isEmpty_)
        throw new Error('Empty BBox2 has no size');
      var size = vec2.create();
      vec2.subtract(size, this.max_, this.min_);
      return size;
    },

    get size() {
      if (this.isEmpty_)
        throw new Error('Empty BBox2 has no size');
      return {width: this.max_[0] - this.min_[0],
        height: this.max_[1] - this.min_[1]};
    },

    get width() {
      if (this.isEmpty_)
        throw new Error('Empty BBox2 has no width');
      return this.max_[0] - this.min_[0];
    },

    get height() {
      if (this.isEmpty_)
        throw new Error('Empty BBox2 has no width');
      return this.max_[1] - this.min_[1];
    },

    toString: function() {
      if (this.isEmpty_)
        return 'empty';
      return 'min=(' + this.min_[0] + ',' + this.min_[1] + ') ' +
          'max=(' + this.max_[0] + ',' + this.max_[1] + ')';
    },

    asRect: function() {
      return base.Rect.fromXYWH(
          this.min_[0],
          this.min_[1],
          this.max_[0] - this.min_[0],
          this.max_[1] - this.min_[1]);
    }
  };

  return {
    BBox2: BBox2
  };

});
