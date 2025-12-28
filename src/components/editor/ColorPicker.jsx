import React from 'react';

const ColorPicker = ({ onSelect, onClose }) => {
    const colors = ['#FFFF00', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FEF08A', '#FECACA', '#BBF7D0', '#BFDBFE'];
    return (
        <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg p-2 flex gap-1 z-50 border border-gray-200 flex-wrap w-[150px]">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => onSelect(c)}
                    className="w-6 h-6 rounded-full border border-gray-100 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    title={c}
                />
            ))}
            <div className="fixed inset-0 z-[-1]" onClick={onClose} />
        </div>
    );
};

export default ColorPicker;
