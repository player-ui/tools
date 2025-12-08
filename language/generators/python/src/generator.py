"""
XLR to Python Class Generator

Converts XLR NamedType[ObjectType] nodes into Python classes using AST generation.
Top-level ObjectTypes become Asset classes, nested ObjectTypes become Serializable classes.
"""

import ast
from typing import Any, List, Dict, Literal, Optional, Union
from pathlib import Path
from copy import deepcopy

from player_tools_xlr_types.nodes import (
    AndType,
    NamedType,
    ObjectProperty,
    ObjectType,
    NodeType,
    OrType,
    RefType
)

from player_tools_xlr_types.guards import (
    is_and_type,
    is_any_type,
    is_named_type_with_generics,
    is_null_type,
    is_object_type,
    is_array_type,
    is_primitive_const,
    is_record_type,
    is_string_type,
    is_number_type,
    is_boolean_type,
    is_named_type,
    is_or_type,
    is_ref_type,
    is_undefined_type,
    is_unknown_type
)

from .utils import (
    COMMON_AST_NODES,
    PropertyInfo,
    PLAYER_DSL_PACKAGE,
    clean_property_name,
    generate_class_name,
    ast_to_source
)

def generate_python_classes(
        named_object_type: NamedType[ObjectType],
        type: Literal['asset', 'view'],
        output_dir: str = "."
    ) -> str:
    """
    Generate Python classes from a NamedType[ObjectType] and write to file.
    
    Args:
        named_object_type: NamedType wrapping an ObjectType
        output_dir: Directory to write the generated file
        
    Returns:
        Path to the generated file
        
    Raises:
        ValueError: If input is not a NamedType[ObjectType]
    """
    if not is_named_type(named_object_type) or not is_object_type(named_object_type.base_node):
        raise ValueError("Input must be a NamedType[ObjectType]")

    generator = ClassGenerator(named_object_type, output_dir, type)
    return generator.generate()


