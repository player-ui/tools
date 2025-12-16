"""
Tests for guard functions in guards.py
"""

from ..guards import (
    is_any_type,
    is_unknown_type,
    is_undefined_type,
    is_null_type,
    is_void_type,
    is_string_type,
    is_number_type,
    is_boolean_type,
    is_never_type,
    is_ref_node,
    is_ref_type,
    is_object_node,
    is_object_type,
    is_array_node,
    is_array_type,
    is_conditional_node,
    is_conditional_type,
    is_tuple_node,
    is_tuple_type,
    is_and_type,
    is_or_type,
    is_template_literal_type,
    is_record_type,
    is_function_type,
    is_type_node,
    is_node_type,
    is_named_type,
    is_named_type_with_generics,
    is_primitive_type,
    is_primitive_const
)
from ..nodes import (
    AnyType,
    UnknownType,
    UndefinedType,
    NullType,
    VoidType,
    StringType,
    NumberType,
    BooleanType,
    NeverType,
    RefNode,
    RefType,
    ObjectNode,
    ObjectType,
    ArrayNode,
    ArrayType,
    ConditionalNode,
    ConditionalType,
    TupleNode,
    TupleType,
    TupleMember,
    AndType,
    OrType,
    TemplateLiteralType,
    RecordType,
    FunctionType,
    FunctionTypeParameters,
    NamedType,
    NamedTypeWithGenerics,
    ObjectProperty
)


class TestPrimitiveTypeGuards:
    """Test guards for primitive types"""

    def test_is_any_type_positive(self):
        """Test is_any_type returns True for AnyType instances"""
        any_type = AnyType()
        assert is_any_type(any_type) is True

    def test_is_any_type_negative(self):
        """Test is_any_type returns False for non-AnyType instances"""
        string_type = StringType()
        assert is_any_type(string_type) is False
        assert is_any_type("not a type") is False
        assert is_any_type(123) is False
        assert is_any_type(None) is False

    def test_is_unknown_type_positive(self):
        """Test is_unknown_type returns True for UnknownType instances"""
        unknown_type = UnknownType()
        assert is_unknown_type(unknown_type) is True

    def test_is_unknown_type_negative(self):
        """Test is_unknown_type returns False for non-UnknownType instances"""
        any_type = AnyType()
        assert is_unknown_type(any_type) is False
        assert is_unknown_type("not a type") is False

    def test_is_undefined_type_positive(self):
        """Test is_undefined_type returns True for UndefinedType instances"""
        undefined_type = UndefinedType()
        assert is_undefined_type(undefined_type) is True

    def test_is_undefined_type_negative(self):
        """Test is_undefined_type returns False for non-UndefinedType instances"""
        null_type = NullType()
        assert is_undefined_type(null_type) is False
        assert is_undefined_type("not a type") is False

    def test_is_null_type_positive(self):
        """Test is_null_type returns True for NullType instances"""
        null_type = NullType()
        assert is_null_type(null_type) is True

    def test_is_null_type_negative(self):
        """Test is_null_type returns False for non-NullType instances"""
        undefined_type = UndefinedType()
        assert is_null_type(undefined_type) is False
        assert is_null_type("not a type") is False

    def test_is_void_type_positive(self):
        """Test is_void_type returns True for VoidType instances"""
        void_type = VoidType()
        assert is_void_type(void_type) is True

    def test_is_void_type_negative(self):
        """Test is_void_type returns False for non-VoidType instances"""
        any_type = AnyType()
        assert is_void_type(any_type) is False
        assert is_void_type("not a type") is False

    def test_is_string_type_positive(self):
        """Test is_string_type returns True for StringType instances"""
        string_type = StringType()
        assert is_string_type(string_type) is True

    def test_is_string_type_negative(self):
        """Test is_string_type returns False for non-StringType instances"""
        number_type = NumberType()
        assert is_string_type(number_type) is False
        assert is_string_type("actual string") is False

    def test_is_number_type_positive(self):
        """Test is_number_type returns True for NumberType instances"""
        number_type = NumberType()
        assert is_number_type(number_type) is True

    def test_is_number_type_negative(self):
        """Test is_number_type returns False for non-NumberType instances"""
        string_type = StringType()
        assert is_number_type(string_type) is False
        assert is_number_type(42) is False

    def test_is_boolean_type_positive(self):
        """Test is_boolean_type returns True for BooleanType instances"""
        boolean_type = BooleanType()
        assert is_boolean_type(boolean_type) is True

    def test_is_boolean_type_negative(self):
        """Test is_boolean_type returns False for non-BooleanType instances"""
        string_type = StringType()
        assert is_boolean_type(string_type) is False
        assert is_boolean_type(True) is False

    def test_is_never_type_positive(self):
        """Test is_never_type returns True for NeverType instances"""
        never_type = NeverType()
        assert is_never_type(never_type) is True

    def test_is_never_type_negative(self):
        """Test is_never_type returns False for non-NeverType instances"""
        any_type = AnyType()
        assert is_never_type(any_type) is False
        assert is_never_type("not a type") is False


