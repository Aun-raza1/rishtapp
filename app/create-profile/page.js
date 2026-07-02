"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"

// ── Static data ──────────────────────────────────────────────────────────────

const PAKISTANI_CITIES = [
  "Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Multan",
  "Peshawar","Quetta","Sialkot","Gujranwala","Hyderabad","Bahawalpur",
  "Sargodha","Sukkur","Larkana","Sheikhupura","Rahim Yar Khan","Jhang",
  "Dera Ghazi Khan","Gujrat","Kasur","Mardan","Mingora","Nawabshah",
  "Sahiwal","Mirpur Khas","Okara","Burewala","Jacobabad","Muzaffarabad",
]

const HEIGHT_OPTIONS = [
  "4'10\"","4'11\"",
  "5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"","5'8\"","5'9\"",
  "5'10\"","5'11\"",
  "6'0\"","6'1\"","6'2\"","6'3\"","6'4\"","6'5\"+",
]

const EDUCATION_OPTIONS = [
  "Matric (SSC)","O Levels","Intermediate (FSC/FA)","A Levels",
  "Bachelors","BSc Engineering","MBBS / Medical","BBA / Commerce",
  "Masters / MS","MBA","PhD","Diploma / Vocational","Other",
]

const SECT_OPTIONS = [
  "Sunni","Barelvi","Deobandi","Ahl-e-Hadith",
  "Shia","Other",
]

const FAMILY_STRUCTURE_OPTIONS = [
  "Nuclear family","Joint family","Semi-joint","Parents abroad","Only mother","Only father","Guardian / Other",
]

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Public Profile",   sublabel: "Visible on browse cards"         },
  { number: 2, label: "Private Details",  sublabel: "Unlocked only after acceptance"  },
  { number: 3, label: "Profile Photo",    sublabel: "Optional but recommended"        },
]

// ── Shared input style tokens ─────────────────────────────────────────────────

const inputBase = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: "12px",
  border: "1.5px solid #D6D0C8",
  backgroundColor: "#FDFCFA",
  fontSize: "15px",
  color: "#1a1815",
  outline: "none",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
  boxSizing: "border-box",
}

const inputFocus = {
  borderColor: "#154A2C",
  boxShadow: "0 0 0 3px rgba(21,74,44,0.1)",
  backgroundColor: "#fff",
}

// ── Label component ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      color: "#4A443C",
      marginBottom: "7px",
      letterSpacing: "0.2px",
    }}>
      {children}
      {required && <span style={{ color: "#C56A4D", marginLeft: "3px" }}>*</span>}
    </label>
  )
}

// ── Controlled input with focus ring ─────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {children}
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: "12.5px", color: "#C56A4D", fontWeight: "500" }}>
          {error}
        </p>
      )}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = "text", maxLength }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputBase, ...(focused ? inputFocus : {}) }}
    />
  )
}

function SelectInput({ value, onChange, children }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        ...(focused ? inputFocus : {}),
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b6459' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: "38px",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  )
}

function TextareaInput({ value, onChange, placeholder, rows = 4 }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputBase,
        ...(focused ? inputFocus : {}),
        resize: "vertical",
        lineHeight: "1.65",
        minHeight: "120px",
      }}
    />
  )
}

