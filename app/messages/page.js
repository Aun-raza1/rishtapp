"use client";

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ConversationSidebar from "@/components/messages/ConversationSidebar";
import ChatThread from "@/components/messages/ChatThread";
import Navbar from "@/components/Navbar";

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");

  const [user, setUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async (currentUser, currentProfile) => {
    // Step 1a: fetch accepted interests where I am the sender
    const { data: sentAccepted } = await supabase
      .from("interests")
      .select("*")
      .eq("sender_id", currentUser.id)
      .eq("status", "accepted");

    // Step 1b: fetch accepted interests where I am the receiver
    const { data: receivedAccepted } = await supabase
      .from("interests")
      .select("*")
      .eq("receiver_id", currentUser.id)
      .eq("status", "accepted");

    const allAccepted = [
      ...(sentAccepted || []),
      ...(receivedAccepted || []),
    ];

    if (allAccepted.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Collect the other person's ID for each match
    const otherUserIds = allAccepted.map((i) =>
      i.sender_id === currentUser.id ? i.receiver_id : i.sender_id
    );

    // Deduplicate
    const uniqueOtherIds = [...new Set(otherUserIds)];

    // Step 2: fetch profiles of those users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", uniqueOtherIds);

    if (!profiles) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Step 3: for each conversation, fetch the latest message
    const conversationList = await Promise.all(
      profiles.map(async (profile) => {
        const otherId = profile.user_id;

        const { data: lastMsgData } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMsgData?.[0] || null;

        // Count unread messages (received by me, not yet read)
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", otherId)
          .eq("receiver_id", currentUser.id)
          .eq("read", false);

        return {
          profile,
          lastMessage,
          unreadCount: unreadCount || 0,
        };
      })
    );

    // Sort by most recent message
    conversationList.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || "0";
      const bTime = b.lastMessage?.created_at || "0";
      return new Date(bTime) - new Date(aTime);
    });

    setConversations(conversationList);

    // If ?with= param exists, auto-select that conversation
    if (withParam) {
      const target = conversationList.find(
        (c) => c.profile.user_id === withParam
      );
      if (target) setSelectedConversation(target);
    }

    setLoading(false);
  }, [withParam]);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      setMyProfile(profile);
      await fetchConversations(authUser, profile);
    };

    init();
  }, [fetchConversations]);

  // Update last_seen on mount and every 60 seconds while on page
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSelectConversation = (convo) => {
    setSelectedConversation(convo);
    // Mark unread count as 0 locally immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.profile.user_id === convo.profile.user_id
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };

  const handleNewMessage = (message, otherUserId) => {
    // Update sidebar last message optimistically
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.profile.user_id === otherUserId) {
          return { ...c, lastMessage: message, unreadCount: 0 };
        }
        return c;
      });
      // Re-sort
      return updated.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || "0";
        const bTime = b.lastMessage?.created_at || "0";
        return new Date(bTime) - new Date(aTime);
      });
    });
  };

  const handleConversationDeleted = (deletedMsgId, otherUserId) => {
    // Refresh last message for that conversation
    fetchConversations(user, myProfile);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#0A3320",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48,
              height: 48,
              border: "3px solid rgba(201,169,110,0.3)",
              borderTop: "3px solid #C9A96E",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Georgia, serif", fontSize: 14 }}>
              Loading conversations...
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        html, body { overflow: hidden !important; height: 100% !important; }
      `}</style>
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
      }}>
      <Navbar />
      <div style={{
        flex: 1,
        backgroundColor: "#0A3320",
        display: "flex",
        overflow: "hidden",
        minHeight: 0,
      }}>
        {/* Sidebar — 30% */}
        <div style={{
          width: "30%",
          minWidth: 280,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInLeft 0.3s ease",
        }}>
          <ConversationSidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelect={handleSelectConversation}
            currentUser={user}
          />
        </div>

        {/* Chat Thread — 70% */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease",
        }}>
          {selectedConversation ? (
            <ChatThread
              key={selectedConversation.profile.user_id}
              currentUser={user}
              myProfile={myProfile}
              otherProfile={selectedConversation.profile}
              onNewMessage={(msg) => handleNewMessage(msg, selectedConversation.profile.user_id)}
              onMessageDeleted={(msgId) => handleConversationDeleted(msgId, selectedConversation.profile.user_id)}
            />
          ) : (
            <EmptyThreadState conversations={conversations} />
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function EmptyThreadState({ conversations }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0A3320",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle arabesque background */}
      <ArabesqueBackground />

      <div style={{
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        padding: "48px 32px",
        maxWidth: 360,
      }}>
        {/* Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(201,169,110,0.15)",
          border: "1px solid rgba(201,169,110,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M6 8C6 6.9 6.9 6 8 6H28C29.1 6 30 6.9 30 8V22C30 23.1 29.1 24 28 24H20L14 30V24H8C6.9 24 6 23.1 6 22V8Z" stroke="rgba(201,169,110,0.8)" strokeWidth="1.5" fill="none"/>
            <circle cx="13" cy="15" r="1.5" fill="rgba(201,169,110,0.8)"/>
            <circle cx="18" cy="15" r="1.5" fill="rgba(201,169,110,0.8)"/>
            <circle cx="23" cy="15" r="1.5" fill="rgba(201,169,110,0.8)"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: 22,
          color: "rgba(255,255,255,0.90)",
          marginBottom: 12,
          fontWeight: "normal",
          letterSpacing: "0.01em",
        }}>
          {conversations.length === 0 ? "No matches yet" : "Select a conversation"}
        </h2>
        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 14,
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.7,
          marginBottom: 28,
        }}>
          {conversations.length === 0
            ? "Once your interests are accepted, your conversations will appear here."
            : "Choose someone from the left to begin your conversation."}
        </p>

        {conversations.length === 0 && (
          <a href="/browse" style={{
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: "#C9A96E",
            color: "#0A3320",
            borderRadius: 8,
            fontFamily: "Georgia, serif",
            fontSize: 14,
            textDecoration: "none",
            fontWeight: "bold",
            letterSpacing: "0.02em",
          }}>
            Browse profiles
          </a>
        )}
      </div>
    </div>
  );
}

function ArabesqueBackground() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="arabesque-bg" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="40" cy="40" r="4" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
          <circle cx="40" cy="40" r="8" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(0,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(45,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(90,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(135,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(180,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(225,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(270,40,40)"/>
          <ellipse cx="40" cy="28" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" transform="rotate(315,40,40)"/>
          <path d="M0,0 C15,10 25,30 40,40" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7"/>
          <path d="M80,0 C65,10 55,30 40,40" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7"/>
          <path d="M0,80 C15,70 25,50 40,40" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7"/>
          <path d="M80,80 C65,70 55,50 40,40" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7"/>
          <ellipse cx="20" cy="20" rx="2.5" ry="4.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" transform="rotate(45,20,20)"/>
          <ellipse cx="60" cy="20" rx="2.5" ry="4.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" transform="rotate(-45,60,20)"/>
          <ellipse cx="20" cy="60" rx="2.5" ry="4.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" transform="rotate(-45,20,60)"/>
          <ellipse cx="60" cy="60" rx="2.5" ry="4.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" transform="rotate(45,60,60)"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arabesque-bg)"/>
    </svg>
  );
}