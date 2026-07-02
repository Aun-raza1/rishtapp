"use client";

import { useState, useRef, useEffect } from "react";

function formatTime(createdAt) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function canDeleteForEveryone(createdAt) {
  if (!createdAt) return false;
  const hoursDiff = (new Date() - new Date(createdAt)) / 3600000;
  return hoursDiff <= 24;
}

// Seen tick SVG
function SeenTick({ read }) {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
      {/* First tick */}
      <path d="M1 5L4 8L8 2" stroke={read ? "#C9A96E" : "rgba(255,255,255,0.45)"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Second tick (double check) */}
      <path d="M6 5L9 8L13 2" stroke={read ? "#C9A96E" : "rgba(255,255,255,0.45)"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function MessageBubble({ message, isMine, onDelete, currentUserId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);

  const canDeleteEveryone = isMine && canDeleteForEveryone(message.created_at);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: 6,
        animation: "fadeIn 0.2s ease",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
    >
      <div style={{
        position: "relative",
        maxWidth: "65%",
        display: "flex",
        flexDirection: "column",
        alignItems: isMine ? "flex-end" : "flex-start",
        gap: 3,
      }}>

        {/* Bubble */}
        <div style={{
          padding: "10px 14px",
          borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          backgroundColor: isMine ? "#C56A4D" : "rgba(245,237,207,0.92)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.20)",
          position: "relative",
          wordBreak: "break-word",
        }}>
          <p style={{
            margin: 0,
            fontFamily: "Georgia, serif",
            fontSize: 14,
            color: isMine ? "#ffffff" : "#1a1815",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}>
            {message.content}
          </p>
        </div>

        {/* Timestamp + seen */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingRight: isMine ? 2 : 0,
          paddingLeft: isMine ? 0 : 2,
        }}>
          <span style={{
            fontFamily: "Georgia, serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
          }}>
            {formatTime(message.created_at)}
          </span>
          {isMine && <SeenTick read={message.read} />}
        </div>

        {/* Delete button — appears on hover */}
        {hovered && (
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: 4,
              [isMine ? "left" : "right"]: "calc(100% + 6px)",
              zIndex: 10,
            }}
          >
            {/* Chevron trigger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: "rgba(0,0,0,0.35)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.80)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div style={{
                position: "absolute",
                top: 30,
                [isMine ? "left" : "right"]: 0,
                backgroundColor: "#1a2e1f",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.40)",
                minWidth: 170,
                animation: "fadeIn 0.15s ease",
              }}>
                {/* Delete for me */}
                <button
                  onClick={() => {
                    onDelete(message.id, "for_me");
                    setMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    borderBottom: canDeleteEveryone ? "1px solid rgba(255,255,255,0.07)" : "none",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3.5H12M5 3.5V2.5C5 2.2 5.2 2 5.5 2H8.5C8.8 2 9 2.2 9 2.5V3.5M5.5 6V10.5M8.5 6V10.5M3 3.5L3.5 11.5C3.5 11.8 3.7 12 4 12H10C10.3 12 10.5 11.8 10.5 11.5L11 3.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                  <span style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                  }}>
                    Delete for me
                  </span>
                </button>

                {/* Delete for everyone — only sender within 24hrs */}
                {canDeleteEveryone && (
                  <button
                    onClick={() => {
                      onDelete(message.id, "for_everyone");
                      setMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(197,106,77,0.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3.5H12M5 3.5V2.5C5 2.2 5.2 2 5.5 2H8.5C8.8 2 9 2.2 9 2.5V3.5M5.5 6V10.5M8.5 6V10.5M3 3.5L3.5 11.5C3.5 11.8 3.7 12 4 12H10C10.3 12 10.5 11.8 10.5 11.5L11 3.5" stroke="#C56A4D" strokeWidth="1.1" strokeLinecap="round"/>
                    </svg>
                    <span style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 12,
                      color: "#C56A4D",
                    }}>
                      Delete for everyone
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}