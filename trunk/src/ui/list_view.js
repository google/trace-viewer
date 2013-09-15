// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Simple list view.
 */
base.requireStylesheet('ui.list_view');

base.require('base.events');
base.require('base.utils');
base.require('ui');
base.require('ui.container_that_decorates_its_children');

base.exportTo('ui', function() {
  /**
   * @constructor
   */
  var ListView = ui.define('x-list-view', ui.ContainerThatDecoratesItsChildren);

  ListView.prototype = {
    __proto__: ui.ContainerThatDecoratesItsChildren.prototype,

    decorate: function() {
      ui.ContainerThatDecoratesItsChildren.prototype.decorate.call(this);

      this.classList.add('x-list-view');
      this.onItemClicked_ = this.onItemClicked_.bind(this);
      this.onKeyDown_ = this.onKeyDown_.bind(this);
      this.tabIndex = 0;
      this.addEventListener('keydown', this.onKeyDown_);

      this.selectionChanged_ = false;
    },

    decorateChild_: function(item) {
      item.classList.add('list-item');
      item.addEventListener('click', this.onItemClicked_, true);

      var listView = this;
      Object.defineProperty(
          item,
          'selected', {
            configurable: true,
            set: function(value) {
              var oldSelection = listView.selectedElement;
              if (oldSelection && oldSelection != this && value)
                listView.selectedElement.removeAttribute('selected');
              if (value)
                this.setAttribute('selected', 'selected');
              else
                this.removeAttribute('selected');
              var newSelection = listView.selectedElement;
              if (newSelection != oldSelection)
                base.dispatchSimpleEvent(listView, 'selection-changed', false);
            },
            get: function() {
              return this.hasAttribute('selected');
            }
          });
    },

    undecorateChild_: function(item) {
      this.selectionChanged_ |= item.selected;

      item.classList.remove('list-item');
      item.removeEventListener('click', this.onItemClicked_);
      delete item.selected;
    },

    beginDecorating_: function() {
      this.selectionChanged_ = false;
    },

    doneDecoratingForNow_: function() {
      if (this.selectionChanged_)
        base.dispatchSimpleEvent(this, 'selection-changed', false);
    },

    get selectedElement() {
      var el = this.querySelector('.list-item[selected]');
      if (!el)
        return undefined;
      return el;
    },

    set selectedElement(el) {
      if (!el) {
        if (this.selectedElement)
          this.selectedElement.selected = false;
        return;
      }

      if (el.parentElement != this)
        throw new Error(
            'Can only select elements that are children of this list view');
      el.selected = true;
    },

    getElementByIndex: function(index) {
      return this.querySelector('.list-item:nth-child(' + index + ')');
    },

    clear: function() {
      var changed = this.selectedElement !== undefined;
      ui.ContainerThatDecoratesItsChildren.prototype.clear.call(this);
      if (changed)
        base.dispatchSimpleEvent(this, 'selection-changed', false);
    },

    onItemClicked_: function(e) {
      var currentSelectedElement = this.selectedElement;
      if (currentSelectedElement)
        currentSelectedElement.removeAttribute('selected');
      var element = e.target;
      while (element.parentElement != this)
        element = element.parentElement;
      element.setAttribute('selected', 'selected');
      base.dispatchSimpleEvent(this, 'selection-changed', false);
    },

    onKeyDown_: function(e) {
      if (this.selectedElement === undefined)
        return;

      if (e.keyCode == 38) { // Up arrow.
        var prev = this.selectedElement.previousSibling;
        if (prev) {
          prev.selected = true;
          base.scrollIntoViewIfNeeded(prev);
          e.preventDefault();
          return true;
        }
      } else if (e.keyCode == 40) { // Down arrow.
        var next = this.selectedElement.nextSibling;
        if (next) {
          next.selected = true;
          base.scrollIntoViewIfNeeded(next);
          e.preventDefault();
          return true;
        }
      }
    },

    addItem: function(textContent) {
      var item = document.createElement('div');
      item.textContent = textContent;
      this.appendChild(item);
      return item;
    }

  };

  return {
    ListView: ListView
  };

});
