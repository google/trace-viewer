// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.unittest.test_error');

base.exportTo('base.unittest', function() {
  function forAllAssertMethodsIn_(prototype, fn) {
    for (var fieldName in prototype) {
      if (fieldName.indexOf('assert') != 0)
        continue;
      var fieldValue = prototype[fieldName];
      if (typeof fieldValue != 'function')
        continue;
      fn(fieldName, fieldValue);
    }
  }

  var Assertions = {};
  Assertions.prototype = {
    assertTrue: function(a, opt_message) {
      if (a)
        return;
      var message = opt_message || 'Expected true, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertFalse: function(a, opt_message) {
      if (!a)
        return;
      var message = opt_message || 'Expected false, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertUndefined: function(a, opt_message) {
      if (a === undefined)
        return;
      var message = opt_message || 'Expected undefined, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertNotUndefined: function(a, opt_message) {
      if (a !== undefined)
        return;
      var message = opt_message || 'Expected not undefined, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertNull: function(a, opt_message) {
      if (a === null)
        return;
      var message = opt_message || 'Expected null, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertNotNull: function(a, opt_message) {
      if (a !== null)
        return;
      var message = opt_message || 'Expected non-null, got ' + a;
      throw new base.unittest.TestError(message);
    },

    assertEquals: function(a, b, opt_message) {
      if (a === b)
        return;
      if (opt_message)
        throw new base.unittest.TestError(opt_message);

      var message = 'Expected\n"';
      if (typeof(a) === 'string' || a instanceof String)
        message += a;
      else {
        try {
          message += JSON.stringify(a);
        } catch (e) {
          message += a;
        }
      }

      message += '"\n\ngot\n\n"';
      if (typeof(b) === 'string' || b instanceof String)
        message += b;
      else {
        try {
          message += JSON.stringify(b);
        } catch (e) {
          message += b;
        }
      }

      message += '"';
      throw new base.unittest.TestError(message);
    },

    assertNotEquals: function(a, b, opt_message) {
      if (a !== b)
        return;
      var message = opt_message || 'Expected something not equal to ' + b;
      throw new base.unittest.TestError(message);
    },

    assertArrayEquals: function(a, b, opt_message) {
      if (a.length === b.length) {
        var ok = true;
        for (var i = 0; i < a.length; i++) {
          ok &= (a[i] === b[i]);
        }
        if (ok)
          return;
      }

      var message = opt_message || 'Expected array ' + a + ', got array ' + b;
      throw new base.unittest.TestError(message);
    },

    assertArrayShallowEquals: function(a, b, opt_message) {
      if (a.length === b.length) {
        var ok = true;
        for (var i = 0; i < a.length; i++) {
          ok &= (a[i] === b[i]);
        }
        if (ok)
          return;
      }

      var message = opt_message || 'Expected array ' + b + ', got array ' + a;
      throw new base.unittest.TestError(message);
    },

    assertAlmostEquals: function(a, b, opt_message) {
      if (Math.abs(a - b) < 0.00001)
        return;
      var message = opt_message || 'Expected almost ' + a + ', got ' + b;
      throw new base.unittest.TestError(message);
    },

    assertVec2Equals: function(a, b, opt_message) {
      if (a[0] === b[0] &&
          a[1] === b[1])
        return;
      var message = opt_message || 'Expected (' + a[0] + ',' + a[1] +
          ') but got (' + b[0] + ',' + b[1] + ')';
      throw new base.unittest.TestError(message);
    },

    assertVec3Equals: function(a, b, opt_message) {
      if (a[0] === b[0] &&
          a[1] === b[1] &&
          a[2] === b[2])
        return;
      var message = opt_message || 'Expected ' + vec3.toString(a) +
          ' but got ' + vec3.toString(b);
      throw new base.unittest.TestError(message);
    },

    assertQuadEquals: function(a, b, opt_message) {
      var ok = true;
      ok &= a.p1[0] === b.p1[0] && a.p1[1] === b.p1[1];
      ok &= a.p2[0] === b.p2[0] && a.p2[1] === b.p2[1];
      ok &= a.p3[0] === b.p3[0] && a.p3[1] === b.p3[1];
      ok &= a.p4[0] === b.p4[0] && a.p4[1] === b.p4[1];
      if (ok)
        return;
      var message = opt_message || 'Expected "' + a.toString() +
          '", got "' + b.toString() + '"';
      throw new base.unittest.TestError(message);
    },

    assertRectEquals: function(a, b, opt_message) {
      var ok = true;
      if (a.x === b.x && a.y === b.y &&
          a.width === b.width && a.height === b.height) {
        return;
      }

      var message = opt_message || 'Expected "' + a.toString() +
          '", got "' + b.toString() + '"';
      throw new base.unittest.TestError(message);
    },

    assertObjectEquals: function(a, b, opt_message) {
      var a_json = JSON.stringify(a);
      var b_json = JSON.stringify(b);
      if (a_json === b_json)
        return;
      var message = opt_message || 'Expected ' + a_json + ', got ' + b_json;
      throw new base.unittest.TestError(message);
    },

    assertThrows: function(fn, opt_message) {
      try {
        fn();
      } catch (e) {
        return;
      }
      var message = opt_message || 'Expected throw from ' + fn;
      throw new base.unittest.TestError(message);
    },

    assertDoesNotThrow: function(fn, opt_message) {
      try {
        fn();
      } catch (e) {
        var message = opt_message || 'Expected to not throw from ' + fn +
            ' but got: ' + e;
        throw new base.unittest.TestError(message);
      }
    },

    assertApproxEquals: function(a, b, opt_epsilon, opt_message) {
      if (a === b)
        return;
      var epsilon = opt_epsilon || 0.000001; // 6 digits.
      a = Math.abs(a);
      b = Math.abs(b);
      var relative_error = Math.abs(a - b) / (a + b);
      if (relative_error < epsilon)
        return;
      var message = opt_message || 'Expect ' + a + ' and ' + b +
          ' to be within ' + epsilon + ' was ' + relative_error;
      throw new base.unittest.TestError(message);
    },

    assertVisible: function(elt) {
      if (!elt.offsetHeight || !elt.offsetWidth)
        throw new base.unittest.TestError('Expected element to be visible');
    }
  };

  function bindGlobals_() {
    forAllAssertMethodsIn_(Assertions.prototype,
        function(fieldName, fieldValue) {
          global[fieldName] = fieldValue.bind(this);
        });
  };
  bindGlobals_();

  return {
    Assertions: Assertions
  };
});