class TestRefTypeGuards:
    """Test guards for reference types"""

    def test_is_ref_node_positive(self):
        """Test is_ref_node returns True for RefNode instances"""
        ref_node = RefNode(ref="test.ref")
        assert is_ref_node(ref_node) is True

    def test_is_ref_node_negative(self):
        """Test is_ref_node returns False for non-RefNode instances"""
        any_type = AnyType()
        assert is_ref_node(any_type) is False
        assert is_ref_node("not a ref") is False

    def test_is_ref_type_positive(self):
        """Test is_ref_type returns True for RefType instances"""
        ref_type = RefType(ref="test.ref")
        assert is_ref_type(ref_type) is True

    def test_is_ref_type_negative(self):
        """Test is_ref_type returns False for non-RefType instances"""
        ref_node = RefNode(ref="test.ref")
        assert is_ref_type(ref_node) is False
        assert is_ref_type("not a ref type") is False


class TestObjectTypeGuards:
    """Test guards for object types"""

    def test_is_object_node_positive(self):
        """Test is_object_node returns True for ObjectNode instances"""
        object_node = ObjectNode(properties={})
        assert is_object_node(object_node) is True

    def test_is_object_node_negative(self):
        """Test is_object_node returns False for non-ObjectNode instances"""
        array_node = ArrayNode(elementType=StringType())
        assert is_object_node(array_node) is False
        assert is_object_node({}) is False

    def test_is_object_type_positive(self):
        """Test is_object_type returns True for ObjectType instances"""
        object_type = ObjectType(properties={})
        assert is_object_type(object_type) is True

    def test_is_object_type_negative(self):
        """Test is_object_type returns False for non-ObjectType instances"""
        array_type = ArrayType(elementType=StringType())
        assert is_object_type(array_type) is False
        assert is_object_type({}) is False

    def test_is_object_type_with_named_type(self):
        """Test is_object_type with NamedType wrapping ObjectType"""
        object_type = ObjectType(properties={})
        named_object = NamedType(base_node=object_type, name="TestObject", source="test")
        assert is_object_type(named_object) is True


class TestArrayTypeGuards:
    """Test guards for array types"""

    def test_is_array_node_positive(self):
        """Test is_array_node returns True for ArrayNode instances"""
        array_node = ArrayNode(elementType=StringType())
        assert is_array_node(array_node) is True

    def test_is_array_node_negative(self):
        """Test is_array_node returns False for non-ArrayNode instances"""
        object_node = ObjectNode(properties={})
        assert is_array_node(object_node) is False
        assert is_array_node([]) is False

    def test_is_array_type_positive(self):
        """Test is_array_type returns True for ArrayType instances"""
        array_type = ArrayType(elementType=StringType())
        assert is_array_type(array_type) is True

    def test_is_array_type_negative(self):
        """Test is_array_type returns False for non-ArrayType instances"""
        object_type = ObjectType(properties={})
        assert is_array_type(object_type) is False
        assert is_array_type([]) is False

    def test_is_array_type_with_named_type(self):
        """Test is_array_type with NamedType wrapping ArrayType"""
        array_type = ArrayType(elementType=StringType())
        named_array = NamedType(base_node=array_type, name="TestArray", source="test")
        assert is_array_type(named_array) is True


