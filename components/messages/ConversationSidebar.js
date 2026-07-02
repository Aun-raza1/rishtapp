"use client";

import { useState } from "react";

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
  const diffMs = new Date() - new Date(lastSeen);
  return diffMs < 120000; // within 2 minutes = online
}

function formatMessageTime(createdAt) {
  if (!createdAt) return "";
  const now = new Date();
  const msgDate = new Date(createdAt);
  const diffDays = Math.floor((now - msgDate) / 86400000);

  if (diffDays === 0) {
    return msgDate.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return msgDate.toLocaleDateString("en-PK", { weekday: "short" });
  return msgDate.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function Avatar({ profile, size = 48 }) {
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  if (profile.photo_url) {
    return (
      <img
        src={profile.photo_url}
        alt={profile.full_name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
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
      <span style={{
        fontFamily: "Georgia, serif",
        fontSize: size * 0.33,
        color: "#C9A96E",
        fontWeight: "bold",
      }}>
        {initials}
      </span>
    </div>
  );
}

export default function ConversationSidebar({ conversations, selectedConversation, onSelect, currentUser }) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.profile.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      height: "100%",
      backgroundColor: "#061812",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: 22,
          color: "#ffffff",
          fontWeight: "normal",
          margin: "0 0 16px 0",
          letterSpacing: "0.01em",
        }}>
          Messages
        </h1>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.85)",
              fontFamily: "Georgia, serif",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "48px 20px",
            textAlign: "center",
          }}>
            <p style={{
              fontFamily: "Georgia, serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.6,
            }}>
              {search ? "No conversations match your search." : "No matches yet. Accept an interest to start chatting."}
            </p>
          </div>
        ) : (
          filtered.map((convo) => {
            const isSelected = selectedConversation?.profile.user_id === convo.profile.user_id;
            const online = isOnline(convo.profile.last_seen);
            const hasUnread = convo.unreadCount > 0;

            const lastMsgText = convo.lastMessage
              ? convo.lastMessage.sender_id === currentUser.id
                ? `You: ${convo.lastMessage.content}`
                : convo.lastMessage.content
              : "Say salaam 👋";

            const truncated = lastMsgText.length > 42
              ? lastMsgText.slice(0, 42) + "..."
              : lastMsgText;

            return (
              <div
                key={convo.profile.user_id}
                onClick={() => onSelect(convo)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 20px",
                  cursor: "pointer",
                  backgroundColor: isSelected
                    ? "rgba(201,169,110,0.10)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "3px solid #C9A96E"
                    : "3px solid transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {/* Avatar with online dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar profile={convo.profile} size={48} />
                  {online && (
                    <div style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      backgroundColor: "#4CAF50",
                      border: "2px solid #061812",
                    }} />
                  )}
                </div>

                {/* Name + last message */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 14,
                      color: hasUnread ? "#ffffff" : "rgba(255,255,255,0.85)",
                      fontWeight: hasUnread ? "bold" : "normal",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 130,
                    }}>
                      {convo.profile.full_name || "Unknown"}
                    </span>
                    <span style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 12,
                      color: hasUnread ? "#C9A96E" : "rgba(255,255,255,0.75)",
                      flexShrink: 0,
                      marginLeft: 8,
                    }}>
                      {formatMessageTime(convo.lastMessage?.created_at)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 12,
                      color: hasUnread ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.35)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}>
                      {truncated}
                    </span>

                    {hasUnread && (
                      <div style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: "#C9A96E",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                        flexShrink: 0,
                        padding: "0 5px",
                      }}>
                        <span style={{
                          fontFamily: "Georgia, serif",
                          fontSize: 10,
                          color: "#0A3320",
                          fontWeight: "bold",
                        }}>
                          {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>


    </div>
  );
}