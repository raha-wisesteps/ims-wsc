"use client";

import { useState } from "react";
import { Flag, ChevronDown } from "lucide-react";

interface TaskEditorProps {
    onAddTask: (text: string, priority: "high" | "medium" | "low") => void;
}

export default function TaskEditor({ onAddTask }: TaskEditorProps) {
    const [text, setText] = useState("");
    const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

    const handleAddTask = () => {
        if (!text.trim()) return;
        onAddTask(text, priority);
        setText("");
        setPriority("medium"); // Reset priority or keep? User might want to batch add. Let's reset to default.
    };

    const togglePriority = () => {
        const next: Record<string, "high" | "medium" | "low"> = {
            "high": "low",
            "low": "medium",
            "medium": "high"
        };
        setPriority(next[priority]);
    };

    return (
        <div className={`mb-4 group flex items-center gap-3 p-3 rounded-2xl transition-all border dark:border-white/10 shadow-sm ${priority === 'high' ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-rose-500/30 dark:focus-within:ring-rose-500/20' :
            priority === 'medium' ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-amber-500/30 dark:focus-within:ring-amber-500/20' :
                'bg-white dark:bg-white/5 border-gray-200 dark:border-emerald-500/30 dark:focus-within:ring-emerald-500/20'
            }`}>
            <button
                onClick={togglePriority}
                className={`flex items-center gap-1 h-8 pl-3 pr-2 rounded-full transition-colors cursor-pointer border ${priority === 'high' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                    priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                title="Change Priority"
            >
                <Flag className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's your focus today?"
                autoComplete="off"
                style={{
                    backgroundColor: 'transparent',
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    border: 'none',
                    WebkitAppearance: 'none'
                }}
                className="daily-plan-input flex-1 bg-transparent !bg-transparent text-sm font-medium dark:text-white text-black placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none !outline-none border-none !border-none ring-0 !ring-0 shadow-none !shadow-none focus:outline-none focus:!outline-none focus:border-none focus:ring-0 focus:shadow-none focus:bg-transparent"
                onKeyDown={(e) => {
                    e.stopPropagation(); // Critical for carousel
                    if (e.key === 'Enter') {
                        handleAddTask();
                    }
                }}
            />
        </div>
    );
}
