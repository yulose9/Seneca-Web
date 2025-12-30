import { BubbleMenu } from "@tiptap/react/menus";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const HIGHLIGHT_COLORS = [
  { color: "#FFFF00", name: "Yellow" },
  { color: "#FF6B6B", name: "Red" },
  { color: "#51CF66", name: "Green" },
  { color: "#339AF0", name: "Blue" },
  { color: "#CC5DE8", name: "Purple" },
  { color: "#20C997", name: "Teal" },
];

const TEXT_COLORS = [
  { color: "#000000", name: "Default" },
  { color: "#6B7280", name: "Gray" },
  { color: "#DC2626", name: "Red" },
  { color: "#D97706", name: "Orange" },
  { color: "#059669", name: "Green" },
  { color: "#2563EB", name: "Blue" },
  { color: "#7C3AED", name: "Purple" },
];

const TURN_INTO_OPTIONS = [
  {
    id: "paragraph",
    label: "Text",
    icon: Type,
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    icon: Heading1,
    command: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    icon: Heading2,
    command: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    icon: Heading3,
    command: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Bullet List",
    icon: List,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered List",
    icon: ListOrdered,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    label: "To-do List",
    icon: CheckSquare,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    icon: Quote,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

export default function EditorBubbleMenu({ editor }) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const getCurrentBlockType = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("bulletList")) return "Bullet List";
    if (editor.isActive("orderedList")) return "Numbered List";
    if (editor.isActive("taskList")) return "To-do List";
    if (editor.isActive("blockquote")) return "Quote";
    return "Text";
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: { mainAxis: 10 },
      }}
    >
      <div className="bubble-menu" ref={dropdownRef}>
        {/* Turn Into Dropdown */}
        <div className="bubble-menu-dropdown-wrapper">
          <button
            type="button"
            onClick={() => toggleDropdown("turnInto")}
            className={clsx("bubble-menu-button bubble-menu-dropdown-trigger", {
              "is-active": activeDropdown === "turnInto",
            })}
            title="Turn into"
          >
            <span className="bubble-menu-dropdown-label">
              {getCurrentBlockType()}
            </span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {activeDropdown === "turnInto" && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bubble-menu-dropdown"
              >
                <div className="bubble-menu-dropdown-header">Turn into</div>
                {TURN_INTO_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        option.command(editor);
                        setActiveDropdown(null);
                      }}
                      className="bubble-menu-dropdown-item"
                    >
                      <Icon size={14} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bubble-menu-divider" />

        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("bold"),
          })}
          title="Bold (⌘B)"
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("italic"),
          })}
          title="Italic (⌘I)"
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("underline"),
          })}
          title="Underline (⌘U)"
        >
          <Underline size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("strike"),
          })}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("code"),
          })}
          title="Inline Code"
        >
          <Code size={16} />
        </button>

        <div className="bubble-menu-divider" />

        {/* Text Color */}
        <div className="bubble-menu-dropdown-wrapper">
          <button
            type="button"
            onClick={() => toggleDropdown("textColor")}
            className={clsx("bubble-menu-button", {
              "is-active": activeDropdown === "textColor",
            })}
            title="Text Color"
          >
            <Palette size={16} />
          </button>
          <AnimatePresence>
            {activeDropdown === "textColor" && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bubble-menu-dropdown bubble-menu-color-dropdown"
              >
                <div className="bubble-menu-dropdown-header">Color</div>
                <div className="bubble-menu-color-grid">
                  {TEXT_COLORS.map(({ color, name }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setActiveDropdown(null);
                      }}
                      className="bubble-menu-color-swatch"
                      title={name}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div
                  className="bubble-menu-dropdown-header"
                  style={{ marginTop: "8px" }}
                >
                  Background
                </div>
                <div className="bubble-menu-color-grid">
                  {HIGHLIGHT_COLORS.map(({ color, name }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color }).run();
                        setActiveDropdown(null);
                      }}
                      className="bubble-menu-color-swatch"
                      title={name}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bubble-menu-divider" />

        {/* Link */}
        <button
          type="button"
          onClick={setLink}
          className={clsx("bubble-menu-button", {
            "is-active": editor.isActive("link"),
          })}
          title="Link (⌘K)"
        >
          <LinkIcon size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
}
