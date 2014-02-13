// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.interval_tree');

tvcm.unittest.testSuite('tvcm.interval_tree_test', function() {
  function buildSimpleTree() {
    var tree = new tvcm.IntervalTree(
        function(s) { return s.start; },
        function(e) { return e.end; });

    tree.insert({start: 2}, {end: 6});
    tree.insert({start: 1}, {end: 3});
    tree.insert({start: 5}, {end: 7});
    tree.insert({start: 1}, {end: 5});
    tree.insert({start: 3}, {end: 5});
    tree.insert({start: 3}, {end: 5});
    tree.insert({start: 3}, {end: 6});
    tree.insert({start: 1}, {end: 1});
    tree.insert({start: 4}, {end: 8});
    tree.insert({start: 0}, {end: 2});

    tree.updateHighValues();

    return tree;
  }

  test('findIntersection', function() {
    var tree = buildSimpleTree();
    var intersect = tree.findIntersection(2, 4);

    // Intersect will hold an array of begin/end objects. As a simple way
    // to compare, we just grab the start and end values of those objects
    // and compare to what we expect to see.
    var values = intersect.map(function(v) { return [v[0].start, v[1].end]; });
    values.sort(function(a, b) {
      return (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
    });

    var expected = [[1, 3], [1, 5], [2, 6], [3, 5], [3, 5], [3, 6]];
    assertEquals(6, values.length);
    assertEquals(JSON.stringify(expected), JSON.stringify(values));
  });

  test('findIntersection_noMatching', function() {
    var tree = buildSimpleTree();
    var intersect = tree.findIntersection(9, 10);
    assertArrayEquals([], intersect);
  });

  test('findIntersection_emptyTree', function() {
    var tree = new tvcm.IntervalTree();
    tree.updateHighValues();

    var intersect = tree.findIntersection(2, 4);
    assertArrayEquals([], intersect);
  });

  test('findIntersection_emptyInterval', function() {
    var tree = new tvcm.IntervalTree();
    tree.updateHighValues();

    assertThrows(function() {
      tree.findIntersection();
    });
    assertThrows(function() {
      tree.findIntersection(1);
    });
    assertThrows(function() {
      tree.findIntersection('a', 'b');
    });
  });

  test('insert', function() {
    var tree = new tvcm.IntervalTree(
        function(s) { return s.start; },
        function(e) { return e.end; });

    assertEquals(0, tree.size);

    tree.insert({start: 1}, {end: 4});
    tree.insert({start: 3}, {end: 5});
    tree.updateHighValues();

    var outTree = {
      'left': {
        'node': [1, 4]
      },
      'node': [3, 5]
    };

    assertEquals(2, tree.size);
    assertEquals(JSON.stringify(outTree), JSON.stringify(tree.dump_()));
  });

  test('insert_withoutEnd', function() {
    var tree = new tvcm.IntervalTree(
        function(s) { return s.start; },
        function(e) { return e.end; });

    assertEquals(0, tree.size);

    tree.insert({start: 3, end: 5});
    tree.insert({start: 1, end: 4});
    tree.updateHighValues();

    var outTree = {
      'left': {
        'node': [1, 4]
      },
      'node': [3, 5]
    };

    assertEquals(2, tree.size);
    assertEquals(JSON.stringify(outTree), JSON.stringify(tree.dump_()));
  });

  test('insert_balancesTree', function() {
    var tree = new tvcm.IntervalTree(
        function(s) { return s.start; },
        function(e) { return e.end; });

    assertEquals(0, tree.size);

    for (var i = 0; i < 10; ++i)
      tree.insert({start: i, end: 5});
    tree.updateHighValues();

    var outTree = {
      'left': {
        'left': {
          'node': [0, 5]
        },
        'node': [1, 5],
        'right': {
          'node': [2, 5]
        }
      },
      'node': [3, 5],
      'right': {
        'left': {
          'left': {
            'node': [4, 5]
          },
          'node': [5, 5],
          'right': {
            'node': [6, 5]
          }
        },
        'node': [7, 5],
        'right': {
          'left': {
            'node': [8, 5]
          },
          'node': [9, 5]
        }
      }
    };

    assertEquals(JSON.stringify(outTree, null, ' '),
        JSON.stringify(tree.dump_(), null, ' '));
  });

  test('insert_withDuplicateIntervals', function() {
    var tree = new tvcm.IntervalTree(
        function(s) { return s.start; },
        function(e) { return e.end; });

    assertEquals(0, tree.size);

    tree.insert({start: 1}, {end: 4});
    tree.insert({start: 3}, {end: 5});
    tree.insert({start: 3}, {end: 5});
    tree.insert({start: 3}, {end: 6});
    tree.updateHighValues();

    var outTree = {
      'left': {
        'node': [1, 4]
      },
      'node': [[3, 5], [3, 5], [3, 6]]
    };

    assertEquals(4, tree.size);
    assertEquals(JSON.stringify(outTree), JSON.stringify(tree.dump_()));
  });

  test('insert_updatesHighValues', function() {
    var tree = buildSimpleTree();

    var expected = [
      [undefined, undefined],
      [2, undefined],
      [5, 8],
      [undefined, undefined],
      [6, 7],
      [undefined, undefined]
    ];

    var result = [];
    function walk(node) {
      if (node === undefined)
        return;

      walk(node.leftNode);
      result.push([node.maxHighLeft, node.maxHighRight]);
      walk(node.rightNode);
    }
    walk(tree.root);

    assertEquals(JSON.stringify(expected), JSON.stringify(result));
  });
});
