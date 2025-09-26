from typing import List, Optional, Union, Literal, Any
from validation import CrossfieldReference
from json import dumps


def isPrivateProperty(string: str):
    return string.startswith("_") and not string.endswith("__")

def isInternalMethod(string: str):
    return string.startswith("__") and string.endswith("__")

def _default_json_encoder(obj):
    if hasattr(obj, "serialize"):
        return obj._serialize()
    else:
        return lambda o: o.__dict__
    
def isAssetWrapperOrSwitch(obj: Any) -> bool :
    return isinstance(obj, AssetWrapper) or isinstance(obj, Switch)

class Serializable():

    #Map of properties that aren't valid Python properties to their serialized value
    _propMap: dict[str, str]

    def _serialize(self):
        self._jsonable = (int, list, str, dict)
        _dict = dict()
        for attr in dir(self):
            value = getattr(self, attr)
            key = attr

            if isInternalMethod(attr) or key in getattr(self, "_ignored_json_keys", []):
                continue
            elif isinstance(value, self._jsonable) or value is None or hasattr(value, 'to_dict'):
                value = value
            else:
                continue

            if(self._propMap.get(key, None) is not None):
                key = self._propMap[key]
            elif(isPrivateProperty(attr) and not isInternalMethod(attr)):
                key = attr.replace("_", "")

            _dict[key] = value
        return _dict

    def serialize(self, **kw):
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
        if(wrapInAssetWrapper):
            if(isArray):
                val = list(map(lambda asset: AssetWrapper(asset) if not isAssetWrapperOrSwitch(asset) else asset, obj))
            else:
                val = AssetWrapper(obj) if isAssetWrapperOrSwitch(obj) else obj
        
            
        self[name] = val
        return self

class Asset(Serializable):
    id: str
    type: str

    def __init__(self, id:str, type:str) -> None:
        self.id = id
        self.type = type
    
    def withID(self, id: str):
        self.id = id
        return self
    
    def _getID(self):
        return self.id

class View(Asset):
    
    validation: Union[List[CrossfieldReference],None]

    def __init__(self, id: str, type: str, validation: Optional[List[CrossfieldReference]] = []) -> None:
        super().__init__(id, type)
        self.validation = validation if validation else []
    
          
class AssetWrapper():
     
     asset: Asset
     
     def __init__(self, asset: Asset):
          self.asset = asset

class Case():

    exp: str
    asset: Asset

    def __init__(self, exp: str):
        self.exp = exp
    
    def withAsset(self, asset: Asset):
        self.asset = asset
        return self

class Switch():

    dynamic: bool
    cases: List[Case] = []

    def __init__(self, isDynamic = False):
        self.dynamic = isDynamic

    def isDynamic(self, isDynamic):
        self.dynamic = isDynamic

    def withCase(self, case: Case):
        self.cases.append(case)
    
    def withCases(self, cases: List[Case]):
        self.cases = cases


AssetWrapperOrSwitch = Union[AssetWrapper, Switch]


class Template():

    data: str
    output: str
    dynamic: bool
    placement: Literal['append', 'prepend']
    value: AssetWrapperOrSwitch

    def __init__(self, isDynamic = False):
        self.dynamic = isDynamic

    def withData(self, data: str):
        self.data = data
        return self
    
    def withOutput(self, output: str):
        self.output = output
        return self
    
    def isDynamic(self, isDynamic: bool):
        self.dynamic = isDynamic
        return self
    
    def withPlacement(self, placement: Literal['append', 'prepend']):
        self.placement = placement
        return self
    
    def withAsset(self, asset: AssetWrapperOrSwitch):
        self.value = asset
        return self

