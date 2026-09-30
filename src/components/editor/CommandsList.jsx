import clsx from "clsx";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Icon components for better visuals
const CommandIcon = ({ icon, color = "bg-fill" }) => (
  <div
    className={clsx(
      "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
      color
    )}
  >
    {icon}
  </div>
);

// Category mapping for grouping
const CATEGORIES = {
  "Basic Blocks": ["Text", "Heading 1", "Heading 2", "Heading 3"],
  Lists: ["Bullet List", "Numbered List", "Task List", "Toggle List"],
  Blocks: ["Quote", "Code Block", "Callout", "Divider"],
  Media: ["Image", "YouTube", "Link"],
  Alignment: ["Align Left", "Align Center", "Align Right"],
  Advanced: ["Table", "Table of Contents", "Emoji"],
};

// Color mapping for icons
const ICON_COLORS = {
  Text: "bg-fill",
  "Heading 1": "bg-purple/15",
  "Heading 2": "bg-purple/15",
  "Heading 3": "bg-purple/15",
  "Bullet List": "bg-accent/12",
  "Numbered List": "bg-accent/12",
  "Task List": "bg-positive/15",
  "Toggle List": "bg-caution/15",
  Quote: "bg-yellow/20",
  "Code Block": "bg-fill",
  Callout: "bg-yellow/20",
  Divider: "bg-fill",
  Image: "bg-negative/10",
  YouTube: "bg-negative/12",
  Link: "bg-accent/12",
  "Align Left": "bg-indigo/12",
  "Align Center": "bg-indigo/12",
  "Align Right": "bg-indigo/12",
  Table: "bg-teal/15",
  "Table of Contents": "bg-teal/15",
  Emoji: "bg-yellow/20",
};

// Keyboard shortcut hints
const SHORTCUTS = {
  "Heading 1": "⌘⌥1",
  "Heading 2": "⌘⌥2",
  "Heading 3": "⌘⌥3",
  "Bullet List": "⌘⇧8",
  "Numbered List": "⌘⇧7",
  "Task List": "⌘⇧9",
  Quote: "⌘⇧B",
  "Code Block": "⌘⌥C",
};

const CommandsList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      // Instant: keyboard navigation must never lag behind the key press
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      // Tab to navigate down, Shift+Tab to navigate up (like Notion)
      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) {
          upHandler();
        } else {
          downHandler();
        }
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  // Group items by category
  const groupedItems = () => {
    const groups = {};
    props.items.forEach((item, idx) => {
      let category = "Other";
      for (const [cat, items] of Object.entries(CATEGORIES)) {
        if (items.includes(item.title)) {
          category = cat;
          break;
        }
      }
      if (!groups[category]) groups[category] = [];
      groups[category].push({ ...item, globalIndex: idx });
    });
    return groups;
  };

  const groups = groupedItems();

  return (
    <div
      // Keyboard-driven ("/" + arrow keys): rendered statically, no animation.
      className="slash-command-menu"
      ref={listRef}
    >
      {props.items.length > 0 ? (
        <div className="slash-command-content">
          {Object.entries(groups).map(([category, items]) => (
            <div key={category} className="slash-command-group">
              <div className="slash-command-category">{category}</div>
              {items.map((item) => (
                <button
                  type="button"
                  key={item.globalIndex}
                  ref={item.globalIndex === selectedIndex ? selectedRef : null}
                  className={clsx(
                    "slash-command-item group",
                    item.globalIndex === selectedIndex && "is-selected"
                  )}
                  onClick={() => selectItem(item.globalIndex)}
                  onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                >
                  <CommandIcon
                    icon={item.icon}
                    color={ICON_COLORS[item.title] || "bg-fill"}
                  />
                  <div className="slash-command-item-content">
                    <div className="slash-command-item-header">
                      <span className="slash-command-item-title">
                        {item.title}
                      </span>
                      {SHORTCUTS[item.title] && (
                        <span className="slash-command-shortcut">
                          {SHORTCUTS[item.title]}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <span className="slash-command-item-description">
                        {item.description}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="slash-command-empty">
          <span className="slash-command-empty-icon">🔍</span>
          <span className="slash-command-empty-text">No results found</span>
          <span className="slash-command-empty-hint">
            Try a different search term
          </span>
        </div>
      )}
    </div>
  );
});

CommandsList.displayName = "CommandsList";

export default CommandsList;
