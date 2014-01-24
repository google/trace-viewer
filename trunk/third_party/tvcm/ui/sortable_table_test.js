// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.utils');
base.require('ui');
base.require('ui.sortable_table');

base.unittest.testSuite('ui.sortable_table', function() {
  var SortableTable = ui.SortableTable;

  function convertToHTML(s) {
    var res = '';
    for (var i = 0; i < s.length; i++) {
      res += s.charCodeAt(i) > 127 ?
             '&#x' + s.charCodeAt(i).toString(16).toUpperCase() + ';' :
             s.charAt(i);
    }
    return res;
  }

  function SimpleTable() {
    var table = document.createElement('table');
    var thead = table.createTHead();
    var tfoot = table.createTFoot();
    var tbody = table.createTBody();
    var headerRow = thead.insertRow(0);
    headerRow.insertCell(0).appendChild(document.createTextNode('Name'));
    headerRow.insertCell(1).appendChild(document.createTextNode('Value'));
    var row1 = tbody.insertRow(0);
    row1.insertCell(0).appendChild(document.createTextNode('First'));
    row1.insertCell(1).appendChild(document.createTextNode('2'));
    var row2 = tbody.insertRow(1);
    row2.insertCell(0).appendChild(document.createTextNode('Middle'));
    row2.insertCell(1).appendChild(document.createTextNode('18'));
    var row3 = tbody.insertRow(2);
    row3.insertCell(0).appendChild(document.createTextNode('Last'));
    row3.insertCell(1).appendChild(document.createTextNode('1'));
    var footerRow = tfoot.insertRow(0);
    footerRow.insertCell(0).appendChild(document.createTextNode('Average'));
    footerRow.insertCell(1).appendChild(document.createTextNode('7'));
    return table;
  }

  test('instantiate', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('First', tableRows[0].cells[0].innerText);
    assertEquals('2', tableRows[0].cells[1].innerText);
    assertEquals('Middle', tableRows[1].cells[0].innerText);
    assertEquals('18', tableRows[1].cells[1].innerText);
    assertEquals('Last', tableRows[2].cells[0].innerText);
    assertEquals('1', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnAlphabeticColumnAscending', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(0 /*, 'downward' */);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BE;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('First', tableRows[0].cells[0].innerText);
    assertEquals('2', tableRows[0].cells[1].innerText);
    assertEquals('Last', tableRows[1].cells[0].innerText);
    assertEquals('1', tableRows[1].cells[1].innerText);
    assertEquals('Middle', tableRows[2].cells[0].innerText);
    assertEquals('18', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnAlphabeticColumnDescending', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(0 , 'upward');
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25B4;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Middle', tableRows[0].cells[0].innerText);
    assertEquals('18', tableRows[0].cells[1].innerText);
    assertEquals('Last', tableRows[1].cells[0].innerText);
    assertEquals('1', tableRows[1].cells[1].innerText);
    assertEquals('First', tableRows[2].cells[0].innerText);
    assertEquals('2', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnNumericColumnAscending', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(1 /*, 'downward' */);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BE;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Last', tableRows[0].cells[0].innerText);
    assertEquals('1', tableRows[0].cells[1].innerText);
    assertEquals('First', tableRows[1].cells[0].innerText);
    assertEquals('2', tableRows[1].cells[1].innerText);
    assertEquals('Middle', tableRows[2].cells[0].innerText);
    assertEquals('18', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnNumericColumnDescending', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(1 , 'upward');
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25B4;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Middle', tableRows[0].cells[0].innerText);
    assertEquals('18', tableRows[0].cells[1].innerText);
    assertEquals('First', tableRows[1].cells[0].innerText);
    assertEquals('2', tableRows[1].cells[1].innerText);
    assertEquals('Last', tableRows[2].cells[0].innerText);
    assertEquals('1', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnAColumnThenReverseIt', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(0);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BE;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('First', tableRows[0].cells[0].innerText);
    assertEquals('2', tableRows[0].cells[1].innerText);
    assertEquals('Last', tableRows[1].cells[0].innerText);
    assertEquals('1', tableRows[1].cells[1].innerText);
    assertEquals('Middle', tableRows[2].cells[0].innerText);
    assertEquals('18', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
    table.sort(0);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25B4;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Middle', tableRows[0].cells[0].innerText);
    assertEquals('18', tableRows[0].cells[1].innerText);
    assertEquals('Last', tableRows[1].cells[0].innerText);
    assertEquals('1', tableRows[1].cells[1].innerText);
    assertEquals('First', tableRows[2].cells[0].innerText);
    assertEquals('2', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });

  test('sortOnAColumnThenOnAnotherColumn', function() {
    var table = SimpleTable();
    SortableTable.decorate(table);
    table.sort(0 , 'upward');
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25B4;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Middle', tableRows[0].cells[0].innerText);
    assertEquals('18', tableRows[0].cells[1].innerText);
    assertEquals('Last', tableRows[1].cells[0].innerText);
    assertEquals('1', tableRows[1].cells[1].innerText);
    assertEquals('First', tableRows[2].cells[0].innerText);
    assertEquals('2', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
    table.sort(1 /*, 'downward' */);
    var headerRow = table.tHead.rows[0];
    assertEquals('Name&nbsp;&#x25BF;',
                 convertToHTML(headerRow.cells[0].innerHTML));
    assertEquals('Value&nbsp;&#x25BE;',
                 convertToHTML(headerRow.cells[1].innerHTML));
    var tableRows = table.tBodies[0].rows;
    assertEquals('Last', tableRows[0].cells[0].innerText);
    assertEquals('1', tableRows[0].cells[1].innerText);
    assertEquals('First', tableRows[1].cells[0].innerText);
    assertEquals('2', tableRows[1].cells[1].innerText);
    assertEquals('Middle', tableRows[2].cells[0].innerText);
    assertEquals('18', tableRows[2].cells[1].innerText);
    // the footer should never change.
    var footerRow = table.tFoot.rows[0];
    assertEquals('Average', footerRow.cells[0].innerText);
    assertEquals('7', footerRow.cells[1].innerText);
  });
});
