// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.exportTo('tracing', function() {
  /**
   * @constructor The generic base class for filtering a TraceModel based on
   * various rules. The base class returns true for everything.
   */
  function Filter() {
  }

  Filter.prototype = {
    __proto__: Object.prototype,

    matchCounter: function(counter) {
      return true;
    },

    matchCpu: function(cpu) {
      return true;
    },

    matchProcess: function(process) {
      return true;
    },

    matchSlice: function(slice) {
      return true;
    },

    matchThread: function(thread) {
      return true;
    }
  };

  /**
   * @constructor A filter that matches objects by their name case insensitive.
   * .findAllObjectsMatchingFilter
   */
  function TitleFilter(text) {
    Filter.call(this);
    this.text_ = text.toLowerCase();

    if (!text.length)
      throw new Error('Filter text is empty.');
  }
  TitleFilter.prototype = {
    __proto__: Filter.prototype,

    matchSlice: function(slice) {
      if (slice.title === undefined)
        return false;
      return slice.title.toLowerCase().indexOf(this.text_) !== -1;
    }
  };

  /**
   * @constructor A filter that matches objects with the exact given title.
   */
  function ExactTitleFilter(text) {
    Filter.call(this);
    this.text_ = text;

    if (!text.length)
      throw new Error('Filter text is empty.');
  }
  ExactTitleFilter.prototype = {
    __proto__: Filter.prototype,

    matchSlice: function(slice) {
      return slice.title === this.text_;
    }
  };

  return {
    TitleFilter: TitleFilter,
    ExactTitleFilter: ExactTitleFilter
  };
});
