"""
Common Serialization Utility
"""

from types import NoneType
from json import dumps

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

class Serializable():
    """
    Base class to allow for custom JSON serialization
    """
    # Map of properties that aren't valid Python properties to their serialized value
    _propMap: dict[str, str] = {}
    # Types that should be handled by the base serialization logic
    _jsonable = (int, list, str, dict, NoneType)
    # Keys that should be ignored during serialization
    _ignored_json_keys = ['_propMap', '_ignored_json_keys', '_parent', "_slot_name", "_slot_index"]

    def _serialize(self):
        _dict = dict()
        for attr in dir(self):
            value = getattr(self, attr)
            key = attr
            if isInternalMethod(attr) or key in getattr(self, "_ignored_json_keys", []):
                continue
            elif isinstance(value, (self._jsonable, Serializable)) or hasattr(value, 'to_dict'):
                if self._propMap.get(key, None) is not None:
                    key = self._propMap[key]
                elif(isPrivateProperty(attr) and not isInternalMethod(attr)):
                    key = attr.replace("_", "")

                _dict[key] = value
            else:
                continue
        return _dict

    def serialize(self, **kw):
        """
        Serialize this and all children to JSON
        """
        indent = kw.pop("indent", 4)  # use indent key if passed otherwise 4.
        _ignored_json_keys = kw.pop("ignored_keys", [])
        if _ignored_json_keys:
            self._ignored_json_keys += _ignored_json_keys

        return dumps(self, indent=indent, default=_default_json_encoder, **kw)

    def __setitem__(self, property, data):
        self.__dict__[property] = data

    def __getitem__(self, property):
        return self[property]
