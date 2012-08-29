# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import sys
import os
import re

class DepsException(Exception):
  pass

"""
The core of this script is the calc_load_sequence function. In total, this
walks over the provided javascript files and figures out their dependencies
using the module definitions provided in each file. This allows us to, for
example, have a trio of modules:

foo.js:
   base.require('bar');
and bar.js:
   base.require('baz');

calc_load_sequence(['foo']) will yield:
   [Module('baz'), Module('bar'), Module('foo')]

which is, based on the dependencies, the correct sequence in which to load
those modules.
"""

class ResourceFinder(object):
  """Helper code for finding a module given a name and current module.

  The dependency resolution code in Module.resolve will find bits of code in the
  actual javascript that says things require('bar'). This
  code is responsible for figuring out what filename corresponds to 'bar' given
  a Module('foo').
  """
  def __init__(self, root_dir):
    self._root_dir = root_dir
    pass

  def _find_and_load(self, current_module, requested_name, extension):
    assert current_module.filename
    pathy_name = requested_name.replace(".", os.sep)
    filename = pathy_name + extension
    absolute_path = os.path.join(self._root_dir, filename)

    if not os.path.exists(absolute_path):
      return None, None

    f = open(absolute_path, 'r')
    contents = f.read()
    f.close()

    return filename, contents

  def find_and_load_module(self, current_module, requested_module_name):
    return self._find_and_load(current_module, requested_module_name, ".js")

  def find_and_load_style_sheet(self,
                                current_module, requested_style_sheet_name):
    return self._find_and_load(
      current_module, requested_style_sheet_name, ".css")


class StyleSheet(object):
  """Represents a stylesheet resource referenced by a module via the
  base.requireStylesheet(xxx) directive."""
  def __init__(self, name, filename, contents):
    self.name = name
    self.filename = filename
    self.contents = contents

  def __repr__(self):
    return "StyleSheet(%s)" % self.name

def _tokenize_js(text):
  rest = text
  tokens = ["//", "/*", "*/", "\n"]
  while len(rest):
    indices = [rest.find(token) for token in tokens]
    found_indices = [index for index in indices if index >= 0]

    if len(found_indices) == 0:
      # end of string
      yield rest
      return

    min_index = min(found_indices)
    token_with_min = tokens[indices.index(min_index)]

    if min_index > 0:
      yield rest[:min_index]

    yield rest[min_index:min_index + len(token_with_min)]
    rest = rest[min_index + len(token_with_min):]

def _strip_js_comments(text):
  result_tokens = []
  token_stream = _tokenize_js(text).__iter__()
  while True:
    try:
      t = token_stream.next()
    except StopIteration:
      break

    if t == "//":
      while True:
        try:
          t2 = token_stream.next()
          if t2 == "\n":
            break
        except StopIteration:
          break
    elif t == '/*':
      nesting = 1
      while True:
        try:
          t2 = token_stream.next()
          if t2 == "/*":
            nesting += 1
          elif t2 == "*/":
            nesting -= 1
            if nesting == 0:
              break
        except StopIteration:
          break
    else:
      result_tokens.append(t)
  return "".join(result_tokens)

