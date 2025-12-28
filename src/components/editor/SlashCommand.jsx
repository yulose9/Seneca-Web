import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import CommandList from './CommandList';
import {
    Heading1, Heading2, Heading3, Text, List, ListOrdered,
    Quote, Image as ImageIcon, Video, Minus, CheckSquare
} from 'lucide-react';

export const getSuggestionItems = ({ query }) => {
    return [
        {
            title: 'Text',
            description: 'Just start writing with plain text.',
            icon: <Text size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
            },
        },
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            icon: <Heading1 size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            icon: <Heading2 size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            icon: <Heading3 size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list.',
            icon: <List size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a list with numbering.',
            icon: <ListOrdered size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote.',
            icon: <Quote size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: 'Divider',
            description: 'Visually divide blocks.',
            icon: <Minus size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
        {
            title: 'Image',
            description: 'Upload an image from your device.',
            icon: <ImageIcon size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).run();
                const event = new CustomEvent('editor-media-upload', { detail: { type: 'image' } });
                window.dispatchEvent(event);
            },
        },
        {
            title: 'Video / YouTube',
            description: 'Embed a video or YouTube link.',
            icon: <Video size={18} />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).run();
                const event = new CustomEvent('editor-media-upload', { detail: { type: 'video' } });
                window.dispatchEvent(event);
            },
        },
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()));
};

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export const renderItems = () => {
    let component;
    let popup;

    return {
        onStart: (props) => {
            component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
            });

            if (!props.clientRect) {
                return;
            }

            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            });
        },

        onUpdate: (props) => {
            component.updateProps(props);

            if (!props.clientRect) {
                return;
            }

            popup[0].setProps({
                getReferenceClientRect: props.clientRect,
            });
        },

        onKeyDown: (props) => {
            if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
            }

            return component.ref?.onKeyDown(props);
        },

        onExit: () => {
            popup[0].destroy();
            component.destroy();
        },
    };
};

export default SlashCommand;
