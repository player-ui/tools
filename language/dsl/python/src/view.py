"""
Python classes that represent Player View constructs
"""

from typing import List, Optional, Union, Literal, Any
from json import dumps
from .validation import CrossfieldReference


def isPrivateProperty(string: str):
    """
    Checks if a key indicates a private property (starts with _ and doesn't end with __)
    """
    return string.startswith("_") and not string.endswith("__")

def isInternalMethod(string: str):
    """
    Checks if a key indicates a private property (starts and ends with __)
    """
    return string.startswith("__") and string.endswith("__")

def _default_json_encoder(obj):
    if hasattr(obj, "serialize"):
        return obj._serialize() # pylint: disable=protected-access
    else:
        return lambda o: o.__dict__

def isAssetWrapperOrSwitch(obj: Any) -> bool:
    """
    Checks if obj is an instance of AssetWrapper or Switch
    """
    return isinstance(obj, (AssetWrapper, Switch))

class Serializable():
    """
    Base class to allow for custom JSON serialization
    """
    # Map of properties that aren't valid Python properties to their serialized value
    _propMap: dict[str, str]
    # Types that should be handled by the base serialization logic
    _jsonable = (int, list, str, dict)
    # Keys that should be ignored during serialization
    _ignored_json_keys = []

    def _serialize(self):
        _dict = dict()
        for attr in dir(self):
            value = getattr(self, attr)
            key = attr

            if isInternalMethod(attr) or key in getattr(self, "_ignored_json_keys", []):
                continue
            elif isinstance(value, self._jsonable) or value is None or hasattr(value, 'to_dict'):
                pass
            else:
                continue

            if self._propMap.get(key, None) is not None:
                key = self._propMap[key]
            elif(isPrivateProperty(attr) and not isInternalMethod(attr)):
                key = attr.replace("_", "")

            _dict[key] = value
        return _dict

    def serialize(self, **kw):
        """
        Serialize this and all children to JSON
        """
        indent = kw.pop("indent", 4)  # use indent key if passed otherwise 4.
        _ignored_json_keys = kw.pop("ignored_keys", []) + ['_propMap', '_ignored_json_keys']
        if _ignored_json_keys:
            self._ignored_json_keys = _ignored_json_keys

        return dumps(self, indent=indent, default=_default_json_encoder, **kw)

    def __setitem__(self, property, data):
        self.__dict__[property] = data

    def __getitem__(self, property):
        return self[property]

    def _withSlot(self, name: str, obj: Any, wrapInAssetWrapper: bool = True, isArray = False):
        val = obj
        if wrapInAssetWrapper:
            if isArray:
                val = list(
                    map(
                        lambda asset: AssetWrapper(asset) if not isAssetWrapperOrSwitch(asset)
                        else asset, obj
                    )
                )
            else:
                val = AssetWrapper(obj) if isAssetWrapperOrSwitch(obj) else obj
        self[name] = val
        return self

class Asset(Serializable):
    """
    An asset is the smallest unit of user interaction in a player View
    """

    id: str
    type: str

    def __init__(self, id:str, type:str) -> None:
        self.id = id
        self.type = type

    def withID(self, id: str):
        """
        Sets the ID for an Asset
        """
        self.id = id
        return self

    def getID(self):
        """
        Returns the ID of the asset
        """
        return self.id

class View(Asset):
    """
    A top level Asset that usually dictates layout information for the page, 
    and can also contain validation logic that runs over multiple fields
    """

    validation: Union[List[CrossfieldReference],None]

    def __init__(self,
                 id: str,
                 type: str,
                 validation: Optional[List[CrossfieldReference]] = None
                ) -> None:
        super().__init__(id, type)
        self.validation = validation if validation else []

class AssetWrapper():
    """
    An object that contains an asset
    """
    asset: Asset

    def __init__(self, asset: Asset):
        self.asset = asset

class SwitchCase():
    """
    A single case statement to use in a switch
    """

    exp: str
    asset: Asset

    def __init__(self, exp: str):
        self.exp = exp

    def withAsset(self, asset: Asset):
        """
        Sets the Asset for the SwitchCase
        """
        self.asset = asset
        return self

class Switch():
    """
    A switch can replace an asset with the applicable case on first render
    """

    dynamic: bool
    cases: List[SwitchCase] = []

    def __init__(self, isDynamic = False):
        self.dynamic = isDynamic

    def isDynamic(self, isDynamic):
        """
        Sets the isDynamic property of the Switch
        """
        self.dynamic = isDynamic

    def withCase(self, case: SwitchCase):
        """
        Adds a single Case to the Switch
        """
        self.cases.append(case)

    def withCases(self, cases: List[SwitchCase]):
        """
        Sets all Cases of the Switch
        """
        self.cases = cases


AssetWrapperOrSwitch = Union[AssetWrapper, Switch]


class Template():
    """
    A template describes a mapping from a data array -> array of objects
    """

    data: str
    output: str
    dynamic: bool
    placement: Literal['append', 'prepend']
    value: AssetWrapperOrSwitch

    def __init__(self, isDynamic = False):
        self.dynamic = isDynamic

    def withData(self, data: str):
        """
        Sets the data property of the Template
        """
        self.data = data
        return self

    def withOutput(self, output: str):
        """
        Sets the output target of the Template
        """
        self.output = output
        return self

    def isDynamic(self, isDynamic: bool):
        """
        Sets the isDynamic property of the Template
        """
        self.dynamic = isDynamic
        return self

    def withPlacement(self, placement: Literal['append', 'prepend']):
        """
        Sets the placement attribute of the Template
        """
        self.placement = placement
        return self

    def withAsset(self, asset: AssetWrapperOrSwitch):
        """
        Sets the asset for the Template to expand
        """
        self.value = asset
        return self
