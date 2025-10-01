"""Tests for flow.py classes"""
import json
from ..flow import FlowResult, Flow
from ..navigation import Navigation, NavigationFlowEndState
from ..schema import Schema, SchemaNode
from ..view import View


class TestFlowResult:
    """Test cases for FlowResult class"""

    def test_instantiation_minimal(self):
        """Test FlowResult can be instantiated with minimal parameters"""
        end_state = NavigationFlowEndState(outcome="completed")
        result = FlowResult(end_state=end_state)
        assert result is not None
        assert result.end_state == end_state
        assert result.data is None

    def test_instantiation_with_data(self):
        """Test FlowResult can be instantiated with data"""
        end_state = NavigationFlowEndState(outcome="completed")
        test_data = {"key": "value", "number": 42}
        result = FlowResult(end_state=end_state, data=test_data)
        assert result is not None
        assert result.end_state == end_state
        assert result.data == test_data

    def test_end_state_property_getter(self):
        """Test end_state property getter"""
        end_state = NavigationFlowEndState(outcome="cancelled")
        result = FlowResult(end_state=end_state)
        assert result.end_state == end_state

    def test_end_state_property_setter(self):
        """Test end_state property setter"""
        initial_state = NavigationFlowEndState(outcome="initial")
        new_state = NavigationFlowEndState(outcome="final")
        result = FlowResult(end_state=initial_state)
        result.end_state = new_state
        assert result.end_state == new_state

    def test_data_property_getter(self):
        """Test data property getter"""
        end_state = NavigationFlowEndState(outcome="completed")
        test_data = {"test": "data"}
        result = FlowResult(end_state=end_state, data=test_data)
        assert result.data == test_data

    def test_data_property_setter(self):
        """Test data property setter"""
        end_state = NavigationFlowEndState(outcome="completed")
        result = FlowResult(end_state=end_state)
        new_data = {"new": "data", "count": 123}
        result.data = new_data
        assert result.data == new_data

    def test_data_property_setter_none(self):
        """Test data property setter with None"""
        end_state = NavigationFlowEndState(outcome="completed")
        result = FlowResult(end_state=end_state, data={"initial": "data"})
        result.data = None
        assert result.data is None

    def test_json_serialization(self):
        """Test JSON serialization"""
        end_state = NavigationFlowEndState(outcome="success")
        test_data = {"result": "test", "count": 5}
        result = FlowResult(end_state=end_state, data=test_data)
        
        json_str = json.dumps(result.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert "_end_state" in data
        assert "_data" in data
        assert data["_data"] == test_data


class TestFlow:
    """Test cases for Flow class"""

    def test_instantiation_minimal(self):
        """Test Flow can be instantiated with minimal required parameters"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test_flow", navigation=navigation)
        assert flow is not None
        assert flow.id == "test_flow"
        assert flow.navigation == navigation
        assert flow.views == []
        assert flow.schema is None
        assert flow.data is None

    def test_instantiation_full(self):
        """Test Flow can be instantiated with all parameters"""
        navigation = Navigation(begin="start")
        views = [View(id="view1", type="text")]
        schema = Schema(root=SchemaNode())
        data = {"initial": "data"}
        
        flow = Flow(
            id="full_flow",
            navigation=navigation,
            views=views,
            schema=schema,
            data=data,
            custom_prop="custom_value"
        )
        
        assert flow is not None
        assert flow.id == "full_flow"
        assert flow.navigation == navigation
        assert flow.views == views
        assert flow.schema == schema
        assert flow.data == data
        assert flow.get_additional_prop("custom_prop") == "custom_value"

    def test_id_property_getter(self):
        """Test id property getter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test_id", navigation=navigation)
        assert flow.id == "test_id"

    def test_id_property_setter(self):
        """Test id property setter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="initial_id", navigation=navigation)
        flow.id = "new_id"
        assert flow.id == "new_id"

    def test_views_property_getter(self):
        """Test views property getter"""
        navigation = Navigation(begin="start")
        views = [View(id="view1", type="text"), View(id="view2", type="input")]
        flow = Flow(id="test", navigation=navigation, views=views)
        assert flow.views == views

    def test_views_property_setter(self):
        """Test views property setter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test", navigation=navigation)
        new_views = [View(id="new_view", type="button")]
        flow.views = new_views
        assert flow.views == new_views

    def test_schema_property_getter(self):
        """Test schema property getter"""
        navigation = Navigation(begin="start")
        schema = Schema(root=SchemaNode())
        flow = Flow(id="test", navigation=navigation, schema=schema)
        assert flow.schema == schema

    def test_schema_property_setter(self):
        """Test schema property setter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test", navigation=navigation)
        new_schema = Schema(root=SchemaNode())
        flow.schema = new_schema
        assert flow.schema == new_schema

    def test_data_property_getter(self):
        """Test data property getter"""
        navigation = Navigation(begin="start")
        data = {"test": "data"}
        flow = Flow(id="test", navigation=navigation, data=data)
        assert flow.data == data

    def test_data_property_setter(self):
        """Test data property setter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test", navigation=navigation)
        new_data = {"new": "data"}
        flow.data = new_data
        assert flow.data == new_data

    def test_navigation_property_getter(self):
        """Test navigation property getter"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test", navigation=navigation)
        assert flow.navigation == navigation

    def test_navigation_property_setter(self):
        """Test navigation property setter"""
        initial_nav = Navigation(begin="start")
        new_nav = Navigation(begin="end")
        flow = Flow(id="test", navigation=initial_nav)
        flow.navigation = new_nav
        assert flow.navigation == new_nav

    def test_additional_props_methods(self):
        """Test additional properties methods"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test", navigation=navigation, custom="value", number=42)
        
        assert flow.get_additional_prop("custom") == "value"
        assert flow.get_additional_prop("number") == 42
        assert flow.get_additional_prop("nonexistent") is None
        
        flow.set_additional_prop("new_prop", "new_value")
        assert flow.get_additional_prop("new_prop") == "new_value"
        
        all_props = flow.additional_props
        assert "custom" in all_props
        assert "number" in all_props
        assert "new_prop" in all_props

    def test_json_serialization_minimal(self):
        """Test JSON serialization with minimal setup"""
        navigation = Navigation(begin="start")
        flow = Flow(id="test_flow", navigation=navigation)
        
        json_str = json.dumps(flow.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_id"] == "test_flow"
        assert "_navigation" in data
        assert data["_views"] == []
        assert data["_schema"] is None
        assert data["_data"] is None
        assert "_additional_props" in data

    def test_json_serialization_full(self):
        """Test JSON serialization with all properties"""
        navigation = Navigation(begin="start")
        views = [View(id="view1", type="text")]
        schema = Schema(root=SchemaNode())
        data = {"test": "data"}
        
        flow = Flow(
            id="full_flow",
            navigation=navigation,
            views=views,
            schema=schema,
            data=data,
            custom_prop="custom"
        )
        
        json_str = json.dumps(flow.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        parsed_data = json.loads(json_str)
        
        assert parsed_data["_id"] == "full_flow"
        assert "_navigation" in parsed_data
        assert len(parsed_data["_views"]) == 1
        assert "_schema" in parsed_data
        assert parsed_data["_data"] == data
        assert parsed_data["_additional_props"]["custom_prop"] == "custom"