class TestConditionalTypeGuards:
    """Test guards for conditional types"""

    def test_is_conditional_node_positive(self):
        """Test is_conditional_node returns True for ConditionalNode instances"""
        check_dict = {"check": StringType()}
        value_dict = {"true": BooleanType(), "false": NeverType()}
        conditional_node = ConditionalNode(check=check_dict, value=value_dict)
        assert is_conditional_node(conditional_node) is True

    def test_is_conditional_node_negative(self):
        """Test is_conditional_node returns False for non-ConditionalNode instances"""
        string_type = StringType()
        assert is_conditional_node(string_type) is False
        assert is_conditional_node("not conditional") is False

    def test_is_conditional_type_positive(self):
        """Test is_conditional_type returns True for ConditionalType instances"""
        check_dict = {"check": StringType()}
        value_dict = {"true": BooleanType(), "false": NeverType()}
        conditional_type = ConditionalType(check=check_dict, value=value_dict)
        assert is_conditional_type(conditional_type) is True

    def test_is_conditional_type_negative(self):
        """Test is_conditional_type returns False for non-ConditionalType instances"""
        check_dict = {"check": StringType()}
        value_dict = {"true": BooleanType(), "false": NeverType()}
        conditional_node = ConditionalNode(check=check_dict, value=value_dict)
        assert is_conditional_type(conditional_node) is False


class TestTupleTypeGuards:
    """Test guards for tuple types"""

    def test_is_tuple_node_positive(self):
        """Test is_tuple_node returns True for TupleNode instances"""
        tuple_members = [TupleMember(type=StringType()), TupleMember(type=NumberType())]
        tuple_node = TupleNode(elementTypes=tuple_members, minItems=1)
        assert is_tuple_node(tuple_node) is True

    def test_is_tuple_node_negative(self):
        """Test is_tuple_node returns False for non-TupleNode instances"""
        array_node = ArrayNode(elementType=StringType())
        assert is_tuple_node(array_node) is False
        assert is_tuple_node(()) is False

    def test_is_tuple_type_positive(self):
        """Test is_tuple_type returns True for TupleType instances"""
        tuple_members = [TupleMember(type=StringType()), TupleMember(type=NumberType())]
        tuple_type = TupleType(elementTypes=tuple_members, minItems=1)
        assert is_tuple_type(tuple_type) is True

    def test_is_tuple_type_negative(self):
        """Test is_tuple_type returns False for non-TupleType instances"""
        tuple_members = [TupleMember(type=StringType()), TupleMember(type=NumberType())]
        tuple_node = TupleNode(elementTypes=tuple_members, minItems=1)
        assert is_tuple_type(tuple_node) is False
        assert is_tuple_type(()) is False


class TestUnionIntersectionTypeGuards:
    """Test guards for union and intersection types"""

    def test_is_and_type_positive(self):
        """Test is_and_type returns True for AndType instances"""
        and_type = AndType(and_types=[StringType(), NumberType()])
        assert is_and_type(and_type) is True

    def test_is_and_type_negative(self):
        """Test is_and_type returns False for non-AndType instances"""
        or_type = OrType(or_types=[StringType(), NumberType()])
        assert is_and_type(or_type) is False
        assert is_and_type("not and type") is False

    def test_is_or_type_positive(self):
        """Test is_or_type returns True for OrType instances"""
        or_type = OrType(or_types=[StringType(), NumberType()])
        assert is_or_type(or_type) is True

    def test_is_or_type_negative(self):
        """Test is_or_type returns False for non-OrType instances"""
        and_type = AndType(and_types=[StringType(), NumberType()])
        assert is_or_type(and_type) is False
        assert is_or_type("not or type") is False

    def test_is_or_type_with_named_type(self):
        """Test is_or_type with NamedType wrapping OrType"""
        or_type = OrType(or_types=[StringType(), NumberType()])
        named_union = NamedType(base_node=or_type, name="TestUnion", source="test")
        assert is_or_type(named_union) is True


