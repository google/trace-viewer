// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tvcm', function() {
  function max(a, b) {
    if (a === undefined)
      return b;
    if (b === undefined)
      return a;
    return Math.max(a, b);
  }

  /**
   * This class implements an interval tree.
   *    See: http://wikipedia.org/wiki/Interval_tree
   *
   * Internally the tree is a Red-Black tree. The insertion/colour is done using
   * the Left-leaning Red-Black Trees algorithm as described in:
   *       http://www.cs.princeton.edu/~rs/talks/LLRB/LLRB.pdf
   *
   * @param {function} beginPositionCb Callback to retrieve the begin position.
   * @param {function} endPositionCb Callback to retrieve the end position.
   *
   * @constructor
   */
  function IntervalTree(beginPositionCb, endPositionCb) {
    this.beginPositionCb_ = beginPositionCb;
    this.endPositionCb_ = endPositionCb;

    this.root_ = undefined;
    this.size_ = 0;
  }

  IntervalTree.prototype = {
    /**
     * Insert events into the interval tree.
     *
     * @param {Object} begin The left object.
     * @param {Object=} opt_end The end object, optional. If not provided the
     *     begin object is assumed to also be the end object.
     */
    insert: function(begin, opt_end) {
      var startPosition = this.beginPositionCb_(begin);
      var endPosition = this.endPositionCb_(opt_end || begin);

      var node = new IntervalTreeNode(begin, opt_end || begin,
                                      startPosition, endPosition);
      this.size_++;

      this.root_ = this.insertNode_(this.root_, node);
      this.root_.colour = Colour.BLACK;
    },

    insertNode_: function(root, node) {
      if (root === undefined)
        return node;

      if (root.leftNode && root.leftNode.isRed &&
          root.rightNode && root.rightNode.isRed)
        this.flipNodeColour_(root);

      if (node.key < root.key)
        root.leftNode = this.insertNode_(root.leftNode, node);
      else if (node.key === root.key)
        root.merge(node);
      else
        root.rightNode = this.insertNode_(root.rightNode, node);

      if (root.rightNode && root.rightNode.isRed &&
          (root.leftNode === undefined || !root.leftNode.isRed))
        root = this.rotateLeft_(root);

      if (root.leftNode && root.leftNode.isRed &&
          root.leftNode.leftNode && root.leftNode.leftNode.isRed)
        root = this.rotateRight_(root);

      return root;
    },

    rotateRight_: function(node) {
      var sibling = node.leftNode;
      node.leftNode = sibling.rightNode;
      sibling.rightNode = node;
      sibling.colour = node.colour;
      node.colour = Colour.RED;
      return sibling;
    },

    rotateLeft_: function(node) {
      var sibling = node.rightNode;
      node.rightNode = sibling.leftNode;
      sibling.leftNode = node;
      sibling.colour = node.colour;
      node.colour = Colour.RED;
      return sibling;
    },

    flipNodeColour_: function(node) {
      node.colour = this.flipColour_(node.colour);
      node.leftNode.colour = this.flipColour_(node.leftNode.colour);
      node.rightNode.colour = this.flipColour_(node.rightNode.colour);
    },

    flipColour_: function(colour) {
      return colour === Colour.RED ? Colour.BLACK : Colour.RED;
    },

    /* The high values are used to find intersection. It should be called after
     * all of the nodes are inserted. Doing it each insert is _slow_. */
    updateHighValues: function() {
      this.updateHighValues_(this.root_);
    },

    /* There is probably a smarter way to do this by starting from the inserted
     * node, but need to handle the rotations correctly. Went the easy route
     * for now. */
    updateHighValues_: function(node) {
      if (node === undefined)
        return undefined;

      node.maxHighLeft = this.updateHighValues_(node.leftNode);
      node.maxHighRight = this.updateHighValues_(node.rightNode);

      return max(max(node.maxHighLeft, node.highValue), node.maxHighRight);
    },

    /**
     * Retrieve all overlapping intervals.
     *
     * @param {number} lowValue The low value for the intersection interval.
     * @param {number} highValue The high value for the intersection interval.
     * @return {Array} All [begin, end] pairs inside intersecting intervals.
     */
    findIntersection: function(lowValue, highValue) {
      if (lowValue === undefined || highValue === undefined)
        throw new Error('lowValue and highValue must be defined');
      if ((typeof lowValue !== 'number') || (typeof highValue !== 'number'))
        throw new Error('lowValue and highValue must be numbers');

      if (this.root_ === undefined)
        return [];

      return this.findIntersection_(this.root_, lowValue, highValue);
    },

    findIntersection_: function(node, lowValue, highValue) {
      var ret = [];

      /* This node starts has a start point at or further right then highValue
       * so we know this node is out and all right children are out. Just need
       * to check left */
      if (node.lowValue >= highValue) {
        if (!node.hasLeftNode)
          return [];
        return this.findIntersection_(node.leftNode, lowValue, highValue);
      }

      /* If we have a maximum left high value that is bigger then lowValue we
       * need to check left for matches */
      if (node.maxHighLeft > lowValue) {
        ret = ret.concat(
            this.findIntersection_(node.leftNode, lowValue, highValue));
      }

      /* We know that this node starts before highValue, if any of it's data
       * ends after lowValue we need to add those nodes */
      if (node.highValue > lowValue) {
        for (var i = (node.data.length - 1); i >= 0; --i) {
          /* data nodes are sorted by high value, so as soon as we see one
           * before low value we're done. */
          if (node.data[i].high < lowValue)
            break;

          ret.unshift([node.data[i].start, node.data[i].end]);
        }
      }

      /* check for matches in the right tree */
      if (node.hasRightNode) {
        ret = ret.concat(
            this.findIntersection_(node.rightNode, lowValue, highValue));
      }

      return ret;
    },

    /**
     * Returns the number of nodes in the tree.
     */
    get size() {
      return this.size_;
    },

    /**
     * Returns the root node in the tree.
     */
    get root() {
      return this.root_;
    },

    /**
     * Dumps out the [lowValue, highValue] pairs for each node in depth-first
     * order.
     */
    dump_: function() {
      if (this.root_ === undefined)
        return [];
      return this.dumpNode_(this.root_);
    },

    dumpNode_: function(node) {
      var ret = {};
      if (node.hasLeftNode)
        ret['left'] = this.dumpNode_(node.leftNode);

      ret['node'] = node.dump();

      if (node.hasRightNode)
        ret['right'] = this.dumpNode_(node.rightNode);

      return ret;
    }
  };

  var Colour = {
    RED: 'red',
    BLACK: 'black'
  };

  function IntervalTreeNode(startObject, endObject, lowValue, highValue) {
    this.lowValue_ = lowValue;

    this.data_ = [{
      start: startObject,
      end: endObject,
      high: highValue,
      low: lowValue
    }];

    this.colour_ = Colour.RED;

    this.parentNode_ = undefined;
    this.leftNode_ = undefined;
    this.rightNode_ = undefined;

    this.maxHighLeft_ = undefined;
    this.maxHighRight_ = undefined;
  }

  IntervalTreeNode.prototype = {
    get colour() {
      return this.colour_;
    },

    set colour(colour) {
      this.colour_ = colour;
    },

    get key() {
      return this.lowValue_;
    },

    get lowValue() {
      return this.lowValue_;
    },

    get highValue() {
      return this.data_[this.data_.length - 1].high;
    },

    set leftNode(left) {
      this.leftNode_ = left;
    },

    get leftNode() {
      return this.leftNode_;
    },

    get hasLeftNode() {
      return this.leftNode_ !== undefined;
    },

    set rightNode(right) {
      this.rightNode_ = right;
    },

    get rightNode() {
      return this.rightNode_;
    },

    get hasRightNode() {
      return this.rightNode_ !== undefined;
    },

    set parentNode(parent) {
      this.parentNode_ = parent;
    },

    get parentNode() {
      return this.parentNode_;
    },

    get isRootNode() {
      return this.parentNode_ === undefined;
    },

    set maxHighLeft(high) {
      this.maxHighLeft_ = high;
    },

    get maxHighLeft() {
      return this.maxHighLeft_;
    },

    set maxHighRight(high) {
      this.maxHighRight_ = high;
    },

    get maxHighRight() {
      return this.maxHighRight_;
    },

    get data() {
      return this.data_;
    },

    get isRed() {
      return this.colour_ === Colour.RED;
    },

    merge: function(node) {
      this.data_ = this.data_.concat(node.data);
      this.data_.sort(function(a, b) {
        return a.high - b.high;
      });
    },

    dump: function() {
      if (this.data_.length === 1)
        return [this.data_[0].low, this.data[0].high];

      return this.data_.map(function(d) { return [d.low, d.high]; });
    }
  };

  return {
    IntervalTree: IntervalTree
  };
});
