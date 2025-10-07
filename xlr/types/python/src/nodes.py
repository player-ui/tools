"""
Python equivalent of TypeScript interfaces for XLR Nodes
"""

from typing import Any, Dict, List, Mapping, Optional, Union, Generic, TypeVar

T = TypeVar('T', bound='TypeNode')

class Annotations:
    """The name used to reference this type"""

    def __init__(self,
                 name: Optional[str] = None,
                 title: Optional[str] = None,
                 description: Optional[str] = None,
                 examples: Optional[Union[str, List[str]]] = None,
                 default: Optional[str] = None,
                 see: Optional[Union[str, List[str]]] = None,
                 comment: Optional[str] = None,
                 meta: Optional[Dict[str, str]] = None):
        self._name = name
        self._title = title
        self._description = description
        self._examples = examples
        self._default = default
        self._see = see
        self._comment = comment
        self._meta = meta

    @property
    def name(self) -> Optional[str]:
        """The name used to reference this type"""
        return self._name

    @name.setter
    def name(self, value: Optional[str]) -> None:
        self._name = value

    @property
    def title(self) -> Optional[str]:
        """The path within a type to this type (may be the same as `name`)"""
        return self._title

    @title.setter
    def title(self, value: Optional[str]) -> None:
        self._title = value

    @property
    def description(self) -> Optional[str]:
        """The JSDoc string for this type"""
        return self._description

    @description.setter
    def description(self, value: Optional[str]) -> None:
        self._description = value

    @property
    def examples(self) -> Optional[Union[str, List[str]]]:
        """The JSDoc `@example` string for this type"""
        return self._examples

    @examples.setter
    def examples(self, value: Optional[Union[str, List[str]]]) -> None:
        self._examples = value

    @property
    def default(self) -> Optional[str]:
        """The JSDoc `@default` string for this type"""
        return self._default

    @default.setter
    def default(self, value: Optional[str]) -> None:
        self._default = value

    @property
    def see(self) -> Optional[Union[str, List[str]]]:
        """The JSDoc `@see` string for this type"""
        return self._see

    @see.setter
    def see(self, value: Optional[Union[str, List[str]]]) -> None:
        self._see = value

    @property
    def comment(self) -> Optional[str]:
        """The Typescript comment associated with the type"""
        return self._comment

    @comment.setter
    def comment(self, value: Optional[str]) -> None:
        self._comment = value

    @property
    def meta(self) -> Optional[Dict[str, str]]:
        """The JSDoc `@meta` string for this type"""
        return self._meta

    @meta.setter
    def meta(self, value: Optional[Dict[str, str]]) -> None:
        self._meta = value


class Const:
    """Generic const interface"""

    def __init__(self, const: Optional[Any] = None):
        self._const = const

    @property
    def const(self) -> Optional[Any]:
        """The literal value for the node"""
        return self._const

    @const.setter
    def const(self, value: Optional[Any]) -> None:
        self._const = value


class Enum:
    """Generic enum interface"""

    def __init__(self, enum: Optional[List[Any]] = None):
        self._enum = enum

    @property
    def enum(self) -> Optional[List[Any]]:
        """The list of enums for the node"""
        return self._enum

    @enum.setter
    def enum(self, value: Optional[List[Any]]) -> None:
        self._enum = value


class CommonTypeInfo(Const, Enum):
    """Common type information combining Const and Enum"""

    def __init__(self, const: Optional[Any] = None, enum: Optional[List[Any]] = None):
        Const.__init__(self, const)
        Enum.__init__(self, enum)


class TypeNode:
    """Base type node with type identifier"""

    def __init__(self, type_name: str):
        self._type = type_name

    @property
    def type(self) -> str:
        """The type of Node"""
        return self._type

    @type.setter
    def type(self, value: str) -> None:
        self._type = value


