"""
Deserialization utilities for XLR nodes.
Converts JSON strings back into proper XLR node objects.
"""

import json
from typing import Any, Dict, Union
from .nodes import (

    # Simple types
    AnyType, UnknownType, UndefinedType, NullType, VoidType, StringType,
    NumberType, BooleanType, NeverType, TemplateLiteralType,

    # Complex types
    RefType, ObjectType, ArrayType, TupleType, AndType, OrType,
    RecordType, FunctionType, ConditionalType,

    # Helper classes
    ObjectProperty, TupleMember, FunctionTypeParameters, ParamTypeNode,
    NamedType, NamedTypeWithGenerics,

    # Type unions
    NodeType
)


def deserialize_xlr_node(json_string: str) -> NodeType:
    """
    Deserialize a JSON string into an XLR node object.
    
    Uses Python's built-in json library with the loads function and object_hook
    parameter to pass in custom deserialization logic.
    
    Args:
        json_string: JSON string representation of an XLR node
        
    Returns:
        The deserialized XLR node object
        
    Raises:
        ValueError: If the JSON cannot be deserialized or contains invalid node types
        json.JSONDecodeError: If the JSON string is malformed
    """
    return json.loads(json_string, object_hook=_deserialize_object_hook)


def _deserialize_object_hook(obj: Dict[str, Any]) -> Any:
    """
    Object hook function for JSON deserialization.
    
    This function is called for every JSON object during deserialization
    and converts dictionaries with type information into appropriate XLR node objects.
    
    Args:
        obj: Dictionary from JSON parsing
        
    Returns:
        Either the original dict or a deserialized XLR node object
    """
    # Handle special helper classes first (they don't have a "type" field)
    if _is_named_type(obj):
        return _deserialize_named_type(obj)
    elif _is_object_property(obj):
        return _deserialize_object_property(obj)
    elif _is_function_type_parameter(obj):
        return _deserialize_function_type_parameter(obj)
    elif _is_param_type_node(obj):
        return _deserialize_param_type_node(obj)

    # Handle main node types based on "type" field
    node_type = obj.get("type")
    if not node_type or not isinstance(node_type, str):
        return obj  # Not an XLR node, return as-is

    try:
        return _deserialize_by_type(node_type, obj)
    except Exception as e:
        raise ValueError(f"Failed to deserialize node of type '{node_type}': {e}") from e


def _deserialize_by_type(node_type: str, obj: Dict[str, Any]) -> NodeType:
    """Deserialize based on the node type."""
    type_map = {
        "any": _deserialize_any_type,
        "unknown": _deserialize_unknown_type,
        "undefined": _deserialize_undefined_type,
        "null": _deserialize_null_type,
        "void": _deserialize_void_type,
        "string": _deserialize_string_type,
        "number": _deserialize_number_type,
        "boolean": _deserialize_boolean_type,
        "never": _deserialize_never_type,
        "ref": _deserialize_ref_type,
        "object": _deserialize_object_type,
        "array": _deserialize_array_type,
        "tuple": _deserialize_tuple_type,
        "and": _deserialize_and_type,
        "or": _deserialize_or_type,
        "template": _deserialize_template_literal_type,
        "record": _deserialize_record_type,
        "function": _deserialize_function_type,
        "conditional": _deserialize_conditional_type,
    }

    deserializer = type_map.get(node_type)
    if not deserializer:
        raise ValueError(f"Unknown node type: {node_type}")

    return deserializer(obj)


# Simple type deserializers
def _deserialize_any_type(obj: Dict[str, Any]) -> AnyType:
    return AnyType(**_extract_common_props(obj))

def _deserialize_unknown_type(obj: Dict[str, Any]) -> UnknownType:
    return UnknownType(**_extract_common_props(obj))

def _deserialize_undefined_type(obj: Dict[str, Any]) -> UndefinedType:
    return UndefinedType(**_extract_common_props(obj))

def _deserialize_null_type(obj: Dict[str, Any]) -> NullType:
    return NullType(**_extract_common_props(obj))

def _deserialize_void_type(obj: Dict[str, Any]) -> VoidType:
    return VoidType(**_extract_common_props(obj))

def _deserialize_string_type(obj: Dict[str, Any]) -> StringType:
    return StringType(**_extract_common_props(obj))

def _deserialize_number_type(obj: Dict[str, Any]) -> NumberType:
    return NumberType(**_extract_common_props(obj))

def _deserialize_boolean_type(obj: Dict[str, Any]) -> BooleanType:
    return BooleanType(**_extract_common_props(obj))

def _deserialize_never_type(obj: Dict[str, Any]) -> NeverType:
    return NeverType(**_extract_common_props(obj))


# Complex type deserializers
def _deserialize_ref_type(obj: Dict[str, Any]) -> RefType:
    kwargs = _extract_annotation_props(obj)
    kwargs['ref'] = obj['ref']
    if 'genericArguments' in obj:
        kwargs['genericArguments'] = obj['genericArguments']
    if 'property' in obj:
        kwargs['property'] = obj['property']
    return RefType(**kwargs)

def _deserialize_object_type(obj: Dict[str, Any]) -> ObjectType:
    kwargs = _extract_common_props(obj)
    kwargs['properties'] = obj.get('properties', {})
    if 'extends' in obj:
        kwargs['extends'] = obj['extends']
    if 'additionalProperties' in obj:
        kwargs['additionalProperties'] = obj['additionalProperties']
    return ObjectType(**kwargs)

def _deserialize_array_type(obj: Dict[str, Any]) -> ArrayType:
    kwargs = _extract_common_props(obj)
    kwargs['elementType'] = obj['elementType']
    return ArrayType(**kwargs)

