// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the Settings class.
 */
base.exportTo('base', function() {
  var alternativeStorageInstance = undefined;

  /**
   * Settings is a simple wrapper around local storage, to make it easier
   * to test classes that have settings.
   *
   * @constructor
   */
  function Settings() {
    if (alternativeStorageInstance) {
      this.storage_ = alternativeStorageInstance;
    } else if ('G_testRunner' in global) {
      /**
       * In unit tests, use a mock object for storage so we don't change
       * localStorage in tests.
       */
      this.storage_ = FakeLocalStorage.singleton();
      global.G_testRunner.clearMockLocalStorage =
          FakeLocalStorage.clearSingleton;
    } else {
      this.storage_ = localStorage;
    }
  }

  Settings.setAlternativeStorageInstance = function(instance) {
    alternativeStorageInstance = instance;
  }

  Settings.prototype = {

    /**
     * Get the setting with the given name.
     *
     * @param {string} key The name of the setting.
     * @param {string=} opt_default The default value to return if not set.
     * @param {string=} opt_namespace If set, the setting name will be prefixed
     * with this namespace, e.g. "categories.settingName". This is useful for
     * a set of related settings.
     */
    get: function(key, opt_default, opt_namespace) {
      key = this.namespace_(key, opt_namespace);
      var val = this.storage_.getItem(key);
      if (val === null || val === undefined)
        return opt_default;
      return String(val);
    },

    /**
     * Set the setting with the given name to the given value.
     *
     * @param {string} key The name of the setting.
     * @param {string} value The value of the setting.
     * @param {string=} opt_namespace If set, the setting name will be prefixed
     * with this namespace, e.g. "categories.settingName". This is useful for
     * a set of related settings.
     */
    set: function(key, value, opt_namespace) {
      this.storage_.setItem(this.namespace_(key, opt_namespace), String(value));
    },

    /**
     * Return a list of all the keys, or all the keys in the given namespace
     * if one is provided.
     *
     * @param {string=} opt_namespace If set, only return settings which
     * begin with this prefix.
     */
    keys: function(opt_namespace) {
      var result = [];
      opt_namespace = opt_namespace || '';
      for (var i = 0; i < this.storage_.length; i++) {
        var key = this.storage_.key(i);
        if (this.isnamespaced_(key, opt_namespace))
          result.push(this.unnamespace_(key, opt_namespace));
      }
      return result;
    },

    isnamespaced_: function(key, opt_namespace) {
      return key.indexOf(this.normalize_(opt_namespace)) == 0;
    },

    namespace_: function(key, opt_namespace) {
      return this.normalize_(opt_namespace) + key;
    },

    unnamespace_: function(key, opt_namespace) {
      return key.replace(this.normalize_(opt_namespace), '');
    },

    /**
     * All settings are prefixed with a global namespace to avoid collisions.
     * Settings may also be namespaced with an additional prefix passed into
     * the get, set, and keys methods in order to group related settings.
     * This method makes sure the two namespaces are always set properly.
     */
    normalize_: function(opt_namespace) {
      return Settings.NAMESPACE + (opt_namespace ? opt_namespace + '.' : '');
    }
  };

  Settings.NAMESPACE = 'trace-viewer';

  /**
   * Create a Fake localStorage object which just stores to a dictionary
   * instead of actually saving into localStorage. Only used in unit tests.
   * @constructor
   */
  function FakeLocalStorage() {
  }

  FakeLocalStorage.singleton = function() {
    FakeLocalStorage.instance_ =
        FakeLocalStorage.instance_ || new FakeLocalStorage();
    return FakeLocalStorage.instance_;
  }

  FakeLocalStorage.clearSingleton = function() {
    delete FakeLocalStorage.instance_;
  }

  FakeLocalStorage.prototype = {
    __proto__: Object.prototype,

    getItem: function(key) {
      // LocalStorage returns null if the key isn't found, not undefined.
      if (this[key] === undefined || this[key] === null)
        return null;
      return this[key];
    },

    setItem: function(key, value) {
      this[key] = value;
    },

    key: function(i) {
      return Object.keys(this).sort()[i];
    },
    get length() {
      return Object.keys(this).length;
    }
  };

  return {
    Settings: Settings
  };
});
