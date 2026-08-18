"use client"

import { useEffect, useState } from "react"

export default function Greeting() {
  const [greeting, setGreeting] = useState("Hello")

  useEffect(() => {
    function updateGreeting() {
      const hour = new Date().getHours()

      if (hour >= 5 && hour < 12) {
        setGreeting("Good morning")
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good afternoon")
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good evening")
      } else {
        setGreeting("Good night")
      }
    }

    updateGreeting()

    const interval = setInterval(
      updateGreeting,
      60 * 1000
    )

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {greeting}{" "}
      {greeting === "Good morning"
        ? "☀️"
        : greeting === "Good afternoon"
          ? "👋"
          : greeting === "Good evening"
            ? "🌆"
            : "🌙"}
    </>
  )
}