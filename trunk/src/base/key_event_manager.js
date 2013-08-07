// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.guid');

base.exportTo('base', function() {
  /**
   * KeyEventManager avoids leaks when listening for keys.
   *
   * A common but leaky pattern is:
   *   document.addEventListener('key*', function().bind(this))
   * This leaks.
   *
   * Instead do this:
   *   KeyEventManager.instance.addListener('keyDown', func, this);
   *
   * This will not leak. BUT, note, if "this" is not attached to the document,
   * it will NOT receive input events.
   *
   * Conceptually, KeyEventManager works by making the this refrence "weak",
   * which is actually accomplished by putting a guid on the thisArg. When keys
   * are received, we look for elements with that guid and dispatch the keys to
   * them.
   */
  function KeyEventManager(opt_document) {
    this.document_ = opt_document || document;
    if (KeyEventManager.instance)
      throw new Error('KeyEventManager is a singleton.');
    this.onEvent_ = this.onEvent_.bind(this);
    this.document_.addEventListener('keydown', this.onEvent_);
    this.document_.addEventListener('keypress', this.onEvent_);
    this.document_.addEventListener('keyup', this.onEvent_);
    this.listeners_ = [];
  }
  KeyEventManager.instance = undefined;

  KeyEventManager.resetInstanceForUnitTesting = function() {
    if (KeyEventManager.instance) {
      KeyEventManager.instance.destroy();
      KeyEventManager.instance = undefined;
    }
    KeyEventManager.instance = new KeyEventManager();
  }

  KeyEventManager.prototype = {
    addListener: function(type, handler, thisArg) {
      if (!thisArg.keyEventManagerGuid_) {
        thisArg.keyEventManagerGuid_ = base.GUID.allocate();
        thisArg.keyEventManagerRefCount_ = 0;
      }
      thisArg.classList.add('key-event-manager-target');
      thisArg.keyEventManagerRefCount_++;

      var guid = thisArg.keyEventManagerGuid_;
      this.listeners_.push({
        guid: guid,
        type: type,
        handler: handler
      });
    },

    onEvent_: function(event) {
      // This does standard DOM event propagation of the given event, but using
      // guids to locate the thisArg for each listener. See event_target.js for
      // notes on how this works.
      var preventDefaultState = undefined;
      var stopPropagationCalled = false;

      var oldPreventDefault = event.preventDefault;
      event.preventDefault = function() {
        preventDefaultState = false;
        oldPreventDefault.call(this);
      };

      var oldStopPropagation = event.stopPropagation;
      event.stopPropagation = function() {
        stopPropagationCalled = true;
        oldStopPropagation.call(this);
      };

      event.stopImmediatePropagation = function() {
        throw new Error('Not implemented');
      };

      var possibleThisArgs = this.document_.querySelectorAll(
          '.key-event-manager-target');
      var possibleThisArgsByGUID = {};
      for (var i = 0; i < possibleThisArgs.length; i++) {
        possibleThisArgsByGUID[possibleThisArgs[i].keyEventManagerGuid_] =
            possibleThisArgs[i];
      }

      // We need to copy listeners_ and verify the thisArgs exists on each loop
      // iteration because the event callbacks can change the DOM and listener
      // list.
      var listeners = this.listeners_.concat();
      var type = event.type;
      var prevented = 0;
      for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        if (listener.type !== type)
          continue;
        // thisArg went away.
        var thisArg = possibleThisArgsByGUID[listener.guid];
        if (!thisArg)
          continue;

        var handler = listener.handler;
        if (handler.handleEvent)
          prevented |= handler.handleEvent.call(handler, event) === false;
        else
          prevented |= handler.call(thisArg, event) === false;
        if (stopPropagationCalled)
          break;
      }

      // We want to return false if preventDefaulted, or one of the handlers
      // return false. But otherwise, we want to return undefiend.
      return !prevented && preventDefaultState;
    },

    removeListener: function(type, handler, thisArg) {
      if (thisArg.keyEventManagerGuid_ === undefined)
        throw new Error('Was not registered with KeyEventManager');
      if (thisArg.keyEventManagerRefCount_ === 0)
        throw new Error('No events were registered on the provided thisArg');
      for (var i = 0; i < this.listeners_.length; i++) {
        var listener = this.listeners_[i];
        if (listener.type == type &&
            listener.handler == handler &&
            listener.guid == thisArg.keyEventManagerGuid_) {
          thisArg.keyEventManagerRefCount_--;
          if (thisArg.keyEventManagerRefCount_ === 0)
            thisArg.classList.remove('key-event-manager-target');
          this.listeners_.splice(i, 1);
          return;
        }
      }
      throw new Error('Listener not found');
    },

    destroy: function() {
      this.listeners_.splice(0);
      this.document_.removeEventListener('keydown', this.onEvent_);
      this.document_.removeEventListener('keypress', this.onEvent_);
      this.document_.removeEventListener('keyup', this.onEvent_);
    },

    dispatchFakeEvent: function(type, args) {
      var e = new KeyboardEvent(type, args);
      return KeyEventManager.instance.onEvent_.call(undefined, e);
    }
  };

  KeyEventManager.instance = new KeyEventManager();

  return {
    KeyEventManager: KeyEventManager
  };
});
