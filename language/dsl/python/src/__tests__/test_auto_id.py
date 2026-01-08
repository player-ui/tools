"""Tests for automatic ID generation functionality in view.py"""
import json

from ..view import (
    Asset,
    View,
)


# Mock classes that extend Asset to mimic real usage
class Collection(Asset):
    """Mock collection asset for testing"""
    
    def __init__(self, id=None):
        super().__init__(id, "collection")
    
    def withContent(self, asset):
        """Add a single content asset"""
        self._withSlot("content", asset, wrapInAssetWrapper=True, isArray=False)
        return self
    
    def withItems(self, assets):
        """Add multiple item assets as an array"""
        self._withSlot("items", assets, wrapInAssetWrapper=True, isArray=True)
        return self


class Text(Asset):
    """Mock text asset for testing"""
    
    def __init__(self, id=None, value=None):
        super().__init__(id, "text")
        if value is not None:
            self.value = value
    
    def withValue(self, value):
        """Set the text value"""
        self.value = value
        return self


class Input(Asset):
    """Mock input asset for testing"""
    
    def __init__(self, id=None, placeholder=None):
        super().__init__(id, "input")
        if placeholder is not None:
            self.placeholder = placeholder
    
    def withPlaceholder(self, placeholder):
        """Set the input placeholder"""
        self.placeholder = placeholder
        return self


class Action(Asset):
    """Mock action asset for testing"""
    
    def __init__(self, id=None, label=None):
        super().__init__(id, "action")
        if label is not None:
            self.label = label
    
    def withLabel(self, label):
        """Set the action label"""
        self.label = label
        return self


class TestAutoIDGeneration:
    """Test cases for automatic ID generation"""

    def test_asset_without_parent_has_root_id(self):
        """Test that asset without parent gets 'root' as ID"""
        asset = Text()
        
        assert asset.id == "root"

    def test_asset_with_explicit_id(self):
        """Test that explicit ID is preserved"""
        asset = Text(id="my_custom_id")
        
        assert asset.id == "my_custom_id"

    def test_asset_with_explicit_id_in_slot(self):
        """Test that explicit ID is overridden when asset is placed in a slot"""
        parent = Collection(id="parent")
        child = Text(id="explicit_id")
        
        parent.withContent(child)
        
        # The ID should be regenerated based on parent context
        assert child.id == "parent-content-text"


    def test_single_child_without_parent_id(self):
        """Test ID generation when parent has no explicit ID (parent is root)"""
        parent = Collection()  # parent ID will be "root"
        child = Text()
        
        parent.withContent(child)
        
        assert child.id == "root-content-text"

    def test_multiple_children_in_array_slot(self):
        """Test ID generation for multiple children in an array slot"""
        parent = Collection(id="parent")
        children = [
            Text(),
            Input(),
            Action()
        ]
        
        parent.withItems(children)
        
        assert children[0].id == "parent-items-0-text"
        assert children[1].id == "parent-items-1-input"
        assert children[2].id == "parent-items-2-action"

    def test_nested_assets_three_levels(self):
        """Test ID generation for nested assets (three levels)"""
        root = Collection(id="root_collection")
        middle = Collection()
        leaf = Text()
        
        root.withContent(middle)
        middle.withContent(leaf)
        
        assert root.id == "root_collection"
        assert middle.id == "root_collection-content-collection"
        assert leaf.id == "root_collection-content-collection-content-text"

    def test_nested_assets_with_arrays(self):
        """Test ID generation for nested assets including arrays"""
        root = Collection(id="outer")
        inner_collections = [
            Collection(),
            Collection()
        ]
        
        root.withItems(inner_collections)
        
        # Add children to the first inner collection
        texts = [Text(), Text()]
        inner_collections[0].withItems(texts)
        
        assert inner_collections[0].id == "outer-items-0-collection"
        assert inner_collections[1].id == "outer-items-1-collection"
        assert texts[0].id == "outer-items-0-collection-items-0-text"
        assert texts[1].id == "outer-items-0-collection-items-1-text"

    def test_view_class_auto_id(self):
        """Test that View class also supports auto ID generation"""
        view = View(id=None, type="form")
        
        assert view.id == "root"

    def test_view_with_explicit_id(self):
        """Test that View class respects explicit ID"""
        view = View(id="my_form", type="form")
        
        assert view.id == "my_form"

    def test_with_id_method_override(self):
        """Test that withID method can override auto-generated ID"""
        parent = Collection(id="parent")
        child = Text()
        
        parent.withContent(child)
        assert child.id == "parent-content-text"
        
        # Override with explicit ID
        child.withID("custom_override_id")
        assert child.id == "custom_override_id"

    def test_get_id_method_with_auto_generated_id(self):
        """Test getID method returns auto-generated ID"""
        parent = Collection(id="test_parent")
        child = Input()
        
        parent.withContent(child)
        
        assert child.getID() == "test_parent-content-input"


