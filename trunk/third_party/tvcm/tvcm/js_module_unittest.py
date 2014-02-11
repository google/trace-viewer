# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import unittest

from tvcm import fake_fs
from tvcm import module
from tvcm import js_module
from tvcm import project as project_module
from tvcm import resource as resource_module
from tvcm import resource_loader
from tvcm import strip_js_comments

class SmokeTest(unittest.TestCase):
  def testBasic(self):
    with fake_fs.FakeFS({"/src/test.js": "// blahblahblah\n\n'use strict';\n\nbase.require('dependency1');"}):
      project = project_module.Project(['/src/'], include_tvcm_paths=False)
      loader = resource_loader.ResourceLoader(project)
      resource = resource_module.Resource('/src/', '/src/test.js')
      my_module = js_module.JSModule(loader, 'test', resource)

class ValidateStrictModeTests(unittest.TestCase):
  """Test case for ValidateUsesStrictMode."""

  def test_ValidateUsesStrictMode_returns_true(self):
    text = "// blahblahblah\n\n'use strict';\n\nbase.require('dependency1');"
    stripped_text = strip_js_comments.strip_js_comments(text)
    self.assertIsNone(js_module.ValidateUsesStrictMode('module', stripped_text))

  def test_ValidateUsesStrictModeOneLiner(self):
    text = "'use strict'; base.require('dependency1');"
    stripped_text = strip_js_comments.strip_js_comments(text)
    self.assertIsNone(js_module.ValidateUsesStrictMode('module', stripped_text))

  def test_ValidateUsesStrictMode_catches_missing_strict_mode(self):
    text = "// blahblahblah\n\nbase.require('dependency1');"
    stripped_text = strip_js_comments.strip_js_comments(text)
    self.assertRaises(
        lambda: js_module.ValidateUsesStrictMode('module', stripped_text))

class ValidateTestSuiteDefinition(unittest.TestCase):
  def test_basic_success(self):
    text = """
base.unittest.testSuite('foo.bar_test', function() {
});
"""
    js_module.ValidateTestSuiteDefinition('foo.bar_test', text)


  def test_wrong_name(self):
    text = """
base.unittest.testSuite('foo.bar', function() {
});
"""
    self.assertRaises(
      lambda: js_module.ValidateTestSuiteDefinition('foo.bar_test', text))

  def test_no_suite_failure(self):
    text = """
"""
    self.assertRaises(
      lambda: js_module.ValidateTestSuiteDefinition('foo.bar_test', text))

  def test_multiple_suites_failure(self):
    text = """
base.unittest.testSuite('foo.bar_test', function() {
});
base.unittest.testSuite('foo.bar_test', function() {
});
"""
    self.assertRaises(
      lambda: js_module.ValidateTestSuiteDefinition('foo.bar_test', text))