class AnyType(TypeNode, CommonTypeInfo, Annotations):
    """Any type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "any")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class UnknownType(TypeNode, CommonTypeInfo, Annotations):
    """Unknown type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "unknown")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class UndefinedType(TypeNode, CommonTypeInfo, Annotations):
    """Undefined type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "undefined")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class NullType(TypeNode, CommonTypeInfo, Annotations):
    """Null type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "null")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class VoidType(TypeNode, CommonTypeInfo, Annotations):
    """Void type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "void")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class StringType(TypeNode, CommonTypeInfo, Annotations):
    """String type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "string")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class NumberType(TypeNode, CommonTypeInfo, Annotations):
    """Number type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "number")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class BooleanType(TypeNode, CommonTypeInfo, Annotations):
    """Boolean type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "boolean")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class NeverType(TypeNode, CommonTypeInfo, Annotations):
    """Never type implementation"""

    def __init__(self, **kwargs):
        TypeNode.__init__(self, "never")
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class RefNode(TypeNode):
    """Reference node implementation"""

    def __init__(
            self,
            ref: str,
            genericArguments: Optional[List['NodeType']] = None,
            property: Optional[str] = None
        ):
        super().__init__("ref")
        self._ref = ref
        self._genericArguments = genericArguments
        self._property = property

    @property
    def ref(self) -> str:
        """Name of the referenced Type"""
        return self._ref

    @ref.setter
    def ref(self, value: str) -> None:
        self._ref = value

    @property
    def genericArguments(self) -> Optional[List['NodeType']]:
        """Parameters to potentially fill in a generic when it is resolved"""
        return self._genericArguments

    @genericArguments.setter
    def genericArguments(self, value: Optional[List['NodeType']]) -> None:
        self._genericArguments = value

    @property
    def property(self) -> Optional[str]:
        """Optional property to access when the reference is resolved"""
        return self._property

    @property.setter
    def property(self, value: Optional[str]) -> None:
        self._property = value


class RefType(RefNode, Annotations):
    """Reference type with annotations"""

    def __init__(
            self,
            ref: str,
            genericArguments: Optional[List['NodeType']] = None,
            property: Optional[str] = None,
            **kwargs
        ):
        RefNode.__init__(self, ref, genericArguments, property)
        Annotations.__init__(self, **kwargs)


class ObjectProperty:
    """Object property definition"""

    def __init__(self, required: bool, node: 'NodeType'):
        self._required = required
        self._node = node

    @property
    def required(self) -> bool:
        """If this property is required"""
        return self._required

    @required.setter
    def required(self, value: bool) -> None:
        self._required = value

    @property
    def node(self) -> 'NodeType':
        """The type of the property"""
        return self._node

    @node.setter
    def node(self, value: 'NodeType') -> None:
        self._node = value


class ObjectNode(TypeNode):
    """Object node implementation"""

    def __init__(
            self,
            properties: Dict[str, ObjectProperty],
            extends: Optional[RefType] = None,
            additionalProperties: Union[bool, 'NodeType'] = False
        ):
        super().__init__("object")
        self._properties = properties
        self._extends = extends
        self._additionalProperties = additionalProperties

    @property
    def properties(self) -> Dict[str, ObjectProperty]:
        """The properties associated with an object"""
        return self._properties

    @properties.setter
    def properties(self, value: Dict[str, ObjectProperty]) -> None:
        self._properties = value

    @property
    def extends(self) -> Optional[RefType]:
        """A custom primitive that this object extends that is to be resolved when used"""
        return self._extends

    @extends.setter
    def extends(self, value: Optional[RefType]) -> None:
        self._extends = value

    @property
    def additionalProperties(self) -> Union[bool, 'NodeType']:
        """What type, if any, of additional properties are allowed on the object"""
        return self._additionalProperties

    @additionalProperties.setter
    def additionalProperties(self, value: Union[bool, 'NodeType']) -> None:
        self._additionalProperties = value


class ObjectType(ObjectNode, CommonTypeInfo, Annotations):
    """Object type with annotations"""

    def __init__(
            self,
            properties: Dict[str, ObjectProperty],
            extends: Optional[RefType] = None,
            additionalProperties: Union[bool, 'NodeType'] = False,
            **kwargs
        ):
        ObjectNode.__init__(self, properties, extends, additionalProperties)
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class ArrayNode(TypeNode):
    """Array node implementation"""

    def __init__(self, elementType: 'NodeType'):
        super().__init__("array")
        self._elementType = elementType

    @property
    def elementType(self) -> 'NodeType':
        """What types are allowed in the array"""
        return self._elementType

    @elementType.setter
    def elementType(self, value: 'NodeType') -> None:
        self._elementType = value


