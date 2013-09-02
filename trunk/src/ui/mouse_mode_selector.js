// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('ui.tool_button');
base.requireStylesheet('ui.mouse_mode_selector');

base.requireTemplate('ui.mouse_mode_selector');

base.require('base.events');
base.require('tracing.constants');
base.require('base.events');
base.require('base.iteration_helpers');
base.require('base.utils');
base.require('base.key_event_manager');
base.require('ui');
base.require('ui.mouse_tracker');

base.exportTo('ui', function() {

  var MOUSE_SELECTOR_MODE = {};
  MOUSE_SELECTOR_MODE.SELECTION = 0x1;
  MOUSE_SELECTOR_MODE.PANSCAN = 0x2;
  MOUSE_SELECTOR_MODE.ZOOM = 0x4;
  MOUSE_SELECTOR_MODE.TIMING = 0x8;
  MOUSE_SELECTOR_MODE.ALL_MODES = 0xF;

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
  var MouseModeSelector = ui.define('div');

  MouseModeSelector.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function(opt_targetElement) {
      this.classList.add('mouse-mode-selector');

      var node = base.instantiateTemplate('#mouse-mode-selector-template');
      this.appendChild(node);

      this.buttonsEl_ = this.querySelector('.buttons');
      this.dragHandleEl_ = this.querySelector('.drag-handle');

      this.supportedModeMask = MOUSE_SELECTOR_MODE.ALL_MODES;

      this.pos = {
        x: window.innerWidth - 50,
        y: 100
      };

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

      base.KeyEventManager.instance.addListener(
          'keydown', this.onKeyDown_, this);
      base.KeyEventManager.instance.addListener(
          'keyup', this.onKeyUp_, this);

      this.mode_ = undefined;
      this.modeToKeyCodeMap_ = {};
      this.modifierToModeMap_ = {};

      this.targetElement = opt_targetElement;
      this.modeBeforeAlternativeModeActivated_ = null;
      this.exitAlternativeModeModifier_ = null;

      this.isInteracting_ = false;
      this.isClick_ = false;
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

      var mode = base.Settings.get(this.settingsKey_ + '.mode', undefined);
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

      var pos = base.Settings.get(this.settingsKey_ + '.pos', undefined);
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
        if (!this.isInAlternativeMode_)
          base.dispatchSimpleEvent(this, modeInfo.eventNames.exit, true);
      }

      this.currentMode_ = newMode;

      if (this.currentMode_) {
        modeInfo = allModeInfo[this.currentMode_];
        var buttonEl = this.buttonsEl_.querySelector('.' + modeInfo.className);
        if (buttonEl)
          buttonEl.classList.add('active');
        if (!this.isInAlternativeMode_)
          base.dispatchSimpleEvent(this, modeInfo.eventNames.enter, true);
      }

      if (this.settingsKey_)
        base.Settings.set(this.settingsKey_ + '.mode', this.mode);
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

    setPositionFromEvent_: function(pos, e) {
      pos.x = e.clientX;
      pos.y = e.clientY;
    },

    onMouseDown_: function(e) {
      if (e.button !== tracing.constants.LEFT_MOUSE_BUTTON)
        return;

      this.setPositionFromEvent_(this.mouseDownPos_, e);
      var mouseEvent = new base.Event(
          allModeInfo[this.mode].eventNames.begin, true);
      mouseEvent.data = e;
      this.dispatchEvent(mouseEvent);
      this.isInteracting_ = true;
      this.isClick_ = true;
      ui.trackMouseMovesUntilMouseUp(this.onMouseMove_, this.onMouseUp_);
    },

    onMouseMove_: function(e) {
      this.setPositionFromEvent_(this.mousePos_, e);
      var mouseEvent = new base.Event(
          allModeInfo[this.mode].eventNames.update, true);
      mouseEvent.data = e;
      mouseEvent.deltaX = e.x - this.mouseDownPos_.x;
      mouseEvent.deltaY = e.y - this.mouseDownPos_.y;
      mouseEvent.mouseDownPosition = this.mouseDownPos_;
      this.dispatchEvent(mouseEvent);

      if (this.isInteracting_)
        this.checkIsClick_(e);
    },

    onMouseUp_: function(e) {
      if (e.button !== tracing.constants.LEFT_MOUSE_BUTTON)
        return;

      var mouseEvent = new base.Event(
          allModeInfo[this.mode].eventNames.end, true);

      mouseEvent.data = e;
      mouseEvent.consumed = false;
      mouseEvent.isClick = this.isClick_;

      this.dispatchEvent(mouseEvent);

      if (this.isClick_ && !mouseEvent.consumed)
        this.dispatchClickEvents_(e);

      this.isInteracting_ = false;
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
      this.setAlternateMode_(null);
      this.mode = e.target.mode;
      e.preventDefault();
    },

    onKeyDown_: function(e) {

      // Prevent the user from changing modes during an interaction.
      if (this.isInteracting_)
        return;

      if (this.isInAlternativeMode_)
        return;

      var modifierToModeMap = this.modifierToModeMap_;
      var mode = this.mode;
      var m = MODIFIER;
      var modifier;

      var shiftPressed = e.shiftKey;
      var spacePressed = e.keyCode === ' '.charCodeAt(0);
      var cmdOrCtrlPressed =
          (base.isMac && e.metaKey) || (!base.isMac && e.ctrlKey);

      if (shiftPressed && modifierToModeMap[m.SHIFT] !== mode)
        modifier = m.SHIFT;
      else if (spacePressed && modifierToModeMap[m.SPACE] !== mode)
        modifier = m.SPACE;
      else if (cmdOrCtrlPressed && modifierToModeMap[m.CMD_OR_CTRL] !== mode)
        modifier = m.CMD_OR_CTRL;
      else
        return;

      this.setAlternateMode_(modifier);
    },

    onKeyUp_: function(e) {

      // Prevent the user from changing modes during an interaction.
      if (this.isInteracting_)
        return;

      base.iterItems(this.modeToKeyCodeMap_, function(modeStr, keyCode) {
        if (e.keyCode === keyCode) {
          this.setAlternateMode_(null);
          var mode = parseInt(modeStr);
          this.mode = mode;
        }
      }, this);

      if (!this.isInAlternativeMode_)
        return;

      var shiftReleased = !e.shiftKey;
      var spaceReleased = e.keyCode === ' '.charCodeAt(0);
      var cmdOrCtrlReleased =
          (base.isMac && !e.metaKey) || (!base.isMac && !e.ctrlKey);

      var exitModifier = this.exitAlternativeModeModifier_;
      if ((shiftReleased && exitModifier === MODIFIER.SHIFT) ||
          (spaceReleased && exitModifier === MODIFIER.SPACE) ||
          (cmdOrCtrlReleased && exitModifier === MODIFIER.CMD_OR_CTRL)) {
        this.setAlternateMode_(null);
      }
    },

    get isInAlternativeMode_() {
      return !!this.modeBeforeAlternativeModeActivated_;
    },

    setAlternateMode_: function(modifier) {
      if (!modifier) {
        if (this.isInAlternativeMode_) {
          this.mode = this.modeBeforeAlternativeModeActivated_;
          this.modeBeforeAlternativeModeActivated_ = null;
        }
        return;
      }

      var alternateMode = this.modifierToModeMap_[modifier];
      if ((alternateMode & this.supportedModeMask_) === 0)
        return;

      this.modeBeforeAlternativeModeActivated_ = this.mode;
      this.exitAlternativeModeModifier_ = modifier;
      this.mode = alternateMode;
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
        base.Settings.set(this.settingsKey_ + '.pos', this.pos);
    },

    constrainPositionToBounds_: function(pos) {
      var parent = this.offsetParent || document.body;
      var parentRect = base.windowRectForElement(parent);

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

      this.initialRelativeMouseDownPos_.x = e.clientX - this.offsetLeft;
      this.initialRelativeMouseDownPos_.y = e.clientY - this.offsetTop;
      ui.trackMouseMovesUntilMouseUp(this.onDragHandleMouseMove_.bind(this));
    },

    onDragHandleMouseMove_: function(e) {
      var pos = {};
      pos.x = (e.clientX - this.initialRelativeMouseDownPos_.x);
      pos.y = (e.clientY - this.initialRelativeMouseDownPos_.y);
      this.pos = pos;
    },

    checkIsClick_: function(e) {
      if (!this.isInteracting_ || !this.isClick_)
        return;

      var deltaX = this.mousePos_.x - this.mouseDownPos_.x;
      var deltaY = this.mousePos_.y - this.mouseDownPos_.y;
      var minDist = tracing.constants.MIN_MOUSE_SELECTION_DISTANCE;

      if (deltaX * deltaX + deltaY * deltaY > minDist * minDist)
        this.isClick_ = false;
    },

    dispatchClickEvents_: function(e) {
      if (!this.isClick_)
        return;

      var eventNames = allModeInfo[MOUSE_SELECTOR_MODE.SELECTION].eventNames;

      var mouseEvent = new base.Event(eventNames.begin, true);
      mouseEvent.data = e;
      this.dispatchEvent(mouseEvent);

      mouseEvent = new base.Event(eventNames.end, true);
      mouseEvent.data = e;
      this.dispatchEvent(mouseEvent);
    }
  };

  return {
    MouseModeSelector: MouseModeSelector,
    MOUSE_SELECTOR_MODE: MOUSE_SELECTOR_MODE,
    MODIFIER: MODIFIER
  };
});
