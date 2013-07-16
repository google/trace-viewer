// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.event_target');

base.exportTo('base', function() {
  /**
   * Creates a new event to be used with base.EventTarget or DOM EventTarget
   * objects.
   * @param {string} type The name of the event.
   * @param {boolean=} opt_bubbles Whether the event bubbles.
   *     Default is false.
   * @param {boolean=} opt_preventable Whether the default action of the event
   *     can be prevented.
   * @constructor
   * @extends {Event}
   */
  function Event(type, opt_bubbles, opt_preventable) {
    var e = base.doc.createEvent('Event');
    e.initEvent(type, !!opt_bubbles, !!opt_preventable);
    e.__proto__ = global.Event.prototype;
    return e;
  };

  Event.prototype = {
    __proto__: global.Event.prototype
  };

  /**
   * Dispatches a simple event on an event target.
   * @param {!EventTarget} target The event target to dispatch the event on.
   * @param {string} type The type of the event.
   * @param {boolean=} opt_bubbles Whether the event bubbles or not.
   * @param {boolean=} opt_cancelable Whether the default action of the event
   *     can be prevented.
   * @return {boolean} If any of the listeners called {@code preventDefault}
   *     during the dispatch this will return false.
   */
  function dispatchSimpleEvent(target, type, opt_bubbles, opt_cancelable) {
    var e = new Event(type, opt_bubbles, opt_cancelable);
    return target.dispatchEvent(e);
  }

  return {
    Event: Event,
    dispatchSimpleEvent: dispatchSimpleEvent
  };
});

