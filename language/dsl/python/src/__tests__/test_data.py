"""Tests for data.py classes"""
import json

from ..data import ExpressionObject


class TestExpressionObject:
    """Test cases for ExpressionObject class"""

    def test_instantiation_default(self):
        """Test ExpressionObject can be instantiated with default parameters"""
        obj = ExpressionObject()
        assert obj is not None
        assert obj.exp is None

    def test_instantiation_with_string_expression(self):
        """Test ExpressionObject can be instantiated with string expression"""
        expression = "some_expression"
        obj = ExpressionObject(exp=expression)
        assert obj is not None
        assert obj.exp == expression

    def test_instantiation_with_list_expression(self):
        """Test ExpressionObject can be instantiated with list expression"""
        expression = ["expr1", "expr2", "expr3"]
        obj = ExpressionObject(exp=expression)
        assert obj is not None
        assert obj.exp == expression

    def test_exp_property_getter(self):
        """Test exp property getter"""
        expression = "test_expression"
        obj = ExpressionObject(exp=expression)
        assert obj.exp == expression

    def test_exp_property_setter_string(self):
        """Test exp property setter with string"""
        obj = ExpressionObject()
        new_expression = "new_expression"
        obj.exp = new_expression
        assert obj.exp == new_expression

    def test_exp_property_setter_list(self):
        """Test exp property setter with list"""
        obj = ExpressionObject()
        new_expression = ["expr1", "expr2"]
        obj.exp = new_expression
        assert obj.exp == new_expression

    def test_exp_property_setter_none(self):
        """Test exp property setter with None"""
        obj = ExpressionObject(exp="initial")
        obj.exp = None
        assert obj.exp is None

    def test_json_serialization_default(self):
        """Test JSON serialization with default values"""
        obj = ExpressionObject()
        json_str = json.dumps(obj.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert "_exp" in data
        assert data["_exp"] is None

    def test_json_serialization_with_string_expression(self):
        """Test JSON serialization with string expression"""
        expression = "test_expression"
        obj = ExpressionObject(exp=expression)
        json_str = json.dumps(obj.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_exp"] == expression

    def test_json_serialization_with_list_expression(self):
        """Test JSON serialization with list expression"""
        expression = ["expr1", "expr2", "expr3"]
        obj = ExpressionObject(exp=expression)
        json_str = json.dumps(obj.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_exp"] == expression

    def test_json_deserialization_compatibility(self):
        """Test that serialized data can be used to recreate object"""
        original_expression = ["expr1", "expr2"]
        obj1 = ExpressionObject(exp=original_expression)
        
        # Serialize
        json_str = json.dumps(obj1.__dict__)
        data = json.loads(json_str)
        
        # Create new object from serialized data
        obj2 = ExpressionObject(exp=data["_exp"])
        
        assert obj2.exp == original_expression
        assert obj1.exp == obj2.exp
