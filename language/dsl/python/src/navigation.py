"""
Python classes that represent Player Navigation constructs
"""

from typing import Any, Dict, Generic, List, Literal, Optional, TypeVar, Union
from .data import Expression, ExpressionObject
from .utils import Serializable

T = TypeVar('T', bound=str)

class Navigation(Serializable):
    """The navigation section of the flow describes a State Machine for the user."""

    _ignored_json_keys = ["begin", "flows"]

    def __init__(self, BEGIN: str, **flows: Union[str, 'NavigationFlow']):
        self._BEGIN = BEGIN
        self.additional_props: Dict[str, Union[str, 'NavigationFlow']] = flows

    @property
    def BEGIN(self) -> str:
        """The name of the Flow to begin on"""
        return self._BEGIN

    @BEGIN.setter
    def begin(self, value: str) -> None:
        self._BEGIN = value

    def get_flow(self, name: str) -> Optional[Union[str, 'NavigationFlow']]:
        """Get a flow by name"""
        return self.additional_props.get(name)

    def set_flow(self, name: str, flow: Union[str, 'NavigationFlow']) -> None:
        """Set a flow"""
        self.additional_props[name] = flow

    @property
    def flows(self) -> Dict[str, Union[str, 'NavigationFlow']]:
        """Get all flows"""
        return self.additional_props.copy()


NavigationFlowTransition = Dict[str, str]

