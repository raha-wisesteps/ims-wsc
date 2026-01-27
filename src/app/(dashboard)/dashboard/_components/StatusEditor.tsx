"use client";

import { useState } from "react";
import { MessageSquare, Check, X, Pencil } from "lucide-react";

interface StatusEditorProps {
    initialStatus: string;
    onSave: (newStatus: string) => void;
}

export default function StatusEditor({ initialStatus, onSave }: StatusEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialStatus);

    const handleSave = () => {
        if (value.trim()) {
            onSave(value.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setValue(initialStatus);
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        setValue(initialStatus);
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 mt-1 w-full animate-in fade-in zoom-in duration-200">
                <MessageSquare className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="flex-1 min-w-0 bg-black/10 dark:bg-white/10 border-none rounded px-2 py-0.5 text-sm dark:text-white text-black outline-none focus:ring-1 focus:ring-[#e8c559]"
                    autoFocus
                    onKeyDown={(e) => {
                        e.stopPropagation(); // Prevent carousel swipe
                        if (e.key === 'Enter') {
                            handleSave();
                        } else if (e.key === 'Escape') {
                            handleCancel();
                        }
                    }}
                />
                <button
                    onClick={handleSave}
                    className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                >
                    <Check className="h-3 w-3" />
                </button>
                <button
                    onClick={handleCancel}
                    className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 mt-1 group">
            <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                <p className="text-sm dark:text-white/70 text-gray-600 truncate">
                    {initialStatus}
                </p>
            </div>
            <button
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[#e8c559] transition-all"
                title="Edit Status"
            >
                <Pencil className="h-3 w-3" />
            </button>
        </div>
    );
}
