"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"

export default function Browse() {
  const [profiles, setProfiles] = useState([])
  const [user, setUser] = useState(null)
  const [sentInterests, setSentInterests] = useState([])
  const [savedProfiles, setSavedProfiles] = useState([]) // array of saved_profile_id strings
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoveredButton, setHoveredButton] = useState(null)
  const [hoveredBookmark, setHoveredBookmark] = useState(null)
  const [modalProfile, setModalProfile] = useState(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const router = useRouter()

  // Tracks profile_ids already recorded this session — prevents repeat Supabase calls
  const recordedImpressions = useRef(new Set())
  // Holds ref to the observer so we can disconnect on unmount
  const observerRef = useRef(null)
  // Stable ref to user so the observer callback always has latest value without stale closures
  const userRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      userRef.current = user

      // Fetch all profiles, then filter out own profile client-side
      const { data, error } = await supabase.from("profiles").select("*")
      if (!error) {
        const filtered = user
          ? data.filter((p) => p.user_id !== user.id)
          : data
        setProfiles(filtered)
      }

      if (user) {
        // Fetch sent interests
        const { data: interestsData } = await supabase
          .from("interests")
          .select("*")
          .eq("sender_id", user.id)
        if (interestsData) setSentInterests(interestsData)

        // Fetch saves
        const { data: savesData } = await supabase
          .from("saves")
          .select("saved_profile_id")
          .eq("user_id", user.id)
        if (savesData) setSavedProfiles(savesData.map((s) => s.saved_profile_id))
      }
    }
    init()
  }, [])

  // ── Impression recording ──
  const recordImpression = useCallback(async (profileId) => {
    const currentUser = userRef.current
      console.log("recordImpression called for:", profileId, "currentUser:", currentUser)
    // Guest — no impression recorded
    if (!currentUser) return

    // Already recorded this session — skip Supabase call entirely
    if (recordedImpressions.current.has(profileId)) return

    // Mark immediately before the async call to prevent race conditions
    recordedImpressions.current.add(profileId)

    // Upsert — onConflict silently does nothing if (profile_id, viewer_id) already exists
// Upsert — onConflict silently does nothing if (profile_id, viewer_id) already exists
    const { data, error } = await supabase
      .from("impressions")
      .upsert(
        {
          profile_id: profileId,
          viewer_id: currentUser.id,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,viewer_id" }
      )

    console.log("upsert result:", data, "error:", error)
  }, [])

  // ── Set up IntersectionObserver once profiles are loaded ──
  useEffect(() => {
    if (profiles.length === 0) return

    // Disconnect any previous observer before creating a new one
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const profileId = entry.target.getAttribute("data-profile-id")
          if (!profileId) return
          recordImpression(profileId)
        })
      },
      {
        // Fire when at least 40% of the card is visible in the viewport
        threshold: 0.4,
      }
    )

    // Attach observer to every profile card
    const cards = document.querySelectorAll("[data-profile-id]")
    cards.forEach((card) => observerRef.current.observe(card))

    // Cleanup on unmount or when profiles change
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [profiles, recordImpression])

  const getInterestStatus = (receiverId) => {
    const existing = sentInterests.find((i) => i.receiver_id === receiverId)
    return existing ? existing.status : null
  }

  const isSaved = (profileUserId) => savedProfiles.includes(profileUserId)

  const toggleSave = async (profileUserId) => {
    // Guest: show login prompt modal
    if (!user) {
      setShowGuestModal(true)
      return
    }

    const alreadySaved = isSaved(profileUserId)

    // Optimistic update
    if (alreadySaved) {
      setSavedProfiles(savedProfiles.filter((id) => id !== profileUserId))
    } else {
      setSavedProfiles([...savedProfiles, profileUserId])
    }

    if (alreadySaved) {
      const { error } = await supabase
        .from("saves")
        .delete()
        .eq("user_id", user.id)
        .eq("saved_profile_id", profileUserId)
      if (error) {
        // Revert on failure
        setSavedProfiles((prev) => [...prev, profileUserId])
        alert("Could not remove saved profile. Please try again.")
      }
    } else {
      const { error } = await supabase
        .from("saves")
        .insert([{ user_id: user.id, saved_profile_id: profileUserId }])
      if (error) {
        // Revert on failure
        setSavedProfiles((prev) => prev.filter((id) => id !== profileUserId))
        alert("Could not save profile. Please try again.")
      }
    }
  }

  const sendInterest = async (receiverId) => {
    if (!user) { alert("Please login to send an interest"); return }
    if (user.id === receiverId) { alert("You can't send interest to your own profile"); return }
    const existingStatus = getInterestStatus(receiverId)
    if (existingStatus === "pending") {
      const { error } = await supabase.from("interests").delete()
        .eq("sender_id", user.id).eq("receiver_id", receiverId)
      if (!error) setSentInterests(sentInterests.filter((i) => i.receiver_id !== receiverId))
      return
    }
    if (existingStatus === "accepted" || existingStatus === "declined") {
      alert(`This interest is already ${existingStatus}`); return
    }
    const { error } = await supabase.from("interests").insert([
      { sender_id: user.id, receiver_id: receiverId, status: "pending" }
    ])
    if (!error) setSentInterests([...sentInterests, { sender_id: user.id, receiver_id: receiverId, status: "pending" }])
  }

  const getButtonStyles = (status, profileUserId) => {
    const isHovered = hoveredButton === profileUserId
    const base = {
      width: "100%",
      padding: "15px",
      borderRadius: "14px",
      fontSize: "14px",
      fontWeight: "600",
      border: "none",
      cursor: status === "accepted" || status === "declined" ? "not-allowed" : "pointer",
      letterSpacing: "0.3px",
      transition: "all 0.2s ease",
    }
    if (status === "accepted") return { ...base, backgroundColor: "#E8F5ED", color: "#2D6A4F" }
    if (status === "declined") return { ...base, backgroundColor: "#F5F0EB", color: "#9c9588" }
    if (status === "pending") return {
      ...base,
      backgroundColor: isHovered ? "#F5DDD4" : "#FBE8E1",
      border: "1px solid #E0926F",
      color: "#9A4A30",
    }
    return {
      ...base,
      backgroundColor: isHovered ? "#0F4522" : "#14532d",
      color: "white",
      boxShadow: isHovered
        ? "0 4px 14px rgba(20,83,45,0.35)"
        : "0 2px 8px rgba(20,83,45,0.2)",
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0A3320" }}>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(18px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes tooltipFade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }

        .bookmark-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(10,30,18,0.96);
          color: rgba(255,255,255,0.88);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.3px;
          padding: 6px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          border: 1px solid rgba(255,255,255,0.08);
          animation: tooltipFade 0.15s ease forwards;
          z-index: 10;
        }
        .bookmark-tooltip::before {
          content: '';
          position: absolute;
          bottom: 100%;
          right: 10px;
          border: 5px solid transparent;
          border-bottom-color: rgba(10,30,18,0.96);
        }
      `}</style>
      <Navbar />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GUEST SAVE MODAL
          Shown when a non-logged-in user tries to bookmark
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showGuestModal && (
        <div
          onClick={() => setShowGuestModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.18s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "24px",
              overflow: "hidden",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              animation: "slideUp 0.22s ease",
            }}
          >
            {/* Modal header */}
            <div style={{
              backgroundColor: "#154A2C",
              padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"
                    stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
                <span style={{
                  color: "white", fontWeight: "700", fontSize: "15px",
                  fontFamily: "Georgia, serif", letterSpacing: "-0.1px",
                }}>
                  Save This Profile
                </span>
              </div>
              <button
                onClick={() => setShowGuestModal(false)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none", borderRadius: "50%",
                  width: "32px", height: "32px",
                  color: "white", fontSize: "18px",
                  cursor: "pointer", lineHeight: "1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "36px 28px 32px", textAlign: "center" }}>
              <div style={{
                width: "72px", height: "72px",
                borderRadius: "50%",
                backgroundColor: "#F5EDCF",
                border: "2px solid #EEE6C0",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"
                    fill="rgba(197,106,77,0.15)" stroke="#C56A4D" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </div>

              <h3 style={{
                fontSize: "20px", fontWeight: "700",
                color: "#1a1815", marginBottom: "10px",
                fontFamily: "Georgia, serif", letterSpacing: "-0.2px",
              }}>
                Create an account to save profiles
              </h3>
              <p style={{
                fontSize: "14px", color: "#6b6459",
                lineHeight: "1.7", marginBottom: "28px",
                maxWidth: "280px", margin: "0 auto 28px",
              }}>
                Sign up to bookmark profiles you're interested in and revisit them anytime from your dashboard.
              </p>

              <button
                onClick={() => { setShowGuestModal(false); router.push("/signup") }}
                style={{
                  width: "100%",
                  padding: "15px",
                  backgroundColor: "#0A3320",
                  color: "white",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  letterSpacing: "0.3px",
                  transition: "background 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 4px 14px rgba(10,51,32,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#154A2C"
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(10,51,32,0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0A3320"
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(10,51,32,0.3)"
                }}
              >
                Create a Free Account →
              </button>

              <p style={{ marginTop: "16px", fontSize: "13px", color: "#a89f96" }}>
                Already have an account?{" "}
                <span
                  onClick={() => { setShowGuestModal(false); router.push("/login") }}
                  style={{ color: "#C56A4D", cursor: "pointer", fontWeight: "600" }}
                >
                  Sign in
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PHOTO MODAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {modalProfile && (
        <div
          onClick={() => setModalProfile(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.18s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              overflow: "hidden",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              animation: "slideUp 0.2s ease",
            }}
          >
            <div style={{
              backgroundColor: "#154A2C",
              padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "white", fontWeight: "600", fontSize: "15px" }}>
                {modalProfile.name}
              </span>
              <button
                onClick={() => setModalProfile(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none", borderRadius: "50%",
                  width: "32px", height: "32px",
                  color: "white", fontSize: "18px",
                  cursor: "pointer", lineHeight: "1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              >
                ×
              </button>
            </div>
            <div style={{
              padding: "36px 0",
              display: "flex", justifyContent: "center",
              backgroundColor: "#F7F4F0",
            }}>
              <div style={{
                width: "160px", height: "160px",
                borderRadius: "50%",
                backgroundColor: "#154A2C",
                border: "4px solid rgba(21,74,44,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "white", fontSize: "52px", fontWeight: "600", letterSpacing: "2px" }}>
                  {modalProfile.initials}
                </span>
              </div>
            </div>
            <div style={{ padding: "20px 24px 28px" }}>
              <div style={{ fontSize: "14px", color: "#6b6459", textAlign: "center", lineHeight: "1.7" }}>
                {modalProfile.profession && <div style={{ fontWeight: "600", color: "#1a1815", fontSize: "16px" }}>{modalProfile.profession}</div>}
                {modalProfile.education && <div>{modalProfile.education}</div>}
                {modalProfile.city && <div>{modalProfile.city}, Pakistan</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "48px 28px 0" }}>
        <h2 style={{
          fontSize: "28px", fontWeight: "700", color: "white",
          margin: "0 0 6px", letterSpacing: "-0.3px",
          fontFamily: "Georgia, serif",
        }}>
          Browse Profiles
        </h2>
        <p style={{
          color: "rgba(255,255,255,0.45)", fontSize: "14px",
          marginBottom: "36px", letterSpacing: "0.1px",
        }}>
          {profiles.length} profiles available
        </p>

        {/* ── Card grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingBottom: "60px" }}>
          {profiles.map((profile) => {
            const status = getInterestStatus(profile.user_id)
            const saved = isSaved(profile.user_id)
            const initials = profile.name
              ? profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
              : "?"
            const isCardHovered = hoveredCard === profile.id
            const isBookmarkHovered = hoveredBookmark === profile.user_id

            return (
              <div
                key={profile.id}
                data-profile-id={profile.user_id}
                onMouseEnter={() => setHoveredCard(profile.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  backgroundColor: "white",
                  borderRadius: "24px",
                  overflow: "hidden",
                  boxShadow: isCardHovered
                    ? "0 20px 48px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)"
                    : "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
                  transform: isCardHovered ? "translateY(-4px)" : "translateY(0)",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    CARD HEADER BAND
                    Avatar (left) + Name/Profession (center) + Bookmark (right)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div style={{
                  backgroundColor: "#154A2C",
                  borderBottom: "1px solid rgba(0,0,0,0.12)",
                  padding: "28px 28px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  position: "relative",
                }}>
                  {/* Clickable avatar */}
                  <div
                    onClick={() => setModalProfile({ ...profile, initials })}
                    style={{
                      position: "relative",
                      width: "72px", height: "72px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: "72px", height: "72px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      border: "2px solid rgba(255,255,255,0.22)",
                      outline: "4px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "border-color 0.18s ease",
                    }}>
                      <span style={{ color: "white", fontSize: "24px", fontWeight: "600", letterSpacing: "1px" }}>
                        {initials}
                      </span>
                    </div>
                    <div
                      className="avatar-overlay"
                      style={{
                        position: "absolute", inset: 0,
                        borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0,
                        transition: "opacity 0.18s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                    >
                      <span style={{
                        color: "white", fontSize: "10px",
                        fontWeight: "700", letterSpacing: "0.5px",
                        textAlign: "center", lineHeight: "1.3",
                      }}>
                        VIEW
                      </span>
                    </div>
                  </div>

                  {/* Name / Profession / Education */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "20px", fontWeight: "700",
                      color: "white", letterSpacing: "-0.2px", lineHeight: "1.2",
                    }}>
                      {profile.name}
                    </div>
                    {profile.profession && (
                      <div style={{
                        fontSize: "15px", fontWeight: "600",
                        color: "rgba(255,255,255,0.9)",
                        marginTop: "5px", lineHeight: "1.3",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {profile.profession}
                      </div>
                    )}
                    {profile.education && (
                      <div style={{
                        fontSize: "13px", fontWeight: "500",
                        color: "rgba(255,255,255,0.5)",
                        marginTop: "3px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {profile.education}
                      </div>
                    )}
                  </div>

                  {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      BOOKMARK BUTTON
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                  <div style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start" }}>
                    <button
                      onClick={() => toggleSave(profile.user_id)}
                      onMouseEnter={() => setHoveredBookmark(profile.user_id)}
                      onMouseLeave={() => setHoveredBookmark(null)}
                      title=""
                      style={{
                        background: saved
                          ? "rgba(197,106,77,0.18)"
                          : isBookmarkHovered
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.07)",
                        border: saved
                          ? "1px solid rgba(197,106,77,0.5)"
                          : "1px solid rgba(255,255,255,0.18)",
                        borderRadius: "10px",
                        width: "38px", height: "38px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        padding: 0,
                        transform: isBookmarkHovered ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      {saved ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"
                            fill="#C56A4D"
                            stroke="#C56A4D"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"
                            fill="none"
                            stroke={isBookmarkHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"}
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>

                    {isBookmarkHovered && (
                      <div className="bookmark-tooltip">
                        {saved ? "Remove from saved" : "Save this profile"}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── White info panel ── */}
                <div style={{ padding: "24px 28px 28px" }}>

                  {/* Stat strip */}
                  <div style={{
                    display: "flex",
                    marginBottom: "18px",
                    borderRadius: "14px",
                    backgroundColor: "#F7F4F0",
                    overflow: "hidden",
                    border: "1px solid #EDE8E0",
                  }}>
                    {[
                      { label: "AGE",    value: profile.age    },
                      { label: "HEIGHT", value: profile.height },
                      { label: "SECT",   value: profile.sect   },
                      { label: "CASTE",  value: profile.caste  },
                    ].map((stat, i, arr) => (
                      <div key={stat.label} style={{
                        flex: 1, textAlign: "center", padding: "12px 4px",
                        borderRight: i < arr.length - 1 ? "1px solid #E0DAD2" : "none",
                      }}>
                        <div style={{ fontSize: "17px", fontWeight: "700", color: "#1a1815", lineHeight: "1.1" }}>
                          {stat.value || "—"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#a89f96", marginTop: "3px", letterSpacing: "0.6px", fontWeight: "500" }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Location pill */}
                  <div style={{ marginBottom: "18px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#EEF5F0",
                      border: "1px solid #C8DFD0",
                      borderRadius: "100px",
                      padding: "5px 12px 5px 8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#2D6A4F",
                    }}>
                      <span style={{ fontSize: "13px" }}>📍</span>
                      {profile.city}, Pakistan
                    </span>
                  </div>

                  {/* Looking For */}
                  <div style={{
                    backgroundColor: "#FAF7F2",
                    borderRadius: "0 12px 12px 0",
                    padding: "14px 16px",
                    marginBottom: "22px",
                    border: "1px solid #EDE8E0",
                    borderLeft: "3px solid #C56A4D",
                  }}>
                    <div style={{
                      fontSize: "10px", color: "#a89f96",
                      marginBottom: "8px", letterSpacing: "0.7px", fontWeight: "700",
                    }}>
                      LOOKING FOR
                    </div>
                    <p style={{
                      fontSize: "15px",
                      color: "#2E2A25",
                      lineHeight: "1.75",
                      margin: 0,
                      fontWeight: "400",
                    }}>
                      {profile.bio}
                    </p>
                  </div>

                  {/* Send Interest CTA */}
                  <button
                    onClick={() => sendInterest(profile.user_id)}
                    onMouseEnter={() => setHoveredButton(profile.user_id)}
                    onMouseLeave={() => setHoveredButton(null)}
                    disabled={status === "accepted" || status === "declined"}
                    style={getButtonStyles(status, profile.user_id)}
                  >
                    {status === "pending"
                      ? "✕  Cancel Interest"
                      : status === "accepted"
                      ? "✓  Accepted"
                      : status === "declined"
                      ? "Declined"
                      : "Send Interest →"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}