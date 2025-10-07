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
                val = AssetWrapper(obj) if not isAssetWrapperOrSwitch(obj) else obj
        self[name] = val
        return self

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
