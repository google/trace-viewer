// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the Settings object.
 */
tvcm.exportTo('tvcm', function() {
  /**
   * Settings is a simple wrapper around local storage, to make it easier
   * to test classes that have settings.
   *
   * May be called as new tvcm.Settings() or simply tvcm.Settings()
   * @constructor
   */
  function Settings() {
    return Settings;
  };

  function SessionSettings() {
    return SessionSettings;
  }

  function AddStaticStorageFunctionsToClass_(input_class, storage) {
    input_class.storage_ = storage;

    /**
     * Get the setting with the given name.
     *
     * @param {string} key The name of the setting.
     * @param {string=} opt_default The default value to return if not set.
     * @param {string=} opt_namespace If set, the setting name will be prefixed
     * with this namespace, e.g. "categories.settingName". This is useful for
     * a set of related settings.
     */
    input_class.get = function(key, opt_default, opt_namespace) {
      key = input_class.namespace_(key, opt_namespace);
      var rawVal = input_class.storage_.getItem(key);
      if (rawVal === null || rawVal === undefined)
        return opt_default;

      // Old settings versions used to stringify objects instead of putting them
      // into JSON. If those are encountered, parse will fail. In that case,
      // "upgrade" the setting to the default value.
      try {
        return JSON.parse(rawVal).value;
      } catch (e) {
        input_class.storage_.removeItem(
            input_class.namespace_(key, opt_namespace));
        return opt_default;
      }
    };

    /**
     * Set the setting with the given name to the given value.
     *
     * @param {string} key The name of the setting.
     * @param {string} value The value of the setting.
     * @param {string=} opt_namespace If set, the setting name will be prefixed
     * with this namespace, e.g. "categories.settingName". This is useful for
     * a set of related settings.
     */
    input_class.set = function(key, value, opt_namespace) {
      if (value === undefined)
        throw new Error('Settings.set: value must not be undefined');
      var v = JSON.stringify({value: value});
      input_class.storage_.setItem(
          input_class.namespace_(key, opt_namespace), v);
    };

    /**
     * Return a list of all the keys, or all the keys in the given namespace
     * if one is provided.
     *
     * @param {string=} opt_namespace If set, only return settings which
     * begin with this prefix.
     */
    input_class.keys = function(opt_namespace) {
      var result = [];
      opt_namespace = opt_namespace || '';
      for (var i = 0; i < input_class.storage_.length; i++) {
        var key = input_class.storage_.key(i);
        if (input_class.isnamespaced_(key, opt_namespace))
          result.push(input_class.unnamespace_(key, opt_namespace));
      }
      return result;
    };

    input_class.isnamespaced_ = function(key, opt_namespace) {
      return key.indexOf(input_class.normalize_(opt_namespace)) == 0;
    };

    input_class.namespace_ = function(key, opt_namespace) {
      return input_class.normalize_(opt_namespace) + key;
    };

    input_class.unnamespace_ = function(key, opt_namespace) {
      return key.replace(input_class.normalize_(opt_namespace), '');
    };

    /**
     * All settings are prefixed with a global namespace to avoid collisions.
     * input_class may also be namespaced with an additional prefix passed into
     * the get, set, and keys methods in order to group related settings.
     * This method makes sure the two namespaces are always set properly.
     */
    input_class.normalize_ = function(opt_namespace) {
      return input_class.NAMESPACE + (opt_namespace ? opt_namespace + '.' : '');
    };

    input_class.setAlternativeStorageInstance = function(instance) {
      input_class.storage_ = instance;
    };

    input_class.getAlternativeStorageInstance = function() {
      if (input_class.storage_ === localStorage)
        return undefined;
      return input_class.storage_;
    };

    input_class.NAMESPACE = 'trace-viewer';
  };

  AddStaticStorageFunctionsToClass_(Settings, localStorage);
  AddStaticStorageFunctionsToClass_(SessionSettings, sessionStorage);

  return {
    Settings: Settings,
    SessionSettings: SessionSettings
  };
});