def _deserialize_tuple_type(obj: Dict[str, Any]) -> TupleType:
    kwargs = _extract_common_props(obj)
    kwargs['elementTypes'] = obj['elementTypes']
    kwargs['minItems'] = obj['minItems']
    if 'additionalItems' in obj:
        kwargs['additionalItems'] = obj['additionalItems']
    return TupleType(**kwargs)

def _deserialize_and_type(obj: Dict[str, Any]) -> AndType:
    kwargs = _extract_annotation_props(obj)
    kwargs['and_types'] = obj.get('and', obj.get('and_types', []))
    return AndType(**kwargs)

def _deserialize_or_type(obj: Dict[str, Any]) -> OrType:
    kwargs = _extract_annotation_props(obj)
    kwargs['or_types'] = obj.get('or', obj.get('or_types', []))
    return OrType(**kwargs)

def _deserialize_template_literal_type(obj: Dict[str, Any]) -> TemplateLiteralType:
    kwargs = _extract_annotation_props(obj)
    kwargs['format'] = obj['format']
    return TemplateLiteralType(**kwargs)

def _deserialize_record_type(obj: Dict[str, Any]) -> RecordType:
    kwargs = _extract_annotation_props(obj)
    kwargs['keyType'] = obj['keyType']
    kwargs['valueType'] = obj['valueType']
    return RecordType(**kwargs)

def _deserialize_function_type(obj: Dict[str, Any]) -> FunctionType:
    kwargs = _extract_annotation_props(obj)
    kwargs['parameters'] = obj.get('parameters', [])
    if 'returnType' in obj:
        kwargs['returnType'] = obj['returnType']
    return FunctionType(**kwargs)

def _deserialize_conditional_type(obj: Dict[str, Any]) -> ConditionalType:
    kwargs = _extract_annotation_props(obj)
    kwargs['check'] = obj['check']
    kwargs['value'] = obj['value']
    return ConditionalType(**kwargs)


# Helper class deserializers
def _deserialize_object_property(obj: Dict[str, Any]) -> ObjectProperty:
    return ObjectProperty(
        required=obj['required'],
        node=obj['node']
    )

def _deserialize_tuple_member(obj: Dict[str, Any]) -> TupleMember:
    kwargs = {'type': obj['type']}
    if 'name' in obj:
        kwargs['name'] = obj['name']
    if 'optional' in obj:
        kwargs['optional'] = obj['optional']
    return TupleMember(**kwargs)

def _deserialize_function_type_parameter(obj: Dict[str, Any]) -> FunctionTypeParameters:
    kwargs = {
        'name': obj['name'],
        'type': obj['type']
    }
    if 'optional' in obj:
        kwargs['optional'] = obj['optional']
    if 'default' in obj:
        kwargs['default'] = obj['default']
    return FunctionTypeParameters(**kwargs)

def _deserialize_param_type_node(obj: Dict[str, Any]) -> ParamTypeNode:
    kwargs = {'symbol': obj['symbol']}
    if 'constraints' in obj:
        kwargs['constraints'] = obj['constraints']
    if 'default' in obj:
        kwargs['default'] = obj['default']
    return ParamTypeNode(**kwargs)

def _deserialize_named_type(obj: Dict[str, Any]) -> Union[NamedType, NamedTypeWithGenerics]:
    # Extract the base node data (everything except name, source, and genericTokens)
    base_obj = {
        k: v for k,
        v in obj.items() if k not in ['name', 'typeName', 'source', 'genericTokens']
    }

    # Extract annotation properties for the NamedType wrapper
    annotation_kwargs = _extract_annotation_props(obj)
    name = obj.get('name', obj.get('typeName', annotation_kwargs.get('name', "")))
    if 'name' in annotation_kwargs:
        del annotation_kwargs['name']

    source = obj['source']

    # Deserialize the base node using the object hook recursively
    # We need to be careful not to create infinite recursion
    base_node = _deserialize_object_hook(base_obj)

    if 'genericTokens' in obj:
        return NamedTypeWithGenerics(
            base_node,
            name,
            source,
            obj['genericTokens'],
            **annotation_kwargs
        )
    else:
        return NamedType(base_node, name, source, **annotation_kwargs)


# Helper functions for identifying object types
def _is_object_property(obj: Dict[str, Any]) -> bool:
    return 'required' in obj and 'node' in obj and 'type' not in obj

def _is_tuple_member(obj: Dict[str, Any]) -> bool:
    return 'type' in obj and \
        ('name' in obj or 'optional' in obj) and \
        not isinstance(obj.get('type'), str)

def _is_function_type_parameter(obj: Dict[str, Any]) -> bool:
    return 'name' in obj and 'type' in obj and \
        ('optional' in obj or 'default' in obj) and \
        not isinstance(obj.get('type'), str)

def _is_param_type_node(obj: Dict[str, Any]) -> bool:
    return 'symbol' in obj and ('constraints' in obj or 'default' in obj)

def _is_named_type(obj: Dict[str, Any]) -> bool:
    return 'name' in obj and 'source' in obj


# Property extraction helpers
def _extract_annotation_props(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Extract annotation properties from object."""
    annotation_keys = [
        'name',
        'title',
        'description',
        'examples',
        'default',
        'see',
        'comment',
        'meta'
    ]
    return {k: v for k, v in obj.items() if k in annotation_keys}

def _extract_common_props(obj: Dict[str, Any]) -> Dict[str, Any]:
    """Extract common properties (annotations + const + enum) from object."""
    props = _extract_annotation_props(obj)
    if 'const' in obj:
        props['const'] = obj['const']
    if 'enum' in obj:
        props['enum'] = obj['enum']
    return props