class ParseDefinitionTests(unittest.TestCase):
  """Test case for js_module.Parse."""

  def test_Parse_populates_resource_name_lists(self):
    # Dependencies to resources can be specified in a my_module "definition",
    # and lists of resource names for the my_module are populated correctly.
    text = (
        "// blahblahblah\n"
        "'use strict';\n"
        "base.require('dependency1');\n"
        "base.require('dependency2');\n"
        "base.requireStylesheet('myStylesheet');\n"
        "base.requireTemplate('myTemplate');\n")
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals(['myStylesheet'], deps.style_sheet_names)
    self.assertEquals(['myTemplate'], deps.html_template_names)
    self.assertEquals(['dependency1', 'dependency2'],
                      deps.dependent_module_names)

  def test_Parse_missing_semicolons(self):
    # Semicolons can be omitted after base.require statements.
    text = (
        "// blahblahblah\n"
        "'use strict';\n"
        "base.require('dependency1')\n"
        "base.require('dependency2');\n"
        "base.requireStylesheet('myStylesheet')\n")
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals(['myStylesheet'], deps.style_sheet_names)
    self.assertEquals(['dependency1', 'dependency2'],
                      deps.dependent_module_names)

  def test_Parse_with_deps_and_stylesheet_swapped(self):
    # The dependencies can be specified in different orders.
    text = (
        "// blahblahblah\n"
        "'use strict';\n"
        "base.require('dependency1');\n"
        "base.requireStylesheet('myStylesheet');\n"
        "base.require('dependency2');\n")
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals(['myStylesheet'], deps.style_sheet_names)
    self.assertEquals(['dependency1', 'dependency2'],
                      deps.dependent_module_names)

  def test_Parse_empty_definition(self):
    # If there are no base.require statements, the lists of resource names
    # for the module are all empty.
    text = "// blahblahblah\n'use strict';"
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals([], deps.style_sheet_names)
    self.assertEquals([], deps.dependent_module_names)

  def test_Parse_with_commented_out_dependency(self):
    # Commented-out base.require statements don't count.
    text = (
        "// blahblahblah\n"
        "'use strict';\n"
        "base.require('dependency1');\n"
        "//base.require('dependency2');\n")
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals([], deps.style_sheet_names)
    self.assertEquals(['dependency1'], deps.dependent_module_names)

  def test_Parse_with_multiline_comment_before(self):
    # There can be long comments before the base.require lines.
    text = (
        "// Copyright (c) 2012 The Chromium Authors. All rights reserved.\n"
        "// Use of this source code is governed by a BSD-style license that"
        " can be\n"
        "// found in the LICENSE file.\n\n"
        "'use strict';\n\n"
        "/**\n"
        " * @fileoverview TimelineView visualizes TRACE_EVENT events using\n"
        " * the tracing.TimelineTrackView component and adds in selection\n"
        " * summary and control buttons.\n"
        " */\n"
        "base.requireStylesheet('timeline_view')\n"
        "base.require('timeline_track_view');\n"
        "base.require('timeline_analysis');\n"
        "base.require('overlay');\n"
        "base.require('trace_event_importer');\n"
        "base.require('linux_perf_importer');\n"
        "base.exportsTo('tracing', function() {\n")
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals(['timeline_view'], deps.style_sheet_names)
    self.assertEquals(['timeline_track_view',
                       'timeline_analysis',
                       'overlay',
                       'trace_event_importer',
                       'linux_perf_importer'], deps.dependent_module_names)

  def test_Parse_with_definition_in_comments(self):
    # Statements inside multi-line comments are ignored.
    text = (
        "// SomeComment\n"
        "/*\n"
        " * All subclasses should depend on linux_perfParser, e.g.\n"
        " *\n"
        " * base.require('linux_perfParser');\n"
        " * base.exportTo('tracing', function() { });\n"
        " *\n"
        " */\n"
        "'use strict';\n"
        "base.require('dependency1');\n"
        "base.require('dependency2');\n")
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals([], deps.style_sheet_names)
    self.assertEquals(['dependency1', 'dependency2'],
                      deps.dependent_module_names)

  def test_Parse_dependency_with_slashes_throws_error(self):
    # An error should be thrown if a slash is found in a resource name.
    text = "base.require('foo/dependency1')"
    # Gross hack. We should separate parsing from the module object.
    self.assertRaises(module.DepsException,
                      lambda: js_module.Parse('module_name', text))

  def test_Parse_dependency_with_dots_is_okay(self):
    # Module names can contain dots.
    text = "base.require('foo.dependency1')"
    # Gross hack. We should separate parsing from the module object.
    stripped_text = strip_js_comments.strip_js_comments(text)
    deps = js_module.Parse('module_name', stripped_text)
    self.assertEquals([], deps.style_sheet_names)
    self.assertEquals(['foo.dependency1'],
                      deps.dependent_module_names)


class IsJSModuleTests(unittest.TestCase):
  """Test case for ValidateUsesStrictMode."""
  def testPositive(self):
    js = """'use strict';

base.requireRawScript('gl-matrix/src/gl-matrix/vec4.js');

base.exportTo('base', function() {
  var tmp_vec2 = vec2.create();"""
    self.assertTrue(js_module.IsJSModule(js))

  def testPositive(self):
    js = """'use strict';

base.require('base.bbox2');

base.unittest.testSuite('base.bbox2_test', function() {
  test('addVec2', function() {"""
    self.assertTrue(js_module.IsJSModule(js))

  def testNegative(self):
    js = """/**
 * @class 4x4 Matrix
 * @name mat4
 */
var mat4 = {};"""
    self.assertFalse(js_module.IsJSModule(js))