class TestAutoIDSerialization:
    """Test cases for serialization of auto-generated IDs"""

    def test_serialize_single_asset_with_auto_id(self):
        """Test serialization of single asset with auto-generated ID"""
        asset = Text()
        
        json_str = asset.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "root"
        assert data["type"] == "text"

    def test_serialize_single_asset_with_explicit_id(self):
        """Test serialization of single asset with explicit ID"""
        asset = Text(id="explicit_text")
        
        json_str = asset.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "explicit_text"
        assert data["type"] == "text"

    def test_serialize_parent_with_single_child(self):
        """Test serialization of parent with single child slot"""
        parent = Collection(id="parent")
        child = Text()
        
        parent.withContent(child)
        
        json_str = parent.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "parent"
        assert data["type"] == "collection"
        assert "content" in data
        assert data["content"]["asset"]["id"] == "parent-content-text"
        assert data["content"]["asset"]["type"] == "text"

    def test_serialize_parent_with_array_children(self):
        """Test serialization of parent with array of children"""
        parent = Collection(id="parent")
        children = [
            Text(),
            Input(),
            Action()
        ]
        
        parent.withItems(children)
        
        json_str = parent.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "parent"
        assert "items" in data
        assert len(data["items"]) == 3
        assert data["items"][0]["asset"]["id"] == "parent-items-0-text"
        assert data["items"][1]["asset"]["id"] == "parent-items-1-input"
        assert data["items"][2]["asset"]["id"] == "parent-items-2-action"

    def test_serialize_nested_three_levels(self):
        """Test serialization of three-level nested structure"""
        root = Collection(id="root")
        middle = Collection()
        leaf = Text()
        
        root.withContent(middle)
        middle.withContent(leaf)
        
        json_str = root.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "root"
        assert data["content"]["asset"]["id"] == "root-content-collection"
        assert data["content"]["asset"]["content"]["asset"]["id"] == "root-content-collection-content-text"

    def test_serialize_complex_nested_with_arrays(self):
        """Test serialization of complex nested structure with arrays"""
        root = Collection(id="app")
        sections = [Collection(), Collection()]
        root.withItems(sections)
        
        # First section has text items
        texts = [Text(), Text()]
        sections[0].withItems(texts)
        
        # Second section has a action
        action = Action()
        sections[1].withContent(action)
        
        json_str = root.serialize()
        data = json.loads(json_str)
        
        # Verify root
        assert data["id"] == "app"
        
        # Verify sections
        assert data["items"][0]["asset"]["id"] == "app-items-0-collection"
        assert data["items"][1]["asset"]["id"] == "app-items-1-collection"
        
        # Verify texts in first section
        assert data["items"][0]["asset"]["items"][0]["asset"]["id"] == "app-items-0-collection-items-0-text"
        assert data["items"][0]["asset"]["items"][1]["asset"]["id"] == "app-items-0-collection-items-1-text"
        
        # Verify action in second section
        assert data["items"][1]["asset"]["content"]["asset"]["id"] == "app-items-1-collection-content-action"

    def test_serialize_view_with_auto_id(self):
        """Test serialization of View with auto-generated ID"""
        view = View(id=None, type="form")
        
        json_str = view.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "root"
        assert data["type"] == "form"

    def test_serialize_empty_collection(self):
        """Test serialization of collection with no children"""
        collection = Collection(id="empty")
        
        json_str = collection.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "empty"
        assert data["type"] == "collection"

    def test_serialize_preserves_custom_properties(self):
        """Test that serialization preserves custom properties along with auto-generated ID"""
        parent = Collection(id="parent")
        text = Text(value="Hello World")
        input_field = Input(placeholder="Enter name")
        action = Action(label="Submit")
        
        parent.withItems([text, input_field, action])
        
        json_str = parent.serialize()
        data = json.loads(json_str)
        
        # Verify IDs are auto-generated
        assert data["items"][0]["asset"]["id"] == "parent-items-0-text"
        assert data["items"][1]["asset"]["id"] == "parent-items-1-input"
        assert data["items"][2]["asset"]["id"] == "parent-items-2-action"
        
        # Verify custom properties are preserved
        assert data["items"][0]["asset"]["value"] == "Hello World"
        assert data["items"][1]["asset"]["placeholder"] == "Enter name"
        assert data["items"][2]["asset"]["label"] == "Submit"


