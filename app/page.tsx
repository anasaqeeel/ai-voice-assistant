"use client"

import { useState, useEffect } from "react"
import ContactSelection from "@/components/contact-selection"
import PermissionRequest from "@/components/permission-request"
import LoadingScreen from "@/components/loading-screen"

export default function Home() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if microphone permission is already granted
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName })
        setHasPermission(result.state === "granted")
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        setHasPermission(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermission()
  }, [])

  if (isLoading) {
    return <LoadingScreen message="Initializing Voice AI..." />
  }

  if (hasPermission === false) {
    return <PermissionRequest onPermissionGranted={() => setHasPermission(true)} />
  }

  return (
    <main className="min-h-screen bg-background">
      <ContactSelection />
    </main>
  )
}
