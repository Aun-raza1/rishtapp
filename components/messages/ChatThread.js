"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import MessageBubble from "./MessageBubble";

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Offline";
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return "Active now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return "Active yesterday";
  return `Active ${diffDays} days ago`;
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return new Date() - new Date(lastSeen) < 120000;
}

function Avatar({ profile, size = 36 }) {
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  if (profile.photo_url) {
    return (
      <img
        src={profile.photo_url}
        alt={profile.full_name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: "#154A2C",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      border: "1px solid rgba(201,169,110,0.3)",
    }}>
      <span style={{ fontFamily: "Georgia, serif", fontSize: size * 0.35, color: "#C9A96E", fontWeight: "bold" }}>
        {initials}
      </span>
    </div>
  );
}

export default function ChatThread({ currentUser, myProfile, otherProfile, onNewMessage, onMessageDeleted }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUserProfile, setOtherUserProfile] = useState(otherProfile);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch messages between current user and other user
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherProfile.user_id}),and(sender_id.eq.${otherProfile.user_id},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (data) {
      // Filter out messages deleted for this user
      const visible = data.filter((msg) => {
        if (msg.sender_id === currentUser.id && msg.deleted_for_sender) return false;
        if (msg.receiver_id === currentUser.id && msg.deleted_for_receiver) return false;
        return true;
      });
      setMessages(visible);
    }
    setLoading(false);
  }, [currentUser.id, otherProfile.user_id]);

  // Mark all received messages as read
  const markMessagesRead = useCallback(async () => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", otherProfile.user_id)
      .eq("receiver_id", currentUser.id)
      .eq("read", false);
  }, [currentUser.id, otherProfile.user_id]);

  // Fetch latest other user profile (for last_seen updates)
  const refreshOtherProfile = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", otherProfile.user_id)
      .single();
    if (data) setOtherUserProfile(data);
  }, [otherProfile.user_id]);

  useEffect(() => {
    fetchMessages();
    markMessagesRead();
    refreshOtherProfile();

    // Poll other user's last_seen every 30 seconds
    const profilePoll = setInterval(refreshOtherProfile, 30000);

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`messages:${currentUser.id}:${otherProfile.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_id === currentUser.id && msg.receiver_id === otherProfile.user_id) ||
            (msg.sender_id === otherProfile.user_id && msg.receiver_id === currentUser.id);

          if (!isRelevant) return;

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // If received, mark as read immediately
          if (msg.sender_id === otherProfile.user_id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", msg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== updated.id) return m;
              // Check if now deleted for this user
              if (updated.sender_id === currentUser.id && updated.deleted_for_sender) return null;
              if (updated.receiver_id === currentUser.id && updated.deleted_for_receiver) return null;
              return updated;
            }).filter(Boolean)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearInterval(profilePoll);
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, otherProfile.user_id, fetchMessages, markMessagesRead, refreshOtherProfile]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom("instant");
    }
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    setInputValue("");

    const newMsg = {
      sender_id: currentUser.id,
      receiver_id: otherProfile.user_id,
      content,
      created_at: new Date().toISOString(),
      read: false,
      deleted_for_sender: false,
      deleted_for_receiver: false,
    };

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...newMsg, id: tempId };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert(newMsg)
      .select()
      .single();

    if (error) {
      // Revert optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSending(false);
      return;
    }

    // Replace optimistic with real
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? data : m))
    );

    onNewMessage(data);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (messageId, deleteType) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const isSender = msg.sender_id === currentUser.id;

    if (deleteType === "for_me") {
      const update = isSender
        ? { deleted_for_sender: true }
        : { deleted_for_receiver: true };

      await supabase.from("messages").update(update).eq("id", messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      onMessageDeleted(messageId);
      return;
    }

    if (deleteType === "for_everyone") {
      // Check 24hr limit
      const msgTime = new Date(msg.created_at);
      const hoursDiff = (new Date() - msgTime) / 3600000;
      if (hoursDiff > 24) {
        alert("You can only delete for everyone within 24 hours of sending.");
        return;
      }

      await supabase
        .from("messages")
        .update({ deleted_for_sender: true, deleted_for_receiver: true })
        .eq("id", messageId);

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      onMessageDeleted(messageId);
    }
  };

  const online = isOnline(otherUserProfile?.last_seen);

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0A3320",
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: "2px solid rgba(201,169,110,0.3)",
          borderTop: "2px solid #C9A96E",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Thread Header */}
      <div style={{
        padding: "14px 24px",
        backgroundColor: "#061812",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        zIndex: 2,
      }}>
        <div style={{ position: "relative" }}>
          <Avatar profile={otherUserProfile} size={40} />
          {online && (
            <div style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#4CAF50",
              border: "2px solid #061812",
            }} />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "Georgia, serif",
            fontSize: 15,
            color: "#ffffff",
            margin: 0,
            fontWeight: "normal",
          }}>
            {otherUserProfile?.full_name || "Unknown"}
          </p>
          <p style={{
            fontFamily: "Georgia, serif",
            fontSize: 11,
            color: online ? "#4CAF50" : "rgba(255,255,255,0.35)",
            margin: "2px 0 0",
          }}>
            {formatLastSeen(otherUserProfile?.last_seen)}
          </p>
        </div>

        {/* Profile info pills */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {otherUserProfile?.city && (
            <span style={{
              padding: "4px 10px",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 20,
              fontFamily: "Georgia, serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.50)",
            }}>
              {otherUserProfile.city}
            </span>
          )}
          {otherUserProfile?.profession && (
            <span style={{
              padding: "4px 10px",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 20,
              fontFamily: "Georgia, serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.50)",
            }}>
              {otherUserProfile.profession}
            </span>
          )}
        </div>
      </div>

      {/* Messages area with arabesque background */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 28px",
        position: "relative",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}>
        {/* Arabesque background */}
        <ArabesqueBackground />

        {/* Messages */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "rgba(201,169,110,0.12)",
                border: "1px solid rgba(201,169,110,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="rgba(201,169,110,0.6)"/>
                </svg>
              </div>
              <p style={{
                fontFamily: "Georgia, serif",
                fontSize: 15,
                color: "rgba(255,255,255,0.70)",
                margin: "0 0 6px",
              }}>
                You matched with {otherUserProfile?.full_name?.split(" ")[0] || "them"}
              </p>
              <p style={{
                fontFamily: "Georgia, serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                margin: 0,
              }}>
                Say salaam and begin your conversation with respect.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === currentUser.id;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showDateDivider = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));

                return (
                  <div key={msg.id}>
                    {showDateDivider && (
                      <DateDivider date={new Date(msg.created_at)} />
                    )}
                    <MessageBubble
                      message={msg}
                      isMine={isMine}
                      onDelete={handleDelete}
                      currentUserId={currentUser.id}
                    />
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{
        padding: "16px 24px",
        backgroundColor: "#061812",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        zIndex: 2,
      }}>
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 14px",
        }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "Georgia, serif",
              fontSize: 14,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: "auto",
              scrollbarWidth: "none",
              paddingTop: 2,
              paddingBottom: 2,
              alignSelf: "center",
            }}
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: inputValue.trim() ? "#C56A4D" : "rgba(255,255,255,0.08)",
              border: "none",
              cursor: inputValue.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.15s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9L16 2L9 16L8 10L2 9Z" fill={inputValue.trim() ? "#ffffff" : "rgba(255,255,255,0.25)"} strokeWidth="0"/>
            </svg>
          </button>
        </div>

        <p style={{
          fontFamily: "Georgia, serif",
          fontSize: 10,
          color: "rgba(255,255,255,0.20)",
          margin: "12px 0 4px",
          textAlign: "center",
        }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function DateDivider({ date }) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let label;
  if (isSameDay(date, today)) {
    label = "Today";
  } else if (isSameDay(date, yesterday)) {
    label = "Yesterday";
  } else {
    label = date.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      margin: "20px 0 16px",
    }}>
      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
      <span style={{
        fontFamily: "Georgia, serif",
        fontSize: 11,
        color: "rgba(255,255,255,0.35)",
        padding: "3px 10px",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

function ArabesqueBackground() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.45,
      }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="arabesque-chat" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
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
          <circle cx="20" cy="20" r="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5"/>
          <circle cx="60" cy="20" r="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5"/>
          <circle cx="20" cy="60" r="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5"/>
          <circle cx="60" cy="60" r="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#0A3320"/>
      <rect width="100%" height="100%" fill="url(#arabesque-chat)"/>
    </svg>
  );
}