"""Tests for schema.py classes"""
import json

from ..schema import (
    SchemaNode,
    SchemaDataType,
    SchemaRecordType,
    SchemaArrayType,
    Schema,
    LanguageDataTypeRef,
    FormattingReference
)
from ..validation import Reference


class TestSchemaNode:
    """Test cases for SchemaNode class"""

    def test_instantiation_empty(self):
        """Test SchemaNode can be instantiated without properties"""
        node = SchemaNode()
        assert node is not None
        assert node.properties == {}

    def test_instantiation_with_properties(self):
        """Test SchemaNode can be instantiated with properties"""
        data_type1 = SchemaDataType(type="string")
        data_type2 = SchemaDataType(type="number")
        
        node = SchemaNode(name=data_type1, age=data_type2)
        
        assert node is not None
        assert node.get_property("name") == data_type1
        assert node.get_property("age") == data_type2

    def test_property_methods(self):
        """Test property getter and setter methods"""
        node = SchemaNode()
        data_type = SchemaDataType(type="boolean")
        
        # Test getting non-existent property
        assert node.get_property("nonexistent") is None
        
        # Test setting and getting property
        node.set_property("is_active", data_type)
        assert node.get_property("is_active") == data_type
        
        # Test properties property
        all_props = node.properties
        assert "is_active" in all_props
        assert all_props["is_active"] == data_type

    def test_json_serialization(self):
        """Test JSON serialization"""
        data_type = SchemaDataType(type="string")
        node = SchemaNode(title=data_type)
        
        json_str = json.dumps(node.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert "_properties" in data
        assert "title" in data["_properties"]


class TestSchemaDataType:
    """Test cases for SchemaDataType class"""

    def test_instantiation_minimal(self):
        """Test SchemaDataType minimal instantiation"""
        data_type = SchemaDataType(type="string")
        
        assert data_type is not None
        assert data_type.type == "string"
        assert data_type.validation == []
        assert data_type.format is None
        assert data_type.default is None

    def test_instantiation_full(self):
        """Test SchemaDataType full instantiation"""
        validation_refs = [Reference(type="required"), Reference(type="min_length")]
        format_ref = FormattingReference(type="email")
        
        data_type = SchemaDataType(
            type="string",
            validation=validation_refs,
            format=format_ref,
            default="default_value",
            custom_prop="custom"
        )
        
        assert data_type.type == "string"
        assert data_type.validation == validation_refs
        assert data_type.format == format_ref
        assert data_type.default == "default_value"

    def test_properties_getters_setters(self):
        """Test all property getters and setters"""
        data_type = SchemaDataType(type="number")
        
        # Test type property
        data_type.type = "integer"
        assert data_type.type == "integer"
        
        # Test validation property
        new_validation = [Reference(type="range")]
        data_type.validation = new_validation
        assert data_type.validation == new_validation
        
        # Test format property
        new_format = FormattingReference(type="currency")
        data_type.format = new_format
        assert data_type.format == new_format
        
        # Test default property
        data_type.default = 42
        assert data_type.default == 42

    def test_json_serialization(self):
        """Test JSON serialization"""
        validation_ref = Reference(type="required")
        format_ref = FormattingReference(type="email")
        
        data_type = SchemaDataType(
            type="string",
            validation=[validation_ref],
            format=format_ref,
            default="test"
        )
        
        json_str = json.dumps(data_type.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_type"] == "string"
        assert data["_default"] == "test"
        assert "_validation" in data
        assert "_format" in data


class TestSchemaRecordType:
    """Test cases for SchemaRecordType class"""

    def test_instantiation_default(self):
        """Test SchemaRecordType default instantiation"""
        record_type = SchemaRecordType(type="object")
        
        assert record_type is not None
        assert record_type.type == "object"
        assert record_type.is_record is True

    def test_instantiation_custom(self):
        """Test SchemaRecordType custom instantiation"""
        record_type = SchemaRecordType(
            type="custom_object",
            is_record=False,
            default={"key": "value"}
        )
        
        assert record_type.type == "custom_object"
        assert record_type.is_record is False
        assert record_type.default == {"key": "value"}

    def test_is_record_property(self):
        """Test is_record property getter and setter"""
        record_type = SchemaRecordType(type="object", is_record=True)
        assert record_type.is_record is True
        
        record_type.is_record = False
        assert record_type.is_record is False

    def test_inheritance_from_schema_data_type(self):
        """Test that SchemaRecordType inherits from SchemaDataType"""
        validation_ref = Reference(type="required")
        record_type = SchemaRecordType(
            type="object",
            validation=[validation_ref]
        )
        
        # Should have all SchemaDataType properties
        assert record_type.type == "object"
        assert record_type.validation == [validation_ref]
        assert record_type.is_record is True

    def test_json_serialization(self):
        """Test JSON serialization"""
        record_type = SchemaRecordType(
            type="user_record",
            is_record=True,
            default={"name": "", "age": 0}
        )
        
        json_str = json.dumps(record_type.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_type"] == "user_record"
        assert data["_is_record"] is True
        assert data["_default"] == {"name": "", "age": 0}


class TestSchemaArrayType:
    """Test cases for SchemaArrayType class"""

    def test_instantiation_default(self):
        """Test SchemaArrayType default instantiation"""
        array_type = SchemaArrayType(type="string")
        
        assert array_type is not None
        assert array_type.type == "string"
        assert array_type.is_array is True

    def test_instantiation_custom(self):
        """Test SchemaArrayType custom instantiation"""
        array_type = SchemaArrayType(
            type="number",
            is_array=False,
            default=[1, 2, 3]
        )
        
        assert array_type.type == "number"
        assert array_type.is_array is False
        assert array_type.default == [1, 2, 3]

    def test_is_array_property(self):
        """Test is_array property getter and setter"""
        array_type = SchemaArrayType(type="string", is_array=True)
        assert array_type.is_array is True
        
        array_type.is_array = False
        assert array_type.is_array is False

    def test_inheritance_from_schema_data_type(self):
        """Test that SchemaArrayType inherits from SchemaDataType"""
        format_ref = FormattingReference(type="list")
        array_type = SchemaArrayType(
            type="string",
            format=format_ref
        )
        
        # Should have all SchemaDataType properties
        assert array_type.type == "string"
        assert array_type.format == format_ref
        assert array_type.is_array is True

    def test_json_serialization(self):
        """Test JSON serialization"""
        array_type = SchemaArrayType(
            type="user",
            is_array=True,
            default=[]
        )
        
        json_str = json.dumps(array_type.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_type"] == "user"
        assert data["_is_array"] is True
        assert data["_default"] == []


class TestSchema:
    """Test cases for Schema class"""

    def test_instantiation_minimal(self):
        """Test Schema minimal instantiation"""
        root_node = SchemaNode()
        schema = Schema(root=root_node)
        
        assert schema is not None
        assert schema.root == root_node
        assert schema.additional_nodes == {}

    def test_instantiation_with_additional_nodes(self):
        """Test Schema instantiation with additional nodes"""
        root_node = SchemaNode()
        user_node = SchemaNode()
        address_node = SchemaNode()
        
        schema = Schema(
            root=root_node,
            user=user_node,
            address=address_node
        )
        
        assert schema.root == root_node
        assert schema.get_node("user") == user_node
        assert schema.get_node("address") == address_node

    def test_root_property(self):
        """Test root property getter and setter"""
        initial_root = SchemaNode()
        schema = Schema(root=initial_root)
        assert schema.root == initial_root
        
        new_root = SchemaNode()
        schema.root = new_root
        assert schema.root == new_root

    def test_node_methods(self):
        """Test node getter and setter methods"""
        schema = Schema(root=SchemaNode())
        
        # Test getting non-existent node
        assert schema.get_node("nonexistent") is None
        
        # Test setting and getting node
        test_node = SchemaNode()
        schema.set_node("test_node", test_node)
        assert schema.get_node("test_node") == test_node
        
        # Test additional_nodes property
        all_nodes = schema.additional_nodes
        assert "test_node" in all_nodes
        assert all_nodes["test_node"] == test_node

    def test_json_serialization(self):
        """Test JSON serialization"""
        root_node = SchemaNode()
        user_node = SchemaNode()
        schema = Schema(root=root_node, user=user_node)
        
        json_str = json.dumps(schema.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert "_root" in data
        assert "_additional_nodes" in data
        assert "user" in data["_additional_nodes"]


class TestLanguageDataTypeRef:
    """Test cases for LanguageDataTypeRef class"""

    def test_instantiation(self):
        """Test LanguageDataTypeRef instantiation"""
        ref = LanguageDataTypeRef(type="Player.Core.String")
        
        assert ref is not None
        assert ref.type == "Player.Core.String"

    def test_type_property(self):
        """Test type property getter and setter"""
        ref = LanguageDataTypeRef(type="Player.Core.Number")
        assert ref.type == "Player.Core.Number"
        
        ref.type = "Player.Core.Boolean"
        assert ref.type == "Player.Core.Boolean"

    def test_json_serialization(self):
        """Test JSON serialization"""
        ref = LanguageDataTypeRef(type="Player.Core.Array")
        
        json_str = json.dumps(ref.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_type"] == "Player.Core.Array"


class TestFormattingReference:
    """Test cases for FormattingReference class"""

    def test_instantiation_minimal(self):
        """Test FormattingReference minimal instantiation"""
        ref = FormattingReference(type="email")
        
        assert ref is not None
        assert ref.type == "email"
        assert ref.additional_props == {}

    def test_instantiation_with_additional_props(self):
        """Test FormattingReference with additional properties"""
        ref = FormattingReference(
            type="currency",
            symbol="$",
            precision=2,
            locale="en-US"
        )
        
        assert ref.type == "currency"
        assert ref.get_additional_prop("symbol") == "$"
        assert ref.get_additional_prop("precision") == 2
        assert ref.get_additional_prop("locale") == "en-US"

    def test_type_property(self):
        """Test type property getter and setter"""
        ref = FormattingReference(type="date")
        assert ref.type == "date"
        
        ref.type = "datetime"
        assert ref.type == "datetime"

    def test_additional_prop_methods(self):
        """Test additional property methods"""
        ref = FormattingReference(type="number", digits=2)
        
        # Test getting existing property
        assert ref.get_additional_prop("digits") == 2
        
        # Test getting non-existent property
        assert ref.get_additional_prop("nonexistent") is None
        
        # Test setting new property
        ref.set_additional_prop("separator", ",")
        assert ref.get_additional_prop("separator") == ","
        
        # Test additional_props property
        all_props = ref.additional_props
        assert "digits" in all_props
        assert "separator" in all_props
        assert all_props["digits"] == 2
        assert all_props["separator"] == ","

    def test_json_serialization(self):
        """Test JSON serialization"""
        ref = FormattingReference(
            type="percentage",
            decimal_places=1,
            show_symbol=True
        )
        
        json_str = json.dumps(ref.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_type"] == "percentage"
        assert "_additional_props" in data
        assert data["_additional_props"]["decimal_places"] == 1
        assert data["_additional_props"]["show_symbol"] is True

    def test_json_deserialization_compatibility(self):
        """Test that serialized data can be used to recreate object"""
        original_ref = FormattingReference(
            type="phone",
            country_code="+1",
            format="(XXX) XXX-XXXX"
        )
        
        # Serialize
        json_str = json.dumps(original_ref.__dict__)
        data = json.loads(json_str)
        
        # Create new object from serialized data
        new_ref = FormattingReference(
            type=data["_type"],
            **data["_additional_props"]
        )
        
        assert new_ref.type == original_ref.type
        assert new_ref.get_additional_prop("country_code") == "+1"
        assert new_ref.get_additional_prop("format") == "(XXX) XXX-XXXX"
