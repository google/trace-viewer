// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.iteration_helpers');
tvcm.require('tvcm.rect');

tvcm.exportTo('tvcm', function() {
  /**
   * Adds a {@code getInstance} static method that always return the same
   * instance object.
   * @param {!Function} ctor The constructor for the class to add the static
   *     method to.
   */
  function addSingletonGetter(ctor) {
    ctor.getInstance = function() {
      return ctor.instance_ || (ctor.instance_ = new ctor());
    };
  }

  function instantiateTemplate(selector) {
    var el = document.querySelector(selector);
    if (!el)
      throw new Error('Element not found');
    return el.content.cloneNode(true);
  }

  function tracedFunction(fn, name, opt_this) {
    function F() {
      console.time(name);
      try {
        fn.apply(opt_this, arguments);
      } finally {
        console.timeEnd(name);
      }
    }
    return F;
  }

  function normalizeException(e) {
    if (typeof(e) == 'string') {
      return {
        message: e,
        stack: ['<unknown>']
      };
    }

    return {
      message: e.message,
      stack: e.stack ? e.stack : ['<unknown>']
    };
  }

  function stackTrace() {
    var stack = new Error().stack + '';
    stack = stack.split('\n');
    return stack.slice(2);
  }

  function windowRectForElement(element) {
    var position = [element.offsetLeft, element.offsetTop];
    var size = [element.offsetWidth, element.offsetHeight];
    var node = element.offsetParent;
    while (node) {
      position[0] += node.offsetLeft;
      position[1] += node.offsetTop;
      node = node.offsetParent;
    }
    return tvcm.Rect.fromXYWH(position[0], position[1], size[0], size[1]);
  }

  function clamp(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
  }

  function lerp(percentage, lo, hi) {
    var range = hi - lo;
    return lo + percentage * range;
  }

  function deg2rad(deg) {
    return (Math.PI * deg) / 180.0;
  }

  function scrollIntoViewIfNeeded(el) {
    var pr = el.parentElement.getBoundingClientRect();
    var cr = el.getBoundingClientRect();
    if (cr.top < pr.top) {
      el.scrollIntoView(true);
    } else if (cr.bottom > pr.bottom) {
      el.scrollIntoView(false);
    }
  }

  function getUsingPath(path, from_dict) {
    var parts = path.split('.');
    var cur = from_dict;

    for (var part; parts.length && (part = parts.shift());) {
      if (!parts.length) {
        return cur[part];
      } else if (part in cur) {
        cur = cur[part];
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  return {
    addSingletonGetter: addSingletonGetter,

    tracedFunction: tracedFunction,
    normalizeException: normalizeException,
    instantiateTemplate: instantiateTemplate,
    stackTrace: stackTrace,

    windowRectForElement: windowRectForElement,

    scrollIntoViewIfNeeded: scrollIntoViewIfNeeded,

    clamp: clamp,
    lerp: lerp,
    deg2rad: deg2rad,

    getUsingPath: getUsingPath
  };
});
