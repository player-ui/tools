"""
Python classes that represent Player View constructs
"""

from typing import List, Optional, Union, Literal, Any
from .utils import Serializable
from .validation import CrossfieldReference

def isAssetWrapperOrSwitch(obj: Any) -> bool:
    """
    Checks if obj is an instance of AssetWrapper or Switch
    """
    return isinstance(obj, (AssetWrapper, Switch))

class Slotable(Serializable):
    """
    Allows Assets/Intermediate Classes to have slots
    """

    def _withSlot(self, name: str, obj: Any, wrapInAssetWrapper: bool = True, isArray = False):
        val = obj
        if wrapInAssetWrapper:
            if isArray:
                val = []
                for index, asset in enumerate(obj):
                    wrapped = AssetWrapper(asset) if not isAssetWrapperOrSwitch(asset) else asset
                    # Set parent relationship and generate ID for the asset
                    actual_asset = wrapped.asset if isinstance(wrapped, AssetWrapper) else None
                    if actual_asset and isinstance(actual_asset, Asset):
                        actual_asset._setParent(self, name, index) #pylint: disable=protected-access
                    val.append(wrapped)
            else:
                val = AssetWrapper(obj) if not isAssetWrapperOrSwitch(obj) else obj
                # Set parent relationship and generate ID for the asset
                actual_asset = val.asset if isinstance(val, AssetWrapper) else None
                if actual_asset and isinstance(actual_asset, Asset):
                    actual_asset._setParent(self, name, None) #pylint: disable=protected-access
        self[name] = val
        return self

class Asset(Slotable):
    """
    An asset is the smallest unit of user interaction in a player View
    """

    id: str
    type: str
    _parent: Optional[Slotable]
    _slot_name: Optional[str]
    _slot_index: Optional[int]

    def __init__(self, id: Optional[str], type: str) -> None:
        self.type = type
        self._parent = None
        self._slot_name = None
        self._slot_index = None
        # Generate ID if not provided
        if id is None:
            self.id = self._generateID()
        else:
            self.id = id

    def _setParent(self, parent: Slotable, slot_name: str, slot_index: Optional[int]):
        """
        Sets the parent relationship and regenerates the ID
        """
        self._parent = parent
        self._slot_name = slot_name
        self._slot_index = slot_index
        # Regenerate ID based on parent context
        self.id = self._generateID()

    def _generateID(self) -> str:
        """
        Generates an ID based on parent ID, slot name, type, and array index
        """
        if self._parent is None:
            return "root"
        # Get parent ID - if parent is an Asset, use its ID, otherwise use "root"
        parent_id = getattr(self._parent, 'id', 'root')
        parts = [parent_id, self._slot_name, self.type]

        if self._slot_index is not None:
            parts.insert(2,str(self._slot_index))

        return "-".join(parts)

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
                 id: Optional[str],
                 type: str,
                 validation: Optional[List[CrossfieldReference]] = None
                ) -> None:
        super().__init__(id, type)
        self.validation = validation if validation else []

class AssetWrapper(Serializable):
    """
    An object that contains an asset
    """
    asset: Asset

    def __init__(self, asset: Asset):
        self.asset = asset

class SwitchCase(Serializable):
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

class Switch(Serializable):
    """
    A switch can replace an asset with the applicable case on first render
    """

    dynamic: bool
    cases: List[SwitchCase]

    def __init__(self, isDynamic = False, cases = None):
        self.dynamic = isDynamic
        self.cases = cases if cases is not None else []

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


class Template(Serializable):
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
