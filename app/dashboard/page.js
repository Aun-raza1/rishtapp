"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [receivedInterests, setReceivedInterests] = useState([])
  const [sentInterests, setSentInterests] = useState([])
  const [savedProfiles, setSavedProfiles] = useState([])
  const [savedByCount, setSavedByCount] = useState(0)
  const [profileViews, setProfileViews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalProfile, setModalProfile] = useState(null)

  useEffect(() => {
    let impressionsChannel = null

    const init = async () => {
      // ── Auth ──
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUser(user)

      // ── Own profile ──
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
      setProfile(profileData)

      // ── Received interests (pending only) ──
      const { data: receivedRaw } = await supabase
        .from("interests")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (receivedRaw && receivedRaw.length > 0) {
        const senderIds = receivedRaw.map((i) => i.sender_id)
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", senderIds)

        const enriched = receivedRaw.map((interest) => ({
          ...interest,
          senderProfile: senderProfiles?.find((p) => p.user_id === interest.sender_id) || null,
        }))
        setReceivedInterests(enriched)
      } else {
        setReceivedInterests([])
      }

      // ── Sent interests ──
      const { data: sentRaw } = await supabase
        .from("interests")
        .select("*")
        .eq("sender_id", user.id)
        .neq("receiver_id", user.id)
        .order("created_at", { ascending: false })

      if (sentRaw && sentRaw.length > 0) {
        const receiverIds = sentRaw.map((i) => i.receiver_id)
        const { data: receiverProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", receiverIds)

        const enriched = sentRaw.map((interest) => ({
          ...interest,
          receiverProfile: receiverProfiles?.find((p) => p.user_id === interest.receiver_id) || null,
        }))
        setSentInterests(enriched)
      } else {
        setSentInterests([])
      }

      // ── Saved profiles ──
      const { data: savesRaw } = await supabase
        .from("saves")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (savesRaw && savesRaw.length > 0) {
        const savedIds = savesRaw.map((s) => s.saved_profile_id)
        const { data: savedProfileData } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", savedIds)

        const enriched = savesRaw.map((save) => ({
          ...save,
          savedProfile: savedProfileData?.find((p) => p.user_id === save.saved_profile_id) || null,
        }))
        setSavedProfiles(enriched)
      } else {
        setSavedProfiles([])
      }

      // ── Saved By count ──
      const { count } = await supabase
        .from("saves")
        .select("*", { count: "exact", head: true })
        .eq("saved_profile_id", user.id)
      setSavedByCount(count || 0)

      // ── Profile Views — initial count from impressions ──
      const { count: viewsCount } = await supabase
        .from("impressions")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id)
      setProfileViews(viewsCount || 0)

      // ── Profile Views — Realtime subscription for live updates ──
      impressionsChannel = supabase
        .channel("impressions-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "impressions",
            filter: `profile_id=eq.${user.id}`,
          },
          () => {
            setProfileViews((prev) => prev + 1)
          }
        )
        .subscribe()

      setLoading(false)
    }

    init()

    // Cleanup Realtime channel on unmount
    return () => {
      if (impressionsChannel) {
        supabase.removeChannel(impressionsChannel)
      }
    }
  }, [])

  // ── Interest actions ──
  const handleAccept = async (interestId) => {
    await supabase.from("interests").update({ status: "accepted" }).eq("id", interestId)
    setReceivedInterests((prev) => prev.filter((i) => i.id !== interestId))
  }

  const handleDecline = async (interestId) => {
    await supabase.from("interests").update({ status: "declined" }).eq("id", interestId)
    setReceivedInterests((prev) => prev.filter((i) => i.id !== interestId))
  }

  // ── Send interest from saved cards ──
  const getInterestStatus = (receiverId) => {
    const existing = sentInterests.find((i) => i.receiver_id === receiverId)
    return existing ? existing.status : null
  }

  const handleSendInterest = async (receiverId) => {
    if (!user) return
    const existingStatus = getInterestStatus(receiverId)
    if (existingStatus === "pending") {
      const { error } = await supabase.from("interests")
        .delete().eq("sender_id", user.id).eq("receiver_id", receiverId)
      if (!error) setSentInterests((prev) => prev.filter((i) => i.receiver_id !== receiverId))
      return
    }
    if (existingStatus === "accepted" || existingStatus === "declined") return
    const { error } = await supabase.from("interests").insert([
      { sender_id: user.id, receiver_id: receiverId, status: "pending" }
    ])
    if (!error) setSentInterests((prev) => [
      ...prev,
      { sender_id: user.id, receiver_id: receiverId, status: "pending", receiverProfile: null }
    ])
  }

  // ── Helpers ──
  const getInitials = (name) => {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const getStatusStyle = (status) => {
    if (status === "accepted") return { background: "#E6F4ED", color: "#0A6B3A", border: "1px solid #B6DEC9" }
    if (status === "declined") return { background: "#FDE8E8", color: "#9B1C1C", border: "1px solid #F5C0C0" }
    return { background: "#FEF6E4", color: "#854F0B", border: "1px solid #FAC775" }
  }

  const getStatusLabel = (status) => {
    if (status === "accepted") return "Accepted"
    if (status === "declined") return "Declined"
    return "Pending"
  }

  const getSendInterestLabel = (status) => {
    if (status === "pending") return "✕ Cancel"
    if (status === "accepted") return "✓ Accepted"
    if (status === "declined") return "Declined"
    return "Send Interest →"
  }

  const getSendInterestStyle = (status, base) => {
    if (status === "accepted") return { ...base, background: "#E6F4ED", color: "#0A6B3A", border: "1px solid #B6DEC9", cursor: "not-allowed" }
    if (status === "declined") return { ...base, background: "#F5F0EB", color: "#9c9588", border: "1px solid #E0DAD2", cursor: "not-allowed" }
    if (status === "pending") return { ...base, background: "transparent", color: "#C56A4D", border: "1.5px solid #C56A4D" }
    return { ...base, background: "#0A3320", color: "white", border: "none" }
  }

  const acceptedMatches = sentInterests.filter((i) => i.status === "accepted" && i.receiver_id !== user?.id)
  const firstName = profile?.full_name?.split(" ")[0] || "there"

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A3320", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px", height: "48px",
            border: "3px solid #C9A96E", borderTopColor: "transparent",
            borderRadius: "50%", margin: "0 auto 16px",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#F5EDCF", fontFamily: "Georgia, serif", fontSize: "16px" }}>
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A3320", fontFamily: "'Geist', Arial, sans-serif" }}>
      <Navbar />

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .dash-card { background: #F5EDCF; border-radius: 20px; border: 1px solid rgba(245,237,207,0.12); box-shadow: 0 2px 20px rgba(0,0,0,0.2); }

        .action-btn-accept {
          background: #0A3320; color: #fff; border: none; padding: 9px 20px;
          border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.18s, transform 0.15s; letter-spacing: 0.02em;
        }
        .action-btn-accept:hover { background: #154A2C; transform: translateY(-1px); }

        .action-btn-decline {
          background: transparent; color: #C56A4D; border: 1.5px solid #C56A4D;
          padding: 9px 20px; border-radius: 999px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: background 0.18s, transform 0.15s; letter-spacing: 0.02em;
        }
        .action-btn-decline:hover { background: rgba(197,106,77,0.08); transform: translateY(-1px); }

        .action-btn-gold {
          background: #C9A96E; color: #0A3320; border: none; padding: 9px 20px;
          border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.18s, transform 0.15s; letter-spacing: 0.02em;
        }
        .action-btn-gold:hover { background: #b8954f; transform: translateY(-1px); }

        .view-more-btn {
          background: transparent; color: #0A3320; border: 1.5px solid rgba(10,51,32,0.25);
          padding: 10px 28px; border-radius: 999px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: border-color 0.18s, background 0.18s; letter-spacing: 0.02em;
          margin-top: 20px;
        }
        .view-more-btn:hover { border-color: #0A3320; background: rgba(10,51,32,0.06); }

        .interest-row { transition: background 0.15s; }
        .interest-row:hover { background: #EDE5B8 !important; }
        .sent-row { transition: background 0.15s; }
        .sent-row:hover { background: #EDE5B8 !important; }
        .saved-row { transition: background 0.15s; }
        .saved-row:hover { background: #EDE5B8 !important; }
        .message-card:hover { border-color: rgba(10,51,32,0.2) !important; background: #EDE5B8 !important; }

        .view-profile-link {
          font-size: 11px; font-weight: 600; color: #6b6459;
          cursor: pointer; letter-spacing: 0.04em; text-decoration: underline;
          text-underline-offset: 2px; transition: color 0.15s;
          background: none; border: none; padding: 0;
        }
        .view-profile-link:hover { color: #0A3320; }

        .modal-overlay {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(0,0,0,0.72);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.18s ease;
        }
        .modal-box {
          background: white; border-radius: 24px; overflow: hidden;
          max-width: 420px; width: 90%;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          animation: slideUp 0.22s ease;
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PROFILE VIEW MODAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {modalProfile && (
        <div className="modal-overlay" onClick={() => setModalProfile(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            <div style={{
              backgroundColor: "#154A2C",
              padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ color: "white", fontWeight: "700", fontSize: "16px", fontFamily: "Georgia, serif", marginBottom: "2px" }}>
                  {modalProfile.full_name}
                </div>
                {modalProfile.profession && (
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                    {modalProfile.profession}
                  </div>
                )}
              </div>
              <button
                onClick={() => setModalProfile(null)}
                style={{
                  background: "rgba(255,255,255,0.12)", border: "none",
                  borderRadius: "50%", width: "34px", height: "34px",
                  color: "white", fontSize: "20px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              >
                ×
              </button>
            </div>

            <div style={{
              padding: "32px 0 24px",
              display: "flex", justifyContent: "center",
              backgroundColor: "#F7F4F0",
            }}>
              <div style={{
                width: "100px", height: "100px", borderRadius: "50%",
                backgroundColor: "#154A2C",
                border: "4px solid rgba(21,74,44,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "white", fontSize: "36px", fontWeight: "700", letterSpacing: "2px" }}>
                  {getInitials(modalProfile.full_name)}
                </span>
              </div>
            </div>

            <div style={{ padding: "8px 28px 32px" }}>
              <div style={{
                display: "flex", borderRadius: "14px",
                backgroundColor: "#F7F4F0", overflow: "hidden",
                border: "1px solid #EDE8E0", marginBottom: "20px",
              }}>
                {[
                  { label: "AGE",    value: modalProfile.age    },
                  { label: "HEIGHT", value: modalProfile.height },
                  { label: "SECT",   value: modalProfile.sect   },
                  { label: "CASTE",  value: modalProfile.caste  },
                ].map((stat, i, arr) => (
                  <div key={stat.label} style={{
                    flex: 1, textAlign: "center", padding: "14px 4px",
                    borderRight: i < arr.length - 1 ? "1px solid #E0DAD2" : "none",
                  }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1815", lineHeight: "1.1" }}>
                      {stat.value || "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#a89f96", marginTop: "3px", letterSpacing: "0.6px", fontWeight: "500" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {modalProfile.education && (
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "10px",
                    backgroundColor: "#F5EDCF", border: "1px solid #EEE6C0",
                  }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#a89f96", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Education
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a1815", textAlign: "right", maxWidth: "60%" }}>
                      {modalProfile.education}
                    </span>
                  </div>
                )}
                {modalProfile.city && (
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "10px",
                    backgroundColor: "#F5EDCF", border: "1px solid #EEE6C0",
                  }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#a89f96", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      City
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a1815" }}>
                      {modalProfile.city}, Pakistan
                    </span>
                  </div>
                )}
              </div>

              {modalProfile.bio && (
                <div style={{
                  backgroundColor: "#FAF7F2",
                  borderRadius: "0 12px 12px 0",
                  padding: "14px 16px",
                  border: "1px solid #EDE8E0",
                  borderLeft: "3px solid #C56A4D",
                }}>
                  <div style={{ fontSize: "10px", color: "#a89f96", marginBottom: "6px", letterSpacing: "0.7px", fontWeight: "700" }}>
                    LOOKING FOR
                  </div>
                  <p style={{ fontSize: "13px", color: "#2E2A25", lineHeight: "1.7", margin: 0 }}>
                    {modalProfile.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PAGE WRAPPER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 32px 80px", animation: "fadeIn 0.4s ease" }}>

        {/* ── GREETING ── */}
        <div style={{ marginBottom: "44px" }}>
          <p style={{
            fontSize: "13px", fontWeight: "600", color: "#C9A96E",
            letterSpacing: "0.12em", textTransform: "uppercase",
            marginBottom: "8px", fontFamily: "Georgia, serif",
          }}>
            Welcome back
          </p>
          <h1 style={{
            fontSize: "38px", fontWeight: "700", color: "#F5EDCF",
            margin: "0 0 8px", fontFamily: "Georgia, serif", letterSpacing: "-0.5px",
          }}>
            {firstName}
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(245,237,207,0.6)", margin: 0, lineHeight: "1.5" }}>
            Here's what's happening with your profile today.
          </p>
        </div>

        {/* ── STATS BAR ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "44px" }}>
          {[
            {
              label: "Profile Views",
              value: profileViews,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#0A3320" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="3" stroke="#0A3320" strokeWidth="2"/>
                </svg>
              ),
              note: "impressions this month",
            },
            {
              label: "Saved By",
              value: savedByCount,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" stroke="#0A3320" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              ),
              note: "people bookmarked you",
            },
            {
              label: "Interests Sent",
              value: sentInterests.length,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#0A3320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#0A3320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              note: "requests you've sent",
            },
            {
              label: "Interests Received",
              value: receivedInterests.length,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#0A3320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              note: "waiting for your reply",
            },
          ].map((stat, i) => (
            <div key={i} style={{
              background: "#C9A96E",
              borderRadius: "20px",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              border: "1px solid rgba(245,237,207,0.08)",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: "rgba(10,51,32,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{
                  fontSize: "36px", fontWeight: "700", color: "#0A3320",
                  margin: "0 0 2px", fontFamily: "Georgia, serif", lineHeight: 1,
                }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#1a1815", margin: "0 0 4px" }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(10,51,32,0.55)", margin: 0 }}>
                  {stat.note}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              INCOMING INTERESTS — full width
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="dash-card" style={{ padding: "32px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "#C56A4D", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                  Incoming
                </p>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0A3320", margin: 0, fontFamily: "Georgia, serif" }}>
                  Interests Received
                </h2>
              </div>
              {receivedInterests.length > 0 && (
                <span style={{
                  background: "#C56A4D", color: "#fff",
                  fontSize: "12px", fontWeight: "700",
                  borderRadius: "999px", padding: "5px 14px",
                }}>
                  {receivedInterests.length} pending
                </span>
              )}
            </div>

            {receivedInterests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "#EEE6C0", border: "1px solid #DDD5A8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#C9A96E" strokeWidth="1.8"/>
                  </svg>
                </div>
                <p style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#0A3320", fontWeight: "600", marginBottom: "6px" }}>
                  No pending interests
                </p>
                <p style={{ fontSize: "13px", color: "#6b6459", margin: 0 }}>
                  When someone sends you an interest, it will appear here.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {receivedInterests.slice(0, 4).map((interest) => {
                    const sender = interest.senderProfile
                    return (
                      <div key={interest.id} className="interest-row" style={{
                        display: "flex", alignItems: "flex-start", gap: "16px",
                        padding: "20px", borderRadius: "16px",
                        background: "#EEE6C0", border: "1px solid rgba(10,51,32,0.07)",
                      }}>
                        <div style={{
                          width: "52px", height: "52px", borderRadius: "50%",
                          background: "#0A3320", color: "#C9A96E",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "16px", fontWeight: "700", fontFamily: "Georgia, serif",
                          flexShrink: 0,
                        }}>
                          {getInitials(sender?.full_name)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "15px", fontWeight: "700", color: "#0A3320", margin: "0 0 2px", fontFamily: "Georgia, serif" }}>
                            {sender?.full_name || "Unknown"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#6b6459", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {sender?.profession || "—"} · {sender?.city || "—"}
                          </p>
                          <button
                            className="view-profile-link"
                            onClick={() => setModalProfile(sender)}
                            style={{ marginBottom: "14px", display: "block" }}
                          >
                            View profile ↗
                          </button>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="action-btn-accept" onClick={() => handleAccept(interest.id)}>
                              Accept
                            </button>
                            <button className="action-btn-decline" onClick={() => handleDecline(interest.id)}>
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {receivedInterests.length > 4 && (
                  <div style={{ textAlign: "center" }}>
                    <Link href="/interests/received" style={{ textDecoration: "none" }}>
                      <button className="view-more-btn">
                        View all {receivedInterests.length} interests →
                      </button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              SENT INTERESTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="dash-card" style={{ padding: "32px" }}>
            <div style={{ marginBottom: "28px" }}>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#C56A4D", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                Outgoing
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0A3320", margin: 0, fontFamily: "Georgia, serif" }}>
                Sent Interests
              </h2>
            </div>

            {sentInterests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "#EEE6C0", border: "1px solid #DDD5A8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#0A3320", fontWeight: "600", marginBottom: "6px" }}>
                  No interests sent yet
                </p>
                <p style={{ fontSize: "13px", color: "#6b6459", margin: "0 0 20px" }}>
                  Browse profiles and send your first interest.
                </p>
                <Link href="/browse" style={{ textDecoration: "none" }}>
                  <button className="action-btn-gold">Start Browsing</button>
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sentInterests.slice(0, 5).map((interest) => {
                    const receiver = interest.receiverProfile
                    const statusStyle = getStatusStyle(interest.status)
                    return (
                      <div key={interest.id} className="sent-row" style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "14px 16px", borderRadius: "12px",
                        background: "#EEE6C0", border: "1px solid rgba(10,51,32,0.07)",
                      }}>
                        <div style={{
                          width: "40px", height: "40px", borderRadius: "50%",
                          background: "#154A2C", color: "#C9A96E",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: "700", fontFamily: "Georgia, serif",
                          flexShrink: 0,
                        }}>
                          {getInitials(receiver?.full_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0A3320", margin: "0 0 1px", fontFamily: "Georgia, serif" }}>
                            {receiver?.full_name || "Unknown"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#6b6459", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {receiver?.profession || "—"} · {receiver?.city || "—"}
                          </p>
                        </div>
                        <span style={{
                          ...statusStyle,
                          fontSize: "11px", fontWeight: "700", padding: "4px 10px",
                          borderRadius: "999px", letterSpacing: "0.04em", flexShrink: 0,
                        }}>
                          {getStatusLabel(interest.status)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {sentInterests.length > 5 && (
                  <div style={{ textAlign: "center" }}>
                    <Link href="/interests/sent" style={{ textDecoration: "none" }}>
                      <button className="view-more-btn">View all {sentInterests.length} →</button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              SAVED PROFILES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="dash-card" style={{ padding: "32px" }}>
            <div style={{ marginBottom: "28px" }}>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#C56A4D", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                Bookmarked
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0A3320", margin: 0, fontFamily: "Georgia, serif" }}>
                Saved Profiles
              </h2>
            </div>

            {savedProfiles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "#EEE6C0", border: "1px solid #DDD5A8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" stroke="#C9A96E" strokeWidth="1.8" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#0A3320", fontWeight: "600", marginBottom: "6px" }}>
                  No saved profiles yet
                </p>
                <p style={{ fontSize: "13px", color: "#6b6459", margin: "0 0 20px" }}>
                  Bookmark profiles while browsing to revisit them here.
                </p>
                <Link href="/browse" style={{ textDecoration: "none" }}>
                  <button className="action-btn-gold">Start Browsing</button>
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {savedProfiles.slice(0, 2).map((save) => {
                    const p = save.savedProfile
                    const interestStatus = getInterestStatus(p?.user_id)
                    const sendBtnBase = {
                      padding: "7px 14px", borderRadius: "999px",
                      fontSize: "12px", fontWeight: "600", cursor: "pointer",
                      transition: "all 0.18s", letterSpacing: "0.02em",
                      flexShrink: 0,
                    }
                    return (
                      <div key={save.id} className="saved-row" style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "16px", borderRadius: "12px",
                        background: "#EEE6C0", border: "1px solid rgba(10,51,32,0.07)",
                      }}>
                        <div style={{
                          width: "44px", height: "44px", borderRadius: "50%",
                          background: "#154A2C", color: "#C9A96E",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "14px", fontWeight: "700", fontFamily: "Georgia, serif",
                          flexShrink: 0,
                        }}>
                          {getInitials(p?.full_name)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "#0A3320", margin: "0 0 1px", fontFamily: "Georgia, serif" }}>
                            {p?.full_name || "Unknown"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#6b6459", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p?.profession || "—"} · {p?.city || "—"}
                          </p>
                          <button
                            className="view-profile-link"
                            onClick={() => setModalProfile(p)}
                          >
                            View profile ↗
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            if (interestStatus !== "accepted" && interestStatus !== "declined") {
                              handleSendInterest(p?.user_id)
                            }
                          }}
                          disabled={interestStatus === "accepted" || interestStatus === "declined"}
                          style={getSendInterestStyle(interestStatus, sendBtnBase)}
                          onMouseEnter={(e) => {
                            if (interestStatus === "pending") e.currentTarget.style.background = "rgba(197,106,77,0.08)"
                            else if (!interestStatus) e.currentTarget.style.background = "#154A2C"
                          }}
                          onMouseLeave={(e) => {
                            if (interestStatus === "pending") e.currentTarget.style.background = "transparent"
                            else if (!interestStatus) e.currentTarget.style.background = "#0A3320"
                          }}
                        >
                          {getSendInterestLabel(interestStatus)}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {savedProfiles.length > 2 && (
                  <div style={{ textAlign: "center" }}>
                    <Link href="/saved" style={{ textDecoration: "none" }}>
                      <button className="view-more-btn">
                        View all {savedProfiles.length} saved →
                      </button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MESSAGES PREVIEW
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#C56A4D", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                Conversations
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0A3320", margin: 0, fontFamily: "Georgia, serif" }}>
                Messages
              </h2>
            </div>
            {acceptedMatches.length > 0 && (
              <Link href="/messages" style={{ textDecoration: "none" }}>
                <button className="action-btn-accept">Open Messages →</button>
              </Link>
            )}
          </div>

          {acceptedMatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "#EEE6C0", border: "1px solid #DDD5A8",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#0A3320", fontWeight: "600", marginBottom: "6px" }}>
                No active conversations yet
              </p>
              <p style={{ fontSize: "13px", color: "#6b6459", margin: 0 }}>
                When someone accepts your interest, you can start a conversation.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {acceptedMatches.slice(0, 3).map((match) => {
                const p = match.receiverProfile
                return (
                  <Link key={match.id} href="/messages" style={{ textDecoration: "none" }}>
                    <div className="message-card" style={{
                      padding: "20px", borderRadius: "14px",
                      background: "#EEE6C0", border: "1px solid rgba(10,51,32,0.07)",
                      transition: "background 0.15s, border-color 0.15s", cursor: "pointer",
                    }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "#0A3320", color: "#C9A96E",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: "700", fontFamily: "Georgia, serif",
                        marginBottom: "12px",
                      }}>
                        {getInitials(p?.full_name)}
                      </div>
                      <p style={{ fontSize: "14px", fontWeight: "700", color: "#0A3320", margin: "0 0 2px", fontFamily: "Georgia, serif" }}>
                        {p?.full_name || "Unknown"}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6b6459", margin: "0 0 14px" }}>
                        {p?.city || "—"}
                      </p>
                      <span style={{
                        fontSize: "11px", fontWeight: "600", color: "#0A3320",
                        background: "rgba(10,51,32,0.08)", padding: "4px 10px",
                        borderRadius: "999px", letterSpacing: "0.04em",
                      }}>
                        Start chatting →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}