class TestSpecialTypeGuards:
    """Test guards for special types"""

    def test_is_template_literal_type_positive(self):
        """Test is_template_literal_type returns True for TemplateLiteralType instances"""
        template_literal = TemplateLiteralType(format="test_${string}_template")
        assert is_template_literal_type(template_literal) is True

    def test_is_template_literal_type_negative(self):
        """Test is_template_literal_type returns False for non-TemplateLiteralType instances"""
        string_type = StringType()
        assert is_template_literal_type(string_type) is False
        assert is_template_literal_type("template string") is False

    def test_is_record_type_positive(self):
        """Test is_record_type returns True for RecordType instances"""
        record_type = RecordType(keyType=StringType(), valueType=NumberType())
        assert is_record_type(record_type) is True

    def test_is_record_type_negative(self):
        """Test is_record_type returns False for non-RecordType instances"""
        object_type = ObjectType(properties={})
        assert is_record_type(object_type) is False
        assert is_record_type({}) is False

    def test_is_function_type_positive(self):
        """Test is_function_type returns True for FunctionType instances"""
        params = [FunctionTypeParameters(name="param1", type=StringType())]
        function_type = FunctionType(parameters=params, returnType=StringType())
        assert is_function_type(function_type) is True

    def test_is_function_type_negative(self):
        """Test is_function_type returns False for non-FunctionType instances"""
        string_type = StringType()
        assert is_function_type(string_type) is False
        assert is_function_type(lambda x: x) is False


class TestBaseTypeGuards:
    """Test guards for base types"""

    def test_is_type_node_positive(self):
        """Test is_type_node returns True for TypeNode instances"""
        string_type = StringType()
        object_type = ObjectType(properties={})
        array_type = ArrayType(elementType=StringType())

        assert is_type_node(string_type) is True
        assert is_type_node(object_type) is True
        assert is_type_node(array_type) is True

    def test_is_type_node_negative(self):
        """Test is_type_node returns False for non-TypeNode instances"""
        assert is_type_node("not a type node") is False
        assert is_type_node(123) is False
        assert is_type_node(None) is False

    def test_is_named_type_positive(self):
        """Test is_named_type returns True for NamedType instances"""
        string_type = StringType()
        named_type = NamedType(base_node=string_type, name="MyString", source="test")
        assert is_named_type(named_type) is True

    def test_is_named_type_with_generics_positive(self):
        """Test is_named_type returns True for NamedTypeWithGenerics instances"""
        string_type = StringType()
        named_with_generics = NamedTypeWithGenerics(
            base_node=string_type,
            name="GenericType",
            source="test", genericTokens=[]
        )
        assert is_named_type(named_with_generics) is True
        assert is_named_type_with_generics(named_with_generics) is True

    def test_is_named_type_negative(self):
        """Test is_named_type returns False for non-NamedType instances"""
        string_type = StringType()
        assert is_named_type(string_type) is False
        assert is_named_type("not named") is False

    def test_is_named_type_with_generics_negative(self):
        """Test is_named_type_with_generics returns False for non-NamedTypeWithGenerics instances"""
        string_type = StringType()
        named_type = NamedType(base_node=string_type, name="MyString", source="test")
        assert is_named_type_with_generics(named_type) is False
        assert is_named_type_with_generics(string_type) is False


