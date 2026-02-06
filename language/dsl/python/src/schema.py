"""
Python classes that represent Player Schema constructs
"""

from typing import Any, Dict, Generic, Optional, List, TypeVar, Union
from .validation import Reference
from .utils import Serializable

T = TypeVar('T', bound=str)

class SchemaNode(Serializable):
    """A Node describes a specific object in the tree"""
    def __init__(self, **properties: 'SchemaDataTypes'):
        self._properties: Dict[str, 'SchemaDataTypes'] = properties
    def get_property(self, name: str) -> Optional['SchemaDataTypes']:
        """Get a property by name"""
        return self._properties.get(name)
    def set_property(self, name: str, data_type: 'SchemaDataTypes') -> None:
        """Set a property"""
        self._properties[name] = data_type
    @property
    def properties(self) -> Dict[str, 'SchemaDataTypes']:
        """Get all properties"""
        return self._properties.copy()


class SchemaDataType(Generic[T], Serializable):
    """Each prop in the object can have a specific DataType"""
    def __init__(
        self,
        type: str,
        validation: Optional[List['Reference']] = None,
        format: Optional['FormattingReference'] = None,
        default: Optional[T] = None,
        **kwargs: Any
    ):
        self._type = type
        self._validation = validation or []
        self._format = format
        self._default = default
        self._additional_props: Dict[str, Any] = kwargs
    @property
    def type(self) -> str:
        """The reference of the base type to use"""
        return self._type
    @type.setter
    def type(self, value: str) -> None:
        self._type = value
    @property
    def validation(self) -> List['Reference']:
        """
        Any additional validations that are associated with this property
        These will add to any base validations associated with the "type"
        """
        return self._validation
    @validation.setter
    def validation(self, value: List['Reference']) -> None:
        self._validation = value
    @property
    def format(self) -> Optional['FormattingReference']:
        """
        A reference to a specific data format to use.
        If none is specified, will fallback to that of the base type
        """
        return self._format
    @format.setter
    def format(self, value: Optional['FormattingReference']) -> None:
        self._format = value
    @property
    def default(self) -> Optional[T]:
        """
        A default value for this property.
        Any reads for this property will result in this default value being written to the model.
        """
        return self._default
    @default.setter
    def default(self, value: Optional[T]) -> None:
        self._default = value


class SchemaRecordType(SchemaDataType[T], Serializable):
    """Determines if the Datatype is a record object"""
    def __init__(
        self,
        type: str,
        is_record: bool = True,
        validation: Optional[List['Reference']] = None,
        format: Optional['FormattingReference'] = None,
        default: Optional[T] = None,
        **kwargs: Any
    ):
        super().__init__(type, validation, format, default, **kwargs)
        self._is_record = is_record
    @property
    def is_record(self) -> bool:
        """boolean to define if its a record"""
        return self._is_record
    @is_record.setter
    def is_record(self, value: bool) -> None:
        self._is_record = value


class SchemaArrayType(SchemaDataType[T], Serializable):
    """Determines if the DataType is an Array Object"""
    def __init__(
        self,
        type: str,
        is_array: bool = True,
        validation: Optional[List['Reference']] = None,
        format: Optional['FormattingReference'] = None,
        default: Optional[T] = None,
        **kwargs: Any
    ):
        super().__init__(type, validation, format, default, **kwargs)
        self._is_array = is_array
    @property
    def is_array(self) -> bool:
        """boolean to define if its an array"""
        return self._is_array
    @is_array.setter
    def is_array(self, value: bool) -> None:
        self._is_array = value


# Type alias for all schema data types
SchemaDataTypes = Union[SchemaDataType[Any], SchemaRecordType[Any], SchemaArrayType[Any]]


class Schema(Serializable):
    """The Schema organizes all content related to Data and it's types"""
    def __init__(self, root: SchemaNode, **additional_nodes: SchemaNode):
        self._root = root
        self._additional_nodes: Dict[str, SchemaNode] = additional_nodes
    @property
    def root(self) -> SchemaNode:
        """The ROOT object is the top level object to use"""
        return self._root
    @root.setter
    def root(self, value: SchemaNode) -> None:
        self._root = value
    def get_node(self, key: str) -> Optional[SchemaNode]:
        """Get an additional node by key"""
        return self._additional_nodes.get(key)
    def set_node(self, key: str, node: SchemaNode) -> None:
        """Set an additional node"""
        self._additional_nodes[key] = node
    @property
    def additional_nodes(self) -> Dict[str, SchemaNode]:
        """Get all additional nodes"""
        return self._additional_nodes.copy()

class LanguageDataTypeRef(Serializable):
    """
    Helper to compliment `Schema.DataType` to provide a way to 
    export a reference to a data type instead of the whole object
    """
    def __init__(self, type: str):
        self._type = type
    @property
    def type(self) -> str:
        """Name of the type in Player Core"""
        return self._type
    @type.setter
    def type(self, value: str) -> None:
        self._type = value


# Formatting namespace classes
class FormattingReference(Serializable):
    """A reference to a specific formatter"""
    def __init__(self, type: str, **kwargs: Any):
        self._type = type
        self._additional_props: Dict[str, Any] = kwargs
    @property
    def type(self) -> str:
        """The name of the formatter (and de-formatter) to use"""
        return self._type
    @type.setter
    def type(self, value: str) -> None:
        self._type = value
    def get_additional_prop(self, key: str) -> Any:
        """Get an additional property by key"""
        return self._additional_props.get(key)
    def set_additional_prop(self, key: str, value: Any) -> None:
        """Set an additional property"""
        self._additional_props[key] = value
    @property
    def additional_props(self) -> Dict[str, Any]:
        """Get all additional properties"""
        return self._additional_props.copy()
