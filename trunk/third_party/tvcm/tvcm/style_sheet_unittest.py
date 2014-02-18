# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import base64
import unittest

from tvcm import style_sheet
from tvcm import project as project_module
from tvcm import resource_loader
from tvcm import fake_fs
from tvcm import module

class StyleSheetUnittest(unittest.TestCase):
  def testImages(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/src/foo/x.css', """
.x .y {
    background-image: url(../images/bar.jpeg);
}
""")
    fs.AddFile('/src/images/bar.jpeg', 'hello world')
    with fs:
      project = project_module.Project(['/src/'],
                                       include_tvcm_paths=False)
      loader = resource_loader.ResourceLoader(project)

      foo_x = loader.LoadStyleSheet('foo.x')
      self.assertEquals(1, len(foo_x.images))

      r0 = foo_x.images[0]
      self.assertEquals('/src/images/bar.jpeg', r0.absolute_path)

      inlined = foo_x.contents_with_inlined_images
      self.assertEquals("""
.x .y {
    background-image: url(data:image/jpeg;base64,%s);
}
""" % base64.standard_b64encode('hello world'), inlined)



  def testURLResolveFails(self):
    fs = fake_fs.FakeFS()
    fs.AddFile('/src/foo/x.css', """
.x .y {
    background-image: url(../images/missing.jpeg);
}
""")
    with fs:
      project = project_module.Project(['/src/'],
                                       include_tvcm_paths=False)
      loader = resource_loader.ResourceLoader(project)

      self.assertRaises(module.DepsException,
                        lambda: loader.LoadStyleSheet('foo.x'))
