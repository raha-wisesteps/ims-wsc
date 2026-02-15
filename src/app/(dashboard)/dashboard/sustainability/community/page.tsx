"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
    ChevronRight,
    MessageSquare,
    Send,
    User,
    AlertCircle,
    Trash2
} from "lucide-react";
import { toast } from "sonner";

export default function SustainabilityCommunity() {
    const supabase = createClient();
    const [posts, setPosts] = useState<any[]>([]);
    const [newPost, setNewPost] = useState("");
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isIntern, setIsIntern] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUserAndPosts();
    }, []);

    const fetchUserAndPosts = async () => {
        setLoading(true);
        try {
            // 1. Get User
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", authUser.id)
                    .single();

                setUser(profile);
                setIsIntern(profile?.role === "intern");
            }

            // 2. Get Posts
            const { data: fetchedPosts, error } = await supabase
                .from("sustainability_forum_posts")
                .select(`
                    *,
                    author:profiles(id, full_name, email, role)
                `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Supabase Error Details:", JSON.stringify(error, null, 2));
                throw error;
            }
            setPosts(fetchedPosts || []);

        } catch (error: any) {
            console.error("Error fetching community data:", error.message || JSON.stringify(error));
            toast.error("Failed to load community data: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim() || isIntern) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from("sustainability_forum_posts")
                .insert([{
                    content: newPost,
                    author_id: user.id
                }]);

            if (error) throw error;

            setNewPost("");
            toast.success("Message posted successfully!");
            fetchUserAndPosts(); // Refresh list
        } catch (error: any) {
            console.error("Error posting message:", error);
            toast.error(error.message || "Failed to post message");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                        <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link href="/dashboard/sustainability" className="hover:text-[var(--text-primary)] transition-colors">Sustainability</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-[var(--text-primary)]">Community</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sustainability Community</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Share ideas, tips, and updates with the team</p>
                </div>
            </header>

            {/* Post Input */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
                {isIntern ? (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                            <h3 className="font-bold">Read Only Access</h3>
                            <p className="text-sm opacity-90 mt-1">
                                As an intern, you can view discussions but cannot post new messages. Please contact your supervisor if you have suggestions to share.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handlePostSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                                {user?.full_name?.[0] || <User className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newPost}
                                    onChange={(e) => setNewPost(e.target.value)}
                                    placeholder="Share a sustainability tip, achievement, or idea..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[100px] resize-none"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={!newPost.trim() || submitting}
                                        className="flex items-center gap-2 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                        {submitting ? "Posting..." : "Post Message"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-500" /> Recent Discussions
                </h2>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading discussions...</div>
                ) : posts.length === 0 ? (
                    <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No conversations yet</h3>
                        <p className="text-gray-400">Be the first to share something with the community!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => {
                            const isAuthor = user?.id === post.author_id;
                            const isAdmin = ['super_admin', 'ceo', 'hr', 'owner'].includes(user?.role);
                            const canDelete = isAuthor || isAdmin;

                            return (
                                <div key={post.id} className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-colors group relative">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-green-600/30 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0 border border-emerald-500/20">
                                            {post.author?.full_name?.[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-white">
                                                        {post.author?.full_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                                            {post.author?.role?.replace('_', ' ')}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure you want to delete this post?")) return;
                                                            try {
                                                                const { error } = await supabase
                                                                    .from("sustainability_forum_posts")
                                                                    .delete()
                                                                    .eq("id", post.id);
                                                                if (error) throw error;
                                                                toast.success("Post deleted");
                                                                fetchUserAndPosts();
                                                            } catch (err: any) {
                                                                toast.error("Failed to delete: " + err.message);
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                                        title="Delete Post"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {post.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
