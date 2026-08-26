# Browser Reference

> **Note:** The Browser classes (`Browser`, `BrowserItem`, `BrowserItemIterator`, `BrowserItemVector`) are part of the `Live.Browser` module in the Python API. While not included in the official Cycling '74 Live Object Model documentation, they are documented in the Live Python API and provide full access to Live's content browser.

The Browser provides access to Live's content library for loading instruments, effects, samples, and presets.

## Table of Contents
- [Accessing the Browser](#accessing-the-browser)
- [Browser Class](#browser-class)
- [BrowserItem Class](#browseritem-class)
- [BrowserItemIterator Class](#browseritemiterator-class)
- [BrowserItemVector Class](#browseritemvector-class)
- [Enumerations](#enumerations)
- [Loading Content](#loading-content)
- [Hot-Swap Mode](#hot-swap-mode)
- [Common Patterns](#common-patterns)

---

## Accessing the Browser

The Browser is accessed via the `browser` property of the Application object.

```python
# From a Control Surface script
app = self.application()
browser = app.browser

# The browser property returns an interface to the browser
```

---

## Browser Class

**Module:** `Live.Browser.Browser`

This class represents the Live browser database and provides access to all browser content categories.

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `audio_effects` | BrowserItem | R | No | Returns a browser item with access to all the Audio Effects content |
| `clips` | BrowserItem | R | No | Returns a browser item with access to all the Clips content |
| `colors` | list[BrowserItem] | R | No | Returns a list of browser items containing the configured colors |
| `current_project` | BrowserItem | R | No | Returns a browser item with access to all the Current Project content |
| `drums` | BrowserItem | R | No | Returns a browser item with access to all the Drums content |
| `filter_type` | FilterType | R | Yes | Current filter type; notification triggered when the hotswap target changes |
| `full_refresh` | - | - | Yes | Observable property; notification triggered when a full browser refresh occurs |
| `hotswap_target` | BrowserItem | R | Yes | Current hotswap target; notification triggered when the hotswap target changes |
| `instruments` | BrowserItem | R | No | Returns a browser item with access to all the Instruments content |
| `legacy_libraries` | list[BrowserItem] | R | No | Returns a list of browser items containing the installed legacy libraries (always empty in current versions) |
| `max_for_live` | BrowserItem | R | No | Returns a browser item with access to all the Max For Live content |
| `midi_effects` | BrowserItem | R | No | Returns a browser item with access to all the MIDI Effects content |
| `packs` | BrowserItem | R | No | Returns a browser item with access to all the Packs content |
| `plugins` | BrowserItem | R | No | Returns a browser item with access to all the Plugins content |
| `samples` | BrowserItem | R | No | Returns a browser item with access to all the Samples content |
| `sounds` | BrowserItem | R | No | Returns a browser item with access to all the Sounds content |
| `user_folders` | list[BrowserItem] | R | No | Returns a list of browser items containing all the user folders |
| `user_library` | BrowserItem | R | No | Returns a browser item with access to all the User Library content |

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `load_item(browser_item)` | None | Loads the provided browser item |
| `preview_item(browser_item)` | None | Previews the provided browser item |
| `stop_preview()` | None | Stop the current preview |
| `relation_to_hotswap_target(browser_item)` | Relation | Returns the relation between the given browser item and the current hotswap target |

### Listener Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `add_filter_type_listener(callback)` | None | Add a listener for filter_type changes |
| `remove_filter_type_listener(callback)` | None | Remove a filter_type listener |
| `filter_type_has_listener(callback)` | bool | Check if callback is registered for filter_type |
| `add_hotswap_target_listener(callback)` | None | Add a listener for hotswap_target changes |
| `remove_hotswap_target_listener(callback)` | None | Remove a hotswap_target listener |
| `hotswap_target_has_listener(callback)` | bool | Check if callback is registered for hotswap_target |
| `add_full_refresh_listener(callback)` | None | Add a listener for full browser refresh |
| `remove_full_refresh_listener(callback)` | None | Remove a full_refresh listener |
| `full_refresh_has_listener(callback)` | bool | Check if callback is registered for full_refresh |

### Example: Access Browser Categories
```python
browser = app.browser

# Get instruments category
instruments = browser.instruments
print(f"Instruments folder: {instruments.name}")

# List top-level items in sounds
for item in browser.sounds.children:
    print(f"Sound category: {item.name}")

# Access user library
user_lib = browser.user_library
for item in user_lib.children:
    print(f"User item: {item.name}")
```

---

## BrowserItem Class

**Module:** `Live.Browser.BrowserItem`

Represents an item in the browser hierarchy (folder, device, preset, sample, etc.).

### Properties

| Property | Type | Access | Observable | Description |
|----------|------|--------|------------|-------------|
| `children` | tuple[BrowserItem] | R | No | Const access to the descendants of this browser item |
| `is_device` | bool | R | No | Indicates if the browser item represents a device |
| `is_folder` | bool | R | No | Indicates if the browser item represents a folder |
| `is_loadable` | bool | R | No | True if item can be loaded via the Browser's `load_item` method |
| `is_selected` | bool | R | No | True if the item is ancestor of or the actual selection |
| `iter_children` | BrowserItemIterator | R | No | Const iterable access to the descendants of this browser item |
| `name` | str | R | No | Const access to the canonical display name of this browser item |
| `source` | str | R | No | Specifies where the item comes from (e.g., Live pack, user library, etc.) |
| `uri` | str | R | No | The URI describes a unique identifier for a browser item |

### Example: Navigate Browser Hierarchy
```python
def list_browser_item(item, depth=0):
    """Recursively list browser items."""
    indent = "  " * depth
    print(f"{indent}{item.name} (loadable: {item.is_loadable})")

    if item.children:
        for child in item.children:
            list_browser_item(child, depth + 1)

# List instruments
list_browser_item(browser.instruments)
```

### Example: Using iter_children
```python
def iterate_children(item):
    """Use iterator for efficient traversal."""
    iterator = item.iter_children
    try:
        while True:
            child = iterator.next()
            print(f"Child: {child.name}")
    except StopIteration:
        pass
```

---

## BrowserItemIterator Class

**Module:** `Live.Browser.BrowserItemIterator`

Iterates over children of a BrowserItem. More memory-efficient than accessing the `children` property for large collections.

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `next()` | BrowserItem | Retrieve the next item |

### Example
```python
# Iterate through children efficiently
iterator = browser.instruments.iter_children
try:
    while True:
        item = iterator.next()
        if item.is_loadable:
            print(f"Loadable: {item.name}")
except StopIteration:
    pass
```

---

## BrowserItemVector Class

**Module:** `Live.Browser.BrowserItemVector`

A container for returning browser items from Live. Used internally for collections of browser items.

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `append(item)` | None | Append a browser item to the vector |
| `extend(items)` | None | Extend the vector with multiple browser items |

---

## Enumerations

### FilterType

**Module:** `Live.Browser.FilterType`

Specifies the current browser filter mode, typically related to hot-swap operations.

| Value | Description |
|-------|-------------|
| `disabled` | Browser filtering is disabled |
| `hotswap_off` | Hot-swap mode is off |
| `instrument_hotswap` | Hot-swapping an instrument |
| `audio_effect_hotswap` | Hot-swapping an audio effect |
| `midi_effect_hotswap` | Hot-swapping a MIDI effect |
| `drum_pad_hotswap` | Hot-swapping a drum pad |
| `midi_track_devices` | Filtering for MIDI track devices |
| `samples` | Filtering for samples |
| `count` | Number of filter types (internal use) |

### Relation

**Module:** `Live.Browser.Relation`

Describes the relationship between a browser item and the current hotswap target.

| Value | Description |
|-------|-------------|
| `none` | No relationship to the hotswap target |
| `equal` | The item is the hotswap target |
| `ancestor` | The item is an ancestor of the hotswap target |
| `descendant` | The item is a descendant of the hotswap target |

---

## Loading Content

### Basic Loading

Use `browser.load_item()` to load a browser item onto the currently selected track.

```python
def load_instrument(self, track_index, item_uri):
    """Load an instrument by URI."""
    browser = self.application().browser
    track = self._song.tracks[track_index]

    # Select the track first (required for load_item to work)
    self._song.view.selected_track = track

    # Find the item
    item = self.find_browser_item_by_uri(browser, item_uri)

    if item and item.is_loadable:
        browser.load_item(item)
        return True
    return False
```

### Preview Audio

Use `preview_item()` to audition samples and sounds before loading.

```python
def preview_sample(browser, item):
    """Preview a browser item's audio."""
    if item.is_loadable:
        browser.preview_item(item)
        # Audio preview starts playing

def stop_preview(browser):
    """Stop any playing preview."""
    browser.stop_preview()
```

---

## Hot-Swap Mode

Hot-swap mode allows replacing a device or sample while maintaining its position and connections.

### Entering Hot-Swap Mode

```python
def enter_hotswap(app, device):
    """Enter Hot-Swap mode for a device."""
    # Select the device first
    song.view.select_device(device)

    # Toggle browse mode to enter hot-swap
    app.view.toggle_browse()

    # Now browser shows compatible replacements
```

### Checking Hot-Swap Relation

```python
def check_hotswap_relation(browser, item):
    """Check how an item relates to the current hotswap target."""
    from Live.Browser import Relation

    relation = browser.relation_to_hotswap_target(item)

    if relation == Relation.equal:
        print("This IS the hotswap target")
    elif relation == Relation.ancestor:
        print("This contains the hotswap target")
    elif relation == Relation.descendant:
        print("This is inside the hotswap target")
    else:
        print("No relation to hotswap target")
```

### Listening to Hot-Swap Changes

```python
def setup_hotswap_listener(browser):
    """Monitor hot-swap target changes."""
    def on_hotswap_changed():
        target = browser.hotswap_target
        filter_type = browser.filter_type
        print(f"Hotswap target changed: {target}, filter: {filter_type}")

    browser.add_hotswap_target_listener(on_hotswap_changed)
    return on_hotswap_changed  # Return for later removal
```

---

## Common Patterns

### Find Item by URI
```python
def find_browser_item_by_uri(browser, uri, max_depth=10):
    """Find a browser item by its URI across all categories."""
    categories = [
        browser.instruments,
        browser.sounds,
        browser.drums,
        browser.audio_effects,
        browser.midi_effects,
        browser.max_for_live,
        browser.plugins,
        browser.samples,
        browser.clips,
        browser.packs,
        browser.user_library,
        browser.current_project,
    ]
    # Also search user folders
    categories.extend(browser.user_folders)

    def search_item(item, depth=0):
        if item.uri == uri:
            return item
        if depth >= max_depth:
            return None
        if item.children:
            for child in item.children:
                result = search_item(child, depth + 1)
                if result:
                    return result
        return None

    for category in categories:
        result = search_item(category)
        if result:
            return result
    return None
```

### Find Item by Path
```python
def find_browser_item_by_path(browser, path):
    """Navigate to item using path like 'instruments/Analog/Bass'."""
    parts = path.split("/")

    # Map root category names to browser properties
    category_map = {
        "instruments": browser.instruments,
        "sounds": browser.sounds,
        "drums": browser.drums,
        "audio_effects": browser.audio_effects,
        "midi_effects": browser.midi_effects,
        "max_for_live": browser.max_for_live,
        "plugins": browser.plugins,
        "samples": browser.samples,
        "clips": browser.clips,
        "packs": browser.packs,
        "user_library": browser.user_library,
        "current_project": browser.current_project,
    }

    # Get root category
    root_name = parts[0].lower().replace(" ", "_")
    current = category_map.get(root_name)
    if not current:
        return None

    # Navigate through path
    for part in parts[1:]:
        if not part:
            continue
        found = False
        if current.children:
            for child in current.children:
                if child.name.lower() == part.lower():
                    current = child
                    found = True
                    break
        if not found:
            return None

    return current
```

### List Available Devices
```python
def list_loadable_devices(category, device_list=None, prefix=""):
    """Get all loadable devices in a category."""
    if device_list is None:
        device_list = []

    if category.is_loadable:
        device_list.append({
            "name": category.name,
            "path": prefix + category.name,
            "uri": category.uri,
            "is_device": category.is_device,
            "source": category.source
        })

    if category.children:
        for child in category.children:
            new_prefix = prefix + category.name + "/" if prefix else category.name + "/"
            list_loadable_devices(child, device_list, new_prefix)

    return device_list

# Usage
devices = list_loadable_devices(browser.instruments)
for d in devices[:10]:  # First 10
    print(f"{d['path']}: {d['uri']}")
```

### Get Browser Tree Structure
```python
def get_browser_tree(browser, category_type="all", max_depth=2):
    """Get a simplified browser tree."""
    def process_item(item, depth=0):
        if depth > max_depth:
            return None

        result = {
            "name": item.name,
            "uri": item.uri,
            "is_folder": item.is_folder,
            "is_device": item.is_device,
            "is_loadable": item.is_loadable,
            "children": []
        }

        if depth < max_depth and item.children:
            for child in item.children:
                child_result = process_item(child, depth + 1)
                if child_result:
                    result["children"].append(child_result)

        return result

    tree = {"categories": []}

    # Define available categories
    category_map = {
        "instruments": ("Instruments", browser.instruments),
        "sounds": ("Sounds", browser.sounds),
        "drums": ("Drums", browser.drums),
        "audio_effects": ("Audio Effects", browser.audio_effects),
        "midi_effects": ("MIDI Effects", browser.midi_effects),
        "max_for_live": ("Max for Live", browser.max_for_live),
        "plugins": ("Plugins", browser.plugins),
        "samples": ("Samples", browser.samples),
    }

    if category_type == "all":
        categories = list(category_map.values())
    else:
        cat = category_map.get(category_type)
        categories = [cat] if cat else []

    for name, category in categories:
        cat_tree = process_item(category)
        cat_tree["category_name"] = name
        tree["categories"].append(cat_tree)

    return tree
```

### Load Device onto Track
```python
def load_device_by_path(self, track_index, path):
    """Load a device using a path string."""
    browser = self.application().browser
    item = find_browser_item_by_path(browser, path)

    if not item:
        raise ValueError(f"Device not found: {path}")

    if not item.is_loadable:
        raise ValueError(f"Item not loadable: {path}")

    # Select target track
    track = self._song.tracks[track_index]
    self._song.view.selected_track = track

    # Load the device
    browser.load_item(item)

    return {
        "loaded": True,
        "name": item.name,
        "track": track.name
    }
```

### Search Browser Content
```python
def search_browser(browser, query, category=None, max_results=50):
    """Search for items matching a query string."""
    results = []
    query_lower = query.lower()

    def search_item(item, path=""):
        if len(results) >= max_results:
            return

        current_path = path + "/" + item.name if path else item.name

        # Check if name matches
        if query_lower in item.name.lower():
            if item.is_loadable:
                results.append({
                    "name": item.name,
                    "path": current_path,
                    "uri": item.uri,
                    "is_device": item.is_device,
                    "source": item.source
                })

        # Search children
        if item.children:
            for child in item.children:
                search_item(child, current_path)

    # Search in specified category or all main categories
    if category:
        categories = [getattr(browser, category)]
    else:
        categories = [
            browser.instruments,
            browser.sounds,
            browser.drums,
            browser.audio_effects,
            browser.midi_effects,
            browser.max_for_live,
            browser.plugins,
            browser.samples,
        ]

    for cat in categories:
        search_item(cat)

    return results

# Usage
results = search_browser(browser, "compressor")
for r in results:
    print(f"{r['path']}")
```

### Cache Browser URIs
```python
class BrowserCache:
    """Cache browser URIs for faster lookups."""

    def __init__(self, browser):
        self.browser = browser
        self.uri_cache = {}
        self.path_cache = {}

    def build_cache(self, categories=None, max_depth=5):
        """Build cache of all loadable items."""
        if categories is None:
            categories = ['instruments', 'sounds', 'drums', 'audio_effects', 'midi_effects']

        for cat_name in categories:
            category = getattr(self.browser, cat_name, None)
            if category:
                self._cache_item(category, cat_name, 0, max_depth)

    def _cache_item(self, item, path, depth, max_depth):
        if depth > max_depth:
            return

        if item.uri:
            self.uri_cache[item.uri] = item
            self.path_cache[path] = item

        for child in item.children:
            child_path = f"{path}/{child.name}"
            self._cache_item(child, child_path, depth + 1, max_depth)

    def get_by_uri(self, uri):
        return self.uri_cache.get(uri)

    def get_by_path(self, path):
        return self.path_cache.get(path)
```

### List All Categories
```python
def get_all_browser_categories(browser):
    """Get a dictionary of all browser category entry points."""
    return {
        'audio_effects': browser.audio_effects,
        'clips': browser.clips,
        'current_project': browser.current_project,
        'drums': browser.drums,
        'instruments': browser.instruments,
        'max_for_live': browser.max_for_live,
        'midi_effects': browser.midi_effects,
        'packs': browser.packs,
        'plugins': browser.plugins,
        'samples': browser.samples,
        'sounds': browser.sounds,
        'user_library': browser.user_library,
        'user_folders': browser.user_folders,  # This is a list
        'colors': browser.colors,  # This is a list
    }
```

---

## Limitations and Notes

- The Browser classes are part of the Live Python API (`Live.Browser` module) but are not documented in the official Cycling '74 Live Object Model reference
- Browser content and structure may vary based on installed Packs and user content
- The `load_item()` method loads content to the currently selected track - ensure the correct track is selected first
- Browser operations can be slow when traversing large content libraries
- The `legacy_libraries` property always returns an empty list in current Live versions
- Hot-swap mode requires proper device selection before toggling browse mode
- Preview playback continues until explicitly stopped with `stop_preview()` or until another preview starts

---

## See Also

- [Application.View](views.md) - For `toggle_browse()` and browser view controls
- [Song.View](song.md) - For track and device selection before loading
- [Device](device.md) - For working with loaded devices
