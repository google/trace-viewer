// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.ui.overlay');
tvcm.require('tvcm.ui.dom_helpers');

tvcm.unittest.testSuite('tvcm.ui.overlay_test', function() {
  function addShowButtonForDialog(dlg) {
    var btn = document.createElement('button');
    btn.textContent = 'Launch Overlay';
    btn.addEventListener('click', function(e) {
      dlg.visible = true;
      e.stopPropagation();
    });

    this.addHTMLOutput(btn);
  }

  function makeButton(title) {
    var btn = document.createElement('button');
    btn.textContent = title;
    return btn;
  }

  function makeCloseButton(dlg) {
    var btn = makeButton('close');
    btn.addEventListener('click', function(e) {
      dlg.onClose_(e);
    });
    return btn;
  }

  test('instantiate', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.classList.add('example-overlay');
    dlg.title = 'ExampleOverlay';
    dlg.innerHTML = 'hello';
    dlg.leftButtons.appendChild(makeButton('i am a button'));
    dlg.leftButtons.appendChild(makeCloseButton(dlg));
    dlg.rightButtons.appendChild(tvcm.ui.createSpan(
        {textContent: 'i am a span'}));
    addShowButtonForDialog.call(this, dlg);
  });

  test('instantiate_noButtons', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.classList.add('example-overlay');
    dlg.title = 'ExampleOverlay';
    dlg.innerHTML = 'hello';
    addShowButtonForDialog.call(this, dlg);
  });

  test('instantiate_disableUserClose', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.classList.add('example-overlay');
    dlg.userCanClose = false;
    dlg.title = 'Unclosable';
    dlg.innerHTML = 'This has no close X button.';
    dlg.leftButtons.appendChild(makeCloseButton(dlg));
    addShowButtonForDialog.call(this, dlg);
  });

  test('instantiateTall', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.title = 'TallContent';
    var contentEl = document.createElement('div');
    contentEl.style.overflowY = 'auto';
    dlg.appendChild(contentEl);

    for (var i = 0; i < 1000; i++) {
      var el = document.createElement('div');
      el.textContent = 'line ' + i;
      contentEl.appendChild(el);
    }


    dlg.leftButtons.appendChild(makeButton('i am a button'));
    addShowButtonForDialog.call(this, dlg);
  });

  test('instantiateTallWithManyDirectChildren', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.title = 'TallContent';
    for (var i = 0; i < 100; i++) {
      var el = document.createElement('div');
      el.style.webkitFlex = '1 0 auto';
      el.textContent = 'line ' + i;
      dlg.appendChild(el);
    }

    dlg.leftButtons.appendChild(makeButton('i am a button'));
    addShowButtonForDialog.call(this, dlg);
  });

  test('closeclickEvent', function() {
    var dlg = new tvcm.ui.Overlay();
    dlg.title = 'Test closeclick event';
    var closeBtn = makeCloseButton(dlg);
    dlg.leftButtons.appendChild(closeBtn);

    var closeClicked = false;
    dlg.addEventListener('closeclick', function() {
      closeClicked = true;
    });

    return new Promise(function(resolver) {
      function pressClose() {
        closeBtn.click();
        if (closeClicked)
          resolver.resolve();
        else
          resolver.reject(new Error('closeclick event is not dispatched'));
      }
      dlg.visible = true;
      setTimeout(pressClose, 60);
    });
  });
});
