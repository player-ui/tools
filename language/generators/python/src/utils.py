"""
Generation Utilities
"""

import ast
from typing import NamedTuple

from player_tools_xlr_types.nodes import NodeType


COMMON_AST_NODES = {
    'string': ast.Name(id='str', ctx=ast.Load()),
    'number': ast.Name(id='int', ctx=ast.Load()), # could be a float?
    'boolean': ast.Name(id='bool', ctx=ast.Load()),
    'Any': ast.Name(id='Any', ctx=ast.Load()),
    'None': ast.Name(id='None', ctx=ast.Load()),
    'Asset': ast.Name(id='Asset', ctx=ast.Load()),
    'Optional': ast.Name(id='Optional', ctx=ast.Load()),
    'List': ast.Name(id='List', ctx=ast.Load()),
    'Union': ast.Name(id='Union', ctx=ast.Load()),
    'Dict': ast.Name(id='Dict', ctx=ast.Load()),
    'Literal': ast.Name(id='Literal', ctx=ast.Load()),
    'self': ast.Name(id='self', ctx=ast.Load()),
    'super': ast.Name(id='super', ctx=ast.Load())
}

PLAYER_DSL_PACKAGE = 'player_tools_dsl'

class PropertyInfo(NamedTuple):
    """Cached property information to avoid repeated processing."""
    clean_name: str
    original_name: str
    node: NodeType
    required: bool
    type: ast.expr