class ArrayType(ArrayNode, CommonTypeInfo, Annotations):
    """Array type with annotations"""

    def __init__(self, elementType: 'NodeType', **kwargs):
        ArrayNode.__init__(self, elementType)
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class ConditionalNode(TypeNode):
    """Conditional node implementation"""

    def __init__(self, check: Mapping[str, 'NodeType'], value: Mapping[str, 'NodeType']):
        super().__init__("conditional")
        self._check = check
        self._value = value

    @property
    def check(self) -> Mapping[str, 'NodeType']:
        """The check arguments"""
        return self._check

    @check.setter
    def check(self, value: Mapping[str, 'NodeType']) -> None:
        self._check = value

    @property
    def value(self) -> Mapping[str, 'NodeType']:
        """The resulting values to use"""
        return self._value

    @value.setter
    def value(self, value: Mapping[str, 'NodeType']) -> None:
        self._value = value


class ConditionalType(ConditionalNode, Annotations):
    """Conditional type with annotations"""

    def __init__(self, check: Mapping[str, 'NodeType'], value: Mapping[str, 'NodeType'], **kwargs):
        ConditionalNode.__init__(self, check, value)
        Annotations.__init__(self, **kwargs)


class TupleMember:
    """Tuple member definition"""

    def __init__(
            self,
            type: 'NodeType',
            name: Optional[str] = None,
            optional: Optional[bool] = None
        ):
        self._name = name
        self._type = type
        self._optional = optional

    @property
    def name(self) -> Optional[str]:
        """Optional Name of the Tuple Member"""
        return self._name

    @name.setter
    def name(self, value: Optional[str]) -> None:
        self._name = value

    @property
    def type(self) -> 'NodeType':
        """Type constraint of the Tuple Member"""
        return self._type

    @type.setter
    def type(self, value: 'NodeType') -> None:
        self._type = value

    @property
    def optional(self) -> Optional[bool]:
        """Is the Tuple Member Optional"""
        return self._optional

    @optional.setter
    def optional(self, value: Optional[bool]) -> None:
        self._optional = value


class TupleNode(TypeNode):
    """Tuple node implementation"""

    def __init__(
            self,
            elementTypes: List[TupleMember],
            minItems: int,
            additionalItems: Union[bool, 'NodeType'] = False
        ):
        super().__init__("tuple")
        self._elementTypes = elementTypes
        self._minItems = minItems
        self._additionalItems = additionalItems

    @property
    def elementTypes(self) -> List[TupleMember]:
        """The types in the tuple"""
        return self._elementTypes

    @elementTypes.setter
    def elementTypes(self, value: List[TupleMember]) -> None:
        self._elementTypes = value

    @property
    def minItems(self) -> int:
        """The minimum number of items"""
        return self._minItems

    @minItems.setter
    def minItems(self, value: int) -> None:
        self._minItems = value

    @property
    def additionalItems(self) -> Union[bool, 'NodeType']:
        """What, if any, additional types can be provided"""
        return self._additionalItems

    @additionalItems.setter
    def additionalItems(self, value: Union[bool, 'NodeType']) -> None:
        self._additionalItems = value


class TupleType(TupleNode, CommonTypeInfo, Annotations):
    """Tuple type with annotations"""

    def __init__(
            self,
            elementTypes: List[TupleMember],
            minItems: int,
            additionalItems: Union[bool, 'NodeType'] = False,
            **kwargs
        ):
        TupleNode.__init__(self, elementTypes, minItems, additionalItems)
        CommonTypeInfo.__init__(self, kwargs.get('const'), kwargs.get('enum'))
        Annotations.__init__(self,
                             **{k: v for k, v in kwargs.items() if k not in ['const', 'enum']}
                            )


class AndType(TypeNode, Annotations):
    """And/Intersection type"""

    def __init__(self, and_types: List['NodeType'], **kwargs):
        super().__init__("and")
        self._and = and_types
        Annotations.__init__(self, **kwargs)

    @property
    def and_types(self) -> List['NodeType']:
        """Nodes in intersection"""
        return self._and

    @and_types.setter
    def and_types(self, value: List['NodeType']) -> None:
        self._and = value


