// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides a caching layer for elided text values.
 */
base.exportTo('tracing', function() {
  /**
   * Cache for elided strings.
   * Moved from the ElidedTitleCache protoype to a "global" for speed
   * (variable reference is 100x faster).
   *   key: String we wish to elide.
   *   value: Another dict whose key is width
   *     and value is an ElidedStringWidthPair.
   */
  var elidedTitleCacheDict = {};
  var elidedTitleCache = new ElidedTitleCache();

  /**
   * A cache for elided strings.
   * @constructor
   */
  function ElidedTitleCache() {
    // TODO(jrg): possibly obsoleted with the elided string cache.
    // Consider removing.
    this.textWidthMap = {};
  }

  ElidedTitleCache.prototype = {
    /**
     * Return elided text.
     *
     * @param {ctx} Context The graphics context.
     * @param {pixWidth} Pixel width.
     * @param {title} Original title text.
     * @param {width} Drawn width in world coords.
     * @param {sliceDuration} Where the title must fit (in world coords).
     * @return {ElidedStringWidthPair} Elided string and width.
     */
    get: function(ctx, pixWidth, title, width, sliceDuration) {
      var elidedDict = elidedTitleCacheDict[title];
      if (!elidedDict) {
        elidedDict = {};
        elidedTitleCacheDict[title] = elidedDict;
      }

      var elidedDictForPixWidth = elidedDict[pixWidth];
      if (!elidedDictForPixWidth) {
        elidedDict[pixWidth] = {};
        elidedDictForPixWidth = elidedDict[pixWidth];
      }

      var stringWidthPair = elidedDictForPixWidth[sliceDuration];
      if (stringWidthPair === undefined) {
        var newtitle = title;
        var elided = false;
        while (this.labelWidthWorld(ctx, newtitle, pixWidth) > sliceDuration) {
          if (newtitle.length * 0.75 < 1)
            break;
          newtitle = newtitle.substring(0, newtitle.length * 0.75);
          elided = true;
        }

        if (elided && newtitle.length > 3)
          newtitle = newtitle.substring(0, newtitle.length - 3) + '...';

        stringWidthPair = new ElidedStringWidthPair(
            newtitle, this.labelWidth(ctx, newtitle));
        elidedDictForPixWidth[sliceDuration] = stringWidthPair;
      }
      return stringWidthPair;
    },

    quickMeasureText_: function(ctx, text) {
      var w = this.textWidthMap[text];
      if (!w) {
        w = ctx.measureText(text).width;
        this.textWidthMap[text] = w;
      }
      return w;
    },

    labelWidth: function(ctx, title) {
      return this.quickMeasureText_(ctx, title) + 2;
    },

    labelWidthWorld: function(ctx, title, pixWidth) {
      return this.labelWidth(ctx, title) * pixWidth;
    }
  };

  /**
   * A pair representing an elided string and world-coordinate width
   * to draw it.
   * @constructor
   */
  function ElidedStringWidthPair(string, width) {
    this.string = string;
    this.width = width;
  }

  return {
    ElidedTitleCache: ElidedTitleCache
  };
});

