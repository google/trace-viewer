# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""This module contains the Module class and other classes for resources.

The Module class represents a module in the trace viewer system. A module has
a name, and may require a variety of other resources, such as stylesheets,
template objects, raw javascript, or other modules.

Other resources include HTML templates, raw javascript files, and stylesheets.
"""

import os
import re
import inspect

from tvcm import resource as resource_module

class DepsException(Exception):
  """Exceptions related to module dependency resolution."""
  def __init__(self, fmt, *args):
    import style_sheet as style_sheet_module
    context = []
    frame = inspect.currentframe()
    while frame:
      locals = frame.f_locals

      module_name = None
      if 'self' in locals:
        s = locals['self']
        if isinstance(s, Module):
          module_name = s.name
        if isinstance(s, style_sheet_module.StyleSheet):
          module_name = s.name + '.css'
      if not module_name:
        if 'module' in locals:
          module = locals['module']
          if isinstance(s, Module):
            module_name = module.name
        elif 'm' in locals:
          module = locals['m']
          if isinstance(s, Module):
            module_name = module.name

      if module_name:
        if len(context):
          if context[-1] != module_name:
            context.append(module_name)
        else:
          context.append(module_name)

      frame = frame.f_back

    context.reverse()
    self.context = context
    context_str = '\n'.join(['  %s' % x for x in context])
    Exception.__init__(self, 'While loading:\n%s\nGot: %s' % (context_str, (fmt % args)))


class ModuleDependencyMetadata(object):
  def __init__(self):
    self.dependent_module_names = []
    self.dependent_raw_script_relative_paths = []
    self.style_sheet_names = []
    self.html_template_names = []

class Module(object):
  """Represents a javascript module.

  Interesting properties include:
    name: Module name, may include a namespace, e.g. 'tvcm.foo'.
    filename: The filename of the actual module.
    contents: The text contents of the module
    dependent_modules: Other modules that this module depends on.

  In addition to these properties, a Module also contains lists of other
  resources that it depends on.
  """
  def __init__(self, loader, name, resource):
    assert isinstance(name, basestring), 'Got %s instead' % repr(name)
    assert isinstance(resource, resource_module.Resource)
    self.loader = loader
    self.name = name
    self.resource = resource

    f = open(self.filename, 'r')
    self.contents = f.read()
    f.close()

    # Dependency metadata, set up during Parse().
    self.dependency_metadata = None

    # Actual dependencies, set up during load().
    self.dependent_modules = []
    self.dependent_raw_scripts = []
    self.style_sheets = []
    self.html_templates = []

  def __repr__(self):
    return '%s(%s)' % (self.__class__.__name__, self.name)

  @property
  def filename(self):
    return self.resource.absolute_path

  @staticmethod
  def html_contents_is_polymer_module(contents):
    return '<polymer-component>' in contents

  def Parse(self):
    """Parses self.contents and fills in the module's dependency metadata."""
    raise NotImplementedError()

  def Load(self):
    """Loads the sub-resources that this module depends on from its dependency metadata.

    Raises:
      DepsException: There was a problem finding one of the dependencies.
      Exception: There was a problem parsing a module that this one depends on.
    """
    assert self.name, 'Module name must be set before dep resolution.'
    assert self.filename, 'Module filename must be set before dep resolution.'
    assert self.name in self.loader.loaded_modules, 'Module must be registered in resource loader before loading.'

    metadata = self.dependency_metadata
    for name in metadata.dependent_module_names:
      module = self.loader.LoadModule(module_name=name)
      self.dependent_modules.append(module)

    for relative_raw_script_path in metadata.dependent_raw_script_relative_paths:
      raw_script = self.loader.LoadRawScript(relative_raw_script_path)
      self.dependent_raw_scripts.append(raw_script)

    for name in metadata.style_sheet_names:
      style_sheet = self.loader.LoadStyleSheet(name)
      self.style_sheets.append(style_sheet)

    for name in metadata.html_template_names:
      html_template = self.loader.LoadHTMLTemplate(name)
      self.html_templates.append(html_template)

  def ComputeLoadSequenceRecursive(self, load_sequence, already_loaded_set,
                                      depth=0):
    """Recursively builds up a load sequence list.

    Args:
      load_sequence: A list which will be incrementally built up.
      already_loaded_set: A set of modules that has already been added to the
          load sequence list.
      depth: The depth of recursion. If it too deep, that indicates a loop.
    """
    if depth > 32:
      raise Exception('Include loop detected on %s', self.name)
    for dependent_module in self.dependent_modules:
      if dependent_module.name in already_loaded_set:
        continue
      dependent_module.ComputeLoadSequenceRecursive(
          load_sequence, already_loaded_set, depth+1)
    if self.name not in already_loaded_set:
      already_loaded_set.add(self.name)
      load_sequence.append(self)


class HTMLTemplate(object):
  """Represents an html template resource referenced by a module via the
  tvcm.requireTemplate(xxx) directive."""
  def __init__(self, name, filename, contents):
    self.name = name
    self.filename = filename
    self.contents = contents

  def __repr__(self):
    return "HTMLTemplate(%s)" % self.name


class RawScript(object):
  """Represents a raw script resource referenced by a module via the
  tvcm.requireRawScript(xxx) directive."""
  def __init__(self, resource):
    self.resource = resource

  @property
  def filename(self):
    return self.resource.absolute_path

  @property
  def contents(self):
    return self.resource.contents

  def __repr__(self):
    return "RawScript(%s)" % self.filename
