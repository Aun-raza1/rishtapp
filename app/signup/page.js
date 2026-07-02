"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

const handleSignup = async () => {
  setLoading(true)
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) {
    alert(error.message)
  } else {
    window.location.href = "/"
  }
  setLoading(false)
}

  return (
    <main className="min-h-screen" style={{display: "flex", flexDirection: "column", backgroundColor: "#dcfce7"}}>
      <Navbar />

      <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px"}}>
        <div style={{width: "100%", maxWidth: "420px", backgroundColor: "white", borderRadius: "20px", padding: "40px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)"}}>
          
          <div style={{textAlign: "center", marginBottom: "32px"}}>
            <div style={{width: "48px", height: "48px", backgroundColor: "#14532d", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"}}>
              <span style={{color: "white", fontSize: "20px", fontWeight: "bold"}}>R</span>
            </div>
            <h2 style={{fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 6px"}}>Create Account</h2>
            <p style={{color: "#6b7280", fontSize: "14px", margin: 0}}>Join the Rishtapp community</p>
          </div>

          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            <div>
              <label style={{display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px"}}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", color: "#111827", outline: "none", boxSizing: "border-box"}}
              />
            </div>

            <div>
  <label style={{display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px"}}>Password</label>
  <div style={{position: "relative"}}>
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Your password"
      style={{width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", color: "#111827", outline: "none", boxSizing: "border-box"}}
    />
    <button
      onClick={() => setShowPassword(!showPassword)}
      style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "13px"}}
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  </div>
</div>

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{backgroundColor: "#14532d", color: "white", padding: "12px", borderRadius: "50px", fontWeight: "600", fontSize: "15px", border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1}}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <p style={{textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0}}>
              Already have an account?{" "}
              <Link href="/login" style={{color: "#15803d", fontWeight: "600"}}>Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}