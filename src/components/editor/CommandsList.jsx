import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import clsx from 'clsx';

const CommandsList = forwardRef((props, ref) => {
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

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

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
        <div className="dropdown-menu">
            {props.items.length > 0 ? (
                props.items.map((item, index) => (
                    <button
                        key={index}
                        className={clsx('dropdown-item', { 'is-selected': index === selectedIndex })}
                        onClick={() => selectItem(index)}
                    >
                        {item.icon && (
                            <span className="dropdown-item-icon">{item.icon}</span>
                        )}
                        <div className="dropdown-item-content">
                            <span className="dropdown-item-title">{item.title}</span>
                            {item.description && (
                                <span className="dropdown-item-description">{item.description}</span>
                            )}
                        </div>
                    </button>
                ))
            ) : (
                <div className="dropdown-item no-result">No result</div>
            )}
        </div>
    );
});

CommandsList.displayName = 'CommandsList';

export default CommandsList;
