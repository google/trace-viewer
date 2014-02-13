// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Container that decorates its children.
 */
tvcm.require('tvcm.events');
tvcm.require('tvcm.ui');

tvcm.exportTo('tvcm.ui', function() {
  /**
   * @constructor
   */
  var ContainerThatDecoratesItsChildren = tvcm.ui.define('div');

  ContainerThatDecoratesItsChildren.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.observer_ = new WebKitMutationObserver(this.didMutate_.bind(this));
      this.observer_.observe(this, { childList: true });

      // textContent is a variable on regular HTMLElements. However, we want to
      // hook and prevent writes to it.
      Object.defineProperty(
          this, 'textContent',
          { get: undefined, set: this.onSetTextContent_});
    },

    appendChild: function(x) {
      HTMLUnknownElement.prototype.appendChild.call(this, x);
      this.didMutate_(this.observer_.takeRecords());
    },

    insertBefore: function(x, y) {
      HTMLUnknownElement.prototype.insertBefore.call(this, x, y);
      this.didMutate_(this.observer_.takeRecords());
    },

    removeChild: function(x) {
      HTMLUnknownElement.prototype.removeChild.call(this, x);
      this.didMutate_(this.observer_.takeRecords());
    },

    replaceChild: function(x, y) {
      HTMLUnknownElement.prototype.replaceChild.call(this, x, y);
      this.didMutate_(this.observer_.takeRecords());
    },

    onSetTextContent_: function(textContent) {
      if (textContent != '')
        throw new Error('textContent can only be set to \'\'.');
      this.clear();
    },

    clear: function() {
      while (this.lastChild)
        HTMLUnknownElement.prototype.removeChild.call(this, this.lastChild);
      this.didMutate_(this.observer_.takeRecords());
    },

    didMutate_: function(records) {
      this.beginDecorating_();
      for (var i = 0; i < records.length; i++) {
        var addedNodes = records[i].addedNodes;
        if (addedNodes) {
          for (var j = 0; j < addedNodes.length; j++)
            this.decorateChild_(addedNodes[j]);
        }
        var removedNodes = records[i].removedNodes;
        if (removedNodes) {
          for (var j = 0; j < removedNodes.length; j++) {
            this.undecorateChild_(removedNodes[j]);
          }
        }
      }
      this.doneDecoratingForNow_();
    },

    decorateChild_: function(child) {
      throw new Error('Not implemented');
    },

    undecorateChild_: function(child) {
      throw new Error('Not implemented');
    },

    beginDecorating_: function() {
    },

    doneDecoratingForNow_: function() {
    }
  };

  return {
    ContainerThatDecoratesItsChildren: ContainerThatDecoratesItsChildren
  };

});
