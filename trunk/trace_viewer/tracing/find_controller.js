// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview FindController.
 */

tvcm.require('tracing.filter');
tvcm.require('tracing.selection');

tvcm.exportTo('tracing', function() {
  function FindController() {
    this.timeline_ = undefined;
    this.model_ = undefined;
    this.filterText_ = '';
    this.filterHits_ = new tracing.Selection();
    this.filterHitsDirty_ = true;
    this.currentHitIndex_ = -1;
  };

  FindController.prototype = {
    __proto__: Object.prototype,

    get timeline() {
      return this.timeline_;
    },

    set timeline(t) {
      this.timeline_ = t;
      this.filterHitsDirty_ = true;
    },

    get filterText() {
      return this.filterText_;
    },

    set filterText(f) {
      if (f == this.filterText_)
        return;
      this.filterText_ = f;
      this.filterHitsDirty_ = true;

      if (!this.timeline)
        return;

      this.timeline.setHighlightAndClearSelection(this.filterHits);
    },

    get filterHits() {
      if (this.filterHitsDirty_) {
        this.filterHitsDirty_ = false;
        this.filterHits_ = new tracing.Selection();
        this.currentHitIndex_ = -1;

        if (this.timeline_ && this.filterText.length) {
          var filter = new tracing.TitleFilter(this.filterText);
          this.timeline.addAllObjectsMatchingFilterToSelection(
              filter, this.filterHits_);
        }
      }
      return this.filterHits_;
    },

    get currentHitIndex() {
      return this.currentHitIndex_;
    },

    find_: function(dir) {
      var firstHit = this.currentHitIndex_ === -1;
      if (firstHit && dir < 0)
        this.currentHitIndex_ = 0;

      var N = this.filterHits.length;
      this.currentHitIndex_ = (this.currentHitIndex_ + dir + N) % N;

      if (!this.timeline)
        return;

      this.timeline.selection =
          this.filterHits.subSelection(this.currentHitIndex_, 1);
    },

    findNext: function() {
      this.find_(1);
    },

    findPrevious: function() {
      this.find_(-1);
    },

    reset: function() {
      this.filterText_ = '';
      this.filterHitsDirty_ = true;
    }
  };

  return {
    FindController: FindController
  };
});
