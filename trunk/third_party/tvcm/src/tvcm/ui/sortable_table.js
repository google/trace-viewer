// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview A sortable table with history states.
 */
tvcm.requireStylesheet('tvcm.ui.sortable_table');

tvcm.require('tvcm.ui');

tvcm.exportTo('tvcm.ui', function() {
  /**
   * @constructor
   */
  var SortableTable = tvcm.ui.define('sortable-table');

  var UNSORTED_ARROW = '&#x25BF';
  var SORT_ASCENDING_ARROW = '&#x25BE';
  var SORT_DESCENDING_ARROW = '&#x25B4';
  var SORT_DIR_ASCENDING = 'downward';
  var SORT_DIR_DESCENDING = 'upward';

  SortableTable.prototype = {
    __proto__: HTMLTableElement.prototype,

    decorate: function() {
      this.classList.add('sortable-table');
      if (!this.tHead)
        return;
      var headerRow = this.tHead.rows[0];
      var currentState = window.history.state;
      for (var i = 0; i < headerRow.cells.length; i++) {
        headerRow.cells[i].addEventListener('click',
                                            this.onItemClicked_, true);
        headerRow.cells[i].innerHTML += '&nbsp;' + UNSORTED_ARROW;
      }

      if (currentState && currentState.tableSorting) {
        var hashCode = this.sortingHashCode_();
        if (currentState.tableSorting[hashCode]) {
          this.sort(currentState.tableSorting[hashCode].col,
                    currentState.tableSorting[hashCode].sortDirection);
        }
      }
    },

    onItemClicked_: function(e) {
      // 'this' refers to the table cell that has been clicked.
      var headerRow = this.parentNode;
      var table = headerRow.parentNode.parentNode;
      var colIndex = Array.prototype.slice.call(headerRow.cells).indexOf(this);
      var sortDirection = table.sort(colIndex);
      var currentState = history.state;
      if (!currentState.tableSorting)
        currentState.tableSorting = {};
      currentState.tableSorting[table.sortingHashCode_()] = {
        col: colIndex,
        sortDirection: sortDirection
      };
      window.history.pushState(currentState);
    },

    sort: function(colIndex, opt_sortDirection) {
      var headerRow = this.tHead.rows[0];
      var headerCell = headerRow.cells[colIndex];

      if (!headerCell.hasAttribute('sort')) {
        // we are either sorting a new column (not previously sorted),
        // or sorting based on a given sort direction (opt_sortDirection).
        return sortByColumn_(headerRow, headerCell, colIndex,
                             opt_sortDirection);
      } else {
        // resort the current sort column in the other direction
        return reverseSortDirection_(headerRow, headerCell, opt_sortDirection);
      }
      return sortDirection;
    },

    // A very simple hash function, based only on the header row and
    // the table location. It is used to check that table loaded
    // can be sorted according to the given history information.
    sortingHashCode_: function() {
      if (this.sortingHashValue_)
        return this.sortingHashValue_;
      var headerText = this.tHead.rows[0].innerText;
      var hash = 0;
      for (var i = 0; i < headerText.length; i++) {
        if (headerText.charCodeAt(i) < 127)
          hash += headerText.charCodeAt(i);
      }

      // use the table index as well in case the same table
      // is displayed more than once on a single page.
      var tableIndex = Array.prototype.slice.call(
          document.getElementsByClassName('sortable-table')).indexOf(this);
      this.sortingHashValue_ = tableIndex + '' + hash;
      return this.sortingHashValue_;
    }
  };

  function compareAscending_(a, b) {
    return compare_(a, b);
  }

  function compareDescending_(a, b) {
    return compare_(b, a);
  }

  function compare_(a, b) {
    var a1 = parseFloat(a);
    var b1 = parseFloat(b);
    if (isNaN(a1) && isNaN(b1))
      return a.toString().localeCompare(b.toString());
    if (isNaN(a1))
      return -1;
    if (isNaN(b1))
      return 1;
    return a1 - b1;
  }

  function sortByColumn_(headerRow, headerCell, colIndex, opt_sortDirection) {
    var sortDirection = opt_sortDirection || SORT_DIR_ASCENDING;
    // remove sort attribute from other header elements.
    for (var i = 0; i < headerRow.cells.length; i++) {
      if (headerRow.cells[i].getAttribute('sort')) {
        headerRow.cells[i].removeAttribute('sort');
        var headerStr = headerRow.cells[i].innerHTML;
        headerRow.cells[i].innerHTML =
            headerStr.substr(0, headerStr.length - 2) + UNSORTED_ARROW;
      }
    }

    var headerStr = headerRow.cells[colIndex].innerHTML;
    headerCell.innerHTML = headerStr.substr(0, headerStr.length - 2) +
                           (sortDirection == SORT_DIR_ASCENDING ?
                            SORT_ASCENDING_ARROW : SORT_DESCENDING_ARROW);

    headerCell.setAttribute('sort', sortDirection);
    var rows = headerRow.parentNode.parentNode.tBodies[0].rows;
    var tempRows = [];
    for (var i = 0; i < rows.length; i++) {
      tempRows.push([rows[i].cells[colIndex].innerText, rows[i]]);
    }

    tempRows.sort(sortDirection == SORT_DIR_ASCENDING ?
                      compareAscending_ : compareDescending_);

    for (var j = 0; j < tempRows.length; j++) {
      headerRow.parentNode.parentNode.tBodies[0].
          appendChild(tempRows[j][1]);
    }
    return sortDirection;
  }

  function reverseSortDirection_(headerRow, headerCell, opt_sortDirection) {
    var sortDirection = headerCell.getAttribute('sort');
    // if it is already sorted in the correct direction, do nothing.
    if (opt_sortDirection == sortDirection)
      return sortDirection;
    sortDirection = sortDirection == SORT_DIR_DESCENDING ?
                    SORT_DIR_ASCENDING : SORT_DIR_DESCENDING;
    headerCell.setAttribute('sort', sortDirection);
    var headerStr = headerCell.innerHTML;
    headerCell.innerHTML = headerStr.substr(0, headerStr.length - 2) +
                           (sortDirection == SORT_DIR_ASCENDING ?
                            SORT_ASCENDING_ARROW : SORT_DESCENDING_ARROW);
    // instead of re-sorting, we reverse the sorted rows.
    var headerRow = headerCell.parentNode;
    var tbody = headerRow.parentNode.parentNode.tBodies[0];
    var tempRows = [];
    for (var i = 0; i < tbody.rows.length; i++)
      tempRows[tempRows.length] = tbody.rows[i];
    for (var i = tempRows.length - 1; i >= 0; i--)
      tbody.appendChild(tempRows[i]);
    return sortDirection;
  }

  return {
    SortableTable: SortableTable
  };
});