class TestCompositeTypeGuards:
    """Test composite guard functions"""

    def test_is_node_type_positive(self):
        """Test is_node_type returns True for various node types"""
        tuple_members = [TupleMember(type=StringType()), TupleMember(type=NumberType())]
        params = [FunctionTypeParameters(name="param1", type=StringType())]
        check_dict = {"check": StringType()}
        value_dict = {"true": BooleanType(), "false": NeverType()}

        test_types = [
            AnyType(), UnknownType(), UndefinedType(), NullType(), NeverType(),
            StringType(), NumberType(), BooleanType(), VoidType(),
            ObjectType(properties={}),
            ArrayType(elementType=StringType()),
            TupleType(elementTypes=tuple_members, minItems=1),
            RecordType(keyType=StringType(), valueType=NumberType()),
            AndType(and_types=[StringType(), NumberType()]),
            OrType(or_types=[StringType(), NumberType()]),
            RefType(ref="test.ref"),
            FunctionType(parameters=params, returnType=StringType()),
            ConditionalType(check=check_dict, value=value_dict),
            TemplateLiteralType(format="test_${string}_template")
        ]

        for type_obj in test_types:
            assert is_node_type(type_obj) is True,\
            f"is_node_type should return True for {type(type_obj).__name__}"

    def test_is_node_type_negative(self):
        """Test is_node_type returns False for non-node types"""
        non_types = [
            "string", 123, True, None, [], {}, lambda x: x,
            ObjectProperty(required=True, node=StringType()),  # This is not a NodeType
        ]

        for non_type in non_types:
            assert is_node_type(non_type) is False,\
                f"is_node_type should return False for {type(non_type).__name__}"

    def test_is_primitive_type_positive(self):
        """Test is_primitive_type returns True for primitive types"""
        primitive_types = [
            AnyType(), UnknownType(), UndefinedType(), NullType(),
            VoidType(), StringType(), NumberType(), BooleanType(), NeverType()
        ]

        for prim_type in primitive_types:
            assert is_primitive_type(prim_type) is True, \
                f"is_primitive_type should return True for {type(prim_type).__name__}"

    def test_is_primitive_type_negative(self):
        """Test is_primitive_type returns False for non-primitive types"""
        tuple_members = [TupleMember(type=StringType()), TupleMember(type=NumberType())]
        params = [FunctionTypeParameters(name="param1", type=StringType())]

        non_primitive_types = [
            ObjectType(properties={}),
            ArrayType(elementType=StringType()),
            TupleType(elementTypes=tuple_members, minItems=1),
            RecordType(keyType=StringType(), valueType=NumberType()),
            AndType(and_types=[StringType(), NumberType()]),
            OrType(or_types=[StringType(), NumberType()]),
            RefType(ref="test.ref"),
            FunctionType(parameters=params, returnType=StringType()),
            "string", 123, None
        ]

        for non_prim_type in non_primitive_types:
            assert is_primitive_type(non_prim_type) is False, \
                f"is_primitive_type should return False for {type(non_prim_type).__name__}"

    def test_is_primitive_const_positive(self):
        """Test is_primitive_const returns True for primitive types with const values"""
        string_with_const = StringType(const="hello")
        number_with_const = NumberType(const=42)
        boolean_with_const = BooleanType(const=True)

        assert is_primitive_const(string_with_const) is True
        assert is_primitive_const(number_with_const) is True
        assert is_primitive_const(boolean_with_const) is True

    def test_is_primitive_const_negative(self):
        """Test is_primitive_const returns False for types without const values or non-primitives"""
        string_without_const = StringType()
        object_type = ObjectType(properties={})

        assert is_primitive_const(string_without_const) is False
        assert is_primitive_const(object_type) is False
        assert is_primitive_const("not a type") is False


class TestEdgeCases:
    """Test edge cases and error conditions"""

    def test_guards_with_none(self):
        """Test all guards handle None gracefully"""
        guard_functions = [
            is_any_type, is_unknown_type, is_undefined_type, is_null_type, is_void_type,
            is_string_type, is_number_type, is_boolean_type, is_never_type,
            is_ref_node, is_ref_type, is_object_node, is_object_type,
            is_array_node, is_array_type, is_conditional_node, is_conditional_type,
            is_tuple_node, is_tuple_type, is_and_type, is_or_type,
            is_template_literal_type, is_record_type, is_function_type,
            is_type_node, is_node_type, is_named_type, is_named_type_with_generics,
            is_primitive_type, is_primitive_const
        ]

        for guard_func in guard_functions:
            assert guard_func(None) is False, f"{guard_func.__name__} should return False for None"

    def test_guards_with_empty_objects(self):
        """Test guards with various empty/default objects"""
        empty_objects = [
            "", 0, False, [], {}, set(), tuple()
        ]

        # Test a few representative guards
        for empty_obj in empty_objects:
            assert is_string_type(empty_obj) is False
            assert is_object_type(empty_obj) is False
            assert is_array_type(empty_obj) is False
            assert is_node_type(empty_obj) is False

    def test_inheritance_behavior(self):
        """Test that guards work correctly with inheritance"""
        # ObjectType inherits from ObjectNode
        object_type = ObjectType(properties={})
        assert is_object_node(object_type) is True  # Should work due to inheritance
        assert is_object_type(object_type) is True

        # ArrayType inherits from ArrayNode
        array_type = ArrayType(elementType=StringType())
        assert is_array_node(array_type) is True  # Should work due to inheritance
        assert is_array_type(array_type) is True

        # All concrete types inherit from TypeNode
        string_type = StringType()
        assert is_type_node(string_type) is True
