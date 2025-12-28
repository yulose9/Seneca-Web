import React, { useState } from 'react';
import { BubbleMenu } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Highlighter, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';

const HIGHLIGHT_COLORS = ['#FFFF00', '#FF6B6B', '#51CF66', '#339AF0', '#CC5DE8', '#20C997'];

export default function EditorBubbleMenu({ editor }) {
    const [showColors, setShowColors] = useState(false);

    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl || 'https://');

        if (url === null) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{
                duration: 100,
                zIndex: 999999,
            }}
        >
            <div className="bubble-menu">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={clsx('bubble-menu-button', { 'is-active': editor.isActive('bold') })}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={clsx('bubble-menu-button', { 'is-active': editor.isActive('italic') })}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={clsx('bubble-menu-button', { 'is-active': editor.isActive('underline') })}
                    title="Underline"
                >
                    <Underline size={16} />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={clsx('bubble-menu-button', { 'is-active': editor.isActive('strike') })}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </button>

                <div className="bubble-menu-divider" />

                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowColors(!showColors)}
                        className={clsx('bubble-menu-button', { 'is-active': editor.isActive('highlight') })}
                        title="Highlight"
                    >
                        <Highlighter size={16} />
                    </button>
                    {showColors && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '8px',
                                background: '#FFFFFF',
                                borderRadius: '8px',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                border: '1px solid rgba(60,60,67,0.12)',
                                padding: '8px',
                                display: 'flex',
                                gap: '4px',
                                zIndex: 999999,
                            }}
                        >
                            {HIGHLIGHT_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHighlight({ color }).run();
                                        setShowColors(false);
                                    }}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        backgroundColor: color,
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="bubble-menu-divider" />

                <button
                    type="button"
                    onClick={setLink}
                    className={clsx('bubble-menu-button', { 'is-active': editor.isActive('link') })}
                    title="Link"
                >
                    <LinkIcon size={16} />
                </button>
            </div>
        </BubbleMenu>
    );
}