class NavigationBaseState(Generic[T], Serializable):
    """The base representation of a state within a Flow"""

    def __init__(
        self,
        state_type: T,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__()
        self._state_type = state_type
        self._onStart = onStart
        self._onEnd = onEnd
        self._additional_props: Dict[str, Any] = kwargs

    @property
    def state_type(self) -> T:
        """A property to determine the type of state this is"""
        return self._state_type

    @state_type.setter
    def state_type(self, value: T) -> None:
        self._state_type = value

    @property
    def onStart(self) -> Optional[Union[str, List[str], ExpressionObject]]:
        """An optional expression to run when this view renders"""
        return self._onStart

    @onStart.setter
    def onStart(self, value: Optional[Union[str, List[str], ExpressionObject]]) -> None:
        self._onStart = value

    @property
    def onEnd(self) -> Optional[Union[str, List[str], ExpressionObject]]:
        """An optional expression to run before view transition"""
        return self._onEnd

    @onEnd.setter
    def onEnd(self, value: Optional[Union[str, List[str], ExpressionObject]]) -> None:
        self._onEnd = value


class NavigationFlowTransitionableState(NavigationBaseState[T]):
    """A generic state that can transition to another state"""

    def __init__(
        self,
        state_type: T,
        transitions: NavigationFlowTransition,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__(state_type, onStart, onEnd, **kwargs)
        self._transitions = transitions

    @property
    def transitions(self) -> NavigationFlowTransition:
        """A mapping of transition-name to FlowState name"""
        return self._transitions

    @transitions.setter
    def transitions(self, value: NavigationFlowTransition) -> None:
        self._transitions = value


class NavigationFlowViewState(NavigationFlowTransitionableState[Literal['VIEW']]):
    """A state representing a view"""

    def __init__(
        self,
        ref: str,
        transitions: NavigationFlowTransition,
        attributes: Optional[Dict[str, Any]] = None,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('VIEW', transitions, onStart, onEnd, **kwargs)
        self._ref = ref
        self._attributes = attributes or {}

    @property
    def ref(self) -> str:
        """An id corresponding to a view from the 'views' array"""
        return self._ref

    @ref.setter
    def ref(self, value: str) -> None:
        self._ref = value

    @property
    def attributes(self) -> Dict[str, Any]:
        """View meta-properties"""
        return self._attributes

    @attributes.setter
    def attributes(self, value: Dict[str, Any]) -> None:
        self._attributes = value


class NavigationFlowEndState(NavigationBaseState[Literal['END']]):
    """An END state of the flow."""

    def __init__(
        self,
        outcome: str,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('END', onStart, onEnd, **kwargs)
        self._outcome = outcome

    @property
    def outcome(self) -> str:
        """
        A description of _how_ the flow ended.
        If this is a flow started from another flow, the outcome determines the flow transition
        """
        return self._outcome

    @outcome.setter
    def outcome(self, value: str) -> None:
        self._outcome = value


class NavigationFlowActionState(NavigationFlowTransitionableState[Literal['ACTION']]):
    """Action states execute an expression to determine the next state to transition to"""

    def __init__(
        self,
        exp: Expression,
        transitions: NavigationFlowTransition,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('ACTION', transitions, onStart, onEnd, **kwargs)
        self._exp = exp

    @property
    def exp(self) -> Expression:
        """
        An expression to execute.
        The return value determines the transition to take
        """
        return self._exp

    @exp.setter
    def exp(self, value: Expression) -> None:
        self._exp = value


class NavigationFlowAsyncActionState(NavigationFlowTransitionableState[Literal['ASYNC_ACTION']]):
    """Action states execute an expression to determine the next state to transition to"""

    def __init__(
        self,
        exp: Expression,
        await_result: bool,
        transitions: NavigationFlowTransition,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('ASYNC_ACTION', transitions, onStart, onEnd, **kwargs)
        self._exp = exp
        self._await = await_result

    @property
    def exp(self) -> Expression:
        """
        An expression to execute.
        The return value determines the transition to take
        """
        return self._exp

    @exp.setter
    def exp(self, value: Expression) -> None:
        self._exp = value

    @property
    def await_result(self) -> bool:
        """Whether the expression(s) should be awaited before transitioning"""
        return self._await

    @await_result.setter
    def await_result(self, value: bool) -> None:
        self._await = value


class NavigationFlowExternalState(NavigationFlowTransitionableState[Literal['EXTERNAL']]):
    """
    External Flow states represent states in the FSM that 
    can't be resolved internally in Player. The flow will wait for the embedded 
    application to manage moving to the next state via a transition
    """

    def __init__(
        self,
        ref: str,
        transitions: NavigationFlowTransition,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('EXTERNAL', transitions, onStart, onEnd, **kwargs)
        self._ref = ref

    @property
    def ref(self) -> str:
        """A reference for this external state"""
        return self._ref

    @ref.setter
    def ref(self, value: str) -> None:
        self._ref = value


class NavigationFlowFlowState(NavigationFlowTransitionableState[Literal['FLOW']]):
    """Flow state that references another flow"""

    def __init__(
        self,
        ref: str,
        transitions: NavigationFlowTransition,
        onStart: Optional[Union[str, List[str], ExpressionObject]] = None,
        onEnd: Optional[Union[str, List[str], ExpressionObject]] = None,
        **kwargs: Any
    ):
        super().__init__('FLOW', transitions, onStart, onEnd, **kwargs)
        self._ref = ref

    @property
    def ref(self) -> str:
        """A reference to a FLOW id state to run"""
        return self._ref

    @ref.setter
    def ref(self, value: str) -> None:
        self._ref = value


# Union type for all navigation flow states
NavigationFlowState = Union[
    NavigationFlowViewState,
    NavigationFlowEndState,
    NavigationFlowFlowState,
    NavigationFlowActionState,
    NavigationFlowAsyncActionState,
    NavigationFlowExternalState,
]


class NavigationFlow(Serializable):
    """A state machine in the navigation"""

    _ignored_json_keys = ["states"]

    def __init__(
        self,
        start_state: str,
        on_start: Optional[Union[str, List[str], ExpressionObject]] = None,
        on_end: Optional[Union[str, List[str], ExpressionObject]] = None,
        **states: NavigationFlowState
    ):
        self._startState = start_state
        self._onStart = on_start
        self._onEnd = on_end
        self.additional_props: Dict[str, NavigationFlowState] = states

    @property
    def startState(self) -> str:
        """The first state to kick off the state machine"""
        return self._startState

    @startState.setter
    def startState(self, value: str) -> None:
        self._startState = value

    @property
    def onStart(self) -> Optional[Union[str, List[str], ExpressionObject]]:
        """An optional expression to run when this Flow starts"""
        return self._onStart

    @onStart.setter
    def onStart(self, value: Optional[Union[str, List[str], ExpressionObject]]) -> None:
        self._onStart = value

    @property
    def onEnd(self) -> Optional[Union[str, List[str], ExpressionObject]]:
        """An optional expression to run when this Flow ends"""
        return self._onEnd

    @onEnd.setter
    def onEnd(self, value: Optional[Union[str, List[str], ExpressionObject]]) -> None:
        self._onEnd = value

    def get_state(self, name: str) -> Optional[NavigationFlowState]:
        """Get a state by name"""
        return self.additional_props.get(name)

    def set_state(self, name: str, state: NavigationFlowState) -> None:
        """Set a state"""
        self.additional_props[name] = state

    @property
    def states(self) -> Dict[str, NavigationFlowState]:
        """Get all states"""
        return self.additional_props.copy()