class TestAutoIDEdgeCases:
    """Test edge cases for automatic ID generation"""

    def test_same_type_multiple_times_in_array(self):
        """Test that same asset types in array get different IDs"""
        parent = Collection(id="list")
        children = [Text(), Text(), Text()]
        
        parent.withItems(children)
        
        assert children[0].id == "list-items-0-text"
        assert children[1].id == "list-items-1-text"
        assert children[2].id == "list-items-2-text"

    def test_different_slot_names_same_type(self):
        """Test that same type in different slots gets different IDs"""
        parent = Collection(id="container")
        
        # Custom implementation for testing - directly use _withSlot
        header = Text()
        footer = Text()
        
        parent._withSlot("header", header, wrapInAssetWrapper=True, isArray=False)
        parent._withSlot("footer", footer, wrapInAssetWrapper=True, isArray=False)
        
        assert header.id == "container-header-text"
        assert footer.id == "container-footer-text"

    def test_empty_array_slot(self):
        """Test parent with empty array slot"""
        parent = Collection(id="empty_list")
        parent.withItems([])
        
        json_str = parent.serialize()
        data = json.loads(json_str)
        
        assert data["id"] == "empty_list"
        assert data["items"] == []

    def test_deeply_nested_structure(self):
        """Test deeply nested structure (5 levels)"""
        level1 = Collection(id="level1")
        level2 = Collection()
        level3 = Collection()
        level4 = Collection()
        level5 = Text()
        
        level1.withContent(level2)
        level2.withContent(level3)
        level3.withContent(level4)
        level4.withContent(level5)
        
        assert level5.id == "level1-content-collection-content-collection-content-collection-content-text"

    def test_reassigning_asset_to_different_parent(self):
        """Test that reassigning asset to different parent regenerates ID"""
        parent1 = Collection(id="parent1")
        parent2 = Collection(id="parent2")
        child = Text()
        
        # First assignment
        parent1.withContent(child)
        assert child.id == "parent1-content-text"
        
        # Reassign to different parent
        parent2.withContent(child)
        assert child.id == "parent2-content-text"

    def test_parent_with_auto_generated_id(self):
        """Test child of parent that also has auto-generated ID"""
        grandparent = Collection(id="gp")
        parent = Collection()  # Will get auto-generated ID
        child = Text()
        
        grandparent.withContent(parent)
        parent.withContent(child)
        
        assert parent.id == "gp-content-collection"
        assert child.id == "gp-content-collection-content-text"

    def test_mixed_explicit_and_auto_ids(self):
        """Test mixing explicit and auto-generated IDs in hierarchy"""
        root = Collection(id="root")
        middle = Collection()  # Auto-generated
        leaf1 = Text(id="explicit_leaf")  # Will be overridden
        leaf2 = Action()  # Auto-generated
        
        root.withContent(middle)
        middle.withItems([leaf1, leaf2])
        
        assert root.id == "root"
        assert middle.id == "root-content-collection"
        # Even though leaf1 had explicit ID, it gets overridden
        assert leaf1.id == "root-content-collection-items-0-text"
        assert leaf2.id == "root-content-collection-items-1-action"



