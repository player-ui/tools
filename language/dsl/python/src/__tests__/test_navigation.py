"""Tests for navigation.py classes"""
import json
from ..navigation import (
    Navigation, 
    CommentBase, 
    NavigationBaseState, 
    NavigationFlowTransitionableState,
    NavigationFlowViewState, 
    NavigationFlowEndState, 
    NavigationFlowActionState,
    NavigationFlowAsyncActionState, 
    NavigationFlowExternalState, 
    NavigationFlowFlowState,
    NavigationFlow,
)
from ..data import ExpressionObject


class TestNavigation:
    """Test cases for Navigation class"""

    def test_instantiation_minimal(self):
        """Test Navigation can be instantiated with minimal parameters"""
        nav = Navigation(begin="start")
        assert nav is not None
        assert nav.begin == "start"
        assert nav.flows == {}

    def test_instantiation_with_flows(self):
        """Test Navigation can be instantiated with flows"""
        flow1 = NavigationFlow(start_state="state1")
        nav = Navigation(begin="start", flow1=flow1, flow2="simple_flow")
        assert nav.begin == "start"
        assert nav.get_flow("flow1") == flow1
        assert nav.get_flow("flow2") == "simple_flow"

    def test_begin_property_getter(self):
        """Test begin property getter"""
        nav = Navigation(begin="initial_state")
        assert nav.begin == "initial_state"

    def test_begin_property_setter(self):
        """Test begin property setter"""
        nav = Navigation(begin="start")
        nav.begin = "new_start"
        assert nav.begin == "new_start"

    def test_flow_methods(self):
        """Test flow getter and setter methods"""
        nav = Navigation(begin="start")
        flow = NavigationFlow(start_state="state1")
        
        # Test getting non-existent flow
        assert nav.get_flow("nonexistent") is None
        
        # Test setting and getting flow
        nav.set_flow("test_flow", flow)
        assert nav.get_flow("test_flow") == flow
        
        # Test flows property
        all_flows = nav.flows
        assert "test_flow" in all_flows
        assert all_flows["test_flow"] == flow

    def test_json_serialization(self):
        """Test JSON serialization"""
        flow = NavigationFlow(start_state="state1")
        nav = Navigation(begin="start", test_flow=flow)
        
        json_str = json.dumps(nav.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_begin"] == "start"
        assert "_flows" in data


class TestCommentBase:
    """Test cases for CommentBase class"""

    def test_instantiation_default(self):
        """Test CommentBase can be instantiated with default parameters"""
        obj = CommentBase()
        assert obj is not None
        assert obj.comment is None

    def test_instantiation_with_comment(self):
        """Test CommentBase can be instantiated with comment"""
        comment_text = "This is a test comment"
        obj = CommentBase(comment=comment_text)
        assert obj.comment == comment_text

    def test_comment_property_getter(self):
        """Test comment property getter"""
        comment_text = "Test comment"
        obj = CommentBase(comment=comment_text)
        assert obj.comment == comment_text

    def test_comment_property_setter(self):
        """Test comment property setter"""
        obj = CommentBase()
        new_comment = "New comment"
        obj.comment = new_comment
        assert obj.comment == new_comment

    def test_json_serialization(self):
        """Test JSON serialization"""
        obj = CommentBase(comment="Test comment")
        json_str = json.dumps(obj.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_comment"] == "Test comment"


class TestNavigationBaseState:
    """Test cases for NavigationBaseState class"""

    def test_instantiation_minimal(self):
        """Test NavigationBaseState can be instantiated with minimal parameters"""
        state = NavigationBaseState(state_type="TEST")
        assert state is not None
        assert state.state_type == "TEST"
        assert state.on_start is None
        assert state.on_end is None
        assert state.comment is None

    def test_instantiation_full(self):
        """Test NavigationBaseState can be instantiated with all parameters"""
        exp_obj = ExpressionObject(exp="test_expression")
        state = NavigationBaseState(
            state_type="FULL",
            on_start="start_expr",
            on_end=exp_obj,
            comment="Test state",
            custom_prop="custom_value"
        )
        
        assert state.state_type == "FULL"
        assert state.on_start == "start_expr"
        assert state.on_end == exp_obj
        assert state.comment == "Test state"

    def test_properties_getters_setters(self):
        """Test all property getters and setters"""
        state = NavigationBaseState(state_type="TEST")
        
        # Test state_type
        new_type = "NEW_TYPE"
        state.state_type = new_type
        assert state.state_type == new_type
        
        # Test on_start
        start_expr = ["expr1", "expr2"]
        state.on_start = start_expr
        assert state.on_start == start_expr
        
        # Test on_end
        end_expr = ExpressionObject(exp="end_expression")
        state.on_end = end_expr
        assert state.on_end == end_expr

    def test_json_serialization(self):
        """Test JSON serialization"""
        state = NavigationBaseState(
            state_type="TEST",
            on_start="start_expr",
            comment="Test comment"
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "TEST"
        assert data["_on_start"] == "start_expr"
        assert data["_comment"] == "Test comment"


class TestNavigationFlowTransitionableState:
    """Test cases for NavigationFlowTransitionableState class"""

    def test_instantiation(self):
        """Test NavigationFlowTransitionableState instantiation"""
        transitions = {"next": "next_state", "back": "prev_state"}
        state = NavigationFlowTransitionableState(
            state_type="TRANSITIONABLE",
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "TRANSITIONABLE"
        assert state.transitions == transitions

    def test_transitions_property(self):
        """Test transitions property getter and setter"""
        transitions = {"action": "next_state"}
        state = NavigationFlowTransitionableState(
            state_type="TEST",
            transitions=transitions
        )
        
        assert state.transitions == transitions
        
        new_transitions = {"new_action": "new_state"}
        state.transitions = new_transitions
        assert state.transitions == new_transitions

    def test_json_serialization(self):
        """Test JSON serialization"""
        transitions = {"next": "next_state"}
        state = NavigationFlowTransitionableState(
            state_type="TEST",
            transitions=transitions
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_transitions"] == transitions


class TestNavigationFlowViewState:
    """Test cases for NavigationFlowViewState class"""

    def test_instantiation_minimal(self):
        """Test NavigationFlowViewState minimal instantiation"""
        transitions = {"next": "next_view"}
        state = NavigationFlowViewState(
            ref="view1",
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "VIEW"
        assert state.ref == "view1"
        assert state.transitions == transitions
        assert state.attributes == {}

    def test_instantiation_with_attributes(self):
        """Test NavigationFlowViewState with attributes"""
        transitions = {"submit": "next_state"}
        attributes = {"title": "Test View", "required": True}
        
        state = NavigationFlowViewState(
            ref="view1",
            transitions=transitions,
            attributes=attributes
        )
        
        assert state.attributes == attributes

    def test_properties(self):
        """Test ref and attributes properties"""
        transitions = {"next": "next_state"}
        state = NavigationFlowViewState(ref="view1", transitions=transitions)
        
        # Test ref property
        state.ref = "new_view"
        assert state.ref == "new_view"
        
        # Test attributes property
        new_attrs = {"color": "blue", "size": "large"}
        state.attributes = new_attrs
        assert state.attributes == new_attrs

    def test_json_serialization(self):
        """Test JSON serialization"""
        transitions = {"next": "next_state"}
        attributes = {"title": "Test"}
        state = NavigationFlowViewState(
            ref="view1",
            transitions=transitions,
            attributes=attributes
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "VIEW"
        assert data["_ref"] == "view1"
        assert data["_attributes"] == attributes


class TestNavigationFlowEndState:
    """Test cases for NavigationFlowEndState class"""

    def test_instantiation(self):
        """Test NavigationFlowEndState instantiation"""
        state = NavigationFlowEndState(outcome="completed")
        
        assert state is not None
        assert state.state_type == "END"
        assert state.outcome == "completed"

    def test_outcome_property(self):
        """Test outcome property getter and setter"""
        state = NavigationFlowEndState(outcome="success")
        assert state.outcome == "success"
        
        state.outcome = "cancelled"
        assert state.outcome == "cancelled"

    def test_json_serialization(self):
        """Test JSON serialization"""
        state = NavigationFlowEndState(
            outcome="completed",
            comment="End of flow"
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "END"
        assert data["_outcome"] == "completed"


class TestNavigationFlowActionState:
    """Test cases for NavigationFlowActionState class"""

    def test_instantiation(self):
        """Test NavigationFlowActionState instantiation"""
        expression = "calculateNextState()"
        transitions = {"success": "next_state", "failure": "error_state"}
        
        state = NavigationFlowActionState(
            exp=expression,
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "ACTION"
        assert state.exp == expression
        assert state.transitions == transitions

    def test_exp_property(self):
        """Test exp property getter and setter"""
        transitions = {"next": "next_state"}
        state = NavigationFlowActionState(
            exp="initial_expression",
            transitions=transitions
        )
        
        assert state.exp == "initial_expression"
        
        new_expression = ["expr1", "expr2"]
        state.exp = new_expression
        assert state.exp == new_expression

    def test_json_serialization(self):
        """Test JSON serialization"""
        expression = "testExpression()"
        transitions = {"next": "next_state"}
        
        state = NavigationFlowActionState(
            exp=expression,
            transitions=transitions
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "ACTION"
        assert data["_exp"] == expression


class TestNavigationFlowAsyncActionState:
    """Test cases for NavigationFlowAsyncActionState class"""

    def test_instantiation(self):
        """Test NavigationFlowAsyncActionState instantiation"""
        expression = "asyncOperation()"
        transitions = {"success": "success_state"}
        
        state = NavigationFlowAsyncActionState(
            exp=expression,
            await_result=True,
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "ASYNC_ACTION"
        assert state.exp == expression
        assert state.await_result is True
        assert state.transitions == transitions

    def test_await_result_property(self):
        """Test await_result property getter and setter"""
        transitions = {"next": "next_state"}
        state = NavigationFlowAsyncActionState(
            exp="async_exp",
            await_result=False,
            transitions=transitions
        )
        
        assert state.await_result is False
        
        state.await_result = True
        assert state.await_result is True

    def test_json_serialization(self):
        """Test JSON serialization"""
        expression = "asyncCall()"
        transitions = {"done": "completed_state"}
        
        state = NavigationFlowAsyncActionState(
            exp=expression,
            await_result=True,
            transitions=transitions
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "ASYNC_ACTION"
        assert data["_await"] is True


class TestNavigationFlowExternalState:
    """Test cases for NavigationFlowExternalState class"""

    def test_instantiation(self):
        """Test NavigationFlowExternalState instantiation"""
        transitions = {"continue": "next_state", "cancel": "end_state"}
        
        state = NavigationFlowExternalState(
            ref="external_service_1",
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "EXTERNAL"
        assert state.ref == "external_service_1"
        assert state.transitions == transitions

    def test_ref_property(self):
        """Test ref property getter and setter"""
        transitions = {"next": "next_state"}
        state = NavigationFlowExternalState(ref="service1", transitions=transitions)
        
        assert state.ref == "service1"
        
        state.ref = "new_service"
        assert state.ref == "new_service"

    def test_json_serialization(self):
        """Test JSON serialization"""
        transitions = {"done": "complete"}
        state = NavigationFlowExternalState(
            ref="external_ref",
            transitions=transitions
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "EXTERNAL"
        assert data["_ref"] == "external_ref"


class TestNavigationFlowFlowState:
    """Test cases for NavigationFlowFlowState class"""

    def test_instantiation(self):
        """Test NavigationFlowFlowState instantiation"""
        transitions = {"completed": "next_flow", "cancelled": "end_flow"}
        
        state = NavigationFlowFlowState(
            ref="sub_flow_id",
            transitions=transitions
        )
        
        assert state is not None
        assert state.state_type == "FLOW"
        assert state.ref == "sub_flow_id"
        assert state.transitions == transitions

    def test_ref_property(self):
        """Test ref property getter and setter"""
        transitions = {"next": "next_state"}
        state = NavigationFlowFlowState(ref="flow1", transitions=transitions)
        
        assert state.ref == "flow1"
        
        state.ref = "flow2"
        assert state.ref == "flow2"

    def test_json_serialization(self):
        """Test JSON serialization"""
        transitions = {"end": "final_state"}
        state = NavigationFlowFlowState(
            ref="referenced_flow",
            transitions=transitions
        )
        
        json_str = json.dumps(state.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        assert data["_state_type"] == "FLOW"
        assert data["_ref"] == "referenced_flow"


class TestNavigationFlow:
    """Test cases for NavigationFlow class"""

    def test_instantiation_minimal(self):
        """Test NavigationFlow minimal instantiation"""
        flow = NavigationFlow(start_state="initial")
        
        assert flow is not None
        assert flow.start_state == "initial"
        assert flow.on_start is None
        assert flow.on_end is None
        assert flow.states == {}

    def test_instantiation_with_states(self):
        """Test NavigationFlow instantiation with states"""
        end_state = NavigationFlowEndState(outcome="completed")
        view_state = NavigationFlowViewState(
            ref="view1", 
            transitions={"next": "end"}
        )
        
        flow = NavigationFlow(
            start_state="view",
            on_start="initFlow()",
            view=view_state,
            end=end_state
        )
        
        assert flow.start_state == "view"
        assert flow.on_start == "initFlow()"
        assert flow.get_state("view") == view_state
        assert flow.get_state("end") == end_state

    def test_properties(self):
        """Test all property getters and setters"""
        flow = NavigationFlow(start_state="start")
        
        # Test start_state
        flow.start_state = "new_start"
        assert flow.start_state == "new_start"
        
        # Test on_start
        start_exp = ExpressionObject(exp="startExpression")
        flow.on_start = start_exp
        assert flow.on_start == start_exp
        
        # Test on_end
        end_exp = ["endExpr1", "endExpr2"]
        flow.on_end = end_exp
        assert flow.on_end == end_exp

    def test_state_methods(self):
        """Test state getter and setter methods"""
        flow = NavigationFlow(start_state="start")
        
        # Test getting non-existent state
        assert flow.get_state("nonexistent") is None
        
        # Test setting and getting state
        state = NavigationFlowEndState(outcome="test")
        flow.set_state("test_state", state)
        assert flow.get_state("test_state") == state
        
        # Test states property
        all_states = flow.states
        assert "test_state" in all_states
        assert all_states["test_state"] == state

    def test_json_serialization(self):
        """Test JSON serialization"""
        view_state = NavigationFlowViewState(
            ref="view1",
            transitions={"next": "end"}
        )
        end_state = NavigationFlowEndState(outcome="completed")
        
        flow = NavigationFlow(
            start_state="view",
            on_start="init()",
            view=view_state,
            end=end_state
        )
        
        json_str = json.dumps(flow.__dict__, default=lambda o: o.__dict__)
        assert json_str is not None
        data = json.loads(json_str)
        
        assert data["_start_state"] == "view"
        assert data["_on_start"] == "init()"
        assert "_states" in data
        assert len(data["_states"]) == 2