// ── Section wrapper (grey card inside step) ───────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{
      backgroundColor: "#F7F4F0",
      border: "1px solid #EDE8E0",
      borderRadius: "18px",
      padding: "24px 24px 28px",
      marginBottom: "20px",
    }}>
      {title && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          paddingBottom: "14px",
          borderBottom: "1px solid #E5DFD6",
        }}>
          <span style={{ fontSize: "18px" }}>{icon}</span>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#6b6459", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {title}
          </span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreateProfile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // ── Step 1: Public fields ──
  const [fullName, setFullName]         = useState("")
  const [gender, setGender]             = useState("")
  const [age, setAge]                   = useState("")
  const [height, setHeight]             = useState("")
  const [city, setCity]                 = useState("")
  const [profession, setProfession]     = useState("")
  const [education, setEducation]       = useState("")
  const [sect, setSect]                 = useState("")
  const [lookingFor, setLookingFor]     = useState("")

  // ── Step 2: Private fields ──
  const [contactNumber, setContactNumber]       = useState("")
  const [area, setArea]                         = useState("")
  const [fatherOccupation, setFatherOccupation] = useState("")
  const [familyStructure, setFamilyStructure]   = useState("")
  const [siblingsCount, setSiblingsCount]       = useState("")
  const [alternativeContact, setAlternativeContact] = useState("")

  // ── Step 3: Photo ──
  const [photoFile, setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUser(user)

      // Pre-fill if profile already exists
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (data) {
        setFullName(data.full_name || "")
        setGender(data.gender || "")
        setAge(data.age || "")
        setHeight(data.height || "")
        setCity(data.city || "")
        setProfession(data.profession || "")
        setEducation(data.education || "")
        setSect(data.sect || "")
        setLookingFor(data.bio || "")
        setContactNumber(data.contact_number || "")
        setArea(data.area || "")
        setFatherOccupation(data.father_occupation || "")
        setFamilyStructure(data.family_structure || "")
        setSiblingsCount(data.siblings_count || "")
        setAlternativeContact(data.alternative_contact || "")
      }
    }
    init()
  }, [])

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep = (step) => {
    const e = {}
    if (step === 1) {
      if (!fullName.trim())     e.fullName   = "Full name is required."
      if (!gender)              e.gender     = "Please select a gender."
      if (!age || isNaN(age) || age < 18 || age > 75)
                                e.age        = "Please enter a valid age (18–75)."
      if (!city)                e.city       = "Please select your city."
      if (!profession.trim())   e.profession = "Job title / profession is required."
      if (!education)           e.education  = "Please select your education level."
      if (!lookingFor.trim())   e.lookingFor = "Please write a short description."
    }
    if (step === 2) {
      const phoneRegex = /^(\+92|0)?[3][0-9]{9}$/
      if (!contactNumber.trim())          e.contactNumber = "Contact number is required."
      else if (!phoneRegex.test(contactNumber.replace(/\s/g, "")))
                                          e.contactNumber = "Enter a valid Pakistani mobile number (e.g. 03001234567)."
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(s => s + 1)
  }

  const handleBack = () => {
    setErrors({})
    setCurrentStep(s => s - 1)
  }

  // ── Photo handling ────────────────────────────────────────────────────────

  const handlePhotoFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep(2)) { setCurrentStep(2); return }
    setLoading(true)

    let photoUrl = null

    // Upload photo if provided
    if (photoFile && user) {
      const ext = photoFile.name.split(".").pop()
      const path = `${user.id}/profile.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, photoFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(path)
        photoUrl = urlData?.publicUrl || null
      }
    }

    const profilePayload = {
      user_id:              user.id,
      email:                user.email,
      // Step 1 — public
      full_name:            fullName.trim(),
      name:                 fullName.trim(),   // keep legacy `name` col in sync
      gender:               gender,
      age:                  parseInt(age),
      height:               height,
      city:                 city,
      profession:           profession.trim(),
      education:            education,
      sect:                 sect,
      bio:                  lookingFor.trim(),
      // Step 2 — private
      contact_number:       contactNumber.trim(),
      area:                 area.trim(),
      father_occupation:    fatherOccupation.trim(),
      family_structure:     familyStructure,
      siblings_count:       siblingsCount ? parseInt(siblingsCount) : null,
      alternative_contact:  alternativeContact.trim(),
      // Step 3 — photo
      photo_url:            photoUrl,
      // Meta
      is_profile_completed: true,
      updated_at:           new Date().toISOString(),
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" })

    setLoading(false)
    if (error) {
      alert("Something went wrong saving your profile. Please try again.")
      console.error(error)
    } else {
      router.push("/dashboard")
    }
  }

  // ── Progress bar ──────────────────────────────────────────────────────────

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0A3320" }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "44px 24px 80px" }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "white", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            {currentStep === 1 && "Build Your Rishta Profile"}
            {currentStep === 2 && "Private Details"}
            {currentStep === 3 && "Profile Photo"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: 0 }}>
            {currentStep === 1 && "This information appears on your public browse card."}
            {currentStep === 2 && "This is only shared when both parties accept the rishta."}
            {currentStep === 3 && "Add a photo so families can make a confident decision."}
          </p>
        </div>

        {/* ── Step indicator ── */}
        <div style={{ marginBottom: "32px" }}>
          {/* Step labels row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            {STEPS.map((step) => {
              const isActive    = currentStep === step.number
              const isCompleted = currentStep > step.number
              return (
                <div key={step.number} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                    {/* Circle */}
                    <div style={{
                      width: "32px", height: "32px",
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: "700",
                      transition: "all 0.2s ease",
                      backgroundColor: isCompleted ? "#C56A4D" : isActive ? "white" : "rgba(255,255,255,0.12)",
                      color: isCompleted ? "white" : isActive ? "#0A3320" : "rgba(255,255,255,0.4)",
                      border: isActive ? "none" : isCompleted ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                    }}>
                      {isCompleted ? "✓" : step.number}
                    </div>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? "white" : isCompleted ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                      letterSpacing: "0.2px",
                    }}>
                      {step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress bar track */}
          <div style={{
            height: "4px",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: "100px",
            overflow: "hidden",
            margin: "0 16px",
          }}>
            <div style={{
              height: "100%",
              width: `${progressPercent}%`,
              backgroundColor: "#C56A4D",
              borderRadius: "100px",
              transition: "width 0.35s ease",
            }} />
          </div>
        </div>

        {/* ── Form card ── */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "24px",
          padding: "32px 32px 36px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1)",
        }}>

          {/* ════════════════════════════════════════════
              STEP 1 — Public Core Info
          ════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

              <Section title="Personal" icon="👤">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Full Name" required error={errors.fullName}>
                      <TextInput
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. Fatima Malik"
                      />
                    </Field>
                  </div>

                  <Field label="Gender" required error={errors.gender}>
                    <SelectInput value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </SelectInput>
                  </Field>

                  <Field label="Age" required error={errors.age}>
                    <TextInput
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      placeholder="e.g. 26"
                    />
                  </Field>

                  <Field label="Height" error={errors.height}>
                    <SelectInput value={height} onChange={e => setHeight(e.target.value)}>
                      <option value="">Select height</option>
                      {HEIGHT_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                    </SelectInput>
                  </Field>

                  <Field label="City" required error={errors.city}>
                    <SelectInput value={city} onChange={e => setCity(e.target.value)}>
                      <option value="">Select city</option>
                      {PAKISTANI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </SelectInput>
                  </Field>
                </div>
              </Section>

              <Section title="Career & Education" icon="🎓">
                <Field label="Job Title / Profession" required error={errors.profession}>
                  <TextInput
                    value={profession}
                    onChange={e => setProfession(e.target.value)}
                    placeholder="e.g. Software Engineer, Doctor, Teacher"
                  />
                </Field>

                <Field label="Education Level" required error={errors.education}>
                  <SelectInput value={education} onChange={e => setEducation(e.target.value)}>
                    <option value="">Select education level</option>
                    {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </SelectInput>
                </Field>
              </Section>

              <Section title="Religious Values" icon="☪️">
                <Field label="Sect / Religious Values" error={errors.sect}>
                  <SelectInput value={sect} onChange={e => setSect(e.target.value)}>
                    <option value="">Select (optional)</option>
                    {SECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </SelectInput>
                </Field>
              </Section>

              <Section title="About & Looking For" icon="💬">
                <Field label="What are you looking for in a partner?" required error={errors.lookingFor}>
                  <TextareaInput
                    value={lookingFor}
                    onChange={e => setLookingFor(e.target.value)}
                    placeholder="Write a warm, honest description of yourself and what qualities matter most to you in a life partner..."
                    rows={5}
                  />
                </Field>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#9c9588", lineHeight: "1.55" }}>
                  This appears on your browse card. Be genuine — families read this carefully.
                </p>
              </Section>

            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 2 — Private / Protected Info
          ════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

              {/* Privacy notice */}
              <div style={{
                display: "flex", gap: "12px", alignItems: "flex-start",
                backgroundColor: "#EEF5F0", border: "1px solid #C8DFD0",
                borderRadius: "14px", padding: "14px 16px", marginBottom: "20px",
              }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>🔒</span>
                <p style={{ margin: 0, fontSize: "13px", color: "#2D6A4F", lineHeight: "1.6", fontWeight: "500" }}>
                  Everything on this step is <strong>strictly private</strong>. It is only revealed to the other party after <em>both</em> sides accept the rishta.
                </p>
              </div>

              <Section title="Contact" icon="📞">
                <Field label="Mobile Number" required error={errors.contactNumber}>
                  <TextInput
                    type="tel"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="e.g. 03001234567"
                  />
                </Field>

                <Field label="Alternative Contact / WhatsApp (optional)" error={errors.alternativeContact}>
                  <TextInput
                    value={alternativeContact}
                    onChange={e => setAlternativeContact(e.target.value)}
                    placeholder="e.g. parent's number, email, or Instagram handle"
                  />
                </Field>
              </Section>

              <Section title="Location" icon="📍">
                <Field label="Sub-locality / Area" error={errors.area}>
                  <TextInput
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="e.g. DHA Phase 5, Gulshan-e-Iqbal, F-7"
                  />
                </Field>
                <p style={{ margin: "0", fontSize: "12.5px", color: "#9c9588" }}>
                  Used only for proximity matching. Never shown publicly.
                </p>
              </Section>

              <Section title="Family Background" icon="🏠">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Father's Occupation" error={errors.fatherOccupation}>
                      <TextInput
                        value={fatherOccupation}
                        onChange={e => setFatherOccupation(e.target.value)}
                        placeholder="e.g. Retired Army Officer, Businessman"
                      />
                    </Field>
                  </div>

                  <Field label="Family Structure" error={errors.familyStructure}>
                    <SelectInput value={familyStructure} onChange={e => setFamilyStructure(e.target.value)}>
                      <option value="">Select structure</option>
                      {FAMILY_STRUCTURE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </SelectInput>
                  </Field>

                  <Field label="Number of Siblings" error={errors.siblingsCount}>
                    <TextInput
                      type="number"
                      value={siblingsCount}
                      onChange={e => setSiblingsCount(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </Field>
                </div>
              </Section>

            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 3 — Photo Upload
          ════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

              {/* Photo notice */}
              <div style={{
                backgroundColor: "#FAF7F2",
                border: "1px solid #EDE8E0",
                borderLeft: "3px solid #C56A4D",
                borderRadius: "0 14px 14px 0",
                padding: "14px 16px",
                marginBottom: "24px",
              }}>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#4a443c", lineHeight: "1.65" }}>
                  📸 Your photo will be displayed with a <strong>high-resolution zoom overlay</strong> once a match is made — so families can review it privately after acceptance.
                </p>
              </div>

              {/* Drag and drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handlePhotoFile(file)
                }}
                style={{
                  border: `2px dashed ${dragOver ? "#154A2C" : "#D6D0C8"}`,
                  borderRadius: "20px",
                  backgroundColor: dragOver ? "#EEF5F0" : "#FDFCFA",
                  padding: "48px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  marginBottom: "20px",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => handlePhotoFile(e.target.files?.[0])}
                />

                {photoPreview ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                        width: "120px", height: "120px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #154A2C",
                        boxShadow: "0 4px 16px rgba(21,74,44,0.2)",
                      }}
                    />
                    <p style={{ margin: 0, fontSize: "14px", color: "#154A2C", fontWeight: "600" }}>
                      ✓ Photo selected
                    </p>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#9c9588" }}>
                      Click to change
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "60px", height: "60px",
                      borderRadius: "50%",
                      backgroundColor: "#EEF5F0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "26px",
                    }}>
                      📷
                    </div>
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1a1815" }}>
                      Drag & drop your photo here
                    </p>
                    <p style={{ margin: 0, fontSize: "13px", color: "#9c9588" }}>
                      or click to browse — JPG, PNG, WEBP up to 5MB
                    </p>
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: "#F7F4F0",
                borderRadius: "14px",
                padding: "16px 18px",
                border: "1px solid #EDE8E0",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: "700", color: "#4A443C" }}>
                  Photo is optional
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#9c9588", lineHeight: "1.6" }}>
                  You can skip this step and add a photo later from your Dashboard. Profiles with photos receive significantly more genuine interest.
                </p>
              </div>

            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid #F0EBE2",
            gap: "12px",
          }}>
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                style={{
                  padding: "13px 24px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "1.5px solid #D6D0C8",
                  backgroundColor: "transparent",
                  color: "#6b6459",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  letterSpacing: "0.2px",
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#F7F4F0"; e.currentTarget.style.borderColor = "#b5b0a8" }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#D6D0C8" }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                style={{
                  padding: "13px 32px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  backgroundColor: "#14532d",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  letterSpacing: "0.3px",
                  boxShadow: "0 3px 10px rgba(20,83,45,0.25)",
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#0F4522"; e.currentTarget.style.boxShadow = "0 5px 16px rgba(20,83,45,0.35)" }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#14532d"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(20,83,45,0.25)" }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: "13px 32px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  backgroundColor: loading ? "#9c9588" : "#14532d",
                  color: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.18s ease",
                  letterSpacing: "0.3px",
                  boxShadow: loading ? "none" : "0 3px 10px rgba(20,83,45,0.25)",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = "#0F4522" }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = "#14532d" }}
              >
                {loading ? "Saving…" : "Complete Profile ✓"}
              </button>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}