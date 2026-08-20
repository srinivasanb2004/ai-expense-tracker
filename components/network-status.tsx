"use client"

import {
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"

export default function NetworkStatus() {
  const [online, setOnline] = useState(true)
  const [showBackOnline, setShowBackOnline] =
    useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOnline(navigator.onLine)

    let timer: ReturnType<typeof setTimeout> | undefined

    function handleOffline() {
      if (timer) clearTimeout(timer)

      setOnline(false)
      setShowBackOnline(false)
    }

    function handleOnline() {
      setOnline(true)
      setShowBackOnline(true)

      if (timer) clearTimeout(timer)

      timer = setTimeout(() => {
        setShowBackOnline(false)
      }, 3000)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener(
        "offline",
        handleOffline
      )

      window.removeEventListener(
        "online",
        handleOnline
      )

      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!mounted) return null

  if (!online) {
    return (
      <div className="network-banner network-banner-offline">
        <div className="network-banner-inner">
          <WifiOff size={18} />

          <div className="min-w-0">
            <p className="font-black">
              You&apos;re offline
            </p>

            <p className="text-xs opacity-80">
              Check your internet connection. Financial
              data may be unavailable.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (showBackOnline) {
    return (
      <div className="network-banner network-banner-online">
        <div className="network-banner-inner">
          <Wifi size={18} />

          <div className="min-w-0 flex-1">
            <p className="font-black">
              You&apos;re back online
            </p>

            <p className="text-xs opacity-80">
              Your connection has been restored.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBackOnline(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return null
}