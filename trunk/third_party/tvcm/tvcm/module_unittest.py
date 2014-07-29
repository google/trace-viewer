#!/usr/bin/env python
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Tests for the module module, which contains Module and related classes."""

import unittest

from tvcm import fake_fs
from tvcm import module
from tvcm import strip_js_comments
from tvcm import resource_loader
from tvcm import project as project_module

class ModuleIntegrationTests(unittest.TestCase):
  def test_module(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/src/x.html', """
<!DOCTYPE html>
<link rel="import" href="/y.html">
<link rel="import" href="/z.html">
<script>
'use strict';
</script>
""")
    fs.AddFile('/src/y.html', """
<!DOCTYPE html>
<link rel="import" href="/z.html">
""")
    fs.AddFile('/src/z.html', """
<!DOCTYPE html>
""")
    fs.AddFile('/src/tvcm.html', '<!DOCTYPE html>')
    with fs:
      project = project_module.Project(['/src/'],
                                       include_tvcm_paths=False)
      loader = resource_loader.ResourceLoader(project)
      x_module = loader.LoadModule('x')

      self.assertEquals([loader.loaded_modules['y'],
                         loader.loaded_modules['z']],
                        x_module.dependent_modules)

      already_loaded_set = set()
      load_sequence = []
      x_module.ComputeLoadSequenceRecursive(load_sequence, already_loaded_set)

      self.assertEquals([loader.loaded_modules['z'],
                         loader.loaded_modules['y'],
                         x_module],
                        load_sequence)

  def testBasic(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/x/src/my_module.html', """
<!DOCTYPE html>
<link rel="import" href="/tvcm/foo.html">
});
""")
    fs.AddFile('/x/tvcm/foo.html', """
<!DOCTYPE html>
});
""");
    project = project_module.Project(['/x'],
                                     include_tvcm_paths=False)
    loader = resource_loader.ResourceLoader(project)
    with fs:
      my_module = loader.LoadModule(module_name = 'src.my_module')
      dep_names = [x.name for x in my_module.dependent_modules]
      self.assertEquals(['tvcm.foo'], dep_names)

  def testDepsExceptionContext(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/x/src/my_module.html', """
<!DOCTYPE html>
<link rel="import" href="/tvcm/foo.html">
""")
    fs.AddFile('/x/tvcm/foo.html', """
<!DOCTYPE html>
<link rel="import" href="missing.html">
""");
    project = project_module.Project(['/x'],
                                     include_tvcm_paths=False)
    loader = resource_loader.ResourceLoader(project)
    with fs:
      exc = None
      try:
        my_module = loader.LoadModule(module_name = 'src.my_module')
        assertFalse('Expected an exception')
      except module.DepsException, e:
        exc = e
      self.assertEquals(
        ['src.my_module', 'tvcm.foo'],
        exc.context)



  def testGetAllDependentFilenamesRecursive(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/x/y/z/foo.html', """
<!DOCTYPE html>
<link rel="import" href="/z/foo2.html">
<link rel="stylesheet" href="/z/foo.css">
<script src="/bar.js"></script>
""")
    fs.AddFile('/x/y/z/foo.css', """
.x .y {
    background-image: url(foo.jpeg);
}
""")
    fs.AddFile('/x/y/z/foo.jpeg', '')
    fs.AddFile('/x/y/z/foo2.html', """
<!DOCTYPE html>
""");
    fs.AddFile('/x/raw/bar.js', 'hello');
    project = project_module.Project(['/x/y', '/x/raw/'],
                                     include_tvcm_paths=False)
    loader = resource_loader.ResourceLoader(project)
    with fs:
      my_module = loader.LoadModule(module_name='z.foo')
      self.assertEquals(1, len(my_module.dependent_raw_scripts))

      dependent_filenames = my_module.GetAllDependentFilenamesRecursive()
      self.assertEquals([
        '/x/y/z/foo.html',
        '/x/raw/bar.js',
        '/x/y/z/foo.css',
        '/x/y/z/foo.jpeg',
        '/x/y/z/foo2.html'
      ], dependent_filenames)
