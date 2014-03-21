// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tvcm.ui.tool_button');
tvcm.requireStylesheet('tvcm.ui.mouse_mode_selector');

tvcm.requireTemplate('tvcm.ui.mouse_mode_selector');

tvcm.require('tvcm.events');
tvcm.require('tvcm.iteration_helpers');
tvcm.require('tvcm.utils');
tvcm.require('tvcm.key_event_manager');
tvcm.require('tvcm.ui');
tvcm.require('tvcm.ui.mouse_tracker');

tvcm.exportTo('tvcm.ui', function() {

  var MIN_MOUSE_SELECTION_DISTANCE = 4;

  var MOUSE_SELECTOR_MODE = {};
  MOUSE_SELECTOR_MODE.SELECTION = 0x1;
  MOUSE_SELECTOR_MODE.PANSCAN = 0x2;
  MOUSE_SELECTOR_MODE.ZOOM = 0x4;
  MOUSE_SELECTOR_MODE.TIMING = 0x8;
  MOUSE_SELECTOR_MODE.ROTATE = 0x10;
  MOUSE_SELECTOR_MODE.ALL_MODES = 0x1F;

  var allModeInfo = {};
  allModeInfo[MOUSE_SELECTOR_MODE.PANSCAN] = {
    title: 'pan',
    className: 'pan-scan-mode-button',
    eventNames: {
      enter: 'enterpan',
      begin: 'beginpan',
      update: 'updatepan',
      end: 'endpan',
      exit: 'exitpan'
    }
  };
  allModeInfo[MOUSE_SELECTOR_MODE.SELECTION] = {
    title: 'selection',
    className: 'selection-mode-button',
    eventNames: {
      enter: 'enterselection',
      begin: 'beginselection',
      update: 'updateselection',
      end: 'endselection',
      exit: 'exitselection'
    }
  };

  allModeInfo[MOUSE_SELECTOR_MODE.ZOOM] = {
    title: 'zoom',
    className: 'zoom-mode-button',
    eventNames: {
      enter: 'enterzoom',
      begin: 'beginzoom',
      update: 'updatezoom',
      end: 'endzoom',
      exit: 'exitzoom'
    }
  };
  allModeInfo[MOUSE_SELECTOR_MODE.TIMING] = {
    title: 'timing',
    className: 'timing-mode-button',
    eventNames: {
      enter: 'entertiming',
      begin: 'begintiming',
      update: 'updatetiming',
      end: 'endtiming',
      exit: 'exittiming'
    }
  };
  allModeInfo[MOUSE_SELECTOR_MODE.ROTATE] = {
    title: 'rotate',
    className: 'rotate-mode-button',
    eventNames: {
      enter: 'enterrotate',
      begin: 'beginrotate',
      update: 'updaterotate',
      end: 'endrotate',
      exit: 'exitrotate'
    }
  };

  var MODIFIER = {
    SHIFT: 0x1,
    SPACE: 0x2,
    CMD_OR_CTRL: 0x4
  };

  /**
   * Provides a panel for switching the interaction mode of the mouse.
   * It handles the user interaction and dispatches events for the various
   * modes.
   *
   * @constructor
   * @extends {HTMLDivElement}
   */
  var MouseModeSelector = tvcm.ui.define('div');

  MouseModeSelector.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function(opt_targetElement) {
      this.classList.add('mouse-mode-selector');

      var node = tvcm.instantiateTemplate('#mouse-mode-selector-template');
      this.appendChild(node);

      this.buttonsEl_ = this.querySelector('.buttons');
      this.dragHandleEl_ = this.querySelector('.drag-handle');

      this.supportedModeMask = MOUSE_SELECTOR_MODE.ALL_MODES;

      this.initialRelativeMouseDownPos_ = {x: 0, y: 0};

      this.defaultMode_ = MOUSE_SELECTOR_MODE.PANSCAN;
      this.settingsKey_ = undefined;
      this.mousePos_ = {x: 0, y: 0};
      this.mouseDownPos_ = {x: 0, y: 0};

      this.dragHandleEl_.addEventListener('mousedown',
          this.onDragHandleMouseDown_.bind(this));

      this.onMouseDown_ = this.onMouseDown_.bind(this);
      this.onMouseMove_ = this.onMouseMove_.bind(this);
      this.onMouseUp_ = this.onMouseUp_.bind(this);

      this.buttonsEl_.addEventListener('mouseup', this.onButtonMouseUp_);
      this.buttonsEl_.addEventListener('mousedown', this.onButtonMouseDown_);
      this.buttonsEl_.addEventListener('click', this.onButtonPress_.bind(this));

      tvcm.KeyEventManager.instance.addListener(
          'keydown', this.onKeyDown_, this);
      tvcm.KeyEventManager.instance.addListener(
          'keyup', this.onKeyUp_, this);

      this.mode_ = undefined;
      this.modeToKeyCodeMap_ = {};
      this.modifierToModeMap_ = {};

      this.targetElement = opt_targetElement;
      this.spacePressed_ = false;
      this.modeBeforeAlternativeModeActivated_ = null;

      this.isInteracting_ = false;
      this.isClick_ = false;
    },

    get targetElement() {
      return this.targetElement_;
    },

    set targetElement(target) {
      if (this.targetElement_)
        this.targetElement_.removeEventListener('mousedown', this.onMouseDown_);
      this.targetElement_ = target;
      if (this.targetElement_)
        this.targetElement_.addEventListener('mousedown', this.onMouseDown_);
    },

    get defaultMode() {
      return this.defaultMode_;
    },

    set defaultMode(defaultMode) {
      this.defaultMode_ = defaultMode;
    },

    get settingsKey() {
      return this.settingsKey_;
    },

    set settingsKey(settingsKey) {
      this.settingsKey_ = settingsKey;
      if (!this.settingsKey_)
        return;

      var mode = tvcm.Settings.get(this.settingsKey_ + '.mode', undefined);
      // Modes changed from 1,2,3,4 to 0x1, 0x2, 0x4, 0x8. Fix any stray
      // settings to the best of our abilities.
      if (allModeInfo[mode] === undefined)
        mode = undefined;

      // Restoring settings against unsupported modes should just go back to the
      // default mode.
      if ((mode & this.supportedModeMask_) === 0)
        mode = undefined;

      if (!mode)
        mode = this.defaultMode_;
      this.mode = mode;

      var pos = tvcm.Settings.get(this.settingsKey_ + '.pos', undefined);
      if (pos)
        this.pos = pos;
    },

    get supportedModeMask() {
      return this.supportedModeMask_;
    },

    /**
     * Sets the supported modes. Should be an OR-ing of MOUSE_SELECTOR_MODE
     * values.
     */
    set supportedModeMask(supportedModeMask) {
      if (this.mode && (supportedModeMask & this.mode) === 0)
        throw new Error('supportedModeMask must include current mode.');

      function createButtonForMode(mode) {
        var button = document.createElement('div');
        button.mode = mode;
        button.title = allModeInfo[mode].title;
        button.classList.add('tool-button');
        button.classList.add(allModeInfo[mode].className);
        return button;
      }

      this.supportedModeMask_ = supportedModeMask;
      this.buttonsEl_.textContent = '';
      for (var modeName in MOUSE_SELECTOR_MODE) {
        if (modeName == 'ALL_MODES')
          continue;
        var mode = MOUSE_SELECTOR_MODE[modeName];
        if ((this.supportedModeMask_ & mode) === 0)
          continue;
        this.buttonsEl_.appendChild(createButtonForMode(mode));
      }
    },

    get mode() {
      return this.currentMode_;
    },

    set mode(newMode) {
      if (newMode !== undefined) {
        if (typeof newMode !== 'number')
          throw new Error('Mode must be a number');
        if ((newMode & this.supportedModeMask_) === 0)
          throw new Error('Cannot switch to this mode, it is not supported');
        if (allModeInfo[newMode] === undefined)
          throw new Error('Unrecognized mode');
      }

      var modeInfo;

      if (this.currentMode_ === newMode)
        return;

      if (this.currentMode_) {
        modeInfo = allModeInfo[this.currentMode_];
        var buttonEl = this.buttonsEl_.querySelector('.' + modeInfo.className);
        if (buttonEl)
          buttonEl.classList.remove('active');

        // End event.
        if (this.isInteracting_) {

          var mouseEvent = this.createEvent_(
              allModeInfo[this.mode].eventNames.end);
          this.dispatchEvent(mouseEvent);
        }

        // Exit event.
        tvcm.dispatchSimpleEvent(this, modeInfo.eventNames.exit, true);
      }

      this.currentMode_ = newMode;

      if (this.currentMode_) {
        modeInfo = allModeInfo[this.currentMode_];
        var buttonEl = this.buttonsEl_.querySelector('.' + modeInfo.className);
        if (buttonEl)
          buttonEl.classList.add('active');

        // Entering a new mode resets mouse down pos.
        this.mouseDownPos_.x = this.mousePos_.x;
        this.mouseDownPos_.y = this.mousePos_.y;

        // Enter event.
        if (!this.isInAlternativeMode_)
          tvcm.dispatchSimpleEvent(this, modeInfo.eventNames.enter, true);

        // Begin event.
        if (this.isInteracting_) {
          var mouseEvent = this.createEvent_(
              allModeInfo[this.mode].eventNames.begin);
          this.dispatchEvent(mouseEvent);
        }


      }

      if (this.settingsKey_ && !this.isInAlternativeMode_)
        tvcm.Settings.set(this.settingsKey_ + '.mode', this.mode);
    },

    setKeyCodeForMode: function(mode, keyCode) {
      if ((mode & this.supportedModeMask_) === 0)
        throw new Error('Mode not supported');
      this.modeToKeyCodeMap_[mode] = keyCode;

      if (!this.buttonsEl_)
        return;

      var modeInfo = allModeInfo[mode];
      var buttonEl = this.buttonsEl_.querySelector('.' + modeInfo.className);
      if (buttonEl) {
        buttonEl.title =
            modeInfo.title + ' (' + String.fromCharCode(keyCode) + ')';
      }
    },

    setCurrentMousePosFromEvent_: function(e) {
      this.mousePos_.x = e.clientX;
      this.mousePos_.y = e.clientY;
    },

    createEvent_: function(eventName, sourceEvent) {
      var event = new tvcm.Event(eventName, true);
      event.clientX = this.mousePos_.x;
      event.clientY = this.mousePos_.y;
      event.deltaX = this.mousePos_.x - this.mouseDownPos_.x;
      event.deltaY = this.mousePos_.y - this.mouseDownPos_.y;
      event.mouseDownX = this.mouseDownPos_.x;
      event.mouseDownY = this.mouseDownPos_.y;
      event.didPreventDefault = false;
      event.preventDefault = function() {
        event.didPreventDefault = true;
        if (sourceEvent)
          sourceEvent.preventDefault();
      };
      event.stopPropagation = function() {
        sourceEvent.stopPropagation();
      };
      event.stopImmediatePropagation = function() {
        throw new Error('Not implemented');
      };
      return event;
    },

    onMouseDown_: function(e) {
      if (e.button !== 0)
        return;
      this.setCurrentMousePosFromEvent_(e);
      var mouseEvent = this.createEvent_(
          allModeInfo[this.mode].eventNames.begin, e);
      this.dispatchEvent(mouseEvent);
      this.isInteracting_ = true;
      this.isClick_ = true;
      tvcm.ui.trackMouseMovesUntilMouseUp(this.onMouseMove_, this.onMouseUp_);
    },

    onMouseMove_: function(e) {
      this.setCurrentMousePosFromEvent_(e);

      var mouseEvent = this.createEvent_(
          allModeInfo[this.mode].eventNames.update, e);
      this.dispatchEvent(mouseEvent);

      if (this.isInteracting_)
        this.checkIsClick_(e);
    },

    onMouseUp_: function(e) {
      if (e.button !== 0)
        return;

      var mouseEvent = this.createEvent_(
          allModeInfo[this.mode].eventNames.end, e);
      mouseEvent.isClick = this.isClick_;
      this.dispatchEvent(mouseEvent);

      if (this.isClick_ && !mouseEvent.didPreventDefault)
        this.dispatchClickEvents_(e);

      this.isInteracting_ = false;
      this.updateAlternativeModeState_(e);
    },

    onButtonMouseDown_: function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    },

    onButtonMouseUp_: function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    },

    onButtonPress_: function(e) {
      this.modeBeforeAlternativeModeActivated_ = undefined;
      this.mode = e.target.mode;
      e.preventDefault();
    },

    onKeyDown_: function(e) {
      if (e.keyCode === ' '.charCodeAt(0))
        this.spacePressed_ = true;
      this.updateAlternativeModeState_(e);
    },

    onKeyUp_: function(e) {
      if (e.keyCode === ' '.charCodeAt(0))
        this.spacePressed_ = false;

      var didHandleKey = false;
      tvcm.iterItems(this.modeToKeyCodeMap_, function(modeStr, keyCode) {
        if (e.keyCode === keyCode) {
          this.modeBeforeAlternativeModeActivated_ = undefined;
          var mode = parseInt(modeStr);
          this.mode = mode;
          didHandleKey = true;
        }
      }, this);

      if (didHandleKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.updateAlternativeModeState_(e);
    },

    updateAlternativeModeState_: function(e) {
      var shiftPressed = e.shiftKey;
      var spacePressed = this.spacePressed_;
      var cmdOrCtrlPressed =
          (tvcm.isMac && e.metaKey) || (!tvcm.isMac && e.ctrlKey);

      // Figure out the new mode
      var smm = this.supportedModeMask_;
      var newMode;
      var isNewModeAnAlternativeMode = false;
      if (shiftPressed &&
          (this.modifierToModeMap_[MODIFIER.SHIFT] & smm) !== 0) {
        newMode = this.modifierToModeMap_[MODIFIER.SHIFT];
        isNewModeAnAlternativeMode = true;
      } else if (spacePressed &&
                 (this.modifierToModeMap_[MODIFIER.SPACE] & smm) !== 0) {
        newMode = this.modifierToModeMap_[MODIFIER.SPACE];
        isNewModeAnAlternativeMode = true;
      } else if (cmdOrCtrlPressed &&
                 (this.modifierToModeMap_[MODIFIER.CMD_OR_CTRL] & smm) !== 0) {
        newMode = this.modifierToModeMap_[MODIFIER.CMD_OR_CTRL];
        isNewModeAnAlternativeMode = true;
      } else {
        // Go to the old mode, if there is one.
        if (this.isInAlternativeMode_) {
          newMode = this.modeBeforeAlternativeModeActivated_;
          isNewModeAnAlternativeMode = false;
        } else {
          newMode = undefined;
        }
      }

      // Maybe a mode change isn't needed.
      if (this.mode === newMode || newMode === undefined)
        return;

      // Okay, we're changing.
      if (isNewModeAnAlternativeMode)
        this.modeBeforeAlternativeModeActivated_ = this.mode;
      this.mode = newMode;
    },

    get isInAlternativeMode_() {
      return !!this.modeBeforeAlternativeModeActivated_;
    },

    setModifierForAlternateMode: function(mode, modifier) {
      this.modifierToModeMap_[modifier] = mode;
    },

    get pos() {
      return {
        x: parseInt(this.style.left),
        y: parseInt(this.style.top)
      };
    },

    set pos(pos) {
      pos = this.constrainPositionToBounds_(pos);

      this.style.left = pos.x + 'px';
      this.style.top = pos.y + 'px';

      if (this.settingsKey_)
        tvcm.Settings.set(this.settingsKey_ + '.pos', this.pos);
    },

    constrainPositionToBounds_: function(pos) {
      var parent = this.offsetParent || document.body;
      var parentRect = tvcm.windowRectForElement(parent);

      var top = 0;
      var bottom = parentRect.height - this.offsetHeight;
      var left = 0;
      var right = parentRect.width - this.offsetWidth;

      var res = {};
      res.x = Math.max(pos.x, left);
      res.x = Math.min(res.x, right);

      res.y = Math.max(pos.y, top);
      res.y = Math.min(res.y, bottom);
      return res;
    },

    onDragHandleMouseDown_: function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      var mouseDownPos = {
        x: e.clientX - this.offsetLeft,
        y: e.clientY - this.offsetTop
      };
      tvcm.ui.trackMouseMovesUntilMouseUp(function(e) {
        var pos = {};
        pos.x = e.clientX - mouseDownPos.x;
        pos.y = e.clientY - mouseDownPos.y;
        this.pos = pos;
      }.bind(this));
    },

    checkIsClick_: function(e) {
      if (!this.isInteracting_ || !this.isClick_)
        return;

      var deltaX = this.mousePos_.x - this.mouseDownPos_.x;
      var deltaY = this.mousePos_.y - this.mouseDownPos_.y;
      var minDist = MIN_MOUSE_SELECTION_DISTANCE;

      if (deltaX * deltaX + deltaY * deltaY > minDist * minDist)
        this.isClick_ = false;
    },

    dispatchClickEvents_: function(e) {
      if (!this.isClick_)
        return;

      var eventNames = allModeInfo[MOUSE_SELECTOR_MODE.SELECTION].eventNames;

      var mouseEvent = this.createEvent_(eventNames.begin);
      this.dispatchEvent(mouseEvent);

      mouseEvent = this.createEvent_(eventNames.end);
      this.dispatchEvent(mouseEvent);
    }
  };

  return {
    MIN_MOUSE_SELECTION_DISTANCE: MIN_MOUSE_SELECTION_DISTANCE,
    MouseModeSelector: MouseModeSelector,
    MOUSE_SELECTOR_MODE: MOUSE_SELECTOR_MODE,
    MODIFIER: MODIFIER
  };
});
