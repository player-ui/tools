"""Tests for validation.py classes"""
import json

from ..validation import Reference, CrossfieldReference


class TestReference:
    """Test cases for Reference class"""

    def test_instantiation_minimal(self):
        """Test Reference can be instantiated with minimal parameters"""
        ref = Reference(type="required")
        
        assert ref is not None
        assert ref.type == "required"
        assert ref.message is None
        assert ref.severity is None
        assert ref.trigger is None
        assert ref.data_target is None
        assert ref.display_target is None
        assert ref.blocking is None

    def test_instantiation_full(self):
        """Test Reference can be instantiated with all parameters"""
        ref = Reference(
            type="min_length",
            message="Field must be at least 5 characters",
            severity="error",
            trigger="change",
            data_target="deformatted",
            display_target="field",
            blocking=True,
            custom_prop="custom_value"
        )
        
        assert ref.type == "min_length"
        assert ref.message == "Field must be at least 5 characters"
        assert ref.severity == "error"
        assert ref.trigger == "change"
        assert ref.data_target == "deformatted"
        assert ref.display_target == "field"
        assert ref.blocking is True

    def test_type_property(self):
        """Test type property getter and setter"""
        ref = Reference(type="email")
        assert ref.type == "email"
        
        ref.type = "phone"
        assert ref.type == "phone"

    def test_message_property(self):
        """Test message property getter and setter"""
        ref = Reference(type="required")
        assert ref.message is None
        
        ref.message = "This field is required"
        assert ref.message == "This field is required"
        
        ref.message = None
        assert ref.message is None

    def test_severity_property(self):
        """Test severity property getter and setter"""
        ref = Reference(type="warning_validation")
        assert ref.severity is None
        
        ref.severity = "warning"
        assert ref.severity == "warning"
        
        ref.severity = "error"
        assert ref.severity == "error"

    def test_trigger_property(self):
        """Test trigger property getter and setter"""
        ref = Reference(type="validation")
        assert ref.trigger is None
        
        ref.trigger = "navigation"
        assert ref.trigger == "navigation"
        
        ref.trigger = "change"
        assert ref.trigger == "change"
        
        ref.trigger = "load"
        assert ref.trigger == "load"

    def test_data_target_property(self):
        """Test data_target property getter and setter"""
        ref = Reference(type="validation")
        assert ref.data_target is None
        
        ref.data_target = "formatted"
        assert ref.data_target == "formatted"
        
        ref.data_target = "deformatted"
        assert ref.data_target == "deformatted"

    def test_display_target_property(self):
        """Test display_target property getter and setter"""
        ref = Reference(type="validation")
        assert ref.display_target is None
        
        ref.display_target = "page"
        assert ref.display_target == "page"
        
        ref.display_target = "section"
        assert ref.display_target == "section"
        
        ref.display_target = "field"
        assert ref.display_target == "field"

    def test_blocking_property(self):
        """Test blocking property getter and setter"""
        ref = Reference(type="validation")
        assert ref.blocking is None
        
        ref.blocking = True
        assert ref.blocking is True
        
        ref.blocking = False
        assert ref.blocking is False
        
        ref.blocking = "once"
        assert ref.blocking == "once"

    def test_json_serialization_minimal(self):
        """Test JSON serialization with minimal data"""
        ref = Reference(type="required")
        
        json_str = json.dumps(ref.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_type"] == "required"
        assert data["_message"] is None
        assert data["_severity"] is None
        assert data["_trigger"] is None
        assert data["_data_target"] is None
        assert data["_display_target"] is None
        assert data["_blocking"] is None

    def test_json_serialization_full(self):
        """Test JSON serialization with all properties"""
        ref = Reference(
            type="complex_validation",
            message="Complex validation message",
            severity="warning",
            trigger="navigation",
            data_target="formatted",
            display_target="section",
            blocking="once",
            extra_param="extra_value"
        )
        
        json_str = json.dumps(ref.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_type"] == "complex_validation"
        assert data["_message"] == "Complex validation message"
        assert data["_severity"] == "warning"
        assert data["_trigger"] == "navigation"
        assert data["_data_target"] == "formatted"
        assert data["_display_target"] == "section"
        assert data["_blocking"] == "once"
        assert "_additional_props" in data
        assert data["_additional_props"]["extra_param"] == "extra_value"

    def test_json_deserialization_compatibility(self):
        """Test that serialized data can be used to recreate object"""
        original_ref = Reference(
            type="email_validation",
            message="Invalid email format",
            severity="error",
            trigger="change"
        )
        
        # Serialize
        json_str = json.dumps(original_ref.__dict__)
        data = json.loads(json_str)
        
        # Create new object from serialized data
        new_ref = Reference(
            type=data["_type"],
            message=data["_message"],
            severity=data["_severity"],
            trigger=data["_trigger"],
            data_target=data["_data_target"],
            display_target=data["_display_target"],
            blocking=data["_blocking"]
        )
        
        assert new_ref.type == original_ref.type
        assert new_ref.message == original_ref.message
        assert new_ref.severity == original_ref.severity
        assert new_ref.trigger == original_ref.trigger

    def test_additional_props_functionality(self):
        """Test additional properties functionality"""
        ref = Reference(
            type="custom_validation",
            min_value=10,
            max_value=100,
            regex_pattern="^[A-Z]+$"
        )
        
        # Additional properties should be stored
        assert hasattr(ref, '_additional_props')
        assert ref._additional_props["min_value"] == 10
        assert ref._additional_props["max_value"] == 100
        assert ref._additional_props["regex_pattern"] == "^[A-Z]+$"


class TestCrossfieldReference:
    """Test cases for CrossfieldReference class"""

    def test_instantiation_minimal(self):
        """Test CrossfieldReference can be instantiated with minimal parameters"""
        ref = CrossfieldReference(type="password_confirmation")
        
        assert ref is not None
        assert ref.type == "password_confirmation"
        assert ref.ref is None
        assert ref.message is None
        assert ref.severity is None
        assert ref.trigger is None
        assert ref.display_target is None
        assert ref.blocking is None
        # data_target should always be None for cross-field references
        assert ref.data_target is None

    def test_instantiation_full(self):
        """Test CrossfieldReference can be instantiated with all parameters"""
        ref = CrossfieldReference(
            type="field_comparison",
            ref="password_field",
            message="Passwords do not match",
            severity="error",
            trigger="navigation",
            display_target="field",
            blocking=True,
            comparison_operator="equals"
        )
        
        assert ref.type == "field_comparison"
        assert ref.ref == "password_field"
        assert ref.message == "Passwords do not match"
        assert ref.severity == "error"
        assert ref.trigger == "navigation"
        assert ref.display_target == "field"
        assert ref.blocking is True
        # data_target should always be None
        assert ref.data_target is None

    def test_ref_property(self):
        """Test ref property getter and setter"""
        ref = CrossfieldReference(type="crossfield_validation")
        assert ref.ref is None
        
        ref.ref = "other_field"
        assert ref.ref == "other_field"
        
        ref.ref = None
        assert ref.ref is None

    def test_inheritance_from_reference(self):
        """Test that CrossfieldReference inherits from Reference"""
        ref = CrossfieldReference(
            type="inherit_test",
            message="Inheritance test",
            severity="warning"
        )
        
        # Should have all Reference properties
        assert ref.type == "inherit_test"
        assert ref.message == "Inheritance test"
        assert ref.severity == "warning"
        assert ref.trigger is None
        assert ref.display_target is None
        assert ref.blocking is None
        # data_target should be None (overridden by CrossfieldReference)
        assert ref.data_target is None

    def test_data_target_always_none(self):
        """Test that data_target is always None for cross-field references"""
        # Even if we try to pass data_target, it should be None
        ref = CrossfieldReference(
            type="test_validation",
            ref="target_field"
        )
        
        assert ref.data_target is None
        
        # Trying to set data_target should not work (if property exists)
        # This is enforced by the constructor passing None to super()

    def test_json_serialization_minimal(self):
        """Test JSON serialization with minimal data"""
        ref = CrossfieldReference(type="crossfield_required")
        
        json_str = json.dumps(ref.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_type"] == "crossfield_required"
        assert data["_ref"] is None
        assert data["_data_target"] is None  # Should always be None

    def test_json_serialization_full(self):
        """Test JSON serialization with all properties"""
        ref = CrossfieldReference(
            type="date_range_validation",
            ref="end_date_field",
            message="End date must be after start date",
            severity="error",
            trigger="change",
            display_target="section",
            blocking="once",
            date_format="YYYY-MM-DD"
        )
        
        json_str = json.dumps(ref.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_type"] == "date_range_validation"
        assert data["_ref"] == "end_date_field"
        assert data["_message"] == "End date must be after start date"
        assert data["_severity"] == "error"
        assert data["_trigger"] == "change"
        assert data["_display_target"] == "section"
        assert data["_blocking"] == "once"
        assert data["_data_target"] is None  # Should always be None
        assert "_additional_props" in data
        assert data["_additional_props"]["date_format"] == "YYYY-MM-DD"

    def test_json_deserialization_compatibility(self):
        """Test that serialized data can be used to recreate object"""
        original_ref = CrossfieldReference(
            type="match_validation",
            ref="confirm_password",
            message="Passwords must match",
            severity="error"
        )
        
        # Serialize
        json_str = json.dumps(original_ref.__dict__)
        data = json.loads(json_str)
        
        # Create new object from serialized data
        new_ref = CrossfieldReference(
            type=data["_type"],
            ref=data["_ref"],
            message=data["_message"],
            severity=data["_severity"],
            trigger=data["_trigger"],
            display_target=data["_display_target"],
            blocking=data["_blocking"]
        )
        
        assert new_ref.type == original_ref.type
        assert new_ref.ref == original_ref.ref
        assert new_ref.message == original_ref.message
        assert new_ref.severity == original_ref.severity
        assert new_ref.data_target is None  # Should always be None

    def test_additional_props_functionality(self):
        """Test additional properties functionality inherited from Reference"""
        ref = CrossfieldReference(
            type="conditional_validation",
            ref="dependent_field",
            condition="greater_than",
            threshold=100
        )
        
        # Additional properties should be stored
        assert hasattr(ref, '_additional_props')
        assert ref._additional_props["condition"] == "greater_than"
        assert ref._additional_props["threshold"] == 100

    def test_various_ref_values(self):
        """Test various ref (binding) values"""
        # Test with typical binding reference
        ref1 = CrossfieldReference(type="validation", ref="user.email")
        assert ref1.ref == "user.email"
        
        # Test with array binding reference
        ref2 = CrossfieldReference(type="validation", ref="items[0].name")
        assert ref2.ref == "items[0].name"
        
        # Test with complex binding reference  
        ref3 = CrossfieldReference(type="validation", ref="form.sections.personal.firstName")
        assert ref3.ref == "form.sections.personal.firstName"

