"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_profile_completed")
          .eq("user_id", user.id)
          .single()

        if (profile?.is_profile_completed) {
          setProfileComplete(true)

          const { data: interests } = await supabase
            .from("interests")
            .select("*")
            .eq("receiver_id", user.id)
            .eq("status", "pending")

          if (interests) setPendingCount(interests.length)
        }
      }
    }

    getUser()
  }, [])

  const linkStyle = {
    textDecoration: "none",
    color: "#F5F0E8",
    fontSize: "16px",
    fontWeight: "400",
    padding: "10px 20px",
    borderRadius: "8px",
    letterSpacing: "0.01em",
    transition: "background 0.18s, color 0.18s",
    position: "relative",
    display: "inline-block",
  }

  const buttonStyle = {
    background: "transparent",
    border: "none",
    color: "#F5F0E8",
    fontSize: "16px",
    fontWeight: "400",
    padding: "10px 20px",
    borderRadius: "8px",
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition: "background 0.18s, color 0.18s",
  }

  const signupStyle = {
    textDecoration: "none",
    background: "#C9A96E",
    color: "#0A3320",
    fontSize: "16px",
    fontWeight: "600",
    padding: "11px 28px",
    borderRadius: "999px",
    letterSpacing: "0.02em",
    transition: "background 0.18s, color 0.18s",
    display: "inline-block",
  }

  return (
    <>
      <style>{`
        .rpp-nav-link:hover {
          background: rgba(197, 106, 77, 0.18) !important;
          color: #C56A4D !important;
        }
        .rpp-nav-btn:hover {
          background: rgba(197, 106, 77, 0.18) !important;
          color: #C56A4D !important;
        }
        .rpp-signup:hover {
          background: #C56A4D !important;
          color: #ffffff !important;
        }
      `}</style>

      <nav style={{
        background: "#0A3320",
        borderBottom: "1px solid #154A2C",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        padding: "0 3rem",
        height: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>

        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{
  fontSize: "26px",
  fontWeight: "700",
  letterSpacing: "-0.5px",
  color: "#ffffff",
  fontFamily: "Georgia, 'Times New Roman', serif",
}}>
  Rishtapp
</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

          <Link href="/browse" className="rpp-nav-link" style={linkStyle}>
            Browse
          </Link>

          {!user && (
            <>
              <Link href="/login" className="rpp-nav-link" style={linkStyle}>
                Login
              </Link>
              <Link href="/signup" className="rpp-signup" style={signupStyle}>
                Sign Up
              </Link>
            </>
          )}

          {user && !profileComplete && (
            <>
              <Link href="/create-profile" className="rpp-nav-link" style={linkStyle}>
                Create Profile
              </Link>
              <button
                className="rpp-nav-btn"
                style={buttonStyle}
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/"
                }}
              >
                Logout
              </button>
            </>
          )}

          {user && profileComplete && (
            <>
              <Link href="/dashboard" className="rpp-nav-link" style={linkStyle}>
                Dashboard
                {pendingCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "#C0392B",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "700",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: "1",
                  }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
              <button
                className="rpp-nav-btn"
                style={buttonStyle}
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/"
                }}
              >
                Logout
              </button>
            </>
          )}

        </div>
      </nav>
    </>
  )
}