class OrType(TypeNode, Annotations):
    """Or/Union type"""

    def __init__(self, or_types: List['NodeType'], **kwargs):
        super().__init__("or")
        self._or = or_types
        Annotations.__init__(self, **kwargs)

    @property
    def or_types(self) -> List['NodeType']:
        """Nodes in the union"""
        return self._or

    @or_types.setter
    def or_types(self, value: List['NodeType']) -> None:
        self._or = value


class TemplateLiteralType(TypeNode, Annotations):
    """Template literal type"""

    def __init__(self, format: str, **kwargs):
        super().__init__("template")
        self._format = format
        Annotations.__init__(self, **kwargs)

    @property
    def format(self) -> str:
        """String version of regex used to validate template"""
        return self._format

    @format.setter
    def format(self, value: str) -> None:
        self._format = value


class RecordType(TypeNode, Annotations):
    """Record type"""

    def __init__(self, keyType: 'NodeType', valueType: 'NodeType', **kwargs):
        super().__init__("record")
        self._keyType = keyType
        self._valueType = valueType
        Annotations.__init__(self, **kwargs)

    @property
    def keyType(self) -> 'NodeType':
        """Key types for the Record"""
        return self._keyType

    @keyType.setter
    def keyType(self, value: 'NodeType') -> None:
        self._keyType = value

    @property
    def valueType(self) -> 'NodeType':
        """Value types for the Record"""
        return self._valueType

    @valueType.setter
    def valueType(self, value: 'NodeType') -> None:
        self._valueType = value


class FunctionTypeParameters:
    """Function type parameters"""

    def __init__(
            self,
            name: str,
            type: 'NodeType',
            optional: Optional[bool] = None,
            default: Optional['NodeType'] = None
        ):
        self._name = name
        self._type = type
        self._optional = optional
        self._default = default

    @property
    def name(self) -> str:
        """String name of the function parameter"""
        return self._name

    @name.setter
    def name(self, value: str) -> None:
        self._name = value

    @property
    def type(self) -> 'NodeType':
        """The type constraint of the parameter"""
        return self._type

    @type.setter
    def type(self, value: 'NodeType') -> None:
        self._type = value

    @property
    def optional(self) -> Optional[bool]:
        """Indicates that the parameter is optional"""
        return self._optional

    @optional.setter
    def optional(self, value: Optional[bool]) -> None:
        self._optional = value

    @property
    def default(self) -> Optional['NodeType']:
        """Default value for the parameter if nothing is supplied"""
        return self._default

    @default.setter
    def default(self, value: Optional['NodeType']) -> None:
        self._default = value


class FunctionType(TypeNode, Annotations):
    """Function type"""

    def __init__(
            self,
            parameters: List[FunctionTypeParameters],
            returnType: Optional['NodeType'] = None,
            **kwargs
        ):
        super().__init__("function")
        self._parameters = parameters
        self._returnType = returnType
        Annotations.__init__(self, **kwargs)

    @property
    def parameters(self) -> List[FunctionTypeParameters]:
        """Types for the parameters, in order, for the function"""
        return self._parameters

    @parameters.setter
    def parameters(self, value: List[FunctionTypeParameters]) -> None:
        self._parameters = value

    @property
    def returnType(self) -> Optional['NodeType']:
        """Return type of the function"""
        return self._returnType

    @returnType.setter
    def returnType(self, value: Optional['NodeType']) -> None:
        self._returnType = value


class NamedType(Generic[T], Annotations):
    """Named type that can wrap any base XLR node with name and source information"""

    def __init__(self, base_node: T, name: str, source: str, **kwargs):
        super().__init__(**kwargs)
        self._base_node = base_node
        self._name = name  # Using _name to avoid conflict with Annotations.name
        self._source = source

    def __getattribute__(self, attr):
        try:
            return object.__getattribute__(self, attr)
        except AttributeError:
            return self.base_node.__getattribute__(attr)

    @property
    def base_node(self) -> T:
        """The underlying XLR node that this named type wraps"""
        return self._base_node

    @base_node.setter
    def base_node(self, value: T) -> None:
        self._base_node = value

    @property
    def name(self) -> str:
        """Name of the exported interface/type"""
        return self._name

    @name.setter
    def name(self, value: str) -> None: # type: ignore
        self._name = value

    @property
    def source(self) -> str:
        """File the type was exported from"""
        return self._source

    @source.setter
    def source(self, value: str) -> None:
        self._source = value

    # Delegate type property to base_node for compatibility
    @property
    def type(self) -> str:
        """The type of the underlying node"""
        return self._base_node.type if hasattr(self._base_node, 'type') else ''


