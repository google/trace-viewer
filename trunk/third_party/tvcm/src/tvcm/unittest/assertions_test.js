// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.unittest.assertions');
tvcm.require('tvcm.quad');
tvcm.require('tvcm.rect');

tvcm.requireRawScript('gl-matrix/common.js');
tvcm.requireRawScript('gl-matrix/vec2.js');
tvcm.requireRawScript('gl-matrix/vec3.js');

tvcm.unittest.testSuite('tvcm.unittest.assertions_test', function() {
  function assertionTestSetup() {
    global.rawAssertThrows = function(fn) {
      try {
        fn();
      } catch (e) {
        if (e instanceof tvcm.unittest.TestError)
          return;
        throw new Error('Unexpected error from <' + fn + '>: ' + e);
      }
      throw new Error('Expected <' + fn + '> to throw');
    };

    global.rawAssertNotThrows = function(fn) {
      try {
        fn();
      } catch (e) {
        throw new Error('Expected <' + fn + '> to not throw: ' + e.message);
      }
    };
  }

  function assertionTestTeardown() {
    global.rawAssertThrows = undefined;
    global.rawAssertNotThrows = undefined;
  }

  function assertionTest(name, testFn) {
    test(name, testFn, {
      setUp: assertionTestSetup,
      tearDown: assertionTestTeardown
    });
  }

  assertionTest('assertTrue', function() {
    rawAssertThrows(function() {
      assertTrue(false);
    });
    rawAssertNotThrows(function() {
      assertTrue(true);
    });
  });

  assertionTest('assertFalse', function() {
    rawAssertThrows(function() {
      assertFalse(true);
    });
    rawAssertNotThrows(function() {
      assertFalse(false);
    });
  });

  assertionTest('assertUndefined', function() {
    rawAssertThrows(function() {
      assertUndefined('');
    });
    rawAssertNotThrows(function() {
      assertUndefined(undefined);
    });
  });

  assertionTest('assertNotUndefined', function() {
    rawAssertThrows(function() {
      assertNotUndefined(undefined);
    });
    rawAssertNotThrows(function() {
      assertNotUndefined('');
    });
  });

  assertionTest('assertNull', function() {
    rawAssertThrows(function() {
      assertNull('');
    });
    rawAssertNotThrows(function() {
      assertNull(null);
    });
  });

  assertionTest('assertNotNull', function() {
    rawAssertThrows(function() {
      assertNotNull(null);
    });
    rawAssertNotThrows(function() {
      assertNotNull('');
    });
  });

  assertionTest('assertEquals', function() {
    rawAssertThrows(function() {
      assertEquals(1, 2);
    });
    rawAssertNotThrows(function() {
      assertEquals(1, 1);
    });

    try {
      var f = {};
      f.foo = f;
      assertEquals(1, f);
      throw new tvcm.unittest.TestError('Failed to throw');
    } catch (e) {
      assertNotEquals('Converting circular structure to JSON', e.message);
    }

    try {
      var f = {};
      f.foo = f;
      assertEquals(f, 1);
      throw new tvcm.unittest.TestError('Failed to throw');
    } catch (e) {
      assertNotEquals('Converting circular structure to JSON', e.message);
    }
  });

  assertionTest('assertNotEquals', function() {
    rawAssertThrows(function() {
      assertNotEquals(1, 1);
    });
    rawAssertNotThrows(function() {
      assertNotEquals(1, 2);
    });
  });

  assertionTest('assertArrayEquals', function() {
    rawAssertThrows(function() {
      assertArrayEquals([2, 3], [2, 4]);
    });
    rawAssertThrows(function() {
      assertArrayEquals([1], [1, 2]);
    });
    rawAssertNotThrows(function() {
      assertArrayEquals(['a', 'b'], ['a', 'b']);
    });
  });

  assertionTest('assertArrayEqualsShallow', function() {
    rawAssertThrows(function() {
      assertArrayShallowEquals([2, 3], [2, 4]);
    });
    rawAssertThrows(function() {
      assertArrayShallowEquals([1], [1, 2]);
    });
    rawAssertNotThrows(function() {
      assertArrayShallowEquals(['a', 'b'], ['a', 'b']);
    });
  });

  assertionTest('assertAlmostEquals', function() {
    rawAssertThrows(function() {
      assertAlmostEquals(1, 0);
    });
    rawAssertThrows(function() {
      assertAlmostEquals(1, 1.000011);
    });

    rawAssertNotThrows(function() {
      assertAlmostEquals(1, 1);
    });
    rawAssertNotThrows(function() {
      assertAlmostEquals(1, 1.000001);
    });
    rawAssertNotThrows(function() {
      assertAlmostEquals(1, 1 - 0.000001);
    });
  });

  assertionTest('assertVec2Equals', function() {
    rawAssertThrows(function() {
      assertVec2Equals(vec2.fromValues(0, 1), vec2.fromValues(0, 2));
    });
    rawAssertThrows(function() {
      assertVec2Equals(vec2.fromValues(1, 2), vec2.fromValues(2, 2));
    });
    rawAssertNotThrows(function() {
      assertVec2Equals(vec2.fromValues(1, 1), vec2.fromValues(1, 1));
    });
  });

  assertionTest('assertVec3Equals', function() {
    rawAssertThrows(function() {
      assertVec3Equals(vec3.fromValues(0, 1, 2), vec3.fromValues(0, 1, 3));
    });
    rawAssertThrows(function() {
      assertVec3Equals(vec3.fromValues(0, 1, 2), vec3.fromValues(0, 3, 2));
    });
    rawAssertThrows(function() {
      assertVec3Equals(vec3.fromValues(0, 1, 2), vec3.fromValues(3, 1, 2));
    });
    rawAssertNotThrows(function() {
      assertVec3Equals(vec3.fromValues(1, 2, 3), vec3.fromValues(1, 2, 3));
    });
  });

  assertionTest('assertQuadEquals', function() {
    rawAssertThrows(function() {
      assertQuadEquals(
          tvcm.Quad.fromXYWH(1, 1, 2, 2), tvcm.Quad.fromXYWH(1, 1, 2, 3));
    });
    rawAssertNotThrows(function() {
      assertQuadEquals(
          tvcm.Quad.fromXYWH(1, 1, 2, 2), tvcm.Quad.fromXYWH(1, 1, 2, 2));
    });
  });

  assertionTest('assertRectEquals', function() {
    rawAssertThrows(function() {
      assertRectEquals(
          tvcm.Rect.fromXYWH(1, 1, 2, 2), tvcm.Rect.fromXYWH(1, 1, 2, 3));
    });
    rawAssertNotThrows(function() {
      assertRectEquals(
          tvcm.Rect.fromXYWH(1, 1, 2, 2), tvcm.Rect.fromXYWH(1, 1, 2, 2));
    });
  });

  assertionTest('assertObjectEquals', function() {
    rawAssertThrows(function() {
      assertObjectEquals({a: 1}, {a: 2});
    });
    rawAssertThrows(function() {
      assertObjectEquals({a: 1}, []);
    });
    rawAssertThrows(function() {
      assertObjectEquals({a: 1, b: {}}, {a: 1, c: {}, b: {}});
    });
    rawAssertNotThrows(function() {
      assertObjectEquals({}, {});
    });
    rawAssertNotThrows(function() {
      assertObjectEquals({a: 1}, {a: 1});
    });
  });

  assertionTest('assertThrows', function() {
    rawAssertThrows(function() {
      assertThrows(function() {
      });
    });
    rawAssertNotThrows(function() {
      assertThrows(function() {
        throw new Error('expected_error');
      });
    });
  });

  assertionTest('assertDoesNotThrow', function() {
    rawAssertThrows(function() {
      assertDoesNotThrow(function() {
        throw new Error('expected_error');
      });
    });
    rawAssertNotThrows(function() {
      assertDoesNotThrow(function() {
      });
    });
  });

  assertionTest('assertApproxEquals', function() {
    rawAssertThrows(function() {
      assertApproxEquals(1, 5, 0.5);
    });
    rawAssertNotThrows(function() {
      assertApproxEquals(1, 2, 1);
    });
  });

  assertionTest('assertVisible', function() {
    rawAssertThrows(function() {
      assertVisible({});
    });
    rawAssertThrows(function() {
      assertVisible({offsetHeight: 0});
    });
    rawAssertThrows(function() {
      assertVisible({offsetWidth: 0});
    });
    rawAssertNotThrows(function() {
      assertVisible({offsetWidth: 1, offsetHeight: 1});
    });
  });
});
