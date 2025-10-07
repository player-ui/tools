from pathlib import Path
from os.path import join
from ..deserializer import deserialize_xlr_node

TEST_FILE = join(Path(__file__).parent,"__helpers__","test.json")

class TestDeserializer: 
    """Test deserialization logic"""

    def test_named_object(self):
        """tests deserialization"""
        with open(TEST_FILE, "r", encoding="utf-8") as f:
            test_json = f.read()
            ast = deserialize_xlr_node(test_json)
            assert ast is not None
