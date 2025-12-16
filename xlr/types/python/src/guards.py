"""
Type Guard Functions that provide type narrowing capabilities for TypeScript-like type checking
"""

from typing import TypeGuard, Any, Union
from .nodes import (
    AndType,
    AnyType,
    ArrayNode,
    ArrayType,
    BooleanType,
    ConditionalNode,
    ConditionalType,
    FunctionType,
    NamedType,
    NamedTypeWithGenerics,
    NeverType,
    NodeType,
    NullType,
    NumberType,
    ObjectNode,
    ObjectType,
    OrType,
    PrimitiveTypes,
    RecordType,
    RefNode,
    RefType,
    StringType,
    TemplateLiteralType,
    TupleNode,
    TupleType,
    TypeNode,
    UndefinedType,
    UnknownType,
    VoidType
)


def is_any_type(obj: Any) -> TypeGuard[AnyType]:
    """Type guard for AnyType nodes."""
    return isinstance(obj, AnyType)

def is_unknown_type(obj: Any) -> TypeGuard[UnknownType]:
    """Type guard for UnknownType nodes."""
    return isinstance(obj, UnknownType)

def is_undefined_type(obj: Any) -> TypeGuard[UndefinedType]:
    """Type guard for UndefinedType nodes."""
    return isinstance(obj, UndefinedType)

def is_null_type(obj: Any) -> TypeGuard[NullType]:
    """Type guard for NullType nodes."""
    return isinstance(obj, NullType)

def is_void_type(obj: Any) -> TypeGuard[VoidType]:
    """Type guard for VoidType nodes."""
    return isinstance(obj, VoidType)

def is_string_type(obj: Any) -> TypeGuard[StringType]:
    """Type guard for StringType nodes."""
    return isinstance(obj, StringType)

def is_number_type(obj: Any) -> TypeGuard[NumberType]:
    """Type guard for NumberType nodes."""
    return isinstance(obj, NumberType)

def is_boolean_type(obj: Any) -> TypeGuard[BooleanType]:
    """Type guard for BooleanType nodes."""
    return isinstance(obj, BooleanType)

def is_never_type(obj: Any) -> TypeGuard[NeverType]:
    """Type guard for NeverType nodes."""
    return isinstance(obj, NeverType)

def is_ref_node(obj: Any) -> TypeGuard[RefNode]:
    """Type guard for RefNode nodes."""
    return isinstance(obj, RefNode)

def is_ref_type(obj: Any) -> TypeGuard[RefType]:
    """Type guard for RefType nodes."""
    return isinstance(obj, RefType)

def is_object_node(obj: Any) -> TypeGuard[ObjectNode]:
    """Type guard for ObjectNode nodes."""
    return isinstance(obj, ObjectNode)

def is_object_type(obj: Any) -> TypeGuard[ObjectType]:
    """Type guard for ObjectType nodes."""
    return isinstance(obj, ObjectType) or (is_named_type(obj) and is_object_type(obj.base_node))

def is_array_node(obj: Any) -> TypeGuard[ArrayNode]:
    """Type guard for ArrayNode nodes."""
    return isinstance(obj, ArrayNode)

def is_array_type(obj: Any) -> TypeGuard[ArrayType]:
    """Type guard for ArrayType nodes."""
    return isinstance(obj, ArrayType) or (is_named_type(obj) and is_array_type(obj.base_node))

def is_conditional_node(obj: Any) -> TypeGuard[ConditionalNode]:
    """Type guard for ConditionalNode nodes."""
    return isinstance(obj, ConditionalNode)

def is_conditional_type(obj: Any) -> TypeGuard[ConditionalType]:
    """Type guard for ConditionalType nodes."""
    return isinstance(obj, ConditionalType)

def is_tuple_node(obj: Any) -> TypeGuard[TupleNode]:
    """Type guard for TupleNode nodes."""
    return isinstance(obj, TupleNode)

def is_tuple_type(obj: Any) -> TypeGuard[TupleType]:
    """Type guard for TupleType nodes."""
    return isinstance(obj, TupleType)

def is_and_type(obj: Any) -> TypeGuard[AndType]:
    """Type guard for AndType (intersection) nodes."""
    return isinstance(obj, AndType)

def is_or_type(obj: Any) -> TypeGuard[OrType]:
    """Type guard for OrType (union) nodes."""
    return isinstance(obj, OrType) or (is_named_type(obj) and is_or_type(obj.base_node))

def is_template_literal_type(obj: Any) -> TypeGuard[TemplateLiteralType]:
    """Type guard for TemplateLiteralType nodes."""
    return isinstance(obj, TemplateLiteralType)

def is_record_type(obj: Any) -> TypeGuard[RecordType]:
    """Type guard for RecordType nodes."""
    return isinstance(obj, RecordType)

def is_function_type(obj: Any) -> TypeGuard[FunctionType]:
    """Type guard for FunctionType nodes."""
    return isinstance(obj, FunctionType)

def is_type_node(obj: Any) -> TypeGuard[TypeNode]:
    """Type guard for any TypeNode (base class)."""
    return isinstance(obj, TypeNode)

def is_node_type(obj: Any) -> TypeGuard[NodeType]:
    """Type guard for any NodeType union member."""
    return (is_any_type(obj) or is_unknown_type(obj) or is_undefined_type(obj) or
            is_null_type(obj) or is_never_type(obj) or is_string_type(obj) or
            is_template_literal_type(obj) or is_number_type(obj) or is_boolean_type(obj) or
            is_object_type(obj) or is_array_type(obj) or is_tuple_type(obj) or
            is_record_type(obj) or is_and_type(obj) or is_or_type(obj) or
            is_ref_type(obj) or is_function_type(obj) or is_conditional_type(obj) or
            is_void_type(obj))

def is_named_type(obj: Any) -> TypeGuard[NamedType]:
    """ Type guard for NamedType nodes."""
    return isinstance(obj, NamedType) or isinstance(obj, NamedTypeWithGenerics)

def is_named_type_with_generics(obj:Any) -> TypeGuard[NamedTypeWithGenerics]:
    """ Type guard for NamedTypeWithGeneric nodes."""
    return isinstance(obj, NamedTypeWithGenerics)

def is_primitive_type(obj:Any) -> TypeGuard[PrimitiveTypes]:
    """ Type guard for Primitive nodes."""
    return is_never_type(obj) or \
        is_null_type(obj) or \
        is_string_type(obj) or \
        is_number_type(obj) or \
        is_boolean_type(obj) or \
        is_any_type(obj) or \
        is_unknown_type(obj) or \
        is_undefined_type(obj) or \
        is_void_type(obj)

def is_primitive_const(obj:Any) -> TypeGuard[Union[StringType, NumberType, BooleanType]]:
    """ Type guard for Primitive nodes with const values."""
    return is_primitive_type(obj) and obj.const is not None
