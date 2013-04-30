// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview A list of things, and a viewer for the currently selected
 * thing.
 */
base.require('ui');
base.require('ui.list_view');
base.requireStylesheet('ui.list_and_associated_view');
base.exportTo('ui', function() {

  /**
   * @constructor
   */
  var ListAndAssociatedView = ui.define('x-list-and-associated-view');
  ListAndAssociatedView.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.list_ = undefined;
      this.listProperty_ = undefined;
      this.view_ = undefined;
      this.viewProperty_ = undefined;
      this.listView_ = new ui.ListView();
      this.listView_.addEventListener('selection-changed',
                                      this.onSelectionChanged_.bind(this));
      this.placeholder_ = document.createElement('div');
      this.appendChild(this.listView_);
      this.appendChild(this.placeholder_);
    },

    get listView() {
      return this.listView_;
    },

    get list() {
      return this.list_;
    },

    set list(list) {
      this.list_ = list;
      this.updateChildren_();
    },

    get listProperty() {
      return this.listProperty_;
    },

    set listProperty(listProperty) {
      this.listProperty_ = listProperty;
      this.updateChildren_();
    },

    get view() {
      return this.view_;
    },

    set view(view) {
      this.view_ = view;
      this.updateChildren_();
    },

    get viewProperty() {
      return this.viewProperty_;
    },

    set viewProperty(viewProperty) {
      this.viewProperty_ = viewProperty;
      this.updateChildren_();
    },

    updateChildren_: function() {
      var complete = this.list_ &&
        this.listProperty_ &&
        this.view_ &&
        this.viewProperty_;
      if (!complete) {
        this.replaceChild(this.placeholder_,
                          this.children[1]);
        return;
      }

      for (var i = 0; i < this.list_.length; i++) {
        var itemEl;
        if (i >= this.listView_.children.length) {
          itemEl = document.createElement('div');
          this.listView_.appendChild(itemEl);
        } else {
          itemEl = this.listView_.children[i];
        }
        itemEl.item = this.list_[i];
        var getter = this.list_[i].__lookupGetter__(this.listProperty_);
        if (getter)
          itemEl.textContent = getter.call(this.list_[i]);
        else
          itemEl.textContent = this.list_[i][this.listProperty_];
      }

      if (this.children[1] == this.placeholder_) {
        this.replaceChild(this.view_,
                          this.children[1]);
      }
      if (this.listView_.children.length &&
          !this.listView_.selectedElement)
        this.listView_.selectedElement = this.listView_.children[0];
    },

    onSelectionChanged_: function(e) {
      var setter = this.view_.__lookupSetter__(this.viewProperty_);
      if (!setter) {
        var prop = this.viewProperty_;
        setter = function(value) { this[prop] = value; }
      }
      if (this.listView_.selectedElement) {
        setter.call(this.view_,
                    this.listView_.selectedElement.item);
      } else {
        setter.call(this.view_,
                    undefined);
      }
    }
  };

  return {
    ListAndAssociatedView: ListAndAssociatedView
  };
});