class ParamTypeNode:
    """Parameter type node for generics"""

    def __init__(
            self,
            symbol: str,
            constraints: Optional['NodeType'] = None,
            default: Optional['NodeType'] = None
        ):
        self._symbol = symbol
        self._constraints = constraints
        self._default = default

    @property
    def symbol(self) -> str:
        """Symbol used to identify the generic in the interface/type"""
        return self._symbol

    @symbol.setter
    def symbol(self, value: str) -> None:
        self._symbol = value

    @property
    def constraints(self) -> Optional['NodeType']:
        """The type constraint for the generic"""
        return self._constraints

    @constraints.setter
    def constraints(self, value: Optional['NodeType']) -> None:
        self._constraints = value

    @property
    def default(self) -> Optional['NodeType']:
        """The default value for the generic if no value is provided"""
        return self._default

    @default.setter
    def default(self, value: Optional['NodeType']) -> None:
        self._default = value


class NamedTypeWithGenerics(NamedType[T]):
    """Named type with generics that can wrap any base XLR node"""

    def __init__(
            self,
            base_node: T,
            name: str,
            source: str,
            genericTokens: List[ParamTypeNode],
            **kwargs
        ):
        super().__init__(base_node, name, source, **kwargs)
        self._genericTokens = genericTokens

    @property
    def genericTokens(self) -> List[ParamTypeNode]:
        """Generics for the Named Type that need to be filled in"""
        return self._genericTokens

    @genericTokens.setter
    def genericTokens(self, value: List[ParamTypeNode]) -> None:
        self._genericTokens = value


class NodeTypeWithGenerics:
    """Node type with generics mixin"""

    def __init__(self, genericTokens: List[ParamTypeNode]):
        self._genericTokens = genericTokens

    @property
    def genericTokens(self) -> List[ParamTypeNode]:
        """Generics for the Node that need to be filled in"""
        return self._genericTokens

    @genericTokens.setter
    def genericTokens(self, value: List[ParamTypeNode]) -> None:
        self._genericTokens = value


# Type aliases for union types
PrimitiveTypes = Union[
    NeverType,
    NullType,
    StringType,
    NumberType,
    BooleanType,
    AnyType,
    UnknownType,
    UndefinedType,
    VoidType
]

NodeType = Union[
    AnyType, UnknownType, UndefinedType, NullType, NeverType, StringType, TemplateLiteralType,
    NumberType, BooleanType, ObjectType, ArrayType, TupleType, RecordType, AndType, OrType,
    RefType, FunctionType, ConditionalType, VoidType
]

# Update forward references
ObjectProperty.__annotations__['node'] = NodeType
RefNode.__annotations__['genericArguments'] = Optional[List[NodeType]]
ObjectNode.__annotations__['additionalProperties'] = Union[bool, NodeType]
ArrayNode.__annotations__['elementType'] = NodeType
ConditionalNode.__annotations__['check'] = Dict[str, NodeType]
ConditionalNode.__annotations__['value'] = Dict[str, NodeType]
TupleMember.__annotations__['type'] = NodeType
TupleNode.__annotations__['additionalItems'] = Union[bool, NodeType]
AndType.__annotations__['and_types'] = List[NodeType]
OrType.__annotations__['or_types'] = List[NodeType]
RecordType.__annotations__['keyType'] = NodeType
RecordType.__annotations__['valueType'] = NodeType
FunctionTypeParameters.__annotations__['type'] = NodeType
FunctionTypeParameters.__annotations__['default'] = Optional[NodeType]
FunctionType.__annotations__['returnType'] = Optional[NodeType]
ParamTypeNode.__annotations__['constraints'] = Optional[NodeType]
ParamTypeNode.__annotations__['default'] = Optional[NodeType]
