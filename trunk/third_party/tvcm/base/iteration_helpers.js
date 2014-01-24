// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.exportTo('base', function() {
  function asArray(arrayish) {
    var values = [];
    for (var i = 0; i < arrayish.length; i++)
      values.push(arrayish[i]);
    return values;
  }

  function compareArrays(x, y, elementCmp) {
    var minLength = Math.min(x.length, y.length);
    for (var i = 0; i < minLength; i++) {
      var tmp = elementCmp(x[i], y[i]);
      if (tmp)
        return tmp;
    }
    if (x.length == y.length)
      return 0;

    if (x[i] === undefined)
      return -1;

    return 1;
  }

  /**
   * Compares two values when one or both might be undefined. Undefined
   * values are sorted after defined.
   */
  function comparePossiblyUndefinedValues(x, y, cmp) {
    if (x !== undefined && y !== undefined)
      return cmp(x, y);
    if (x !== undefined)
      return -1;
    if (y !== undefined)
      return 1;
    return 0;
  }

  function concatenateArrays(/*arguments*/) {
    var values = [];
    for (var i = 0; i < arguments.length; i++) {
      if (!(arguments[i] instanceof Array))
        throw new Error('Arguments ' + i + 'is not an array');
      values.push.apply(values, arguments[i]);
    }
    return values;
  }

  function concatenateObjects(/*arguments*/) {
    var result = {};
    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      for (var j in object) {
        result[j] = object[j];
      }
    }
    return result;
  }

  function dictionaryKeys(dict) {
    var keys = [];
    for (var key in dict)
      keys.push(key);
    return keys;
  }

  function dictionaryValues(dict) {
    var values = [];
    for (var key in dict)
      values.push(dict[key]);
    return values;
  }

  function iterItems(dict, fn, opt_this) {
    opt_this = opt_this || this;
    for (var key in dict)
      fn.call(opt_this, key, dict[key]);
  }

  function iterObjectFieldsRecursively(object, func) {
    if (!(object instanceof Object))
      return;

    if (object instanceof Array) {
      for (var i = 0; i < object.length; i++) {
        func(object, i, object[i]);
        iterObjectFieldsRecursively(object[i], func);
      }
      return;
    }

    for (var key in object) {
      var value = object[key];
      func(object, key, value);
      iterObjectFieldsRecursively(value, func);
    }
  }

  return {
    asArray: asArray,
    concatenateArrays: concatenateArrays,
    concatenateObjects: concatenateObjects,
    compareArrays: compareArrays,
    comparePossiblyUndefinedValues: comparePossiblyUndefinedValues,
    dictionaryKeys: dictionaryKeys,
    dictionaryValues: dictionaryValues,
    iterItems: iterItems,
    iterObjectFieldsRecursively: iterObjectFieldsRecursively
  };
});
