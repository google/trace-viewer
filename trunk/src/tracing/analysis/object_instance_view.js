// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('ui');

base.exportTo('tracing.analysis', function() {
  var ObjectInstanceView = ui.define('div');

  ObjectInstanceView.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.objectInstance_ = undefined;
    },

    get objectInstance() {
      return this.objectInstance_;
    },

    set objectInstance(i) {
      this.objectInstance_ = i;
      this.updateContents();
    },

    updateContents: function() {
      throw new Error('Not implemented');
    }
  };

  ObjectInstanceView.typeNameToViewInfoMap = {};
  ObjectInstanceView.register = function(typeName,
                                         viewConstructor,
                                         opt_options) {
    if (ObjectInstanceView.typeNameToViewInfoMap[typeName])
      throw new Error('Handler already registerd for ' + typeName);
    var options = opt_options || {
      showInTrackView: true
    };
    ObjectInstanceView.typeNameToViewInfoMap[typeName] = {
      constructor: viewConstructor,
      options: options
    };
  };

  ObjectInstanceView.getViewInfo = function(typeName) {
    return ObjectInstanceView.typeNameToViewInfoMap[typeName];
  };


  return {
    ObjectInstanceView: ObjectInstanceView
  };
});
