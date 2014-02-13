// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.events');

tvcm.exportTo('tvcm', function() {
  /**
   * Fires a property change event on the target.
   * @param {EventTarget} target The target to dispatch the event on.
   * @param {string} propertyName The name of the property that changed.
   * @param {*} newValue The new value for the property.
   * @param {*} oldValue The old value for the property.
   */
  function dispatchPropertyChange(target, propertyName, newValue, oldValue,
                                  opt_bubbles, opt_cancelable) {
    var e = new tvcm.Event(propertyName + 'Change',
                           opt_bubbles, opt_cancelable);
    e.propertyName = propertyName;
    e.newValue = newValue;
    e.oldValue = oldValue;

    var error;
    e.throwError = function(err) {  // workaround CR 239648
      error = err;
    };

    target.dispatchEvent(e);
    if (error)
      throw error;
  }

  function setPropertyAndDispatchChange(obj, propertyName, newValue) {
    var privateName = propertyName + '_';
    var oldValue = obj[propertyName];
    obj[privateName] = newValue;
    if (oldValue !== newValue)
      tvcm.dispatchPropertyChange(obj, propertyName,
          newValue, oldValue, true, false);
  }

  /**
   * Converts a camelCase javascript property name to a hyphenated-lower-case
   * attribute name.
   * @param {string} jsName The javascript camelCase property name.
   * @return {string} The equivalent hyphenated-lower-case attribute name.
   */
  function getAttributeName(jsName) {
    return jsName.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /* Creates a private name unlikely to collide with object properties names
   * @param {string} name The defineProperty name
   * @return {string} an obfuscated name
   */
  function getPrivateName(name) {
    return name + '_tvcm_';
  }

  /**
   * The kind of property to define in {@code defineProperty}.
   * @enum {number}
   * @const
   */
  var PropertyKind = {
    /**
     * Plain old JS property where the backing data is stored as a 'private'
     * field on the object.
     */
    JS: 'js',

    /**
     * The property backing data is stored as an attribute on an element.
     */
    ATTR: 'attr',

    /**
     * The property backing data is stored as an attribute on an element. If the
     * element has the attribute then the value is true.
     */
    BOOL_ATTR: 'boolAttr'
  };

  /**
   * Helper function for defineProperty that returns the getter to use for the
   * property.
   * @param {string} name The name of the property.
   * @param {tvcm.PropertyKind} kind The kind of the property.
   * @return {function():*} The getter for the property.
   */
  function getGetter(name, kind) {
    switch (kind) {
      case PropertyKind.JS:
        var privateName = getPrivateName(name);
        return function() {
          return this[privateName];
        };
      case PropertyKind.ATTR:
        var attributeName = getAttributeName(name);
        return function() {
          return this.getAttribute(attributeName);
        };
      case PropertyKind.BOOL_ATTR:
        var attributeName = getAttributeName(name);
        return function() {
          return this.hasAttribute(attributeName);
        };
    }
  }

  /**
   * Helper function for defineProperty that returns the setter of the right
   * kind.
   * @param {string} name The name of the property we are defining the setter
   *     for.
   * @param {tvcm.PropertyKind} kind The kind of property we are getting the
   *     setter for.
   * @param {function(*):void=} opt_setHook A function to run after the property
   *     is set, but before the propertyChange event is fired.
   * @param {boolean=} opt_bubbles Whether the event bubbles or not.
   * @param {boolean=} opt_cancelable Whether the default action of the event
   *     can be prevented.
   * @return {function(*):void} The function to use as a setter.
   */
  function getSetter(name, kind, opt_setHook, opt_bubbles, opt_cancelable) {
    switch (kind) {
      case PropertyKind.JS:
        var privateName = getPrivateName(name);
        return function(value) {
          var oldValue = this[privateName];
          if (value !== oldValue) {
            this[privateName] = value;
            if (opt_setHook)
              opt_setHook.call(this, value, oldValue);
            dispatchPropertyChange(this, name, value, oldValue,
                opt_bubbles, opt_cancelable);
          }
        };

      case PropertyKind.ATTR:
        var attributeName = getAttributeName(name);
        return function(value) {
          var oldValue = this.getAttribute(attributeName);
          if (value !== oldValue) {
            if (value == undefined)
              this.removeAttribute(attributeName);
            else
              this.setAttribute(attributeName, value);
            if (opt_setHook)
              opt_setHook.call(this, value, oldValue);
            dispatchPropertyChange(this, name, value, oldValue,
                opt_bubbles, opt_cancelable);
          }
        };

      case PropertyKind.BOOL_ATTR:
        var attributeName = getAttributeName(name);
        return function(value) {
          var oldValue = (this.getAttribute(attributeName) === name);
          if (value !== oldValue) {
            if (value)
              this.setAttribute(attributeName, name);
            else
              this.removeAttribute(attributeName);
            if (opt_setHook)
              opt_setHook.call(this, value, oldValue);
            dispatchPropertyChange(this, name, value, oldValue,
                opt_bubbles, opt_cancelable);
          }
        };
    }
  }

  /**
   * Defines a property on an object. When the setter changes the value a
   * property change event with the type {@code name + 'Change'} is fired.
   * @param {!Object} obj The object to define the property for.
   * @param {string} name The name of the property.
   * @param {tvcm.PropertyKind=} opt_kind What kind of underlying storage to
   * use.
   * @param {function(*):void=} opt_setHook A function to run after the
   *     property is set, but before the propertyChange event is fired.
   * @param {boolean=} opt_bubbles Whether the event bubbles or not.
   * @param {boolean=} opt_cancelable Whether the default action of the event
   *     can be prevented.
   */
  function defineProperty(obj, name, opt_kind, opt_setHook,
                          opt_bubbles, opt_cancelable) {
    console.error("Don't use tvcm.defineProperty");
    if (typeof obj == 'function')
      obj = obj.prototype;

    var kind = opt_kind || PropertyKind.JS;

    if (!obj.__lookupGetter__(name))
      obj.__defineGetter__(name, getGetter(name, kind));

    if (!obj.__lookupSetter__(name))
      obj.__defineSetter__(name, getSetter(name, kind, opt_setHook,
          opt_bubbles, opt_cancelable));
  }

  return {
    PropertyKind: PropertyKind,
    defineProperty: defineProperty,
    dispatchPropertyChange: dispatchPropertyChange,
    setPropertyAndDispatchChange: setPropertyAndDispatchChange
  };
});
