"""
Python classes that represent Player Data constructs
"""

from typing import List, Optional, Union, TypeVar
from .utils import Serializable
T = TypeVar('T', bound=str)

# Future: Build out Expression/Binding template functionality once PEP 750 is available
Expression = Union[str, List[str]]
ExpressionRef = str
Binding = str
BindingRef = str

class ExpressionObject(Serializable):
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
