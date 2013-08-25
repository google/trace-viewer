// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('ui');
base.requireStylesheet('ui.drag_handle');

base.exportTo('ui', function() {

  /**
   * Detects when user clicks handle determines new height of container based
   * on user's vertical mouse move and resizes the target.
   * @constructor
   * @extends {HTMLDivElement}
   * You will need to set target to be the draggable element
   */
  var DragHandle = ui.define('x-drag-handle');

  DragHandle.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.lastMousePos_ = 0;
      this.onMouseMove_ = this.onMouseMove_.bind(this);
      this.onMouseUp_ = this.onMouseUp_.bind(this);
      this.addEventListener('mousedown', this.onMouseDown_);
      this.target_ = undefined;
      this.horizontal = true;
      this.observer_ = new WebKitMutationObserver(
          this.didTargetMutate_.bind(this));
      this.targetSizesByModeKey_ = {};
    },

    get modeKey_() {
      return this.target_.className == '' ? '.' : this.target_.className;
    },

    get target() {
      return this.target_;
    },

    set target(target) {
      this.observer_.disconnect();
      this.target_ = target;
      if (!this.target_)
        return;
      this.observer_.observe(this.target_, {
        attributes: true,
        attributeFilter: ['class']
      });
    },

    get horizontal() {
      return this.horizontal_;
    },

    set horizontal(h) {
      this.horizontal_ = h;
      if (this.horizontal_)
        this.className = 'horizontal-drag-handle';
      else
        this.className = 'vertical-drag-handle';
    },

    get vertical() {
      return !this.horizontal_;
    },

    set vertical(v) {
      this.horizontal = !v;
    },

    forceMutationObserverFlush_: function() {
      var records = this.observer_.takeRecords();
      if (records.length)
        this.didTargetMutate_(records);
    },

    didTargetMutate_: function(e) {
      var modeSize = this.targetSizesByModeKey_[this.modeKey_];
      if (modeSize !== undefined) {
        this.setTargetSize_(modeSize);
        return;
      }

      // If we hadn't previously sized the target, then just remove any manual
      // sizing that we applied.
      this.target_.style[this.targetStyleKey_] = '';
    },

    get targetStyleKey_() {
      return this.horizontal_ ? 'height' : 'width';
    },

    getTargetSize_: function() {
      // If style is not set, start off with computed height.
      var targetStyleKey = this.targetStyleKey_;
      if (!this.target_.style[targetStyleKey]) {
        this.target_.style[targetStyleKey] =
            window.getComputedStyle(this.target_)[targetStyleKey];
      }
      var size = parseInt(this.target_.style[targetStyleKey]);
      this.targetSizesByModeKey_[this.modeKey_] = size;
      return size;
    },

    setTargetSize_: function(s) {
      this.target_.style[this.targetStyleKey_] = s + 'px';
      this.targetSizesByModeKey_[this.modeKey_] = s;
    },

    applyDelta_: function(delta) {
      // Apply new size to the container.
      var curSize = this.getTargetSize_();
      var newSize;
      if (this.target_ === this.nextSibling) {
        newSize = curSize + delta;
      } else {
        newSize = curSize - delta;
      }
      this.setTargetSize_(newSize);
    },

    onMouseMove_: function(e) {
      // Compute the difference in height position.
      var curMousePos = this.horizontal_ ? e.clientY : e.clientX;
      var delta = this.lastMousePos_ - curMousePos;

      this.applyDelta_(delta);

      this.lastMousePos_ = curMousePos;
      e.preventDefault();
      return true;
    },

    onMouseDown_: function(e) {
      if (!this.target_)
        return;
      this.forceMutationObserverFlush_();
      this.lastMousePos_ = this.horizontal_ ? e.clientY : e.clientX;
      document.addEventListener('mousemove', this.onMouseMove_);
      document.addEventListener('mouseup', this.onMouseUp_);
      e.preventDefault();
      return true;
    },

    onMouseUp_: function(e) {
      document.removeEventListener('mousemove', this.onMouseMove_);
      document.removeEventListener('mouseup', this.onMouseUp_);
      e.preventDefault();
    }
  };

  return {
    DragHandle: DragHandle
  };
});
