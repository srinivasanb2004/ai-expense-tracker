"use client"

import { useEffect, useState } from "react"

export default function Greeting({
  name,
}: {
  name?: string | null
}) {
  const [greeting, setGreeting] = useState("Hello")
  const [emoji, setEmoji] = useState("👋")

  useEffect(() => {
    function updateGreeting() {
      // Browser local time
      const hour = new Date().getHours()

      if (hour >= 5 && hour < 12) {
        setGreeting("Good morning")
        setEmoji("☀️")
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good afternoon")
        setEmoji("👋")
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good evening")
        setEmoji("🌆")
      } else {
        setGreeting("Good night")
        setEmoji("🌙")
      }
    }

    updateGreeting()

    const interval = setInterval(
      updateGreeting,
      60 * 1000
    )

    return () => clearInterval(interval)
  }, [])

  // Use first name for a cleaner dashboard greeting
  const firstName =
    name?.trim().split(/\s+/)[0] || ""

  return (
    <>
      {greeting}
      {firstName ? `, ${firstName}` : ""} {emoji}
    </>
  )
}