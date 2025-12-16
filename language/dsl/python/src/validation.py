"""
Python classes that represent Player Validation constructs
"""

from typing import Any, Literal, Optional, Union, Dict
from .utils import Serializable

Severity = Literal['error', 'warning']
Trigger = Literal['navigation', 'change', 'load']
DisplayTarget = Literal['page', 'section', 'field']


class Reference(Serializable):
    """A reference to a validation object"""

    _type: str
    _message: Optional[str]
    _severity: Optional[Severity]
    _trigger: Optional[Trigger]
    _data_target: Optional[Literal['formatted', 'deformatted']]
    _display_target: Optional[DisplayTarget]
    _blocking: Optional[Union[bool, Literal['once']]]

    def __init__(
        self,
        type: str,
        message: Optional[str] = None,
        severity: Optional[Severity] = None,
        trigger: Optional[Trigger] = None,
        data_target: Optional[Literal['formatted', 'deformatted']] = None,
        display_target: Optional[DisplayTarget] = None,
        blocking: Optional[Union[bool, Literal['once']]] = None,
        **kwargs: Any
    ):
        self._type = type
        self._message = message
        self._severity = severity
        self._trigger = trigger
        self._data_target = data_target
        self._display_target = display_target
        self._blocking = blocking
        self._additional_props: Dict[str, Any] = kwargs

    @property
    def type(self) -> str:
        """
        The name of the referenced validation type
        This will be used to lookup the proper handler
        """
        return self._type

    @type.setter
    def type(self, value: str) -> None:
        self._type = value

    @property
    def message(self) -> Optional[str]:
        """An optional means of overriding the default message if the validation is triggered"""
        return self._message

    @message.setter
    def message(self, value: Optional[str]) -> None:
        self._message = value

    @property
    def severity(self) -> Optional[Severity]:
        """An optional means of overriding the default severity of the validation if triggered"""
        return self._severity

    @severity.setter
    def severity(self, value: Optional[Severity]) -> None:
        self._severity = value

    @property
    def trigger(self) -> Optional[Trigger]:
        """When to run this particular validation"""
        return self._trigger

    @trigger.setter
    def trigger(self, value: Optional[Trigger]) -> None:
        self._trigger = value

    @property
    def data_target(self) -> Optional[Literal['formatted', 'deformatted']]:
        """
        Each validation is passed the value of the data to run it's validation against.
        By default, this is the value stored in the data-model (deformatted).
        In the off chance you'd like this validator to run against the formatted 
        value (the one the user sees), set this option
        """
        return self._data_target

    @data_target.setter
    def data_target(self, value: Optional[Literal['formatted', 'deformatted']]) -> None:
        self._data_target = value

    @property
    def display_target(self) -> Optional[DisplayTarget]:
        """Where the error should be displayed"""
        return self._display_target

    @display_target.setter
    def display_target(self, value: Optional[DisplayTarget]) -> None:
        self._display_target = value

    @property
    def blocking(self) -> Optional[Union[bool, Literal['once']]]:
        """
        If the validation blocks navigation
        true/false - always/never block navigation
        once - only block navigation if the validation has not been triggered before

        @default - true for errors, 'once' for warnings
        """
        return self._blocking

    @blocking.setter
    def blocking(self, value: Optional[Union[bool, Literal['once']]]) -> None:
        self._blocking = value


class CrossfieldReference(Reference):
    """Cross-field validation reference"""

    def __init__(
        self,
        type: str,
        ref: Optional[str] = None,  # Binding
        message: Optional[str] = None,
        severity: Optional[Severity] = None,
        trigger: Optional[Trigger] = None,
        display_target: Optional[DisplayTarget] = None,
        blocking: Optional[Union[bool, Literal['once']]] = None,
        **kwargs: Any
    ):
        # Cross-field references cannot have data_target
        super().__init__(type, message, severity, trigger, None, display_target, blocking, **kwargs)
        self._ref = ref

    @property
    def ref(self) -> Optional[str]:
        """The binding to associate this validation with"""
        return self._ref

    @ref.setter
    def ref(self, value: Optional[str]) -> None:
        self._ref = value
