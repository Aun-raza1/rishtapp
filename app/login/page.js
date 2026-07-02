"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
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
            <h2 style={{fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 6px"}}>Welcome Back</h2>
            <p style={{color: "#6b7280", fontSize: "14px", margin: 0}}>Log in to your Rishtapp account</p>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                style={{width: "100%", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", color: "#111827", outline: "none", boxSizing: "border-box"}}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{backgroundColor: "#14532d", color: "white", padding: "12px", borderRadius: "50px", fontWeight: "600", fontSize: "15px", border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1}}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>

            <p style={{textAlign: "center", fontSize: "13px", color: "#6b7280", margin: 0}}>
              Don't have an account?{" "}
              <Link href="/signup" style={{color: "#15803d", fontWeight: "600"}}>Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}