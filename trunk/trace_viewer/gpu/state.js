// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.trace_model.object_instance');

tvcm.exportTo('gpu', function() {

  var ObjectSnapshot = tracing.trace_model.ObjectSnapshot;

  /**
   * @constructor
   */
  function StateSnapshot() {
    ObjectSnapshot.apply(this, arguments);
  }

  StateSnapshot.prototype = {
    __proto__: ObjectSnapshot.prototype,

    preInitialize: function() {
      this.screenshot_ = undefined;
    },

    initialize: function() {
      if (this.args.screenshot)
        this.screenshot_ = this.args.screenshot;
    },

    /**
     * @return {String} a base64 encoded screenshot if available.
     */
    get screenshot() {
      return this.screenshot_;
    }
  };

  ObjectSnapshot.register('gpu::State', StateSnapshot);

  return {
    StateSnapshot: StateSnapshot
  };
});
