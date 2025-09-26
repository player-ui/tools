"""
Generated Python classes from TypeScript types.
This module provides Python equivalents of TypeScript interfaces and types
with proper type hints, getters, and setters.
"""

from typing import List, Optional, Union, TypeVar


# Type variables for generic classes
T = TypeVar('T', bound=str)


Expression = Union[str, List[str]]
ExpressionRef = str  # In Python, we use str and validate the format at runtime
Binding = str
BindingRef = str  # In Python, we use str and validate the format at runtime

class ExpressionObject:
    """An object with an expression in it"""
    
    def __init__(self, exp: Optional[Union[str, List[str]]] = None):
        self._exp = exp
    
    @property
    def exp(self) -> Optional[Union[str, List[str]]]:
        """The expression to run"""
        return self._exp
    
    @exp.setter
    def exp(self, value: Optional[Union[str, List[str]]]) -> None:
        self._exp = value