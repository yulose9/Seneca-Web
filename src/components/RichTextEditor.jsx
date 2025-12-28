import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Heading2,
    Link as LinkIcon, Image as ImageIcon, Video, Highlighter,
    AlignLeft, AlignCenter, AlignRight,
    CheckSquare, Code, Minus, Palette
} from 'lucide-react';

// Slash Command
import Commands from './editor/Commands';
import suggestion from './editor/suggestion';

// Helper: Resize Image
const resizeImage = (file, maxWidth = 800) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const HIGHLIGHT_COLORS = ['#FFFF00', '#FF6B6B', '#51CF66', '#339AF0', '#CC5DE8', '#20C997'];

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
    <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
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
    content = '',
    onChange,
    placeholder = 'Type / for commands...',
    className,
    autoSaveKey = 'journal-draft'
}) {
    const fileInputRef = useRef(null);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

    const saveDraft = useCallback((htmlContent) => {
        try {
            if (autoSaveKey) {
                localStorage.setItem(autoSaveKey, JSON.stringify({
                    content: htmlContent,
                    timestamp: Date.now()
                }));
            }
        } catch (e) {
            console.warn('Draft save failed:', e);
        }
    }, [autoSaveKey]);

    const handleFile = async (file, editorInstance) => {
        if (!editorInstance || !file) return;

        if (file.type.startsWith('image/')) {
            try {
                const base64 = await resizeImage(file);
                editorInstance.chain().focus().setImage({ src: base64 }).run();
            } catch (e) {
                console.error("Image process failed", e);
            }
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(f => handleFile(f, editor));
        e.target.value = '';
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            Typography,
            Image.configure({ inline: true }),
            Link.configure({ openOnClick: false }),
            Youtube.configure({ controls: true }),
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Subscript,
            Superscript,
            TaskList,
            TaskItem.configure({ nested: true }),
            TextStyle,
            Color,
            Placeholder.configure({ placeholder: placeholder || 'Type / for commands...' }),
            Commands.configure({ suggestion }),
        ],
        content,
        editorProps: {
            attributes: {
                class: clsx(
                    'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-8 text-[17px] text-black prose-img:rounded-lg',
                    className
                ),
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer?.files?.length > 0) {
                    Array.from(event.dataTransfer.files).forEach(file => handleFile(file, editor));
                    return true;
                }
                return false;
            }
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
            const newJson = typeof content === 'string' ? content : JSON.stringify(content);
            if (currentJson !== newJson) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    useEffect(() => {
        const handleMediaUpload = (e) => {
            if (e.detail?.type === 'image' && fileInputRef.current) {
                fileInputRef.current.click();
            }
        };
        window.addEventListener('editor-media-upload', handleMediaUpload);
        return () => window.removeEventListener('editor-media-upload', handleMediaUpload);
    }, []);

    if (!editor) return null;

    const addYoutube = () => {
        const url = prompt('Enter YouTube URL');
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden relative rich-text-editor">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-2 border-b border-gray-100 overflow-x-auto no-scrollbar bg-gray-50/50 sticky top-0 z-10">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
                    <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
                    <UnderlineIcon size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
                    <Code size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

                <div className="relative">
                    <ToolbarButton
                        onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                        isActive={editor.isActive('highlight')}
                        title="Highlight"
                    >
                        <Highlighter size={16} />
                    </ToolbarButton>
                    {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg p-2 flex gap-1 z-50 border border-gray-200">
                            {HIGHLIGHT_COLORS.map(c => (
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

                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading">
                    <Heading2 size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
                    <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Task List">
                    <CheckSquare size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
                    <Quote size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                    <AlignLeft size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
                    <AlignCenter size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                    <AlignRight size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />

                <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
                    <Minus size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
                    <LinkIcon size={16} />
                </ToolbarButton>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Image">
                    <ImageIcon size={16} />
                </ToolbarButton>

                <ToolbarButton onClick={addYoutube} title="YouTube">
                    <Video size={16} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
        </div>
    );
}