class Module(object):
  """Represents a javascript module. It can either be directly requested, e.g.
  passed in by name to calc_load_sequence, or created by being referenced a
  module via the base.require(xxx) directive.

  Interesting properties on this object are:

  - filename: the file of the actual module
  - contents: the actual text contents of the module
  - style_sheets: StyleSheet objects that this module relies on for styling
    information.
  - dependent_modules: other modules that this module needs in order to run
  """
  def __init__(self, name = None):
    self.name = name
    self.filename = None
    self.contents = None

    self.dependent_module_names = []
    self.dependent_modules = []
    self.style_sheet_names = []
    self.style_sheets = []

  def __repr__(self):
    return "Module(%s)" % self.name

  def load_and_parse(self, module_filename,
                     module_contents = None,
                     decl_required = True):
    if not module_contents:
      f = open(module_filename, 'r')
      self.contents = f.read()
      f.close()
    else:
      self.contents = module_contents
    self.filename = module_filename
    self.parse_definition_(self.contents, decl_required)

  def resolve(self, all_resources, resource_finder):
    if "scripts" not in all_resources:
      all_resources["scripts"] = {}
    if "style_sheets" not in all_resources:
      all_resources["style_sheets"] = {}

    assert self.filename

    for name in self.dependent_module_names:
      if name in all_resources["scripts"]:
        assert all_resources["scripts"][name].contents
        self.dependent_modules.append(all_resources["scripts"][name])
        continue

      filename, contents = resource_finder.find_and_load_module(self, name)
      if not filename:
        raise DepsException("Could not find a file for module %s" % name)

      module = Module(name)
      all_resources["scripts"][name] = module
      self.dependent_modules.append(module)
      module.load_and_parse(filename, contents)
      module.resolve(all_resources, resource_finder)

    for name in self.style_sheet_names:
      if name in all_resources["style_sheets"]:
        assert all_resources["style_sheets"][name].contents
        self.style_sheets.append(all_resources["scripts"][name])
        continue

      filename, contents = resource_finder.find_and_load_style_sheet(self, name)
      if not filename:
        raise DepsException("Could not find a file for stylesheet %s" % name)

      style_sheet = StyleSheet(name, filename, contents)
      all_resources["style_sheets"][name] = style_sheet
      self.style_sheets.append(style_sheet)

  def compute_load_sequence_recursive(self, load_sequence, already_loaded_set):
    for dependent_module in self.dependent_modules:
      dependent_module.compute_load_sequence_recursive(load_sequence,
                                                       already_loaded_set)
    if self.name not in already_loaded_set:
      already_loaded_set.add(self.name)
      load_sequence.append(self)

  def parse_definition_(self, text, decl_required = True):
    if not decl_required and not self.name:
      raise Exception("Module.name must be set for decl_required to be false.")

    stripped_text = _strip_js_comments(text)

    rest = stripped_text
    while True:
      # Things to search for.
      m_r = re.search("""base\s*\.\s*require\((["'])(.+?)\\1\)""",
                      rest, re.DOTALL)
      m_s = re.search("""base\s*\.\s*requireStylesheet\((["'])(.+?)\\1\)""",
                      rest, re.DOTALL)

      # Figure out which was first.
      if m_r and m_s:
        if m_r.start() < m_s.start():
          m = m_r
        else:
          m = m_s
      elif m_r:
        m = m_r
      elif m_s:
        m = m_s
      else:
        break

      if m == m_r:
        dependent_module_name = m.group(2)
        if '/' in dependent_module_name:
          raise DepsException("Slashes are not allowed in module names. "
                              "Use '.' instead: %s" % dependent_module_name)
        self.dependent_module_names.append(dependent_module_name)
      elif m == m_s:
        self.style_sheet_names.append(m.group(2))

      rest = rest[m.end():]


def calc_load_sequence(filenames):
  """Given a list of starting javascript files, figure out all the Module
  objects that need to be loaded to satisfiy their dependencies.

  The javascript files shoud specify their dependencies in a format that is
  textually equivalent to base.js' require syntax, namely:

     base.require(module1);
     base.require(module2);
     base.requireStylesheet(stylesheet);

  The output of this function is an array of Module objects ordered by
  dependency.
  """

  all_resources = {}
  all_resources["scripts"] = {}
  toplevel_modules = []
  root_dir = ''
  if filenames:
    root_dir = os.path.abspath(os.path.dirname(filenames[0]))
  resource_finder = ResourceFinder(root_dir)
  for filename in filenames:
    if not os.path.exists(filename):
      raise Exception("Could not find %s" % filename)
    name  = os.path.splitext(os.path.basename(filename))[0]

    if name in all_resources["scripts"]:
      continue

    module = Module(name)
    module.load_and_parse(filename, decl_required = False)
    all_resources["scripts"][module.name] = module
    toplevel_modules.append(module)
    module.resolve(all_resources, resource_finder)

  already_loaded_set = set()
  load_sequence = []
  for module in toplevel_modules:
    module.compute_load_sequence_recursive(load_sequence, already_loaded_set)
  return load_sequence
