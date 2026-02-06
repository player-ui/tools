from pathlib import Path
from json import dumps
from os.path import join
from player_tools_xlr_types.deserializer import deserialize_xlr_node
from ..generator import generate_python_classes

TEST_DIR= Path(__file__).parent / "__helpers__"

class TestGenerator: 
    """Test Python class generation logic"""

    def test_generate_action(self):
        """Test generation for Action Asset"""
        with open(join(TEST_DIR, "ActionAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None

            # Check generated Asset API
            from ActionAsset import ActionAsset, Metadata

            asset = ActionAsset(id = "test-asset")
            assert ActionAsset.withLabel is not None
            asset.withValue("next")
            asset.withExp("test")

            metadata = Metadata({"test": "test"}, True, "test")

            asset.withMetadata(metadata)
            assert asset.metaData is not None
            assert asset.serialize() == dumps(
                    {
                        "id": "test-asset",
                        "type": "action",
                        "value": "next", 
                        "exp": "test", 
                        "metaData" : {
                            "beacon": {
                                "test": "test",
                            },
                            "skipValidation": True,
                            "role": "test"
                        },
                    }
                , sort_keys=True, indent=4)


    def test_generate_choice(self):
        """Test generation for Choice Asset"""
        with open(join(TEST_DIR, "ChoiceAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None

    def test_generate_collection(self):
        """Test generation for Collection Asset"""
        with open(join(TEST_DIR, "CollectionAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None

    def test_generate_image(self):
        """Test generation for Image Asset"""
        with open(join(TEST_DIR, "ImageAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None

    def test_generate_info(self):
        """Test generation for Info Asset"""
        with open(join(TEST_DIR, "InfoAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "view") # type: ignore
            assert ast is not None

    def test_generate_input(self):
        """Test generation for Input Asset"""
        with open(join(TEST_DIR, "InputAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None

    def test_generate_text(self):
        """Test generation for Text Asset"""
        with open(join(TEST_DIR, "TextAsset.json"), "r", encoding="utf-8") as f:
            test_json = f.read()
            xlr = deserialize_xlr_node(test_json)
            ast = generate_python_classes(xlr, "asset") # type: ignore
            assert ast is not None
