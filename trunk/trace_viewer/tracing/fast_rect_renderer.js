// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides a mechanism for drawing massive numbers of
 * colored rectangles into a canvas in an efficient manner, provided
 * they are drawn left to right with fixed y and height throughout.
 *
 * The basic idea used here is to fuse subpixel rectangles together so that
 * we never issue a canvas fillRect for them. It turns out Javascript can
 * do this quite efficiently, compared to asking Canvas2D to do the same.
 *
 * A few extra things are done by this class in the name of speed:
 * - Viewport culling: off-viewport rectangles are discarded.
 *
 * - The actual discarding operation is done in world space,
 *   e.g. pre-transform.
 *
 * - Rather than expending compute cycles trying to figure out an average
 *   color for fused rectangles from css strings, you instead draw using
 *   palletized colors. The fused rect color is choosen from the rectangle with
 *   the higher alpha value, if equal the max pallete index encountered.
 *
 * Make sure to flush the trackRenderer before finishing drawing in order
 * to commit any queued drawing operations.
 */
tvcm.exportTo('tracing', function() {

  /**
   * Creates a fast rect renderer with a specific set of culling rules
   * and color pallette.
   * @param {GraphicsContext2D} ctx Canvas2D drawing context.
   * @param {number} minRectSize Only rectangles with width < minRectSize are
   *    considered for merging.
   * @param {number} maxMergeDist Controls how many successive small rectangles
   *    can be merged together before issuing a rectangle.
   * @param {Array} pallette The color pallete for drawing. Pallette slots
   *    should map to valid Canvas fillStyle strings.
   *
   * @constructor
   */
  function FastRectRenderer(ctx, minRectSize, maxMergeDist, pallette) {
    this.ctx_ = ctx;
    this.minRectSize_ = minRectSize;
    this.maxMergeDist_ = maxMergeDist;
    this.pallette_ = pallette;
  }

  FastRectRenderer.prototype = {
    y_: 0,
    h_: 0,
    merging_: false,
    mergeStartX_: 0,
    mergeCurRight_: 0,
    mergedColorId_: 0,
    mergedAlpha_: 0,

    /**
     * Changes the y position and height for subsequent fillRect
     * calls. x and width are specifieid on the fillRect calls.
     */
    setYandH: function(y, h) {
      this.flush();
      this.y_ = y;
      this.h_ = h;
    },

    /**
     * Fills rectangle at the specified location, if visible. If the
     * rectangle is subpixel, it will be merged with adjacent rectangles.
     * The drawing operation may not take effect until flush is called.
     * @param {number} colorId The color of this rectangle, as an index
     *     in the renderer's color pallete.
     * @param {number} alpha The opacity of the rectangle as 0.0-1.0 number.
     */
    fillRect: function(x, w, colorId, alpha) {
      var r = x + w;
      if (w < this.minRectSize_) {
        if (r - this.mergeStartX_ > this.maxMergeDist_)
          this.flush();
        if (!this.merging_) {
          this.merging_ = true;
          this.mergeStartX_ = x;
          this.mergeCurRight_ = r;
          this.mergedColorId_ = colorId;
          this.mergedAlpha_ = alpha;
        } else {
          this.mergeCurRight_ = r;

          if (this.mergedAlpha_ < alpha ||
              (this.mergedAlpha_ === alpha && this.mergedColorId_ < colorId)) {
            this.mergedAlpha_ = alpha;
            this.mergedColorId_ = colorId;
          }
        }
      } else {
        if (this.merging_)
          this.flush();
        this.ctx_.fillStyle = this.pallette_[colorId];
        this.ctx_.globalAlpha = alpha;
        this.ctx_.fillRect(x, this.y_, w, this.h_);
      }
    },

    /**
     * Commits any pending fillRect operations to the underlying graphics
     * context.
     */
    flush: function() {
      if (this.merging_) {
        this.ctx_.fillStyle = this.pallette_[this.mergedColorId_];
        this.ctx_.globalAlpha = this.mergedAlpha_;
        this.ctx_.fillRect(this.mergeStartX_, this.y_,
                           this.mergeCurRight_ - this.mergeStartX_, this.h_);
        this.merging_ = false;
      }
    }
  };

  return {
    FastRectRenderer: FastRectRenderer
  };

});
