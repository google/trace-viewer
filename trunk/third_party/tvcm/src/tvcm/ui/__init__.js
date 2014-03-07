// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tvcm.ui', function() {

  /**
   * Decorates elements as an instance of a class.
   * @param {string|!Element} source The way to find the element(s) to decorate.
   *     If this is a string then {@code querySeletorAll} is used to find the
   *     elements to decorate.
   * @param {!Function} constr The constructor to decorate with. The constr
   *     needs to have a {@code decorate} function.
   */
  function decorate(source, constr) {
    var elements;
    if (typeof source == 'string')
      elements = tvcm.doc.querySelectorAll(source);
    else
      elements = [source];

    for (var i = 0, el; el = elements[i]; i++) {
      if (!(el instanceof constr))
        constr.decorate(el);
    }
  }

  /**
   * Defines a tracing UI component, a function that can be called to construct
   * the component.
   *
   * Tvcm class:
   * <pre>
   * var List = tvcm.ui.define('list');
   * List.prototype = {
   *   __proto__: HTMLUListElement.prototype,
   *   decorate: function() {
   *     ...
   *   },
   *   ...
   * };
   * </pre>
   *
   * Derived class:
   * <pre>
   * var CustomList = tvcm.ui.define('custom-list', List);
   * CustomList.prototype = {
   *   __proto__: List.prototype,
   *   decorate: function() {
   *     ...
   *   },
   *   ...
   * };
   * </pre>
   *
   * @param {string} className The className of the newly created subtype. If
   *     subclassing by passing in opt_parentConstructor, this is used for
   *     debugging. If not subclassing, then it is the tag name that will be
   *     created by the component.

   * @param {function=} opt_parentConstructor The parent class for this new
   *     element, if subclassing is desired. If provided, the parent class must
   *     be also a function created by tvcm.ui.define.
   *
   * @param {string=} opt_tagNS The namespace in which to create the base
   *     element. Has no meaning when opt_parentConstructor is passed and must
   *     either be undefined or the same namespace as the parent class.
   *
   * @return {function(Object=):Element} The newly created component
   *     constructor.
   */
  function define(className, opt_parentConstructor, opt_tagNS) {
    if (typeof className == 'function') {
      throw new Error('Passing functions as className is deprecated. Please ' +
                      'use (className, opt_parentConstructor) to subclass');
    }

    var className = className.toLowerCase();
    if (opt_parentConstructor && !opt_parentConstructor.tagName)
      throw new Error('opt_parentConstructor was not ' +
                      'created by tvcm.ui.define');

    // Walk up the parent constructors until we can find the type of tag
    // to create.
    var tagName = className;
    var tagNS = undefined;
    if (opt_parentConstructor) {
      if (opt_tagNS)
        throw new Error('Must not specify tagNS if parentConstructor is given');
      var parent = opt_parentConstructor;
      while (parent && parent.tagName) {
        tagName = parent.tagName;
        tagNS = parent.tagNS;
        parent = parent.parentConstructor;
      }
    } else {
      tagNS = opt_tagNS;
    }

    /**
     * Creates a new UI element constructor.
     * Arguments passed to the constuctor are provided to the decorate method.
     * You will need to call the parent elements decorate method from within
     * your decorate method and pass any required parameters.
     * @constructor
     */
    function f() {
      if (opt_parentConstructor &&
          f.prototype.__proto__ != opt_parentConstructor.prototype) {
        throw new Error(
            className + ' prototye\'s __proto__ field is messed up. ' +
            'It MUST be the prototype of ' + opt_parentConstructor.tagName);
      }

      var el;
      if (tagNS === undefined)
        el = tvcm.doc.createElement(tagName);
      else
        el = tvcm.doc.createElementNS(tagNS, tagName);
      f.decorate.call(this, el, arguments);
      return el;
    }

    /**
     * Decorates an element as a UI element class.
     * @param {!Element} el The element to decorate.
     */
    f.decorate = function(el) {
      el.__proto__ = f.prototype;
      el.decorate.apply(el, arguments[1]);
      el.constructor = f;
    };

    f.className = className;
    f.tagName = tagName;
    f.tagNS = tagNS;
    f.parentConstructor = (opt_parentConstructor ? opt_parentConstructor :
                                                   undefined);
    f.toString = function() {
      if (!f.parentConstructor)
        return f.tagName;
      return f.parentConstructor.toString() + '::' + f.className;
    };

    return f;
  }

  function elementIsChildOf(el, potentialParent) {
    if (el == potentialParent)
      return false;

    var cur = el;
    while (cur.parentNode) {
      if (cur == potentialParent)
        return true;
      cur = cur.parentNode;
    }
    return false;
  };

  return {
    decorate: decorate,
    define: define,
    elementIsChildOf: elementIsChildOf
  };
});
