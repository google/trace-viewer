// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.event_target');
base.require('base.raf');
base.require('ui.animation');

base.exportTo('ui', function() {
  /**
   * Manages execution, queueing and blending of ui.Animations against
   * a single target.
   *
   * Targets must have a cloneAnimationState() method that returns all the
   * animatable states of that target.
   *
   * @constructor
   * @extends {base.EventTarget}
   */
  function AnimationController() {
    base.EventTarget.call(this);

    this.target_ = undefined;

    this.activeAnimation_ = undefined;

    this.tickScheduled_ = false;
  }

  AnimationController.prototype = {
    __proto__: base.EventTarget.prototype,

    get target() {
      return this.target_;
    },

    set target(target) {
      if (this.activeAnimation_)
        throw new Error('Cannot change target while animation is running.');
      if (target.cloneAnimationState === undefined ||
          typeof target.cloneAnimationState !== 'function')
        throw new Error('target must have a cloneAnimationState function');

      this.target_ = target;
    },

    get activeAnimation() {
      return this.activeAnimation_;
    },

    get hasActiveAnimation() {
      return !!this.activeAnimation_;
    },

    queueAnimation: function(animation, opt_now) {
      if (this.target_ === undefined)
        throw new Error('Cannot queue animations without a target');

      var now;
      if (opt_now !== undefined)
        now = opt_now;
      else
        now = window.performance.now();

      if (this.activeAnimation_) {
        // Must tick the animation before stopping it case its about to stop,
        // and to update the target with its final sets of edits up to this
        // point.
        var done = this.activeAnimation_.tick(now, this.target_);
        if (done)
          this.activeAnimation_ = undefined;
      }

      if (this.activeAnimation_) {
        if (animation.canTakeOverFor(this.activeAnimation_)) {
          this.activeAnimation_.didStopEarly(now, this.target_, true);
          animation.takeOverFor(this.activeAnimation_, now, this.target_);
        } else {
          this.activeAnimation_.didStopEarly(now, this.target_, false);
        }
      }
      this.activeAnimation_ = animation;
      this.activeAnimation_.start(now, this.target_);

      if (this.tickScheduled_)
        return;
      this.tickScheduled_ = true;
      base.requestAnimationFrame(this.tickActiveAnimation_, this);
    },

    cancelActiveAnimation: function(opt_now) {
      if (!this.activeAnimation_)
        return;
      var now;
      if (opt_now !== undefined)
        now = opt_now;
      else
        now = window.performance.now();
      this.activeAnimation_.didStopEarly(now, this.target_, false);
      this.activeAnimation_ = undefined;
    },

    tickActiveAnimation_: function(frameBeginTime) {
      this.tickScheduled_ = false;
      if (!this.activeAnimation_)
        return;

      if (this.target_ === undefined) {
        this.activeAnimation_.didStopEarly(frameBeginTime, this.target_, false);
        return;
      }

      var oldTargetState = this.target_.cloneAnimationState();

      var done = this.activeAnimation_.tick(frameBeginTime, this.target_);
      if (done)
        this.activeAnimation_ = undefined;

      if (this.activeAnimation_) {
        this.tickScheduled_ = true;
        base.requestAnimationFrame(this.tickActiveAnimation_, this);
      }

      if (oldTargetState) {
        var e = new Event('didtick');
        e.oldTargetState = oldTargetState;
        this.dispatchEvent(e, false, false);
      }
    }
  };

  return {
    AnimationController: AnimationController
  };
});
