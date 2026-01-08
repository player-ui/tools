"""
Python classes that represent Player Flow constructs
"""

from typing import Any, Dict, Optional, List
from .navigation import Navigation, NavigationFlowEndState
from .schema import Schema
from .view import View
from .utils import Serializable

DataModel = Dict[Any, Any]

class FlowResult(Serializable):
    """The data at the end of a flow"""

    def __init__(
        self,
        end_state: NavigationFlowEndState,
        data: Optional[Any] = None
    ):
        self._end_state = end_state
        self._data = data

    @property
    def end_state(self) -> NavigationFlowEndState:
        """The outcome describes _how_ the flow ended (forwards, backwards, etc)"""
        return self._end_state

    @end_state.setter
    def end_state(self, value: NavigationFlowEndState) -> None:
        self._end_state = value

    @property
    def data(self) -> Optional[Any]:
        """The serialized data-model"""
        return self._data

    @data.setter
    def data(self, value: Optional[Any]) -> None:
        self._data = value


class Flow(Serializable):
    """
    The JSON payload for running Player
    """

    def __init__(
        self,
        id: str,
        navigation: Navigation,
        views: Optional[List[View]] = None,
        schema: Optional[Schema] = None,
        data: Optional[DataModel] = None,
        **kwargs: Any
    ):
        self._id = id
        self._navigation = navigation
        self._views = views or []
        self._schema = schema
        self._data = data
        self._additional_props: Dict[str, Any] = kwargs

    @property
    def id(self) -> str:
        """A unique identifier for the flow"""
        return self._id

    @id.setter
    def id(self, value: str) -> None:
        self._id = value

    @property
    def views(self) -> List[View]:
        """A list of views (each with an ID) that can be shown to a user"""
        return self._views

    @views.setter
    def views(self, value: List[View]) -> None:
        self._views = value

    @property
    def schema(self) -> Optional[Schema]:
        """
        The schema for the supplied (or referenced data).
        This is used for validation, formatting, etc
        """
        return self._schema

    @schema.setter
    def schema(self, value: Optional[Schema]) -> None:
        self._schema = value

    @property
    def data(self) -> Optional[DataModel]:
        """Any initial data that the flow can use"""
        return self._data

    @data.setter
    def data(self, value: Optional[DataModel]) -> None:
        self._data = value

    @property
    def navigation(self) -> Navigation:
        """A state machine to drive a user through the experience"""
        return self._navigation

    @navigation.setter
    def navigation(self, value: Navigation) -> None:
        self._navigation = value

    def get_additional_prop(self, key: str) -> Any:
        """Get an additional property by key"""
        return self._additional_props.get(key)

    def set_additional_prop(self, key: str, value: Any) -> None:
        """Set an additional property"""
        self._additional_props[key] = value

    @property
    def additional_props(self) -> Dict[str, Any]:
        """Get all additional properties"""
        return self._additional_props.copy()
