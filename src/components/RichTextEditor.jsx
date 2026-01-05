import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Video,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

// Slash Command
import Commands from "./editor/Commands";
import EditorBubbleMenu from "./editor/EditorBubbleMenu";
import suggestion from "./editor/suggestion";

import { storageService } from '../services/storageService';

const HIGHLIGHT_COLORS = [
  "#FFFF00",
  "#FF6B6B",
  "#51CF66",
  "#339AF0",
  "#CC5DE8",
  "#20C997",
];

// Floating Menu Quick Actions
const FLOATING_ACTIONS = [
  {
    id: "heading1",
    icon: Heading1,
    label: "Heading 1",
    command: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    icon: Heading2,
    label: "Heading 2",
    command: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "bulletList",
    icon: List,
    label: "Bullet List",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "taskList",
    icon: CheckSquare,
    label: "To-do List",
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    icon: Quote,
    label: "Quote",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "image",
    icon: ImageIcon,
    label: "Image",
    command: () =>
      window.dispatchEvent(
        new CustomEvent("editor-media-upload", { detail: { type: "image" } })
      ),
  },
];

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={clsx(
      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0",
      isActive
        ? "bg-[#007AFF] text-white"
        : "bg-transparent text-[rgba(60,60,67,0.6)] hover:bg-[rgba(120,120,128,0.12)]",
      disabled && "opacity-30 cursor-not-allowed"
    )}
  >
    {children}
  </motion.button>
);

export default function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Type / for commands...",
  className,
  autoSaveKey = "journal-draft",
}) {
  const fileInputRef = useRef(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(false);

  const saveDraft = useCallback(
    (htmlContent) => {
      try {
        if (autoSaveKey) {
          localStorage.setItem(
            autoSaveKey,
            JSON.stringify({
              content: htmlContent,
              timestamp: Date.now(),
            })
          );
        }
      } catch (e) {
        console.warn("Draft save failed:", e);
      }
    },
    [autoSaveKey]
  );

  const handleFile = async (file, editorInstance) => {
    if (!editorInstance || !file) return;

    if (file.type.startsWith("image/")) {
      try {
        const path = `uploads/${Date.now()}_${file.name}`;
        const url = await storageService.uploadImage(file, path);
        editorInstance.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        console.error("Image upload failed", e);
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => handleFile(f, editor));
    e.target.value = "";
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // The Commands extension provides its own slash command functionality
        // So we don't need to worry about it in StarterKit
      }),
      Underline, // StarterKit doesn't include underline by default
      Typography,
      Image.configure({ inline: true }),
      Link.configure({ openOnClick: false }), // Using enhanced Link
      Youtube.configure({ controls: true }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder || "Type / for commands...",
      }),
      Commands.configure({ suggestion }), // Custom slash command extension
    ],
    content,
    editorProps: {
      attributes: {
        class: clsx(
          "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-8 text-[17px] text-black prose-img:rounded-lg",
          className
        ),
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length > 0) {
          Array.from(event.dataTransfer.files).forEach((file) =>
            handleFile(file, editor)
          );
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      onChange?.(json);
      saveDraft(JSON.stringify(json));
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      // Compare JSON content to check if update is needed
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson =
        typeof content === "string" ? content : JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    const handleMediaUpload = (e) => {
      if (e.detail?.type === "image" && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };
    window.addEventListener("editor-media-upload", handleMediaUpload);
    return () =>
      window.removeEventListener("editor-media-upload", handleMediaUpload);
  }, []);

  if (!editor) return null;

  const addYoutube = () => {
    const url = prompt("Enter YouTube URL");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden relative rich-text-editor border border-[rgba(60,60,67,0.12)]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-gray-100 overflow-x-auto no-scrollbar bg-gray-50/50 sticky top-0 z-10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Code"
        >
          <Code size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

        <div className="relative">
          <ToolbarButton
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter size={16} />
          </ToolbarButton>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg p-2 flex gap-1 z-50 border border-gray-200">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: c }).run();
                    setShowHighlightPicker(false);
                  }}
                  className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Task List"
        >
          <CheckSquare size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          title="Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Image"
        >
          <ImageIcon size={16} />
        </ToolbarButton>

        <ToolbarButton onClick={addYoutube} title="YouTube">
          <Video size={16} />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />

      {/* Floating Menu - appears on empty lines */}
      <FloatingMenu
        editor={editor}
        options={{
          placement: "left-start",
          offset: { mainAxis: 0, crossAxis: -40 },
        }}
        shouldShow={({ state, view }) => {
          const { selection } = state;
          const { $anchor, empty } = selection;
          const isRootDepth = $anchor.depth === 1;
          const isEmptyTextBlock =
            $anchor.parent.isTextblock &&
            !$anchor.parent.type.spec.code &&
            !$anchor.parent.textContent;
          return empty && isRootDepth && isEmptyTextBlock;
        }}
      >
        <div className="floating-menu-wrapper">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFloatingActions(!showFloatingActions)}
            className="floating-menu-trigger"
          >
            <Plus size={16} />
          </motion.button>
          <AnimatePresence>
            {showFloatingActions && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="floating-menu-actions"
              >
                {FLOATING_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        action.command(editor);
                        setShowFloatingActions(false);
                      }}
                      className="floating-menu-action"
                      title={action.label}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FloatingMenu>

      {/* Bubble Menu - appears on text selection */}
      <EditorBubbleMenu editor={editor} />
    </div>
  );
}
