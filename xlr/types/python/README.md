# XLR (eXtended Language Representation) Module

This module provides Python implementations of TypeScript-like type definitions and utilities for working with them.

## Components

### nodes.py
Contains Python class definitions that mirror TypeScript interfaces, including:
- Primitive types (string, number, boolean, etc.)
- Complex types (object, array, tuple, etc.) 
- Union and intersection types
- Reference types
- Function types
- And many more...

### deserializer.py
Provides deserialization functionality to convert JSON strings back into XLR node objects using Python's built-in `json` library with custom `object_hook` logic.

## Usage

### Basic Deserialization

```python
from xlr.deserializer import deserialize_xlr_node

# Simple type
json_str = '{"type": "string", "name": "MyString"}'
node = deserialize_xlr_node(json_str)
print(type(node).__name__)  # StringType
print(node.name)            # MyString
```

### Complex Types

```python
# Object with properties
json_str = '''
{
    "type": "object",
    "name": "User", 
    "properties": {
        "name": {
            "required": true,
            "node": {"type": "string"}
        },
        "age": {
            "required": false,
            "node": {"type": "number"}
        }
    }
}
'''
user_node = deserialize_xlr_node(json_str)
print(user_node.name)  # User
print(len(user_node.properties))  # 2
```

### Arrays and Collections

```python
# Array of strings
json_str = '''
{
    "type": "array",
    "element_type": {"type": "string"},
    "name": "StringArray"
}
'''
array_node = deserialize_xlr_node(json_str)
print(array_node.element_type.type)  # string
```

### Union Types

```python
# String or Number union
json_str = '''
{
    "type": "or",
    "or": [
        {"type": "string"},
        {"type": "number"}
    ],
    "name": "StringOrNumber"
}
'''
union_node = deserialize_xlr_node(json_str)
print(len(union_node.or_types))  # 2
```

## Supported Node Types

The deserializer supports all XLR node types defined in `nodes.py`:

- **Primitive Types**: `any`, `unknown`, `undefined`, `null`, `void`, `string`, `number`, `boolean`, `never`
- **Complex Types**: `object`, `array`, `tuple`, `record`, `function`, `conditional`
- **Composite Types**: `and` (intersection), `or` (union) 
- **Reference Types**: `ref`
- **Template Types**: `template` (template literals)

## Class Generation

### generator.py
Provides functionality to generate Python classes from XLR `NamedType[ObjectType]` nodes using Python's built-in `ast` library.

#### Features:
- **Top-level classes**: Extend `Asset` class from `lang.core`
- **Nested classes**: Extend `Serializable` class from `lang.utils.serialize`
- **Type mapping**: Converts XLR types to proper Python type annotations
- **Union types**: Supports `OrType` nodes as `Union[Type1, Type2, ...]`
- **Asset references**: Handles `RefType` nodes pointing to Assets with `_withSlot()`
- **Array support**: Proper handling of arrays including arrays of Assets
- **Fluent API**: Generates `with*` setter methods for fluent/builder pattern usage
- **Array methods**: Generates both set (`with*`) and append (`add*`) methods for arrays
- **Automatic nesting**: Handles nested ObjectTypes as separate classes
- **AST-based**: Uses Python's AST library for clean, proper code generation

#### Usage:

```python
from xlr.generator import generate_python_classes
from xlr.nodes import (
    NamedType, ObjectType, ObjectProperty, StringType, NumberType,
    OrType, RefType, ArrayType
)

# Create XLR schema with advanced types
user_properties = {
    "id": ObjectProperty(required=True, node=NumberType()),
    "name": ObjectProperty(required=True, node=StringType()),
    "email": ObjectProperty(required=False, node=StringType()),
    # Union type (string or number)
    "value": ObjectProperty(required=False, node=OrType(or_types=[StringType(), NumberType()])),
    # Asset reference (uses _withSlot)
    "template": ObjectProperty(required=True, node=RefType(ref="TemplateAsset")),
    # Array of Asset references
    "components": ObjectProperty(required=False, node=ArrayType(elementType=RefType(ref="ComponentAsset")))
}
user_object = ObjectType(properties=user_properties)
named_user = NamedType(base_node=user_object, name="User", source="user.ts")

# Generate Python class
output_file = generate_python_classes(named_user, output_dir="./generated")
print(f"Generated: {output_file}")
```

#### Generated Class Structure:

```python
from typing import Optional, List, Any, Union
from lang.core import Asset
from lang.utils.serialize import Serializable

class User(Asset):
    id: int
    name: str
    email: Optional[str]
    value: Optional[Union[str, int]]  # Union type from OrType
    template: TemplateAsset           # Asset reference
    components: Optional[List[ComponentAsset]]  # Array of Assets
    
    def __init__(self, type_name: str, id: str, user_id: int, name: str, 
                 email: Optional[str], value: Optional[Union[str, int]],
                 template: TemplateAsset, components: Optional[List[ComponentAsset]]) -> None:
        super().__init__(type_name, id)
        self.user_id = user_id
        self.name = name
        self.email = email
        self.value = value
        # Asset references use _withSlot for proper wrapping
        self._withSlot('template', template, True, False)
        self._withSlot('components', components, True, True)
    
    # Generated with* methods for fluent API
    def withUserId(self, value: int) -> 'User':
        self.user_id = value
        return self
        
    def withName(self, value: str) -> 'User':
        self.name = value
        return self
        
    def withValue(self, value: Union[str, int]) -> 'User':
        self.value = value
        return self
        
    def withTemplate(self, value: TemplateAsset) -> 'User':
        self._withSlot('template', value, True, False)
        return self
        
    def withComponents(self, values: List[ComponentAsset]) -> 'User':
        self._withSlot('components', values, True, True)
        return self
        
    def addComponents(self, value: ComponentAsset) -> 'User':
        if self.components is None:
            self.components = []
        self.components.append(value)
        return self
```

#### Fluent API Usage:

```python
# Using the generated with* methods for fluent/builder pattern
user = User("User", "user-123") \
    .withName("John Doe") \
    .withUserId(42) \
    .withValue("hello") \
    .withTemplate(my_template) \
    .withComponents([component1, component2]) \
    .addComponents(component3)

# Equivalent to:
user = User("User", "user-123")
user.name = "John Doe"  
user.user_id = 42
user.value = "hello"
user._withSlot('template', my_template, True, False)
user._withSlot('components', [component1, component2], True, True)
if user.components is None:
    user.components = []
user.components.append(component3)
```

## Error Handling

The deserializer will raise appropriate exceptions for:
- Malformed JSON (`json.JSONDecodeError`)
- Unknown node types (`ValueError`)
- Invalid node structure (`ValueError`)

The generator will raise appropriate exceptions for:
- Invalid input types (`ValueError`)
- File system errors (`IOError`)