class ClassGenerator:
    """Generates Python classes from XLR ObjectType nodes."""

    def __init__(
            self,
            named_object_type: NamedType[ObjectType],
            output_dir: str,
            type: Literal['asset', 'view']
        ):

        self.type = type.title()
        self.named_object_type = named_object_type
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        self.classes_to_generate: Dict[str, Any] = dict()
        self.classes: List[str] = [named_object_type.name]
        self.generic_tokens = dict(
            (obj.symbol, obj) for obj in named_object_type.genericTokens) \
                if is_named_type_with_generics(named_object_type) \
                else dict()

        # Collect all nested ObjectTypes that need separate classes
        self._collect_nested_objects(named_object_type, '')

    def _get_properties_info(self, object_type: ObjectType) -> List[PropertyInfo]:
        """Pre-process property information to avoid repeated work."""

        properties_info = []
        for original_name, prop_obj in object_type.properties.items():
            #Handle expansion of
            node = prop_obj.node

            if is_ref_type(prop_obj.node) and self.generic_tokens.get(prop_obj.node.ref, None):
                node = deepcopy(prop_obj.node)
                node: NodeType = self.generic_tokens[prop_obj.node.ref].default # type: ignore
                node.title = prop_obj.node.title
                node.description = prop_obj.node.description

            clean_name = clean_property_name(original_name)
            python_type = self._convert_xlr_to_ast(node, clean_name)
            type = self._make_optional_type(python_type) if not prop_obj.required else python_type

            properties_info.append(PropertyInfo(
                clean_name=clean_name,
                original_name=original_name,
                node=node,
                required=prop_obj.required,
                type=type
            ))

        return properties_info

    def _make_optional_type(self, python_type: ast.expr) -> ast.expr:
        """Create Optional[T] type annotation."""
        return ast.Subscript(
            value=COMMON_AST_NODES['Optional'],
            slice=python_type,
            ctx=ast.Load()
        )

    def generate(self) -> str:
        """Generate all classes and write to file."""
        # Create AST module
        module = ast.Module(body=[], type_ignores=[])

        # Add imports
        self._add_imports(module)
        base_length = len(module.body)

        # Generate main class (extends Asset)
        main_class = self._generate_main_class()
        # Generate nested classes (extend Slotable)
        for class_name in self.classes:
            object_type = self.classes_to_generate.get(class_name, None)
            if object_type is not None :
                nested_class = self._generate_nested_class(class_name, object_type)
                module.body.insert(base_length,nested_class)

        #Add main class at the end to avoid forward imports
        module.body.append(main_class)

        # Convert AST to source code
        source_code = ast_to_source(module)

        # Write to file
        filename = f"{self.named_object_type.name}.py"
        file_path = self.output_dir / filename

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(source_code)

        return str(file_path)

    def _collect_nested_objects(
            self, node: Union[NodeType, NamedType],
            parent_prop: Optional[str]
        ) -> None:
        """Recursively collect all nested ObjectTypes that need separate classes."""
        if is_object_type(node):
            self._collect_from_object_type(node, parent_prop if parent_prop else "ERRORERRORERROR")
        elif is_array_type(node):
            self._collect_nested_objects(node.elementType, parent_prop)
        elif is_or_type(node):
            for element in node._or: #pylint: disable=protected-access
                self._collect_nested_objects(element, parent_prop)
        elif is_and_type(node):
            for element in node._and: #pylint: disable=protected-access
                self._collect_nested_objects(element,parent_prop)

    def _collect_from_object_type(self, node: ObjectType, parent_prop: str) -> None:
        """Helper method to collect nested objects from ObjectType nodes."""

        # Handle generics by using default
        if is_named_type_with_generics(node):
            for generic_token in node.genericTokens:
                token = generic_token.default
                symbol = generic_token.symbol
                if (not is_ref_type(token) and is_object_type(token) and
                    symbol not in self.classes_to_generate):
                    self._collect_nested_objects(token, parent_prop)

        # Handle named types
        if is_named_type(node):
            class_name = node.name
            if class_name not in self.classes:
                self.classes.append(class_name)
                self.classes_to_generate[class_name] = node
        else:
            class_name = (
                generate_class_name(node.title.split(".")[-1]) \
                    if node.title
                    else parent_prop
                ).title()
            if class_name not in self.classes:
                self.classes.append(class_name)
                self.classes_to_generate[class_name] = node

        # Process properties
        for prop_name, prop_obj in node.properties.items():
            prop_node = prop_obj.node
            self._collect_nested_objects(prop_node, prop_name)

    def _create_super_call(self, is_asset: bool) -> ast.Expr:
        """Create super().__init__() call for both Asset and Serializable classes."""
        if is_asset:
            args: List[ast.expr] = [
                ast.Name(id='id', ctx=ast.Load()), ast.Name(id='self.type', ctx=ast.Load())
                ]
        else:
            args = []

        return ast.Expr(
            value=ast.Call(
                func=ast.Attribute(
                    value=ast.Call(
                        func=COMMON_AST_NODES['super'],
                        args=[],
                        keywords=[]
                    ),
                    attr='__init__',
                    ctx=ast.Load()
                ),
                args=args,
                keywords=[]
            )
        )

    def _add_imports(self, module: ast.Module) -> None:
        """Add any potential necessary import statements."""
        imports = [
            # from typing import Optional, List, Any, Union
            ast.ImportFrom(
                module='typing',
                names=[
                    ast.alias(name='Optional', asname=None),
                    ast.alias(name='List', asname=None),
                    ast.alias(name='Any', asname=None),
                    ast.alias(name='Union', asname=None),
                    ast.alias(name='Dict', asname=None),
                    ast.alias(name='Literal', asname=None)
                ],
                level=0
            ),
            ast.ImportFrom(
                module= f'{PLAYER_DSL_PACKAGE}.view',
                names=[
                    ast.alias(name='Asset', asname=None),
                    ast.alias(name='Slotable', asname=None)
                ],
                level=0
            ),
        ]

        if self.type == "View":
            imports.append(
            ast.ImportFrom(
                module=f'{PLAYER_DSL_PACKAGE}.view',
                names=[ast.alias(name='View', asname=None)],
                level=0
            ))

        module.body.extend(imports)

    def _generate_main_class(self) -> ast.ClassDef:
        """Generate the main class that extends Asset"""
        class_name = self.named_object_type.name
        object_type = self.named_object_type.base_node

        #Only extend from View if there is no validation prop
        extends_name = "Asset" if any(key == "validation" for key in object_type.properties.keys())\
            else self.type

        # Create class definition
        class_def = ast.ClassDef(
            name=class_name,
            bases=[ast.Name(id=extends_name, ctx=ast.Load())],
            keywords=[],
            decorator_list=[],
            body=[],
            lineno=1,
            col_offset=0
        )

        # Handle the type override
        if object_type.extends :
            extended_node = object_type.extends
            if is_ref_type(extended_node) and \
                extended_node.ref.startswith("Asset") and \
                extended_node.genericArguments and \
                len(extended_node.genericArguments) == 1:

                asset_arg = extended_node.genericArguments[0]
                if(asset_arg and is_string_type(asset_arg) and asset_arg.const):
                    type_prop = ast.AnnAssign(
                        target=ast.Name(id="type", ctx=ast.Store()),
                        annotation=ast.Name(id="str", ctx=ast.Load()),
                        value=ast.Constant(value=asset_arg.const),
                        simple=1
                    )
                    class_def.body.append(type_prop)

        # Add constant ID property
        type_prop = ast.AnnAssign(
            target=ast.Name(id="id", ctx=ast.Store()),
            annotation=ast.Name(id="str", ctx=ast.Load()),
            value=None,
            simple=1
        )
        class_def.body.append(type_prop)

        # Add type annotations for properties
        self._add_property_annotations(class_def, object_type)

        # Add __init__ method
        init_method = self._generate_init_method(object_type, is_asset=True)
        class_def.body.append(init_method)

        # Add with* methods (getters/setters)
        with_methods = self._generate_with_methods(object_type)
        class_def.body.extend(with_methods)

        return class_def

    def _generate_nested_class(self, class_name: str, object_type: ObjectType) -> ast.ClassDef:
        """Generate a nested class that extends Serializable."""
        # Create class definition
        class_def = ast.ClassDef(
            name=class_name,
            bases=[ast.Name(id='Slotable', ctx=ast.Load())],
            keywords=[],
            decorator_list=[],
            body=[],
            lineno=1,
            col_offset=0
        )

        # Add type annotations for properties
        self._add_property_annotations(class_def, object_type)

        # Add __init__ method
        init_method = self._generate_init_method(object_type, is_asset=False)
        class_def.body.append(init_method)

        # Add with* methods (getters/setters)
        with_methods = self._generate_with_methods(object_type)
        class_def.body.extend(with_methods)
        return class_def

    def _add_property_annotations(self, class_def: ast.ClassDef, object_type: ObjectType) -> None:
        """Add type annotations for all properties using cached property info."""

        properties_info = self._get_properties_info(object_type)
        new_names: list[ast.expr] = []
        original_names: list[ast.expr] = []
        for prop_info in properties_info:
            value = None
            annotation = prop_info.type
            if is_primitive_const(prop_info.node):
                value = ast.Constant(value=prop_info.node.const) # type: ignore
                annotation = COMMON_AST_NODES[prop_info.node.type] # type: ignore
            if prop_info.clean_name != prop_info.original_name:
                new_names.append(ast.Constant(value=prop_info.clean_name))
                original_names.append(ast.Constant(value=prop_info.original_name))

            annotation = ast.AnnAssign(
                target=ast.Name(id=prop_info.clean_name, ctx=ast.Store()),
                annotation=annotation,
                value=value,
                simple=1
            )
            class_def.body.append(annotation)

        if new_names:
            map_arg = ast.Assign(
                targets=[ast.Name(id="_propMap", ctx=ast.Store())],
                value=ast.Dict(keys=list(new_names), values=list(original_names))
            )
            class_def.body.append(map_arg)

    def _generate_init_method(self, object_type: ObjectType, is_asset: bool) -> ast.FunctionDef:
        """Generate __init__ method for the class using cached property info."""
        properties_info = self._get_properties_info(object_type)
        properties_info.sort(key=lambda x: x.required, reverse=True)

        # Build arguments list
        required_args, optional_args= [ast.arg(arg='self', annotation=None)], []
        defaults: List[Any] = [None]

        # Add ID parameter for Asset classes
        if is_asset:
            optional_args.append(ast.arg(arg='id', annotation=ast.Subscript(
            value=COMMON_AST_NODES['Optional'],
            slice=COMMON_AST_NODES['string'],
            ctx=ast.Load()
        )))

        # Add parameters for each property
        for prop_info in properties_info:
            if is_primitive_const(prop_info.node):
                continue
            if prop_info.required:
                required_args.append(ast.arg(arg=prop_info.clean_name, annotation=prop_info.type))
                defaults.append(None)
            else:
                optional_args.append(ast.arg(arg=prop_info.clean_name, annotation=prop_info.type))
                defaults.append(COMMON_AST_NODES['None'])

        # Add default for ID
        defaults.insert(len(required_args), COMMON_AST_NODES['None'])

        # Create function definition
        init_def = ast.FunctionDef(
            name='__init__',
            args=ast.arguments(
                posonlyargs=[],
                args=required_args + optional_args,
                vararg=None,
                kwonlyargs=[],
                kw_defaults=[],
                kwarg=None,
                defaults=defaults
            ),
            body=[],
            decorator_list=[]
        )

        # Add super().__init__() call
        init_def.body.append(self._create_super_call(is_asset))

        # Add property assignments
        for prop_info in properties_info:
            if is_primitive_const(prop_info.node):
                continue
            assignment = ast.Assign(
                targets=[
                    ast.Attribute(
                        value=COMMON_AST_NODES['self'],
                        attr=prop_info.clean_name,
                        ctx=ast.Store()
                    )
                ],
                value=ast.Name(id=prop_info.clean_name, ctx=ast.Load())
            )
            init_def.body.append(assignment)

        return init_def

    def _generate_with_methods(self, object_type: ObjectType) -> list[ast.FunctionDef]:
        """Generate with* methods (getters/setters) for each property"""
        methods = []
        properties_info = self._get_properties_info(object_type)
        for prop_info in properties_info:
            if is_primitive_const(prop_info.node):
                continue
            # Generate method name: with + PascalCase property name
            method_name = f"with{prop_info.clean_name.replace('_', '').title()}"

            # Check property type to determine method generation strategy
            if self._is_slot(prop_info.node):
                # Asset property: use _withSlot
                methods.append(self._generate_asset_with_method(method_name, prop_info))
            elif is_array_type(prop_info.node):
                # Array property: generate set and append methods
                methods.extend(self._generate_array_with_methods(method_name, prop_info))
            else:
                # Regular property: simple setter
                methods.append(self._generate_simple_with_method(method_name, prop_info))

        return methods

    def _is_slot(self, node: NodeType) -> bool:
        """Check if a property is an Asset type or array of Assets."""
        if is_ref_type(node):
            ref_name = node.ref
            return ref_name.startswith('Asset')
        elif is_array_type(node) and is_ref_type(node.elementType):
            ref_name = node.elementType.ref
            return ref_name.startswith('Asset')
        return False

    def _generate_simple_with_method(
            self,
            method_name: str,
            prop_info: PropertyInfo
        ) -> ast.FunctionDef:
        """Generate a simple with* method for regular properties."""
        method_def = ast.FunctionDef(
            name=method_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[
                    ast.arg(arg='self', annotation=None),
                    ast.arg(arg='value', annotation=prop_info.type)
                ],
                vararg=None,
                kwonlyargs=[],
                kw_defaults=[],
                kwarg=None,
                defaults=[]
            ),
            body=[
                # self.prop_name = value
                ast.Assign(
                    targets=[ast.Attribute(
                        value=COMMON_AST_NODES['self'],
                        attr=prop_info.clean_name,
                        ctx=ast.Store())
                    ],
                    value=ast.Name(id='value', ctx=ast.Load())
                ),
                # return self
                ast.Return(value=COMMON_AST_NODES['self'])
            ],
            decorator_list=[]
        )
        return method_def

    def _generate_asset_with_method(
            self,
            method_name: str,
            prop_info: PropertyInfo
        ) -> ast.FunctionDef:
        """Generate a with* method for Asset properties using _withSlot."""
        is_array_of_assets = is_array_type(prop_info.node)

        is_asset_wrapper = prop_info.node.ref.startswith("AssetWrapper") \
            if is_ref_type(prop_info.node) else False

        body = [
            ast.Expr(
                value=ast.Call(
                    func=ast.Attribute(
                        value=COMMON_AST_NODES['self'],
                        attr='_withSlot',
                        ctx=ast.Load()
                    ),
                    args=[
                        ast.Constant(value=prop_info.clean_name),
                        ast.Name(id='value', ctx=ast.Load()),
                        ast.Constant(value=is_asset_wrapper),  # wrapInAssetWrapper
                        ast.Constant(value=is_array_of_assets)  # isArray
                    ],
                    keywords=[]
                )
            ),
            ast.Return(value=COMMON_AST_NODES['self'])
        ]

        method_def = ast.FunctionDef(
            name=method_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[
                    ast.arg(arg='self', annotation=None),
                    ast.arg(arg='value', annotation=prop_info.type)
                ],
                vararg=None,
                kwonlyargs=[],
                kw_defaults=[],
                kwarg=None,
                defaults=[]
            ),
            body=body,
            decorator_list=[]
        )
        return method_def

    def _generate_array_with_methods(
            self,
            method_name: str,
            prop_info: PropertyInfo
        ) -> list[ast.FunctionDef]:
        """Generate with* methods for array properties (set and append)."""
        methods = []

        # Get element type for append method
        element_type = (self._convert_xlr_to_ast(prop_info.node.elementType,
                        f"{prop_info.clean_name}") if is_array_type(prop_info.node) \
                        else COMMON_AST_NODES['Any']
                        )

        # Method 1: Set entire array
        set_body = self._create_array_set_body(prop_info)

        set_method = ast.FunctionDef(
            name=method_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[
                    ast.arg(arg='self', annotation=None),
                    ast.arg(arg='values', annotation=prop_info.type)
                ],
                vararg=None,
                kwonlyargs=[],
                kw_defaults=[],
                kwarg=None,
                defaults=[]
            ),
            body=set_body,
            decorator_list=[]
        )
        methods.append(set_method)

        # Method 2: Append to array
        append_method_name = method_name.replace('with', 'add')
        append_body = self._create_array_append_body(prop_info)

        append_method = ast.FunctionDef(
            name=append_method_name,
            args=ast.arguments(
                posonlyargs=[],
                args=[
                    ast.arg(arg='self', annotation=None),
                    ast.arg(arg='value', annotation=element_type)
                ],
                vararg=None,
                kwonlyargs=[],
                kw_defaults=[],
                kwarg=None,
                defaults=[]
            ),
            body=append_body,
            decorator_list=[]
        )
        methods.append(append_method)

        return methods

    def _create_array_set_body(self, prop_info: PropertyInfo) -> list[ast.stmt]:
        """Create body for array setter method."""
        # Asset array: use _withSlot
        return [
            ast.Expr(
                value=ast.Call(
                    func=ast.Attribute(
                        value=COMMON_AST_NODES['self'],
                        attr='_withSlot',
                        ctx=ast.Load()
                    ),
                    args=[
                        ast.Constant(value=prop_info.clean_name),
                        ast.Name(id='values', ctx=ast.Load()),
                        ast.Constant(value=True),  # wrapInAssetWrapper
                        ast.Constant(value=True)   # isArray
                    ],
                    keywords=[]
                )
            ),
            ast.Return(value=COMMON_AST_NODES['self'])
        ]

    def _create_array_append_body(self, prop_info: PropertyInfo) -> list[ast.stmt]:
        """Create body for array append method."""
        return [
            # Initialize array if None
            ast.If(
                test=ast.Compare(
                    left=ast.Attribute(
                        value=COMMON_AST_NODES['self'],
                        attr=prop_info.clean_name,
                        ctx=ast.Load()
                    ),
                    ops=[ast.Is()],
                    comparators=[ast.Constant(value=None)]
                ),
                body=[
                    ast.Assign(
                        targets=[ast.Attribute(
                            value=COMMON_AST_NODES['self'],
                            attr=prop_info.clean_name,
                            ctx=ast.Store())
                        ],
                        value=ast.List(elts=[], ctx=ast.Load())
                    )
                ],
                orelse=[]
            ),
            # Append the value
            ast.Expr(
                value=ast.Call(
                    func=ast.Attribute(
                        value=ast.Attribute(
                            value=COMMON_AST_NODES['self'],
                            attr=prop_info.clean_name,
                            ctx=ast.Load()
                        ),
                        attr='append',
                        ctx=ast.Load()
                    ),
                    args=[ast.Name(id='value', ctx=ast.Load())],
                    keywords=[]
                )
            ),
            ast.Return(value=COMMON_AST_NODES['self'])
        ]

    def _convert_xlr_to_ast(self, node: NodeType, prop_name: str) -> ast.expr:
        """Convert XLR type to Python type annotation (internal)."""

        if is_primitive_const(node):
            return ast.Constant(value=node.const) # type: ignore
        if is_string_type(node):
            return COMMON_AST_NODES['string']
        elif is_number_type(node):
            return COMMON_AST_NODES['number']
        elif is_boolean_type(node):
            return COMMON_AST_NODES['boolean']
        elif is_null_type(node) or is_unknown_type(node) or is_undefined_type(node):
            return COMMON_AST_NODES['None']
        elif is_any_type(node):
            return COMMON_AST_NODES['Any']
        elif is_array_type(node):
            element_type = self._convert_xlr_to_ast(node.elementType, prop_name)
            return ast.Subscript(
                value=COMMON_AST_NODES['List'],
                slice=element_type,
                ctx=ast.Load()
            )
        elif is_record_type(node):
            key_type = self._convert_xlr_to_ast(node.keyType, prop_name)
            value_type = self._convert_xlr_to_ast(node.valueType, prop_name)

            return ast.Subscript(
                value=COMMON_AST_NODES['Dict'],
                slice=ast.Tuple(elts=[key_type, value_type], ctx=ast.Load()),
                ctx=ast.Load()
            )
        elif is_object_type(node):
            # Use the generated class name
            class_name: str = node.name if is_named_type(node) \
                else generate_class_name(prop_name)
            escaped_class_name = "'"+class_name+"'"
            return ast.Name(id=escaped_class_name, ctx=ast.Load())
        elif is_or_type(node):
            return self._handle_or_type(node, prop_name)
        elif is_and_type(node):
            return self._handle_and_type(node, prop_name)
        elif is_ref_type(node):
            return self._handle_ref_type(node)
        else:
            return COMMON_AST_NODES['Any']

    def _handle_or_type(self, node: OrType, prop_name: str) -> ast.expr:
        """Handle or type nodes."""
        # Handle Literal Types
        if all(is_primitive_const(t) for t in node.or_types):
            # python type checker doesn't keep the inference from the previous check
            union_types: List[ast.expr] = [ast.Constant(
                value=or_type.const) for or_type in node.or_types  # type: ignore
            ]

            if len(union_types) == 1:
                return union_types[0]

            return ast.Subscript(
                value=COMMON_AST_NODES['Literal'],
                slice=ast.Tuple(elts=union_types, ctx=ast.Load()),
                ctx=ast.Load()
            )

        else:
            # Handle Union types
            union_types = []

            for type in node.or_types:
                if not is_primitive_const(type):
                    union_types.append(self._convert_xlr_to_ast(type, prop_name))
                else:
                    union_types.append(
                        ast.Subscript(
                            value=COMMON_AST_NODES['Literal'],
                            slice=ast.Tuple(elts=[ast.Constant(type.const)], ctx=ast.Load()),
                            ctx=ast.Load()
                        )
                    )

            if len(union_types) == 1:
                return union_types[0]

            return ast.Subscript(
                value=COMMON_AST_NODES['Union'],
                slice=ast.Tuple(elts=union_types, ctx=ast.Load()),
                ctx=ast.Load()
            )

    def _flatten_and_types(self, and_types: List[NodeType]) -> List[NodeType]:
        """Recursively flatten nested AndType nodes into a single list."""
        flattened = []
        for and_type in and_types:
            if is_and_type(and_type):
                # Recursively flatten nested AndType
                flattened.extend(self._flatten_and_types(and_type.and_types))
            else:
                flattened.append(and_type)
        return flattened

    def _handle_and_type(self, node: AndType, prop_name: str) -> ast.expr:
        """Handle and (intersection) type nodes."""
        and_types = node.and_types

        # First, check if any elements are nested AndTypes and flatten them
        if any(is_and_type(t) for t in and_types):
            and_types = self._flatten_and_types(and_types)

        # Check if all elements are object types
        if all(is_object_type(t) for t in and_types):
            return self._merge_object_types(and_types, prop_name, node.name)

        # Check if any element is a union - need to calculate intersection
        elif any(is_or_type(t) for t in and_types):
            return self._handle_intersection_with_unions(and_types, prop_name)

        # For other cases, fall back to Union (Python doesn't have native intersection types)
        else:
            intersection_types = [
                self._convert_xlr_to_ast(and_type, prop_name) for and_type in and_types
            ]

            if len(intersection_types) == 1:
                return intersection_types[0]

            # Python doesn't have intersection types, so we use Union as approximation
            return ast.Subscript(
                value=COMMON_AST_NODES['Union'],
                slice=ast.Tuple(elts=intersection_types, ctx=ast.Load()),
                ctx=ast.Load()
            )

    def _merge_object_types(
            self,
            object_types: List[NodeType],
            prop_name: str,
            name: Optional[str] = ""
        ) -> ast.expr:
        """Merge multiple object types into a single object type with combined properties."""

        # Create merged properties dictionary
        merged_properties = {}

        for obj_type in object_types:
            # Resolve the actual ObjectType (could be wrapped in NamedType)
            actual_obj_type = obj_type.base_node if is_named_type(obj_type) else obj_type

            if is_object_type(actual_obj_type):
                # Merge properties from this object type
                for prop_name_key, prop_obj in actual_obj_type.properties.items():
                    if prop_name_key in merged_properties:
                        # Property exists in both objects - need to handle conflict
                        # For now, make it required if either requires it
                        existing_prop = merged_properties[prop_name_key]
                        merged_properties[prop_name_key] = ObjectProperty(
                            required=existing_prop.required or prop_obj.required,
                            node=prop_obj.node  # Use the later definition
                        )
                    else:
                        merged_properties[prop_name_key] = prop_obj

        # Create new merged ObjectType
        merged_obj_type = ObjectType(properties=merged_properties)

        # Generate a class name for the merged type
        merged_class_name = name if name \
            else self._generate_merged_class_name(prop_name, object_types)

        # Add to classes to generate if not already present
        if merged_class_name not in self.classes:
            self.classes.append(merged_class_name)
            self.classes_to_generate[merged_class_name] = merged_obj_type

        # Return AST reference to the merged class
        return ast.Name(id=merged_class_name, ctx=ast.Load())

    def _generate_merged_class_name(self, base_name: str, object_types: List[NodeType]) -> str:
        """Generate a unique class name for merged object types."""
        # Clean the base name
        clean_base = clean_property_name(base_name).replace('_', '').title()

        # Try to create a meaningful name from the merged types
        type_names = []
        for obj_type in object_types:
            if is_named_type(obj_type):
                type_names.append(obj_type.name)
            elif hasattr(obj_type, 'name') and obj_type.name:
                type_names.append(obj_type.name)

        if type_names:
            merged_name = ''.join(type_names) + clean_base
        else:
            merged_name = f"Merged{clean_base}"

        return merged_name

    def _handle_intersection_with_unions(
            self,
            and_types: List[NodeType],
            prop_name: str
        ) -> ast.expr:
        """Handle intersections that include union types."""
        # Separate union types from non-union types
        union_types = [t for t in and_types if is_or_type(t)]
        non_union_types = [t for t in and_types if not is_or_type(t)]

        if len(union_types) == 0:
            # No unions, shouldn't reach here but handle gracefully
            return self._convert_xlr_to_ast(and_types[0], prop_name)

        # For each combination of union members, intersect with non-union types
        result_types = []

        # Start with the first union's members
        first_union = union_types[0]
        current_combinations = first_union.or_types.copy()

        # For each additional union, create combinations
        for union_type in union_types[1:]:
            new_combinations = []
            for existing in current_combinations:
                for union_member in union_type.or_types:
                    # Create intersection of existing and union_member
                    new_combinations.append([existing, union_member])
            current_combinations = new_combinations

        # Now intersect each combination with non-union types
        for combination in current_combinations:
            if isinstance(combination, list):
                # Multiple types to intersect
                intersection_candidate = combination + non_union_types
            else:
                # Single type to intersect with non-union types
                intersection_candidate = [combination] + non_union_types

            # Check if all are objects for merging
            if all(is_object_type(t) for t in intersection_candidate):
                result_types.append(
                    self._merge_object_types(intersection_candidate,
                                            f"{prop_name}_intersection")
                                            )
            else:
                # Convert to Python types and use Union
                py_types = [self._convert_xlr_to_ast(t, prop_name) for t in intersection_candidate]
                if len(py_types) == 1:
                    result_types.append(py_types[0])
                else:
                    result_types.append(ast.Subscript(
                        value=COMMON_AST_NODES['Union'],
                        slice=ast.Tuple(elts=py_types, ctx=ast.Load()),
                        ctx=ast.Load()
                    ))

        # Return union of all result types
        if len(result_types) == 1:
            return result_types[0]
        else:
            return ast.Subscript(
                value=COMMON_AST_NODES['Union'],
                slice=ast.Tuple(elts=result_types, ctx=ast.Load()),
                ctx=ast.Load()
            )

    def _handle_ref_type(self, node: RefType) -> ast.expr:
        """Handle reference type nodes."""
        ref_name = node.ref

        maybe_ref = self.generic_tokens.get(ref_name, None)
        if maybe_ref and maybe_ref.default and maybe_ref.default.name:
            return ast.Name(id=maybe_ref.default.name, ctx=ast.Load())

        # Check if this is a reference to an Asset type (AssetWrapper)
        if ref_name.startswith('AssetWrapper'):
            return COMMON_AST_NODES['Asset']
        elif ref_name in ('Expression', 'Binding'):
            return COMMON_AST_NODES['string']
        else:
            # For other references, try to resolve to a generated class name
            # or use the ref name directly
            return ast.Name(id=ref_name, ctx=ast.Load())
