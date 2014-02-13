// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tvcm.ui.info_bar');
tvcm.require('tvcm.ui');
tvcm.require('tvcm.ui.dom_helpers');

tvcm.exportTo('tvcm.ui', function() {
  /**
   * @constructor
   */
  var InfoBar = tvcm.ui.define('x-info-bar');

  InfoBar.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.messageEl_ = tvcm.ui.createSpan({className: 'message'});
      this.buttonsEl_ = tvcm.ui.createSpan({className: 'buttons'});

      this.appendChild(this.messageEl_);
      this.appendChild(this.buttonsEl_);
      this.message = '';
      this.visible = false;
    },

    get message() {
      return this.messageEl_.textContent;
    },

    set message(message) {
      this.messageEl_.textContent = message;
    },

    get visible() {
      return this.classList.contains('info-bar-hidden');
    },

    set visible(visible) {
      if (visible)
        this.classList.remove('info-bar-hidden');
      else
        this.classList.add('info-bar-hidden');
    },

    removeAllButtons: function() {
      this.buttonsEl_.textContent = '';
    },

    addButton: function(text, clickCallback) {
      var button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', clickCallback);
      this.buttonsEl_.appendChild(button);
      return button;
    }
  };

  /**
   * @constructor
   */
  var InfoBarGroup = tvcm.ui.define('x-info-bar-group');

  InfoBarGroup.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.messages_ = [];
    },

    clearMessages: function() {
      this.messages_ = [];
      this.updateContents_();
    },

    addMessage: function(text, opt_buttons) {
      opt_buttons = opt_buttons || [];
      for (var i = 0; i < opt_buttons.length; i++) {
        if (opt_buttons[i].buttonText === undefined)
          throw new Error('buttonText must be provided');
        if (opt_buttons[i].onClick === undefined)
          throw new Error('onClick must be provided');
      }

      this.messages_.push({
        text: text,
        buttons: opt_buttons || []
      });
      this.updateContents_();
    },

    updateContents_: function() {
      this.textContent = '';
      this.messages_.forEach(function(message) {
        var bar = new InfoBar();
        bar.message = message.text;
        bar.visible = true;
        message.buttons.forEach(function(button) {
          bar.addButton(button.buttonText, button.onClick);
        }, this);
        this.appendChild(bar);
      }, this);
    }
  };


  return {
    InfoBar: InfoBar,
    InfoBarGroup: InfoBarGroup
  };
});
