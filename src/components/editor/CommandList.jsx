import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
    Heading1, Heading2, Heading3, Text, List, ListOrdered,
    Quote, Image as ImageIcon, Video, Minus, CheckSquare
} from 'lucide-react';

export const CommandList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[300px] p-1 flex flex-col gap-0.5">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        key={index}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors",
                            index === selectedIndex ? "bg-gray-100 text-black" : "text-gray-600 hover:bg-gray-50"
                        )}
                        onClick={() => selectItem(index)}
                    >
                        <div className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded text-gray-500 shrink-0">
                            {item.icon}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium">{item.title}</span>
                            {item.description && (
                                <span className="text-xs text-gray-400">{item.description}</span>
                            )}
                        </div>
                    </button>
                ))
            ) : (
                <div className="px-3 py-2 text-sm text-gray-400">No result</div>
            )}
        </div>
    );
});

export default CommandList;
