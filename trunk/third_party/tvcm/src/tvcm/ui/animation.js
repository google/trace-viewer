// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tvcm.ui', function() {
  /**
   * Represents a procedural animation that can be run by an
   * tvcm.ui.AnimationController.
   *
   * @constructor
   */
  function Animation() {
  }

  Animation.prototype = {

    /**
     * Called when an animation has been queued after a running animation.
     *
     * @return {boolean} True if the animation can take on the responsibilities
     * of the running animation. If true, takeOverFor will be called on the
     * animation.
     *
     * This can be used to build animations that accelerate as pairs of them are
     * queued.
     */
    canTakeOverFor: function(existingAnimation) {
      throw new Error('Not implemented');
    },

    /**
     * Called to take over responsiblities of an existingAnimation.
     *
     * At this point, the existingAnimation has been ticked one last time, then
     * stopped. This animation will be started after this returns and has the
     * job of finishing(or transitioning away from) the effect the existing
     * animation was trying to accomplish.
     */
    takeOverFor: function(existingAnimation, newStartTimestamp, target) {
      throw new Error('Not implemented');
    },

    start: function(timestamp, target) {
      throw new Error('Not implemented');
    },

    /**
     * Called when an animation is stopped before it finishes. The animation can
     * do what it wants here, usually nothing.
     *
     * @param {Number} timestamp When the animation was stopped.
     * @param {Object} target The object being animated. May be undefined, take
     * care.
     * @param {boolean} willBeTakenOverByAnotherAnimation Whether this animation
     * is going to be handed to another animation's takeOverFor function.
     */
    didStopEarly: function(timestamp, target,
                           willBeTakenOverByAnotherAnimation) {
    },

    /**
     * @return {boolean} true if the animation is finished.
     */
    tick: function(timestamp, target) {
      throw new Error('Not implemented');
    }
  };

  return {
    Animation: Animation
  };
});
