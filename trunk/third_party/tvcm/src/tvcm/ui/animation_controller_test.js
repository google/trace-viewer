// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.utils');
tvcm.require('tvcm.ui.animation_controller');

tvcm.unittest.testSuite('tvcm.ui.animation_controller_test', function() {
  function SimpleAnimation(options) {
    this.stopTime = options.stopTime;

    this.startCalled = false;
    this.didStopEarlyCalled = false;
    this.wasTakenOver = false;
    this.tickCount = 0;
  }

  SimpleAnimation.prototype = {
    __proto__: tvcm.ui.Animation.prototype,

    canTakeOverFor: function(existingAnimation) {
      return false;
    },

    takeOverFor: function(existingAnimation, newStartTimestamp, target) {
      throw new Error('Not implemented');
    },

    start: function(timestamp, target) {
      this.startCalled = true;
    },

    didStopEarly: function(timestamp, target, willBeTakenOver) {
      this.didStopEarlyCalled = true;
      this.wasTakenOver = willBeTakenOver;
    },

    /**
     * @return {boolean} true if the animation is finished.
     */
    tick: function(timestamp, target) {
      this.tickCount++;
      return timestamp >= this.stopTime;
    }
  };

  test('cancel', function() {
    var target = {
      x: 0,
      cloneAnimationState: function() { return {x: this.x}; }
    };

    var controller = new tvcm.ui.AnimationController();
    controller.target = target;

    var animation = new SimpleAnimation({stopTime: 100});
    controller.queueAnimation(animation);

    tvcm.forcePendingRAFTasksToRun(0);
    assertEquals(1, animation.tickCount);
    controller.cancelActiveAnimation();
    assertFalse(controller.hasActiveAnimation);
    assertTrue(animation.didStopEarlyCalled);
  });

  test('simple', function() {
    var target = {
      x: 0,
      cloneAnimationState: function() { return {x: this.x}; }
    };

    var controller = new tvcm.ui.AnimationController();
    controller.target = target;

    var animation = new SimpleAnimation({stopTime: 100});
    controller.queueAnimation(animation);

    tvcm.forcePendingRAFTasksToRun(0);
    assertEquals(1, animation.tickCount);
    assertTrue(controller.hasActiveAnimation);

    tvcm.forcePendingRAFTasksToRun(100);
    assertEquals(2, animation.tickCount);
    assertFalse(controller.hasActiveAnimation);
  });

  test('queueTwo', function() {
    // Clear all pending rafs so if something is lingering it will blow up here.
    tvcm.forcePendingRAFTasksToRun(0);

    var target = {
      x: 0,
      cloneAnimationState: function() { return {x: this.x}; }
    };

    var controller = new tvcm.ui.AnimationController();
    controller.target = target;

    var a1 = new SimpleAnimation({stopTime: 100});
    var a2 = new SimpleAnimation({stopTime: 100});
    controller.queueAnimation(a1, 0);
    assertTrue(a1.startCalled);
    controller.queueAnimation(a2, 50);
    assertTrue(a1.didStopEarlyCalled);
    assertTrue(a2.startCalled);

    tvcm.forcePendingRAFTasksToRun(150);
    assertFalse(controller.hasActiveAnimation);
    assertTrue(a2.tickCount > 0);
  });

  /**
   * @constructor
   */
  function AnimationThatCanTakeOverForSimpleAnimation() {
    this.takeOverForAnimation = undefined;
  }

  AnimationThatCanTakeOverForSimpleAnimation.prototype = {
    __proto__: tvcm.ui.Animation.prototype,


    canTakeOverFor: function(existingAnimation) {
      return existingAnimation instanceof SimpleAnimation;
    },

    takeOverFor: function(existingAnimation, newStartTimestamp, target) {
      this.takeOverForAnimation = existingAnimation;
    },

    start: function(timestamp, target) {
      this.startCalled = true;
    }
  };

  test('takeOver', function() {
    var target = {
      x: 0,
      cloneAnimationState: function() { return {x: this.x}; }
    };

    var controller = new tvcm.ui.AnimationController();
    controller.target = target;

    var a1 = new SimpleAnimation({stopTime: 100});
    var a2 = new AnimationThatCanTakeOverForSimpleAnimation();
    controller.queueAnimation(a1, 0);
    assertTrue(a1.startCalled);
    assertEquals(0, a1.tickCount);
    controller.queueAnimation(a2, 10);
    assertTrue(a1.didStopEarlyCalled);
    assertTrue(a1.wasTakenOver);
    assertEquals(1, a1.tickCount);

    assertEquals(a2.takeOverForAnimation, a1);
    assertTrue(a2.startCalled);

    controller.cancelActiveAnimation();
    assertFalse(controller.hasActiveAnimation);
  });
});
